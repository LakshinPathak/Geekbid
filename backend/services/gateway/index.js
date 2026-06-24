const { createApp } = require('../../common/app');
const { ok } = require('../../common/response');

const app = createApp();

app.get('/v1', (_req, res) => ok(res, { name: 'GeekBid Gateway', status: 'ok' }));

app.get('/v1/info', (_req, res) =>
  ok(res, {
    services: {
      auth: 'http://localhost:3001/v1',
      jobs: 'http://localhost:3003/v1',
      bidding: 'http://localhost:3004/v1',
      payments: 'http://localhost:3005/v1',
      notifications: 'http://localhost:3006/v1',
      chat: 'http://localhost:3007/v1'
    }
  })
);

app.attachErrorHandler();

const port = Number(process.env.GATEWAY_PORT || 3000);
app.listen(port, () => console.log(`[gateway] running on :${port}`));
