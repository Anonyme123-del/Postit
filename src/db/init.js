const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const env = require('../config/env');
const { pool } = require('../config/db');
const { get, run, closeConnection } = require('./database');

const schemaPath = path.join(__dirname, 'schema.sql');

const sql = fs.readFileSync(schemaPath, 'utf8');

async function executeSchema() {
  await pool.query(sql);
}

async function ensureSpecialUsers() {
  const guestPasswordHash = await bcrypt.hash('guest-disabled', 10);
  const adminPasswordHash = await bcrypt.hash(env.adminDefaultPassword, 10);

  const guest = await get('SELECT id FROM users WHERE username = ?', ['guest']);
  const admin = await get('SELECT id FROM users WHERE username = ?', ['admin']);

  let guestId = guest?.id;
  let adminId = admin?.id;

  if (!guestId) {
    const insertedGuest = await run(
      'INSERT INTO users (username, password_hash) VALUES (?, ?) RETURNING id',
      ['guest', guestPasswordHash]
    );

    guestId = insertedGuest.rows[0].id;
  }

  if (!adminId) {
    const insertedAdmin = await run(
      'INSERT INTO users (username, password_hash) VALUES (?, ?) RETURNING id',
      ['admin', adminPasswordHash]
    );

    adminId = insertedAdmin.rows[0].id;
  }

  await run(
    `INSERT INTO user_permissions (user_id, can_create, can_update, can_delete, is_admin)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id)
     DO UPDATE SET can_create = EXCLUDED.can_create,
                   can_update = EXCLUDED.can_update,
                   can_delete = EXCLUDED.can_delete,
                   is_admin = EXCLUDED.is_admin`,
    [guestId, false, false, false, false]
  );

  await run(
    `INSERT INTO user_permissions (user_id, can_create, can_update, can_delete, is_admin)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id)
     DO UPDATE SET can_create = EXCLUDED.can_create,
                   can_update = EXCLUDED.can_update,
                   can_delete = EXCLUDED.can_delete,
                   is_admin = EXCLUDED.is_admin`,
    [adminId, true, true, true, true]
  );
}

async function main() {
  try {
    await executeSchema();
    await ensureSpecialUsers();

    console.log('Database initialized successfully.');
    console.log(`Admin account: admin / ${env.adminDefaultPassword}`);
  } catch (error) {
    const details = error && error.message ? error.message : String(error);
    console.error('Database initialization failed:', details);
    process.exitCode = 1;
  } finally {
    await closeConnection();
  }
}

main();