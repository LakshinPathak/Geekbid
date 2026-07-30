require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { spawn } = require('child_process');
const { closeDb } = require('../common/db');

const services = [
  ['auth', 'services/auth-service/index.js'],
  ['jobs', 'services/job-service/index.js'],
  ['bidding', 'services/bidding-service/index.js'],
  ['payments', 'services/payment-service/index.js'],
  ['notifications', 'services/notification-service/index.js'],
  ['chat', 'services/chat-service/index.js'],
  ['gateway', 'services/gateway/index.js']
];

const procs = services.map(([name, file]) => {
  const p = spawn('node', [file], { stdio: 'inherit' });
  p.on('exit', (code) => {
    console.log(`[${name}] exited with code ${code}`);
  });
  return p;
});

const shutdown = async () => {
  procs.forEach((p) => p.kill('SIGTERM'));
  await closeDb();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
