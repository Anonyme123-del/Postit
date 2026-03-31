const sqlite3 = require('sqlite3').verbose();
const env = require('./env');

const db = new sqlite3.Database(env.dbPath);
db.serialize(() => {
	db.run('PRAGMA foreign_keys = ON');
});

module.exports = db;