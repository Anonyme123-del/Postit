const bcrypt = require('bcrypt');
const { all, get, run } = require('../db/sqlite');

const BCRYPT_ROUNDS = 12;

function normalizePermissionRow(row) {
  if (!row) {
    return {
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      isAdmin: false
    };
  }

  return {
    canCreate: Boolean(row.can_create),
    canUpdate: Boolean(row.can_update),
    canDelete: Boolean(row.can_delete),
    isAdmin: Boolean(row.is_admin)
  };
}

function getGuestPermissions() {
  return {
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    isAdmin: false
  };
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function validateUsername(username) {
  const cleanUsername = normalizeUsername(username);

  if (!cleanUsername) {
    throw new Error("Le nom d'utilisateur est requis.");
  }

  if (cleanUsername.length < 3) {
    throw new Error("Le nom d'utilisateur doit contenir au moins 3 caractères.");
  }

  if (cleanUsername.length > 30) {
    throw new Error("Le nom d'utilisateur est trop long.");
  }

  if (!/^[a-z0-9_.-]+$/.test(cleanUsername)) {
    throw new Error("Le nom d'utilisateur contient des caractères non autorisés.");
  }

  if (['guest', 'admin', 'root', 'system'].includes(cleanUsername)) {
    throw new Error("Ce nom d'utilisateur est réservé.");
  }

  return cleanUsername;
}

function validatePassword(password, username = '') {
  const cleanPassword = String(password || '');
  const cleanUsername = normalizeUsername(username);

  if (!cleanPassword) {
    throw new Error('Le mot de passe est requis.');
  }

  if (cleanPassword.length < 12) {
    throw new Error('Le mot de passe doit contenir au moins 12 caractères.');
  }

  if (cleanPassword.length > 128) {
    throw new Error('Le mot de passe est trop long.');
  }

  if (!/[a-z]/.test(cleanPassword)) {
    throw new Error('Le mot de passe doit contenir au moins une lettre minuscule.');
  }

  if (!/[A-Z]/.test(cleanPassword)) {
    throw new Error('Le mot de passe doit contenir au moins une lettre majuscule.');
  }

  if (!/[0-9]/.test(cleanPassword)) {
    throw new Error('Le mot de passe doit contenir au moins un chiffre.');
  }

  if (!/[!@#$%^&*(),.?":{}|<>_\-+=/\\[\];'`~]/.test(cleanPassword)) {
    throw new Error('Le mot de passe doit contenir au moins un caractère spécial.');
  }

  if (/\s/.test(cleanPassword)) {
    throw new Error('Le mot de passe ne doit pas contenir d’espace.');
  }

  if (cleanUsername && cleanPassword.toLowerCase().includes(cleanUsername)) {
    throw new Error("Le mot de passe ne doit pas contenir le nom d'utilisateur.");
  }

  const weakPatterns = [
    'password',
    'azerty',
    'qwerty',
    '123456',
    '123456789',
    'motdepasse',
    'admin',
    'welcome'
  ];

  const lowerPassword = cleanPassword.toLowerCase();
  if (weakPatterns.some((pattern) => lowerPassword.includes(pattern))) {
    throw new Error('Le mot de passe est trop faible. Choisis-en un plus robuste.');
  }

  return cleanPassword;
}

async function getUserByUsername(username) {
  const cleanUsername = normalizeUsername(username);

  return get(
    `SELECT u.id, u.username, u.password_hash, up.can_create, up.can_update, up.can_delete, up.is_admin
     FROM users u
     LEFT JOIN user_permissions up ON up.user_id = u.id
     WHERE LOWER(u.username) = ?`,
    [cleanUsername]
  );
}

async function getPermissionsForUserId(userId) {
  if (!userId) {
    return getGuestPermissions();
  }

  const row = await get(
    `SELECT can_create, can_update, can_delete, is_admin
     FROM user_permissions
     WHERE user_id = ?`,
    [userId]
  );

  return normalizePermissionRow(row);
}

async function createUser(username, password) {
  const cleanUsername = validateUsername(username);
  const cleanPassword = validatePassword(password, cleanUsername);

  const existing = await getUserByUsername(cleanUsername);
  if (existing) {
    throw new Error("Nom d'utilisateur déjà pris.");
  }

  const passwordHash = await bcrypt.hash(cleanPassword, BCRYPT_ROUNDS);

  const inserted = await run(
    `INSERT INTO users (username, password_hash)
     VALUES (?, ?)`,
    [cleanUsername, passwordHash]
  );

  await run(
    `INSERT INTO user_permissions (user_id, can_create, can_update, can_delete, is_admin)
     VALUES (?, 1, 1, 1, 0)`,
    [inserted.lastID]
  );

  return {
    id: inserted.lastID,
    username: cleanUsername,
    permissions: {
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      isAdmin: false
    }
  };
}

async function authenticate(username, password) {
  const cleanUsername = normalizeUsername(username);
  const cleanPassword = String(password || '');

  if (!cleanUsername || !cleanPassword) {
    return null;
  }

  const user = await getUserByUsername(cleanUsername);
  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(cleanPassword, user.password_hash);
  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    permissions: normalizePermissionRow(user)
  };
}

async function getSessionUser(userId) {
  if (!userId) {
    return null;
  }

  const user = await get(
    `SELECT u.id, u.username, up.can_create, up.can_update, up.can_delete, up.is_admin
     FROM users u
     LEFT JOIN user_permissions up ON up.user_id = u.id
     WHERE u.id = ?`,
    [userId]
  );

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    permissions: normalizePermissionRow(user)
  };
}

async function listUsersWithPermissions() {
  const rows = await all(
    `SELECT u.id, u.username, u.created_at, up.can_create, up.can_update, up.can_delete, up.is_admin
     FROM users u
     LEFT JOIN user_permissions up ON up.user_id = u.id
     ORDER BY u.username ASC`
  );

  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    createdAt: row.created_at,
    permissions: normalizePermissionRow(row)
  }));
}

async function updatePermissions(userId, permissions) {
  await run(
    `UPDATE user_permissions
     SET can_create = ?, can_update = ?, can_delete = ?, is_admin = ?
     WHERE user_id = ?`,
    [
      permissions.canCreate ? 1 : 0,
      permissions.canUpdate ? 1 : 0,
      permissions.canDelete ? 1 : 0,
      permissions.isAdmin ? 1 : 0,
      userId
    ]
  );
}

async function deleteUserById(userId) {
  return run('DELETE FROM users WHERE id = ?', [userId]);
}

module.exports = {
  authenticate,
  createUser,
  deleteUserById,
  getPermissionsForUserId,
  getSessionUser,
  listUsersWithPermissions,
  updatePermissions
};