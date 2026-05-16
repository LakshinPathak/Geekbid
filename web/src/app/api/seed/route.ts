import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { hashSync } from "bcryptjs";

/**
 * POST /api/seed
 *
 * Populates all MongoDB collections with production-quality test data.
 * Clears existing data first. Creates proper indexes.
 */
export async function POST() {
  try {
    const db = await getDb();
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
      },
    ];

    const jobResult = await db.collection("jobs").insertMany(jobs);
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
          "OSCP certified with 5+ years K8s security audits. Can start immediately.",
        createdAt: new Date(now - 2 * h).toISOString(),
      },
      {
        jobId: jobIds[3],
        freelancerId: userIds[5],
        bidType: "counter",
        bidPrice: 1800,
        message:
          "Audited 20+ smart contracts on mainnet. Contributor to OpenZeppelin.",
        createdAt: new Date(now - 4 * h).toISOString(),
      },
      {
        jobId: jobIds[4],
        freelancerId: userIds[6],
        bidType: "counter",
        bidPrice: 1200,
        message:
          "Former Netflix data platform. Expert in Kafka Streams and real-time pipelines.",
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

    // ── Disputes ────────────────────────────────────────────
    // (No open disputes initially — will be created through app interactions)

    // ── Create Indexes ──────────────────────────────────────
    await Promise.all([
      db.collection("users").createIndex({ email: 1 }, { unique: true }),
      db.collection("users").createIndex({ googleId: 1 }, { sparse: true }),
      db.collection("users").createIndex({ role: 1 }),
      db.collection("jobs").createIndex({ status: 1, postedAt: -1 }),
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
      },
      credentials: {
        clients: [
          { email: "maya@startup.io", password: "password123" },
          { email: "derek@fintech.co", password: "password123" },
          { email: "sarah@edtech.dev", password: "password123" },
        ],
        freelancers: [
          { email: "arjun@devmail.io", password: "password123" },
          { email: "priya@secmail.io", password: "password123" },
          { email: "leo@web3mail.io", password: "password123" },
          { email: "mira@dataeng.io", password: "password123" },
          { email: "jake@mobiledev.co", password: "password123" },
        ],
        admin: { email: "admin@geekbid.io", password: "admin123" },
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
