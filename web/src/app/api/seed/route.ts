import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { hashSync } from "bcryptjs";
import { authenticateRequest } from "@/lib/auth";

/**
 * POST /api/seed
 *
 * Populates all MongoDB collections with production-quality test data.
 * Clears existing data first. Creates proper indexes.
 *
 * ⚠️ SECURITY: Requires an authenticated admin — except for the one-time
 * bootstrap case of a completely empty (zero-user) non-production database,
 * where there is no admin yet to authenticate as. Once any user exists, the
 * admin check applies unconditionally. Production is additionally gated on
 * ALLOW_SEED=true, but that env flag alone was never meant to be a security
 * boundary by itself — hence the admin check on top of it.
 */
export async function POST(req: NextRequest) {
 const isProduction = process.env.NODE_ENV === "production";
 const seedAllowed = process.env.ALLOW_SEED === "true";

 if (isProduction && !seedAllowed) {
 return NextResponse.json(
 {
 error: "Seed endpoint is disabled in production",
 hint: "Set ALLOW_SEED=true in environment variables to enable (not recommended)",
 },
 { status: 403 }
 );
 }

 const db = await getDb();
 const isEmptyDatabase = !isProduction && (await db.collection("users").countDocuments({}, { limit: 1 })) === 0;

 if (!isEmptyDatabase) {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }
 if (auth.payload.role !== "admin") {
 return NextResponse.json({ error: "Only admins can seed the database" }, { status: 403 });
 }
 }

 try {
 const now = Date.now();
 const h = 3600000;
 const m = 60000;

 // ── Clear all collections ───────────────────────────────
 await Promise.all([
 db.collection("users").deleteMany({}),
 db.collection("jobs").deleteMany({}),
 db.collection("bids").deleteMany({}),
 db.collection("transactions").deleteMany({}),
 db.collection("disputes").deleteMany({}),
 db.collection("notifications").deleteMany({}),
 db.collection("chat_rooms").deleteMany({}),
 db.collection("chat_messages").deleteMany({}),
 db.collection("refresh_tokens").deleteMany({}),
 db.collection("reviews").deleteMany({}),
 db.collection("milestones").deleteMany({}),
 db.collection("referrals").deleteMany({}),
 db.collection("teams").deleteMany({}),
 db.collection("api_keys").deleteMany({}),
 db.collection("assessments").deleteMany({}),
 db.collection("assessment_results").deleteMany({}),
 ]);

 // ── Users ───────────────────────────────────────────────
 const users = [
 {
 fullName: "Maya Sharma",
 email: "maya@startup.io",
 password: hashSync("password123", 10),
 role: "client",
 avatarInitial: "MS",
 geekScore: 0,
 skills: [],
 bio: "CTO building AI products. Previously at Google & Stripe. Shipped 3 products to 100K+ users.",
 isVerified: true,
 company: "NexaAI Labs",
 availability: "available",
 hourlyRateMin: 0,
 hourlyRateMax: 0,
 createdAt: new Date(now - 30 * 24 * h).toISOString(),
 },
 {
 fullName: "Derek Olsen",
 email: "derek@fintech.co",
 password: hashSync("password123", 10),
 role: "client",
 avatarInitial: "DO",
 geekScore: 0,
 skills: [],
 bio: "Founder at FinLeap — next-gen payment infrastructure. Series A funded.",
 isVerified: true,
 company: "FinLeap Inc.",
 availability: "available",
 hourlyRateMin: 0,
 hourlyRateMax: 0,
 createdAt: new Date(now - 25 * 24 * h).toISOString(),
 },
 {
 fullName: "Sarah Kim",
 email: "sarah@edtech.dev",
 password: hashSync("password123", 10),
 role: "client",
 avatarInitial: "SK",
 geekScore: 0,
 skills: [],
 bio: "Product lead at EduNext. Building the future of online learning platforms.",
 isVerified: true,
 company: "EduNext",
 availability: "available",
 hourlyRateMin: 0,
 hourlyRateMax: 0,
 createdAt: new Date(now - 20 * 24 * h).toISOString(),
 },
 {
 fullName: "Arjun Dev",
 email: "arjun@devmail.io",
 password: hashSync("password123", 10),
 role: "freelancer",
 avatarInitial: "AD",
 geekScore: 712,
 skills: [
 "React",
 "FastAPI",
 "RAG Systems",
 "Node.js",
 "Kubernetes",
 "TypeScript",
 "LLM Fine-tuning",
 ],
 bio: "Senior full-stack engineer focused on AI products. 8+ years building production systems at scale.",
 isVerified: true,
 availability: "available",
 hourlyRateMin: 60,
 hourlyRateMax: 150,
 company: "",
 githubUsername: "arjun-dev",
 createdAt: new Date(now - 45 * 24 * h).toISOString(),
 },
 {
 fullName: "Priya Nair",
 email: "priya@secmail.io",
 password: hashSync("password123", 10),
 role: "freelancer",
 avatarInitial: "PN",
 geekScore: 845,
 skills: [
 "Cloud Security",
 "Penetration Testing",
 "Kubernetes",
 "AWS",
 "Terraform",
 "CI/CD Pipelines",
 ],
 bio: "Cybersecurity architect. Former AWS security team. OSCP & CISSP certified. 200+ audits completed.",
 isVerified: true,
 availability: "available",
 hourlyRateMin: 80,
 hourlyRateMax: 200,
 company: "",
 createdAt: new Date(now - 40 * 24 * h).toISOString(),
 },
 {
 fullName: "Leo Chen",
 email: "leo@web3mail.io",
 password: hashSync("password123", 10),
 role: "freelancer",
 avatarInitial: "LC",
 geekScore: 456,
 skills: [
 "Smart Contracts",
 "DeFi Protocols",
 "React",
 "Node.js",
 "TypeScript",
 ],
 bio: "Web3 builder. Audited 20+ smart contracts on mainnet. Contributor to OpenZeppelin.",
 isVerified: false,
 availability: "part-time",
 hourlyRateMin: 50,
 hourlyRateMax: 120,
 company: "",
 createdAt: new Date(now - 35 * 24 * h).toISOString(),
 },
 {
 fullName: "Mira Patel",
 email: "mira@dataeng.io",
 password: hashSync("password123", 10),
 role: "freelancer",
 avatarInitial: "MP",
 geekScore: 623,
 skills: [
 "ETL Pipelines",
 "Spark",
 "Kafka",
 "Airflow",
 "AWS",
 "TypeScript",
 ],
 bio: "Data engineer specializing in real-time analytics. Former Netflix data platform team.",
 isVerified: true,
 availability: "available",
 hourlyRateMin: 70,
 hourlyRateMax: 160,
 company: "",
 createdAt: new Date(now - 28 * 24 * h).toISOString(),
 },
 {
 fullName: "Jake Wilson",
 email: "jake@mobiledev.co",
 password: hashSync("password123", 10),
 role: "freelancer",
 avatarInitial: "JW",
 geekScore: 389,
 skills: [
 "React Native",
 "Flutter",
 "iOS (Swift)",
 "Android (Kotlin)",
 "TypeScript",
 ],
 bio: "Mobile engineer with 6+ years. Shipped 12 apps with 5M+ downloads combined.",
 isVerified: true,
 availability: "available",
 hourlyRateMin: 55,
 hourlyRateMax: 130,
 company: "",
 createdAt: new Date(now - 22 * 24 * h).toISOString(),
 },
 {
 fullName: "Admin",
 email: "admin@geekbid.io",
 password: hashSync("admin123", 10),
 role: "admin",
 avatarInitial: "GA",
 geekScore: 0,
 skills: [],
 bio: "Platform operations & support.",
 isVerified: true,
 company: "GeekBid",
 availability: "available",
 hourlyRateMin: 0,
 hourlyRateMax: 0,
 createdAt: new Date(now - 60 * 24 * h).toISOString(),
 },
 ];

 const userResult = await db.collection("users").insertMany(users);
 const userIds = Object.values(userResult.insertedIds).map((id) =>
 id.toString()
 );
 // Index: 0=Maya, 1=Derek, 2=Sarah, 3=Arjun, 4=Priya, 5=Leo, 6=Mira, 7=Jake, 8=Admin

 // ── Jobs ────────────────────────────────────────────────
 const jobs = [
 {
 clientId: userIds[0],
 title: "Build AI chatbot for customer support",
 description:
 "Production-ready chatbot with RAG pipeline, analytics dashboard, and human handoff. Docker + K8s deployment, guardrails, conversation memory with vector DB. React widget embeddable via script tag.",
 skillsRequired: ["RAG Systems", "FastAPI", "React", "LLM Fine-tuning"],
 startingPrice: 800,
 minimumPrice: 350,
 decayRatePerHour: 15,
 estimatedHours: 35,
 postedAt: new Date(now - 8 * h).toISOString(),
 deadlineAt: new Date(now + 36 * h).toISOString(),
 status: "open",
 category: "ai_ml",
 featured: true,
 featuredAt: new Date(now - 7 * h).toISOString(),
 },
 {
 clientId: userIds[0],
 title: "Kubernetes hardening + CI/CD audit",
 description:
 "Audit EKS setup, identify security risks, harden CI/CD pipelines. Severity-rated report plus immediate PRs. Pod security, network policies, RBAC review.",
 skillsRequired: [
 "Kubernetes",
 "Cloud Security",
 "CI/CD Pipelines",
 "AWS",
 ],
 startingPrice: 1200,
 minimumPrice: 600,
 decayRatePerHour: 20,
 estimatedHours: 20,
 postedAt: new Date(now - 3 * h).toISOString(),
 deadlineAt: new Date(now + 48 * h).toISOString(),
 status: "open",
 category: "security",
 featured: false,
 },
 {
 clientId: userIds[0],
 title: "React Native performance optimization",
 description:
 "Improve app startup and list rendering. Profiling report, concrete fixes, benchmark before/after. FlatList virtualization, image caching, Hermes migration.",
 skillsRequired: ["React Native", "TypeScript"],
 startingPrice: 650,
 minimumPrice: 300,
 decayRatePerHour: 12,
 estimatedHours: 18,
 postedAt: new Date(now - 28 * h).toISOString(),
 deadlineAt: new Date(now + 10 * h).toISOString(),
 status: "accepted",
 acceptedBy: userIds[3],
 acceptedAt: new Date(now - 16 * h).toISOString(),
 finalPrice: 458,
 category: "mobile",
 featured: false,
 },
 {
 clientId: userIds[1],
 title: "DeFi yield aggregator smart contract",
 description:
 "Solidity smart contract for yield aggregator across Aave, Compound and Curve. Full Hardhat test suite, gas optimization, formal verification.",
 skillsRequired: ["Smart Contracts", "DeFi Protocols", "TypeScript"],
 startingPrice: 2500,
 minimumPrice: 1200,
 decayRatePerHour: 35,
 estimatedHours: 50,
 postedAt: new Date(now - 5 * h).toISOString(),
 deadlineAt: new Date(now + 72 * h).toISOString(),
 status: "open",
 category: "blockchain",
 featured: true,
 featuredAt: new Date(now - 4 * h).toISOString(),
 },
 {
 clientId: userIds[1],
 title: "Real-time analytics dashboard with Kafka",
 description:
 "Real-time analytics consuming Kafka events. Next.js frontend with SSE. Click-stream analysis, funnel visualization, cohort retention charts.",
 skillsRequired: ["Kafka", "Next.js", "Node.js", "TypeScript"],
 startingPrice: 1800,
 minimumPrice: 800,
 decayRatePerHour: 25,
 estimatedHours: 40,
 postedAt: new Date(now - 12 * h).toISOString(),
 deadlineAt: new Date(now + 60 * h).toISOString(),
 status: "open",
 category: "data_eng",
 featured: false,
 },
 {
 clientId: userIds[0],
 title: "Terraform IaC for multi-region AWS",
 description:
 "Terraform modules for multi-region AWS. VPC, EKS, RDS replicas, ElastiCache, S3, CloudFront, Route53 failover. Terragrunt wrapper. Full documentation.",
 skillsRequired: ["Terraform", "AWS", "Kubernetes", "CI/CD Pipelines"],
 startingPrice: 1500,
 minimumPrice: 700,
 decayRatePerHour: 18,
 estimatedHours: 30,
 postedAt: new Date(now - 1 * h).toISOString(),
 deadlineAt: new Date(now + 96 * h).toISOString(),
 status: "open",
 category: "devops",
 featured: false,
 },
 {
 clientId: userIds[2],
 title: "ML-powered recommendation engine",
 description:
 "Build a collaborative filtering + content-based recommendation engine for e-learning platform. Python backend, A/B testing framework, real-time serving via FastAPI.",
 skillsRequired: ["NLP", "FastAPI", "MLOps", "TypeScript"],
 startingPrice: 2200,
 minimumPrice: 1000,
 decayRatePerHour: 30,
 estimatedHours: 45,
 postedAt: new Date(now - 6 * h).toISOString(),
 deadlineAt: new Date(now + 84 * h).toISOString(),
 status: "open",
 category: "ai_ml",
 featured: false,
 },
 {
 clientId: userIds[2],
 title: "Flutter cross-platform mobile app",
 description:
 "Build a cross-platform mobile app for the EduNext learning platform. Student dashboard, video player, quiz engine, push notifications, offline mode.",
 skillsRequired: [
 "Flutter",
 "iOS (Swift)",
 "Android (Kotlin)",
 "TypeScript",
 ],
 startingPrice: 3000,
 minimumPrice: 1500,
 decayRatePerHour: 40,
 estimatedHours: 60,
 postedAt: new Date(now - 2 * h).toISOString(),
 deadlineAt: new Date(now + 120 * h).toISOString(),
 status: "open",
 category: "mobile",
 featured: false,
 },
 {
 clientId: userIds[1],
 title: "GraphQL API gateway migration",
 description:
 "Migrate existing REST microservices to a unified GraphQL gateway. Schema stitching, DataLoader patterns, rate limiting, auth integration, monitoring.",
 skillsRequired: ["GraphQL", "Node.js", "TypeScript", "Kubernetes"],
 startingPrice: 1600,
 minimumPrice: 750,
 decayRatePerHour: 22,
 estimatedHours: 25,
 postedAt: new Date(now - 18 * h).toISOString(),
 deadlineAt: new Date(now + 54 * h).toISOString(),
 status: "open",
 category: "web_dev",
 featured: false,
 },
 {
 clientId: userIds[0],
 title: "Penetration testing & security audit",
 description:
 "Comprehensive penetration test of web app + API. OWASP Top 10 coverage, automated scanning + manual exploitation. Executive report with remediation plan.",
 skillsRequired: [
 "Penetration Testing",
 "Web App Security",
 "Cloud Security",
 ],
 startingPrice: 900,
 minimumPrice: 400,
 decayRatePerHour: 15,
 estimatedHours: 15,
 postedAt: new Date(now - 10 * h).toISOString(),
 deadlineAt: new Date(now + 42 * h).toISOString(),
 status: "open",
 category: "security",
 featured: false,
 },
 ];

 // Add adaptive pricing fields to all seed jobs
 const jobsWithPricing = jobs.map((job, i) => ({
 ...job,
 // Mix of pricing modes: jobs at index 2 (accepted), 8 are fixed; rest adaptive
 pricingMode: i === 2 || i === 8 ? ("fixed" as const) : ("adaptive" as const),
 bidCount: 0,
 uniqueBidderCount: 0,
 lastBidAt: null as string | null,
 lowestCounterBid: null as number | null,
 priceHistory: [
 { price: job.startingPrice, at: job.postedAt, event: "posted" },
 ],
 }));

 const jobResult = await db.collection("jobs").insertMany(jobsWithPricing);
 const jobIds = Object.values(jobResult.insertedIds).map((id) =>
 id.toString()
 );

 // ── Bids ────────────────────────────────────────────────
 const bids = [
 {
 jobId: jobIds[0],
 freelancerId: userIds[3],
 bidType: "counter",
 bidPrice: 520,
 message:
 "Can start in 2 hours. Extensive RAG experience with LangChain + Pinecone. Built 3 production chatbots.",
 createdAt: new Date(now - 60 * m).toISOString(),
 },
 {
 jobId: jobIds[0],
 freelancerId: userIds[5],
 bidType: "counter",
 bidPrice: 580,
 message: "Full-stack dev with AI/ML experience. Can deliver in 5 days.",
 createdAt: new Date(now - 45 * m).toISOString(),
 },
 {
 jobId: jobIds[2],
 freelancerId: userIds[3],
 bidType: "accept",
 bidPrice: 458,
 createdAt: new Date(now - 16 * h).toISOString(),
 },
 {
 jobId: jobIds[1],
 freelancerId: userIds[4],
 bidType: "counter",
 bidPrice: 950,
 message:
 "I can complete the security audit within 2 weeks. Will cover OWASP Top 10 and K8s-specific threats.",
 createdAt: new Date(now - 2 * h).toISOString(),
 },
 {
 jobId: jobIds[3],
 freelancerId: userIds[5],
 bidType: "counter",
 bidPrice: 1800,
 message:
 "I'll deliver a production-ready yield aggregator with full test coverage and gas optimization.",
 createdAt: new Date(now - 4 * h).toISOString(),
 },
 {
 jobId: jobIds[4],
 freelancerId: userIds[6],
 bidType: "counter",
 bidPrice: 1200,
 message:
 "Can build the real-time pipeline with Kafka Streams. Will include monitoring dashboards.",
 createdAt: new Date(now - 10 * h).toISOString(),
 },
 {
 jobId: jobIds[6],
 freelancerId: userIds[3],
 bidType: "counter",
 bidPrice: 1600,
 message:
 "Built recommendation systems at scale. Experience with implicit feedback models.",
 createdAt: new Date(now - 3 * h).toISOString(),
 },
 {
 jobId: jobIds[7],
 freelancerId: userIds[7],
 bidType: "counter",
 bidPrice: 2200,
 message:
 "Shipped 12 mobile apps. Expert in Flutter with 5 years experience.",
 createdAt: new Date(now - 1 * h).toISOString(),
 },
 {
 jobId: jobIds[8],
 freelancerId: userIds[3],
 bidType: "counter",
 bidPrice: 1100,
 message:
 "Migrated 3 REST APIs to GraphQL at my previous company. Strong with schema design.",
 createdAt: new Date(now - 15 * h).toISOString(),
 },
 {
 jobId: jobIds[9],
 freelancerId: userIds[4],
 bidType: "counter",
 bidPrice: 650,
 message:
 "OSCP + CISSP certified. Completed 200+ penetration tests for Fortune 500 companies.",
 createdAt: new Date(now - 8 * h).toISOString(),
 },
 ];

 await db.collection("bids").insertMany(bids);

 // ── Update job demand signals from seeded bids ───────────
 const bidsByJob = new Map<string, typeof bids>();
 for (const bid of bids) {
 const arr = bidsByJob.get(bid.jobId) ?? [];
 arr.push(bid);
 bidsByJob.set(bid.jobId, arr);
 }
 for (const [jid, jbids] of bidsByJob) {
 const uniqueBidders = new Set(jbids.map((b) => b.freelancerId));
 const counterBids = jbids.filter((b) => b.bidType === "counter");
 const lowestCounter = counterBids.length
 ? Math.min(...counterBids.map((b) => b.bidPrice))
 : null;
 const lastBid = jbids.reduce((latest, b) =>
 b.createdAt > latest.createdAt ? b : latest
 );
 await db.collection("jobs").updateOne(
 { _id: jobResult.insertedIds[jobIds.indexOf(jid)] },
 {
 $set: {
 bidCount: jbids.length,
 uniqueBidderCount: uniqueBidders.size,
 lastBidAt: lastBid.createdAt,
 lowestCounterBid: lowestCounter,
 },
 $push: {
 priceHistory: {
 $each: counterBids.map((b) => ({
 price: b.bidPrice,
 at: b.createdAt,
 event: "counter_bid",
 })),
 },
 } as any,
 }
 );
 }

 // ── Transactions ────────────────────────────────────────
 const transactions = [
 {
 jobId: jobIds[2],
 clientId: userIds[0],
 freelancerId: userIds[3],
 grossAmount: 458,
 platformFee: 45.8,
 netAmount: 412.2,
 escrowStatus: "released",
 createdAt: new Date(now - 16 * h).toISOString(),
 releasedAt: new Date(now - 4 * h).toISOString(),
 },
 ];

 const txResult = await db
 .collection("transactions")
 .insertMany(transactions);
 const txIds = Object.values(txResult.insertedIds).map((id) =>
 id.toString()
 );

 // ── Notifications ───────────────────────────────────────
 const notifications = [
 {
 userId: userIds[3],
 type: "price_drop",
 title: "Price Alert",
 body: '"AI chatbot" dropped to $680 — your target range!',
 createdAt: new Date(now - 30 * m).toISOString(),
 isRead: false,
 jobId: jobIds[0],
 },
 {
 userId: userIds[0],
 type: "counter_bid",
 title: "Counter-bid received",
 body: "Arjun Dev sent $520 counter-bid for AI chatbot project.",
 createdAt: new Date(now - 55 * m).toISOString(),
 isRead: false,
 jobId: jobIds[0],
 },
 {
 userId: userIds[3],
 type: "payment",
 title: "Escrow Released",
 body: "$412.20 released for React Native optimization.",
 createdAt: new Date(now - 4 * h).toISOString(),
 isRead: true,
 jobId: jobIds[2],
 },
 {
 userId: userIds[3],
 type: "job_match",
 title: "New Job Match",
 body: '"K8s hardening" matches 3 of your skills.',
 createdAt: new Date(now - 3 * h).toISOString(),
 isRead: false,
 jobId: jobIds[1],
 },
 {
 userId: userIds[0],
 type: "counter_bid",
 title: "Counter-bid received",
 body: "Leo Chen sent $580 counter-bid for AI chatbot project.",
 createdAt: new Date(now - 40 * m).toISOString(),
 isRead: false,
 jobId: jobIds[0],
 },
 {
 userId: userIds[4],
 type: "job_match",
 title: "New Job Match",
 body: '"Penetration testing & security audit" matches your skills.',
 createdAt: new Date(now - 9 * h).toISOString(),
 isRead: false,
 jobId: jobIds[9],
 },
 {
 userId: userIds[1],
 type: "counter_bid",
 title: "Counter-bid received",
 body: "Leo Chen sent $1800 for DeFi yield aggregator.",
 createdAt: new Date(now - 3.5 * h).toISOString(),
 isRead: false,
 jobId: jobIds[3],
 },
 {
 userId: userIds[6],
 type: "job_match",
 title: "New Job Match",
 body: '"Real-time analytics dashboard" matches your Kafka expertise.',
 createdAt: new Date(now - 11 * h).toISOString(),
 isRead: true,
 jobId: jobIds[4],
 },
 {
 userId: userIds[7],
 type: "job_match",
 title: "New Job Match",
 body: '"Flutter cross-platform mobile app" is a perfect match!',
 createdAt: new Date(now - 1.5 * h).toISOString(),
 isRead: false,
 jobId: jobIds[7],
 },
 {
 userId: userIds[2],
 type: "counter_bid",
 title: "Counter-bid received",
 body: "Arjun Dev sent $1600 for ML recommendation engine.",
 createdAt: new Date(now - 2.5 * h).toISOString(),
 isRead: false,
 jobId: jobIds[6],
 },
 ];

 await db.collection("notifications").insertMany(notifications);

 // ── Chat Rooms ──────────────────────────────────────────
 const chatRooms = [
 {
 jobId: jobIds[2],
 participantIds: [userIds[0], userIds[3]],
 updatedAt: new Date(now - 20 * m).toISOString(),
 createdAt: new Date(now - 16 * h).toISOString(),
 },
 ];

 const roomResult = await db
 .collection("chat_rooms")
 .insertMany(chatRooms);
 const roomIds = Object.values(roomResult.insertedIds).map((id) =>
 id.toString()
 );

 // ── Chat Messages ───────────────────────────────────────
 const chatMessages = [
 {
 roomId: roomIds[0],
 senderId: userIds[0],
 text: "Hey Arjun! Can you start with the startup profiling first?",
 createdAt: new Date(now - 15 * h).toISOString(),
 },
 {
 roomId: roomIds[0],
 senderId: userIds[3],
 text: "Absolutely! Running React DevTools profiler + Flipper now.",
 createdAt: new Date(now - 14 * h).toISOString(),
 },
 {
 roomId: roomIds[0],
 senderId: userIds[3],
 text: "Main bottleneck: FlatList re-renders on every state change. Images aren't cached. Hermes not enabled.",
 createdAt: new Date(now - 8 * h).toISOString(),
 },
 {
 roomId: roomIds[0],
 senderId: userIds[0],
 text: "Great findings! Share the startup profiling screenshots too.",
 createdAt: new Date(now - 60 * m).toISOString(),
 },
 {
 roomId: roomIds[0],
 senderId: userIds[3],
 text: "Done. Before/after metrics uploaded. Startup 3.2s → 1.4s. FlatList now 60fps. Memory usage down 40%.",
 createdAt: new Date(now - 20 * m).toISOString(),
 },
 ];

 await db.collection("chat_messages").insertMany(chatMessages);

 // ── Reviews ─────────────────────────────────────────────
 const reviews = [
 {
 jobId: jobIds[2],
 reviewerId: userIds[0],
 revieweeId: userIds[3],
 rating: 5,
 comment: "Exceptional work on the React Native optimization. Arjun reduced startup time by 60% and memory usage by 40%. Highly recommended!",
 reviewerRole: "client",
 createdAt: new Date(now - 3 * h).toISOString(),
 },
 {
 jobId: jobIds[2],
 reviewerId: userIds[3],
 revieweeId: userIds[0],
 rating: 5,
 comment: "Great client to work with. Clear requirements, fast feedback, and prompt escrow release. Would love to work together again.",
 reviewerRole: "freelancer",
 createdAt: new Date(now - 2.5 * h).toISOString(),
 },
 ];

 await db.collection("reviews").insertMany(reviews);

 // Set referral codes on users
 const refCodes = ["MAYA2026", "DEREK26", "SARAH26", "ARJUN26", "PRIYA26", "LEOCHEN", "MIRAPAT", "JAKEWIL", "ADMIN26"];
 await Promise.all(
 refCodes.map((code, i) =>
 db.collection("users").updateOne(
 { _id: userResult.insertedIds[i] },
 { $set: { referralCode: code, referralCredits: 0, plan: "free", planLimits: { jobsPostedThisMonth: 0, bidsPlacedThisMonth: 0, monthResetAt: new Date(now + 30 * 24 * h).toISOString() } } }
 )
 )
 );

 // Update user average ratings
 await db.collection("users").updateOne(
 { _id: userResult.insertedIds[3] },
 { $set: { averageRating: 5.0, totalReviews: 1 } }
 );
 await db.collection("users").updateOne(
 { _id: userResult.insertedIds[0] },
 { $set: { averageRating: 5.0, totalReviews: 1 } }
 );

 // ── Milestones ──────────────────────────────────────────
 const milestones = [
 {
 jobId: jobIds[2],
 title: "Startup profiling & analysis",
 description: "Profile app startup, identify bottlenecks, document findings",
 amount: 150,
 order: 1,
 status: "approved",
 submittedAt: new Date(now - 10 * h).toISOString(),
 approvedAt: new Date(now - 8 * h).toISOString(),
 createdAt: new Date(now - 16 * h).toISOString(),
 },
 {
 jobId: jobIds[2],
 title: "FlatList optimization & image caching",
 description: "Fix FlatList re-renders, implement image caching, enable Hermes",
 amount: 200,
 order: 2,
 status: "approved",
 submittedAt: new Date(now - 6 * h).toISOString(),
 approvedAt: new Date(now - 4 * h).toISOString(),
 createdAt: new Date(now - 16 * h).toISOString(),
 },
 {
 jobId: jobIds[2],
 title: "Final benchmark & documentation",
 description: "Before/after metrics, documentation of changes",
 amount: 108,
 order: 3,
 status: "approved",
 submittedAt: new Date(now - 3 * h).toISOString(),
 approvedAt: new Date(now - 2 * h).toISOString(),
 createdAt: new Date(now - 16 * h).toISOString(),
 },
 ];

 await db.collection("milestones").insertMany(milestones);

 // ── Assessments ─────────────────────────────────────────
 const assessments = [
 {
 skill: "React",
 timeLimit: 900,
 passingScore: 70,
 questions: [
 { question: "What hook is used to manage state in functional components?", options: ["useEffect", "useState", "useContext", "useReducer"], correctIndex: 1 },
 { question: "What does the useEffect hook do?", options: ["Manages state", "Handles side effects", "Creates context", "Memoizes values"], correctIndex: 1 },
 { question: "What is the virtual DOM?", options: ["A direct copy of the real DOM", "A lightweight JS representation of the DOM", "A browser API", "A CSS framework"], correctIndex: 1 },
 { question: "How do you pass data from parent to child?", options: ["Context", "Props", "State", "Refs"], correctIndex: 1 },
 { question: "What is JSX?", options: ["A database", "A syntax extension for JS", "A CSS preprocessor", "A build tool"], correctIndex: 1 },
 { question: "Which method is used to render a React element?", options: ["React.render", "ReactDOM.render", "React.create", "React.mount"], correctIndex: 1 },
 { question: "What is the purpose of keys in React lists?", options: ["Styling", "Unique identification of elements", "Event handling", "State management"], correctIndex: 1 },
 { question: "What does React.memo do?", options: ["Creates memos", "Memoizes component to prevent re-renders", "Manages memory", "Creates refs"], correctIndex: 1 },
 { question: "What is a controlled component?", options: ["Component with no state", "Component where form data is handled by React state", "Component with refs", "Server component"], correctIndex: 1 },
 { question: "What is the Context API used for?", options: ["Routing", "Sharing state without prop drilling", "HTTP requests", "Animation"], correctIndex: 1 },
 ],
 },
 {
 skill: "Node.js",
 timeLimit: 900,
 passingScore: 70,
 questions: [
 { question: "What is Node.js built on?", options: ["SpiderMonkey", "V8 engine", "Chakra", "Rhino"], correctIndex: 1 },
 { question: "What is the event loop?", options: ["A for loop", "A mechanism to handle async operations", "A UI framework", "A database query"], correctIndex: 1 },
 { question: "Which module is used for file operations?", options: ["http", "fs", "path", "url"], correctIndex: 1 },
 { question: "What does npm stand for?", options: ["Node Package Manager", "New Package Manager", "Node Project Manager", "Network Package Manager"], correctIndex: 0 },
 { question: "How do you import a module in Node.js?", options: ["import()", "require()", "include()", "load()"], correctIndex: 1 },
 { question: "What is middleware in Express?", options: ["A database", "Functions that access req/res objects", "A template engine", "A CSS framework"], correctIndex: 1 },
 { question: "What is the purpose of package.json?", options: ["CSS styling", "Project metadata and dependencies", "Database config", "Server config"], correctIndex: 1 },
 { question: "Which method starts an Express server?", options: ["app.start()", "app.listen()", "app.run()", "app.begin()"], correctIndex: 1 },
 { question: "What are streams in Node.js?", options: ["CSS animations", "Objects for reading/writing data continuously", "Database connections", "HTTP headers"], correctIndex: 1 },
 { question: "What is the purpose of process.env?", options: ["CPU info", "Environment variables", "Memory management", "File paths"], correctIndex: 1 },
 ],
 },
 {
 skill: "TypeScript",
 timeLimit: 900,
 passingScore: 70,
 questions: [
 { question: "What is TypeScript?", options: ["A database", "A typed superset of JavaScript", "A CSS framework", "A build tool"], correctIndex: 1 },
 { question: "What keyword declares a variable type?", options: ["var", "let", "type", "interface"], correctIndex: 2 },
 { question: "What is an interface in TypeScript?", options: ["A class", "A contract for object shape", "A function", "A module"], correctIndex: 1 },
 { question: "What does the 'any' type do?", options: ["Throws error", "Opts out of type checking", "Creates array", "Defines number"], correctIndex: 1 },
 { question: "How do you make a property optional?", options: ["Add !", "Add ?", "Add *", "Add &"], correctIndex: 1 },
 { question: "What are generics?", options: ["Generic functions", "Reusable type-safe components", "Global variables", "Default exports"], correctIndex: 1 },
 { question: "What is a union type?", options: ["A + B", "A | B", "A & B", "A * B"], correctIndex: 1 },
 { question: "What does 'readonly' do?", options: ["Makes mutable", "Prevents reassignment", "Creates copy", "Deletes property"], correctIndex: 1 },
 { question: "What is type narrowing?", options: ["Making types smaller", "Refining types within conditional blocks", "Removing types", "Type casting"], correctIndex: 1 },
 { question: "What file configures TypeScript?", options: ["package.json", "tsconfig.json", "config.ts", "types.json"], correctIndex: 1 },
 ],
 },
 ];

 await db.collection("assessments").insertMany(assessments);

 // ── Disputes ────────────────────────────────────────────
 // (No open disputes initially — will be created through app interactions)

 // ── Create Indexes ──────────────────────────────────────
 await Promise.all([
 db.collection("users").createIndex({ email: 1 }, { unique: true }),
 db.collection("users").createIndex({ googleId: 1 }, { sparse: true }),
 db.collection("users").createIndex({ role: 1 }),
 db.collection("jobs").createIndex({ status: 1, postedAt: -1 }),
 db.collection("jobs").createIndex({ category: 1, status: 1, postedAt: -1 }),
 db.collection("jobs").createIndex({ clientId: 1 }),
 db.collection("jobs").createIndex({ acceptedBy: 1 }),
 db.collection("bids").createIndex({ jobId: 1 }),
 db.collection("bids").createIndex({ freelancerId: 1 }),
 db.collection("transactions").createIndex({ clientId: 1 }),
 db.collection("transactions").createIndex({ freelancerId: 1 }),
 db.collection("notifications").createIndex({
 userId: 1,
 createdAt: -1,
 }),
 db.collection("chat_rooms").createIndex({ participantIds: 1 }),
 db.collection("chat_rooms").createIndex({ jobId: 1 }),
 db.collection("chat_messages").createIndex({ roomId: 1, createdAt: 1 }),
 db.collection("disputes").createIndex({ transactionId: 1 }),
 db
 .collection("refresh_tokens")
 .createIndex({ userId: 1 }, { unique: true }),
 db
 .collection("refresh_tokens")
 .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
 db.collection("reviews").createIndex({ jobId: 1, reviewerId: 1 }, { unique: true }),
 db.collection("reviews").createIndex({ revieweeId: 1, createdAt: -1 }),
 db.collection("milestones").createIndex({ jobId: 1, order: 1 }),
 db.collection("referrals").createIndex({ referrerUserId: 1 }),
 db.collection("referrals").createIndex({ referralCode: 1 }),
 db.collection("assessments").createIndex({ skill: 1 }),
 db.collection("assessment_results").createIndex({ userId: 1, assessmentId: 1 }),
 db.collection("assessment_results").createIndex({ userId: 1, skill: 1 }),
 db.collection("teams").createIndex({ ownerId: 1 }),
 db.collection("teams").createIndex({ memberIds: 1 }),
 db.collection("api_keys").createIndex({ userId: 1 }),
 db.collection("api_keys").createIndex({ keyHash: 1 }),
 db.collection("invites").createIndex({ clientId: 1, createdAt: -1 }),
 db.collection("invites").createIndex({ freelancerId: 1, status: 1 }),
 db.collection("invites").createIndex({ clientId: 1, freelancerId: 1, jobId: 1 }, { unique: true }),
 ]);

 return NextResponse.json({
 ok: true,
 seeded: {
 users: users.length,
 jobs: jobs.length,
 bids: bids.length,
 transactions: transactions.length,
 notifications: notifications.length,
 chatRooms: chatRooms.length,
 chatMessages: chatMessages.length,
 reviews: reviews.length,
 milestones: milestones.length,
 assessments: assessments.length,
 },
 });

 } catch (err) {
 console.error("[Seed Error]", err);
 return NextResponse.json(
 { error: "Failed to seed database", details: String(err) },
 { status: 500 }
 );
 }
}
