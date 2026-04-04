const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const env = require('../config/env');
const db = require('../config/db');
const { get, run } = require('./sqlite');

const schemaPath = path.join(__dirname, 'schema.sql');
const sql = fs.readFileSync(schemaPath, 'utf8');

async function ensureSpecialUsers() {
  const guestPasswordHash = await bcrypt.hash('guest-disabled', 10);
  const adminPasswordHash = await bcrypt.hash(env.adminDefaultPassword, 10);

  const guest = await get('SELECT id FROM users WHERE username = ?', ['guest']);
  const admin = await get('SELECT id FROM users WHERE username = ?', ['admin']);

  let guestId = guest?.id;
  let adminId = admin?.id;

  if (!guestId) {
    const insertedGuest = await run('INSERT INTO users (username, password_hash) VALUES (?, ?)', ['guest', guestPasswordHash]);
    guestId = insertedGuest.lastID;
  }

  if (!adminId) {
    const insertedAdmin = await run('INSERT INTO users (username, password_hash) VALUES (?, ?)', ['admin', adminPasswordHash]);
    adminId = insertedAdmin.lastID;
  }

  await run(
    `INSERT INTO user_permissions (user_id, can_create, can_update, can_delete, is_admin)
     VALUES (?, 0, 0, 0, 0)
     ON CONFLICT(user_id)
     DO UPDATE SET can_create = 0, can_update = 0, can_delete = 0, is_admin = 0`,
    [guestId]
  );

  await run(
    `INSERT INTO user_permissions (user_id, can_create, can_update, can_delete, is_admin)
     VALUES (?, 1, 1, 1, 1)
     ON CONFLICT(user_id)
     DO UPDATE SET can_create = 1, can_update = 1, can_delete = 1, is_admin = 1`,
    [adminId]
  );
}

db.exec(sql, (error) => {
  if (error) {
    console.error('Database initialization failed:', error.message);
    process.exitCode = 1;
    return;
  }

  ensureSpecialUsers()
    .then(() => {
      console.log('Database initialized successfully.');
      console.log(`Admin account: admin / ${env.adminDefaultPassword}`);
      db.close();
    })
    .catch((seedError) => {
      console.error('Special user seed failed:', seedError.message);
      process.exitCode = 1;
      db.close();
    });
});