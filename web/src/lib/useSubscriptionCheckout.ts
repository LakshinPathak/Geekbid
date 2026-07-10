"use client";
import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/lib/store";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: Record<string, string>) => void) => void;
    };
  }
}

export type SubscriptionInfo = {
  plan: 'plus' | 'premium';
  status: string;
  cancelAtPeriodEnd: boolean;
} | null;

// Shared subscription-checkout logic for /pricing and the feed-page
// subscription widget — one place for the Razorpay script loading, checkout
// flow, and signature-verified success handling, so both call sites can't
// drift out of sync with each other (or re-introduce the stale-token bug).
export function useSubscriptionCheckout() {
  const { currentUser, getValidToken, refreshCurrentUser } = useApp();
  const [subscription, setSubscription] = useState<SubscriptionInfo>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !document.getElementById("razorpay-script")) {
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => setScriptLoaded(true);
      script.onerror = () => console.warn("Razorpay script failed to load (mock mode will work)");
      document.body.appendChild(script);
    } else if (typeof window !== "undefined" && window.Razorpay) {
      setScriptLoaded(true);
    }
  }, []);

  const loadSubscription = useCallback(async () => {
    const token = await getValidToken();
    if (!token) return;
    const res = await fetch("/api/subscriptions", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.subscription && ["created", "active", "past_due"].includes(data.subscription.status)) {
        setSubscription(data.subscription);
      } else {
        setSubscription(null);
      }
    }
  }, [getValidToken]);

  useEffect(() => { loadSubscription(); }, [loadSubscription]);

  // Verifies Razorpay Checkout's success callback server-side before trusting
  // it — a forged/tampered client-side "success" must not be able to fake
  // activation. The webhook remains the sole authority for actually flipping
  // the user's plan; this only confirms the checkout response itself is real.
  const verifyCheckout = useCallback(async (token: string, response: Record<string, string>) => {
    const verifyRes = await fetch("/api/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        action: "verify_checkout",
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_subscription_id: response.razorpay_subscription_id,
        razorpay_signature: response.razorpay_signature,
      }),
    });
    return verifyRes.json();
  }, []);

  const startCheckout = useCallback(async (targetPlan: 'plus' | 'premium') => {
    setProcessingPlan(targetPlan);
    try {
      const token = await getValidToken();
      if (!token) { toast.error("Please log in again"); setProcessingPlan(null); return; }

      // Already on a different paid plan — this is a plan change, not a new subscription.
      if (subscription) {
        const res = await fetch("/api/subscriptions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "change_plan", newPlan: targetPlan }),
        });
        const data = await res.json();
        if (data.error) { toast.error(data.error); setProcessingPlan(null); return; }
        toast.success(data.message ?? "Plan change requested");
        await Promise.all([loadSubscription(), refreshCurrentUser()]);
        setProcessingPlan(null);
        return;
      }

      const orderRes = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const orderData = await orderRes.json();
      if (orderData.error) { toast.error(orderData.error); setProcessingPlan(null); return; }

      if (orderData.mock) {
        toast.success(`You're now on ${targetPlan === "plus" ? "Plus" : "Premium"}!`);
        await Promise.all([loadSubscription(), refreshCurrentUser()]);
        setProcessingPlan(null);
        return;
      }

      if (!scriptLoaded || !window.Razorpay) {
        toast.error("Payment provider failed to load. Please refresh and try again.");
        setProcessingPlan(null);
        return;
      }

      const options = {
        key: orderData.key,
        subscription_id: orderData.subscriptionId,
        name: "GeekBid",
        description: `${targetPlan === "plus" ? "Plus" : "Premium"} subscription`,
        prefill: { name: currentUser?.fullName || "", email: currentUser?.email || "" },
        theme: { color: "#4b3f8f" },
        handler: async (response: Record<string, string>) => {
          const verifyData = await verifyCheckout(token, response);
          if (verifyData.verified) {
            toast.success("Subscription created! Activating your plan...");
            await Promise.all([loadSubscription(), refreshCurrentUser()]);
          } else {
            toast.error("Payment verification failed", { description: verifyData.error });
          }
          setProcessingPlan(null);
        },
        modal: { ondismiss: () => setProcessingPlan(null) },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("An unexpected error occurred");
      setProcessingPlan(null);
    }
  }, [subscription, getValidToken, scriptLoaded, currentUser, loadSubscription, refreshCurrentUser, verifyCheckout]);

  const cancelSubscription = useCallback(async () => {
    setProcessingPlan("cancel");
    const token = await getValidToken();
    if (!token) { toast.error("Please log in again"); setProcessingPlan(null); return; }
    const res = await fetch("/api/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "cancel" }),
    });
    const data = await res.json();
    if (data.error) toast.error(data.error);
    else { toast.success(data.message ?? "Subscription cancelled"); await loadSubscription(); }
    setProcessingPlan(null);
  }, [getValidToken, loadSubscription]);

  return { subscription, scriptLoaded, processingPlan, startCheckout, cancelSubscription, loadSubscription };
}
