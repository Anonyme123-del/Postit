const { get, run } = require('../db/sqlite');

async function findByUsername(username) {
  return get(
    `SELECT id, username, password_hash, created_at
     FROM users
     WHERE username = ?`,
    [username]
  );
}

async function findUserWithPermissionsByUsername(username) {
  return get(
    `SELECT 
        u.id,
        u.username,
        u.password_hash,
        u.created_at,
        up.can_create,
        up.can_update,
        up.can_delete,
        up.is_admin
     FROM users u
     LEFT JOIN user_permissions up ON up.user_id = u.id
     WHERE u.username = ?`,
    [username]
  );
}

async function createUser(username, passwordHash) {
  return run(
    `INSERT INTO users (username, password_hash)
     VALUES (?, ?)`,
    [username, passwordHash]
  );
}

async function createDefaultPermissions(userId) {
  return run(
    `INSERT INTO user_permissions (user_id, can_create, can_update, can_delete, is_admin)
     VALUES (?, 1, 1, 1, 0)`,
    [userId]
  );
}

module.exports = {
  findByUsername,
  findUserWithPermissionsByUsername,
  createUser,
  createDefaultPermissions
};