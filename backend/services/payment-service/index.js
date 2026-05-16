const { createApp } = require('../../common/app');
const { ok, fail } = require('../../common/response');
const { getDb } = require('../../common/db');
const { asyncHandler } = require('../../common/errorHandler');
const { requireAuth } = require('../../common/authMiddleware');
const { ObjectId } = require('mongodb');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder';

const IS_MOCK = !RAZORPAY_KEY_ID.startsWith('rzp_test_') || 
  RAZORPAY_KEY_ID.includes('placeholder') || RAZORPAY_KEY_ID.includes('YOUR') ||
  RAZORPAY_KEY_SECRET.includes('placeholder') || RAZORPAY_KEY_SECRET.includes('YOUR') ||
  RAZORPAY_KEY_SECRET.length < 10;

let razorpayInstance;
if (!IS_MOCK) {
  try {
    razorpayInstance = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
  } catch (err) {
    console.warn('[payment-service] Razorpay init failed, running in mock mode:', err.message);
  }
} else {
  console.log('[payment-service] Running in MOCK mode (placeholder keys detected)');
}

const app = createApp();

// --- Transaction History (from MongoDB) ---

app.get('/v1/payments/history', asyncHandler(async (_req, res) => {
  const db = await getDb();
  const transactions = await db.collection('transactions')
    .find({})
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  const normalized = transactions.map((t) => ({
    ...t,
    id: t._id.toString(),
    _id: t._id.toString(),
    jobId: t.jobId?.toString(),
    clientId: t.clientId?.toString(),
    freelancerId: t.freelancerId?.toString(),
  }));

  return ok(res, { transactions: normalized });
}));

// --- READ: Get single transaction ---

app.get('/v1/payments/transactions/:id', asyncHandler(async (req, res) => {
  const db = await getDb();

  let filter;
  try {
    filter = { _id: new ObjectId(req.params.id) };
  } catch {
    filter = { _id: req.params.id };
  }

  const tx = await db.collection('transactions').findOne(filter);
  if (!tx) return fail(res, 'ERR_NOT_FOUND', 'Transaction not found', 404);

  return ok(res, {
    transaction: {
      ...tx,
      id: tx._id.toString(),
      _id: tx._id.toString(),
      jobId: tx.jobId?.toString(),
      clientId: tx.clientId?.toString(),
      freelancerId: tx.freelancerId?.toString(),
    },
  });
}));

// --- READ: List disputes ---

app.get('/v1/disputes', asyncHandler(async (req, res) => {
  const db = await getDb();
  const { status } = req.query || {};

  const filter = {};
  if (status) filter.status = status;

  const disputes = await db.collection('disputes')
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  const normalized = disputes.map((d) => ({
    ...d,
    id: d._id.toString(),
    _id: d._id.toString(),
  }));

  return ok(res, { disputes: normalized });
}));

// --- UPDATE: Resolve a dispute ---

app.patch('/v1/disputes/:id', requireAuth, asyncHandler(async (req, res) => {
  const db = await getDb();
  const { status: newStatus, resolution } = req.body || {};

  if (!newStatus) return fail(res, 'ERR_VALIDATION', 'status is required', 400);

  let filter;
  try {
    filter = { _id: new ObjectId(req.params.id) };
  } catch {
    filter = { _id: req.params.id };
  }

  const result = await db.collection('disputes').updateOne(filter, {
    $set: {
      status: newStatus,
      resolution: resolution || '',
      resolvedAt: new Date().toISOString(),
    },
  });

  if (result.matchedCount === 0) return fail(res, 'ERR_NOT_FOUND', 'Dispute not found', 404);
  return ok(res, { updated: true });
}));

// --- Escrow Release (MongoDB) ---

app.post('/v1/payments/release/:transactionId', requireAuth, asyncHandler(async (req, res) => {
  const db = await getDb();

  let filter;
  try {
    filter = { _id: new ObjectId(req.params.transactionId) };
  } catch {
    filter = { _id: req.params.transactionId };
  }

  const tx = await db.collection('transactions').findOne(filter);
  if (!tx) return fail(res, 'ERR_NOT_FOUND', 'Transaction not found', 404);

  await db.collection('transactions').updateOne(
    { _id: tx._id },
    { $set: { escrowStatus: 'released', releasedAt: new Date().toISOString(), updatedAt: new Date() } }
  );

  return ok(res, { released_amount: tx.netAmount });
}));

// --- Escrow Dispute (MongoDB) ---

app.post('/v1/payments/dispute/:transactionId', requireAuth, asyncHandler(async (req, res) => {
  const db = await getDb();

  let filter;
  try {
    filter = { _id: new ObjectId(req.params.transactionId) };
  } catch {
    filter = { _id: req.params.transactionId };
  }

  const tx = await db.collection('transactions').findOne(filter);
  if (!tx) return fail(res, 'ERR_NOT_FOUND', 'Transaction not found', 404);

  await db.collection('transactions').updateOne(
    { _id: tx._id },
    { $set: { escrowStatus: 'disputed', updatedAt: new Date() } }
  );

  // Create a dispute record in the disputes collection
  const dispute = {
    transactionId: tx._id.toString(),
    raisedBy: 'unknown', // needs real auth
    reason: (req.body || {}).reason || '',
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  await db.collection('disputes').insertOne(dispute);

  return ok(res, { dispute_id: dispute._id?.toString() || `d-${Date.now()}`, reason: dispute.reason }, undefined, 201);
}));

// --- Razorpay: Create Order ---

app.post('/v1/payments/create-order', requireAuth, asyncHandler(async (req, res) => {
  const { amount, currency = 'INR', jobId, notes = {} } = req.body || {};

  if (!amount || amount <= 0) {
    return fail(res, 'ERR_VALIDATION', 'Amount must be a positive number', 400);
  }

  if (!razorpayInstance) {
    // Mock mode: return a fake order for testing UI flow
    const mockOrder = {
      id: `order_mock_${Date.now()}`,
      entity: 'order',
      amount: Math.round(amount * 100),
      amount_paid: 0,
      amount_due: Math.round(amount * 100),
      currency,
      status: 'created',
      created_at: Math.floor(Date.now() / 1000),
    };
    return ok(res, { order: mockOrder, key: RAZORPAY_KEY_ID }, undefined, 201);
  }

  try {
    const order = await razorpayInstance.orders.create({
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency,
      receipt: `rcpt_${jobId || 'gen'}_${Date.now()}`,
      notes: { jobId, ...notes },
    });

    return ok(res, { order, key: RAZORPAY_KEY_ID }, undefined, 201);
  } catch (err) {
    console.error('[payment-service] Razorpay order creation failed:', err.message);
    return fail(res, 'ERR_RAZORPAY', 'Failed to create Razorpay order', 500);
  }
}));

// --- Razorpay: Verify Payment (persists to MongoDB) ---

app.post('/v1/payments/verify', requireAuth, asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, jobId } = req.body || {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return fail(res, 'ERR_VALIDATION', 'Missing payment verification fields', 400);
  }

  const db = await getDb();

  // Mock mode check
  if (razorpay_order_id.startsWith('order_mock_')) {
    const tx = {
      jobId: jobId || '',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      grossAmount: 0,
      platformFee: 0,
      netAmount: 0,
      escrowStatus: 'held',
      createdAt: new Date().toISOString(),
      verified: true,
      mock: true,
    };
    const result = await db.collection('transactions').insertOne(tx);
    tx.id = result.insertedId.toString();
    tx._id = tx.id;
    return ok(res, { verified: true, transaction: tx });
  }

  // Real signature verification
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return fail(res, 'ERR_SIGNATURE', 'Payment signature verification failed', 400);
  }

  // Signature valid — record transaction in MongoDB
  const tx = {
    jobId: jobId || '',
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
    escrowStatus: 'held',
    createdAt: new Date().toISOString(),
    verified: true,
  };
  const result = await db.collection('transactions').insertOne(tx);
  tx.id = result.insertedId.toString();
  tx._id = tx.id;

  return ok(res, { verified: true, transaction: tx });
}));

// --- Razorpay: Webhook (async payment confirmations) ---

app.post('/v1/payments/webhook', (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  const signature = req.headers['x-razorpay-signature'];

  if (webhookSecret && signature) {
    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSig !== signature) {
      return fail(res, 'ERR_WEBHOOK', 'Invalid webhook signature', 400);
    }
  }

  const event = req.body?.event;
  const payload = req.body?.payload;

  console.log('[payment-service] Webhook received:', event);

  if (event === 'payment.captured') {
    const paymentEntity = payload?.payment?.entity;
    if (paymentEntity) {
      console.log(`[payment-service] Payment captured: ${paymentEntity.id}, amount: ${paymentEntity.amount}`);
    }
  }

  return res.status(200).json({ status: 'ok' });
});

// --- Razorpay: Get Payment Status ---

app.get('/v1/payments/status/:paymentId', asyncHandler(async (req, res) => {
  if (!razorpayInstance) {
    return ok(res, { id: req.params.paymentId, status: 'captured', mock: true });
  }

  try {
    const payment = await razorpayInstance.payments.fetch(req.params.paymentId);
    return ok(res, payment);
  } catch (err) {
    console.error('[payment-service] Fetch payment failed:', err.message);
    return fail(res, 'ERR_RAZORPAY', 'Failed to fetch payment', 500);
  }
}));

// --- Razorpay: Config (public key for frontend) ---

app.get('/v1/payments/config', (_req, res) => {
  return ok(res, { key: RAZORPAY_KEY_ID, currency: 'INR' });
});

app.attachErrorHandler();

const port = Number(process.env.PAYMENT_PORT || 3005);
app.listen(port, () => console.log(`[payment-service] running on :${port}`));
