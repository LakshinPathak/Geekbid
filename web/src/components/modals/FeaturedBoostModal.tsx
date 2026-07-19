"use client";
import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import { Sparkles, Loader2, Lock, X } from "lucide-react";
import { FEATURED_BOOST_PRICE_INR, FEATURED_BOOST_CURRENCY } from "@/lib/plans";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: Record<string, string>) => void) => void;
    };
  }
}

type Props = {
  jobId: string;
  jobTitle: string;
  onClose: () => void;
  onFeatured: () => void;
};

// Pay-per-boost checkout — shown when a client tries to feature a job after
// their plan's included monthly boosts are exhausted. Reuses the existing
// one-off Razorpay payment flow (api/payments/route.ts) rather than new
// payment infra, tagging the transaction so /api/jobs/feature can atomically
// claim it for exactly this job.
export default function FeaturedBoostModal({ jobId, jobTitle, onClose, onFeatured }: Props) {
  const { currentUser, toggleFeatured, getValidToken } = useApp();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.Razorpay) { setScriptLoaded(true); return; }

    if (!document.getElementById("razorpay-script")) {
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onerror = () => console.warn("Razorpay script failed to load (mock mode will work)");
      document.body.appendChild(script);
    }

    // Poll for window.Razorpay instead of relying on this tag's own `onload`
    // (only one handler can ever attach to a given <script>, so this modal
    // can't listen to it if payments/page.tsx — or a second instance of
    // this modal — was the one that actually added the tag) — the old
    // code's `else if (window.Razorpay)` branch only ran once,
    // synchronously, so a tag that already existed but hadn't finished
    // loading yet left scriptLoaded stuck false forever, and handlePay
    // silently fell back to mock-verifying what should have been a real
    // order.
    const interval = setInterval(() => {
      if (window.Razorpay) {
        setScriptLoaded(true);
        clearInterval(interval);
      }
    }, 100);
    const timeout = setTimeout(() => clearInterval(interval), 10000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, []);

  const finishBoost = useCallback(async (transactionId: string) => {
    const r = await toggleFeatured(jobId, true, transactionId);
    if (r.ok) {
      toast.success("Job featured!", { description: "Your one-off boost is now live." });
      onFeatured();
    } else {
      toast.error("Feature failed", { description: r.message });
    }
    setProcessing(false);
  }, [jobId, toggleFeatured, onFeatured]);

  const handlePay = useCallback(async () => {
    setProcessing(true);
    try {
      const token = await getValidToken();
      if (!token) {
        toast.error("Please log in again");
        setProcessing(false);
        return;
      }

      const orderRes = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount: FEATURED_BOOST_PRICE_INR,
          currency: FEATURED_BOOST_CURRENCY,
          jobId,
          description: `featured_boost:${jobId}`,
        }),
      });
      const orderData = await orderRes.json();
      if (orderData.error) {
        toast.error("Payment failed", { description: orderData.error });
        setProcessing(false);
        return;
      }

      const { order, key, mock } = orderData;

      if (mock || !scriptLoaded || !window.Razorpay) {
        const verifyRes = await fetch("/api/payments", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            razorpay_order_id: order.id,
            razorpay_payment_id: `pay_mock_${Date.now()}`,
            razorpay_signature: "mock_signature",
            amount: FEATURED_BOOST_PRICE_INR,
            currency: FEATURED_BOOST_CURRENCY,
            jobId,
            description: `featured_boost:${jobId}`,
          }),
        });
        const verifyData = await verifyRes.json();
        if (verifyData.verified) await finishBoost(verifyData.transactionId);
        else {
          toast.error("Payment verification failed", { description: verifyData.error });
          setProcessing(false);
        }
        return;
      }

      const options = {
        key,
        amount: order.amount,
        currency: order.currency,
        name: "GeekBid",
        description: `Featured boost: ${jobTitle}`,
        order_id: order.id,
        prefill: { name: currentUser?.fullName || "", email: currentUser?.email || "" },
        theme: { color: "#4b3f8f" },
        handler: async (response: Record<string, string>) => {
          const verifyRes = await fetch("/api/payments", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: FEATURED_BOOST_PRICE_INR,
              currency: FEATURED_BOOST_CURRENCY,
              jobId,
              description: `featured_boost:${jobId}`,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.verified) await finishBoost(verifyData.transactionId);
          else {
            toast.error("Payment verification failed", { description: verifyData.error });
            setProcessing(false);
          }
        },
        modal: { ondismiss: () => setProcessing(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Boost payment error:", err);
      toast.error("An unexpected error occurred");
      setProcessing(false);
    }
  }, [getValidToken, scriptLoaded, currentUser, jobId, jobTitle, finishBoost]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center victory-overlay" onClick={onClose}>
      <div className="glass-panel-lg p-8 max-w-sm w-full mx-4 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-heading text-lg font-bold text-[#3d3a45] flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#4b3f8f]" /> Feature this job
          </h3>
          <button onClick={onClose} className="text-[#6f6a7d] hover:text-[#3d3a45] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-[#6f6a7d] mb-1">
          Your plan&apos;s included featured boosts are used up this month.
        </p>
        <p className="text-lg font-heading font-bold text-[#4b3f8f] mt-3 mb-6">
          ₹{FEATURED_BOOST_PRICE_INR} one-off boost
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1 h-11 rounded-2xl text-sm">
            Cancel
          </button>
          <button
            onClick={handlePay}
            disabled={processing}
            className="btn-primary flex-1 h-11 rounded-2xl text-sm payment-ready disabled:opacity-50"
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {processing ? "Processing..." : "Pay & Feature"}
          </button>
        </div>
      </div>
    </div>
  );
}
