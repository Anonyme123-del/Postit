const bcrypt = require('bcrypt');
const { all, get, run } = require('../db/sqlite');

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
     WHERE u.username = ?`,
    [username]
  );
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

async function createUser(username, password) {
  const cleanUsername = String(username || '').trim();
  if (!cleanUsername || !password) {
    throw new Error('Nom d utilisateur et mot de passe requis.');
  }

  if (cleanUsername.toLowerCase() === 'guest') {
    throw new Error('Le nom guest est reserve.');
  }

  const existing = await getUserByUsername(cleanUsername);
  if (existing) {
    throw new Error('Nom d utilisateur deja pris.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const inserted = await run(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)',
    [cleanUsername, passwordHash]
  );

  await run(
    'INSERT INTO user_permissions (user_id, can_create, can_update, can_delete, is_admin) VALUES (?, 1, 1, 1, 0)',
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