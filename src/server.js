const fs = require('fs');
const http = require('http');
const https = require('https');
const app = require('./app');
const env = require('./config/env');

function createServer() {
  if (env.httpsEnabled && fs.existsSync(env.httpsKeyPath) && fs.existsSync(env.httpsCertPath)) {
    return https.createServer(
      {
        key: fs.readFileSync(env.httpsKeyPath),
        cert: fs.readFileSync(env.httpsCertPath)
      },
      app
    );
  }

  return http.createServer(app);
}

const server = createServer();

server.listen(env.port, () => {
  const protocol = env.httpsEnabled ? 'https' : 'http';
  console.log(`Secure Post-it app listening on ${protocol}://localhost:${env.port}`);
});