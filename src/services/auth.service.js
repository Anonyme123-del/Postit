const bcrypt = require('bcrypt');
const { all, get, run } = require('../db/sqlite');

const SALT_ROUNDS = 12;

class ValidationError extends Error {
  constructor(messages) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.messages = Array.isArray(messages) ? messages : [messages];
  }
}

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

async function getUserByUsername(username) {
  return get(
    `SELECT u.id, u.username, u.password_hash, up.can_create, up.can_update, up.can_delete, up.is_admin
     FROM users u
     LEFT JOIN user_permissions up ON up.user_id = u.id
     WHERE LOWER(u.username) = LOWER(?)`,
    [username]
  );
}

async function getGuestUser() {
  const user = await get(
    `SELECT u.id, u.username, up.can_create, up.can_update, up.can_delete, up.is_admin
     FROM users u
     LEFT JOIN user_permissions up ON up.user_id = u.id
     WHERE u.username = 'guest'`
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

async function getPermissionsForUserId(userId) {
  if (!userId) {
    const guestRow = await get(
      `SELECT up.can_create, up.can_update, up.can_delete, up.is_admin
       FROM users u
       LEFT JOIN user_permissions up ON up.user_id = u.id
       WHERE u.username = 'guest'`
    );

    return normalizePermissionRow(guestRow);
  }

  const row = await get(
    `SELECT can_create, can_update, can_delete, is_admin
     FROM user_permissions
     WHERE user_id = ?`,
    [userId]
  );

  return normalizePermissionRow(row);
}

function validateUsername(username) {
  const errors = [];
  const cleanUsername = String(username || '').trim();

  if (!cleanUsername) {
    errors.push("Le nom d'utilisateur est requis.");
    return errors;
  }

  if (cleanUsername.length < 3) {
    errors.push("Le nom d'utilisateur doit contenir au moins 3 caractères.");
  }

  if (cleanUsername.length > 30) {
    errors.push("Le nom d'utilisateur ne doit pas dépasser 30 caractères.");
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(cleanUsername)) {
    errors.push(
      "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, points, tirets et underscores."
    );
  }

  if (cleanUsername.toLowerCase() === 'guest') {
    errors.push("Le nom d'utilisateur guest est réservé.");
  }

  if (cleanUsername.toLowerCase() === 'admin') {
    errors.push("Le nom d'utilisateur admin est réservé.");
  }

  return errors;
}

function hasSequentialChars(password) {
  const sequences = [
    'abcdefghijklmnopqrstuvwxyz',
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    '0123456789'
  ];

  return sequences.some((sequence) => {
    for (let i = 0; i <= sequence.length - 4; i += 1) {
      const part = sequence.slice(i, i + 4);
      if (password.includes(part)) {
        return true;
      }
    }
    return false;
  });
}

function hasRepeatedChars(password) {
  return /(.)\1\1/.test(password);
}

function validatePasswordStrength(password, username) {
  const errors = [];
  const pwd = String(password || '');
  const cleanUsername = String(username || '').trim().toLowerCase();

  if (!pwd) {
    errors.push('Le mot de passe est requis.');
    return errors;
  }

  if (pwd.length < 10) {
    errors.push('Le mot de passe doit contenir au moins 10 caractères.');
  }

  if (pwd.length > 128) {
    errors.push('Le mot de passe ne doit pas dépasser 128 caractères.');
  }

  if (!/[a-z]/.test(pwd)) {
    errors.push('Le mot de passe doit contenir au moins une lettre minuscule.');
  }

  if (!/[A-Z]/.test(pwd)) {
    errors.push('Le mot de passe doit contenir au moins une lettre majuscule.');
  }

  if (!/[0-9]/.test(pwd)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre.');
  }

  if (!/[^A-Za-z0-9]/.test(pwd)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial.');
  }

  if (/\s/.test(pwd)) {
    errors.push("Le mot de passe ne doit pas contenir d'espaces.");
  }

  if (cleanUsername && pwd.toLowerCase().includes(cleanUsername)) {
    errors.push("Le mot de passe ne doit pas contenir votre nom d'utilisateur.");
  }

  const weakPasswords = [
    'password',
    'password123',
    '12345678',
    '123456789',
    '1234567890',
    'azerty123',
    'qwerty123',
    'admin123',
    'motdepasse123'
  ];

  if (weakPasswords.includes(pwd.toLowerCase())) {
    errors.push('Ce mot de passe est trop courant.');
  }

  if (hasSequentialChars(pwd)) {
    errors.push('Le mot de passe ne doit pas contenir de suite évidente comme abcd ou 1234.');
  }

  if (hasRepeatedChars(pwd)) {
    errors.push('Le mot de passe ne doit pas contenir trop de caractères répétés comme aaa ou 111.');
  }

  return errors;
}

async function createUser(username, password) {
  const cleanUsername = String(username || '').trim();

  const usernameErrors = validateUsername(cleanUsername);
  const passwordErrors = validatePasswordStrength(password, cleanUsername);
  const errors = [...usernameErrors, ...passwordErrors];

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  const existing = await getUserByUsername(cleanUsername);

  if (existing) {
    throw new ValidationError("Nom d'utilisateur déjà pris.");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const inserted = await run(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)',
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
  const cleanUsername = String(username || '').trim();

  if (!cleanUsername || !password) {
    return null;
  }

  const user = await getUserByUsername(cleanUsername);

  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(String(password || ''), user.password_hash);

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
  const existing = await get(
    `SELECT user_id FROM user_permissions WHERE user_id = ?`,
    [userId]
  );

  if (!existing) {
    throw new Error('Permissions introuvables pour cet utilisateur.');
  }

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
  const existing = await get(
    'SELECT id, username FROM users WHERE id = ?',
    [userId]
  );

  if (!existing) {
    throw new Error('Utilisateur introuvable.');
  }

  return run('DELETE FROM users WHERE id = ?', [userId]);
}

module.exports = {
  ValidationError,
  authenticate,
  createUser,
  deleteUserById,
  getGuestUser,
  getPermissionsForUserId,
  getSessionUser,
  listUsersWithPermissions,
  updatePermissions,
  validatePasswordStrength,
  validateUsername
};