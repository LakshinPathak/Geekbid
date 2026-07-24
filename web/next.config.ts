import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    // Client-side third-party origins this app actually loads, so CSP can be
    // locked down to 'self' plus exactly these instead of left wide open:
    //  - checkout.razorpay.com: Razorpay Checkout script (payments/page.tsx,
    //    FeaturedBoostModal, useSubscriptionCheckout) + the checkout iframe
    //    it opens, which itself talks to api.razorpay.com.
    //  - upload-widget.cloudinary.com: the next-cloudinary CldUploadWidget
    //    script (AvatarUploader), which uploads directly to
    //    api.cloudinary.com using the signature from /api/upload/sign.
    //  - res.cloudinary.com: already the only allowed remote image host in
    //    `images.remotePatterns` above.
    // Gemini (src/lib/ai.ts) is called server-side only, never from the
    // browser, so it needs no connect-src entry here.
    const isDev = process.env.NODE_ENV !== "production";
    const csp = [
      "default-src 'self'",
      // Next.js/React need 'unsafe-inline' here without a nonce-based setup
      // (no middleware currently mints per-request nonces); 'unsafe-eval' is
      // only needed for the dev-mode webpack/HMR runtime.
      // cdn.razorpay.com: Razorpay Checkout's own risk-detection sub-script,
      // loaded at runtime by checkout.razorpay.com/v1/checkout.js.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com https://cdn.razorpay.com https://upload-widget.cloudinary.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://res.cloudinary.com https://*.razorpay.com",
      "font-src 'self' data:",
      `connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://api.cloudinary.com${isDev ? " ws://localhost:* http://localhost:*" : ""}`,
      "frame-src https://api.razorpay.com https://checkout.razorpay.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
