const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: Number(process.env.PORT || 3000),
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret',
  dbPath: path.resolve(process.cwd(), process.env.DB_PATH || './data/app.sqlite'),
  httpsEnabled: process.env.HTTPS_ENABLED === 'true',
  httpsKeyPath: path.resolve(process.cwd(), process.env.HTTPS_KEY_PATH || './certs/key.pem'),
  httpsCertPath: path.resolve(process.cwd(), process.env.HTTPS_CERT_PATH || './certs/cert.pem'),
  adminDefaultPassword: process.env.ADMIN_DEFAULT_PASSWORD || 'admin123'
};