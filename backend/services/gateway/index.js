const { createApp } = require('../../common/app');
const { ok } = require('../../common/response');

const app = createApp();

app.get('/v1', (_req, res) => ok(res, { name: 'GeekBid Gateway', status: 'ok' }));

app.get('/v1/info', (_req, res) =>
  ok(res, {
    services: {
      auth: process.env.AUTH_SERVICE_URL || `http://localhost:${process.env.AUTH_PORT || 3001}/v1`,
      jobs: process.env.JOB_SERVICE_URL || `http://localhost:${process.env.JOB_PORT || 3003}/v1`,
      bidding: process.env.BIDDING_SERVICE_URL || `http://localhost:${process.env.BIDDING_PORT || 3004}/v1`,
      payments: process.env.PAYMENT_SERVICE_URL || `http://localhost:${process.env.PAYMENT_PORT || 3005}/v1`,
      notifications: process.env.NOTIFICATION_SERVICE_URL || `http://localhost:${process.env.NOTIFICATION_PORT || 3006}/v1`,
      chat: process.env.CHAT_SERVICE_URL || `http://localhost:${process.env.CHAT_PORT || 3007}/v1`
    }
  })
);

app.attachErrorHandler();

const port = Number(process.env.GATEWAY_PORT || 3000);
app.listen(port, () => console.log(`[gateway] running on :${port}`));
