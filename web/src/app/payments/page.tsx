"use client";
import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/lib/store";
import { useRouter } from "next/navigation";
import {
  CreditCard, Shield, CheckCircle2, AlertCircle, Clock,
  DollarSign, ArrowRight, Loader2, BadgeCheck, XCircle,
  Zap, Lock, RefreshCw,
} from "lucide-react";

type TransactionDisplay = {
  id: string;
  _id?: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  escrowStatus: string;
  paymentMethod?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  description?: string;
  currency?: string;
  createdAt: string;
  releasedAt?: string;
  mock?: boolean;
  verified?: boolean;
};

type PaymentConfig = {
  key: string;
  currency: string;
  mock: boolean;
};

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: Record<string, string>) => void) => void;
    };
  }
}

function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusConfig(status: string) {
  const configs: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
    released: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "Released" },
    held: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "In Escrow" },
    disputed: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", label: "Disputed" },
    refunded: { icon: RefreshCw, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", label: "Refunded" },
    pending: { icon: Loader2, color: "text-neutral-500", bg: "bg-neutral-50 border-neutral-200", label: "Pending" },
  };
  return configs[status] || configs.pending;
}

export default function PaymentsPage() {
  const { auth, currentUser, mounted, transactions, fetchTransactions } = useApp();
  const router = useRouter();

  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    success: boolean;
    message: string;
    transactionId?: string;
  } | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Razorpay checkout script
  useEffect(() => {
    if (typeof window !== "undefined" && !document.getElementById("razorpay-script")) {
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => setScriptLoaded(true);
      script.onerror = () => console.warn("Razorpay script failed to load (mock mode will work)");
      document.body.appendChild(script);
    } else if (window.Razorpay) {
      setScriptLoaded(true);
    }
  }, []);

  // Fetch Razorpay config
  useEffect(() => {
    fetch("/api/payments")
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch(console.error);
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (mounted && !auth.isLoggedIn) {
      router.push("/login");
    }
  }, [mounted, auth.isLoggedIn, router]);

  const handlePayment = useCallback(async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;

    setIsProcessing(true);
    setPaymentResult(null);

    try {
      // Step 1: Create order
      const orderRes = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({
          amount: parsedAmount,
          currency: config?.currency || "INR",
          description,
        }),
      });

      const orderData = await orderRes.json();
      if (orderData.error) {
        setPaymentResult({ success: false, message: orderData.error });
        setIsProcessing(false);
        return;
      }

      const { order, key, mock } = orderData;

      // Step 2: Mock mode — simulate payment
      if (mock || !scriptLoaded || !window.Razorpay) {
        // Simulate a successful payment in mock mode
        const verifyRes = await fetch("/api/payments", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.accessToken}`,
          },
          body: JSON.stringify({
            razorpay_order_id: order.id,
            razorpay_payment_id: `pay_mock_${Date.now()}`,
            razorpay_signature: "mock_signature",
            amount: parsedAmount,
            currency: config?.currency || "INR",
            description,
          }),
        });

        const verifyData = await verifyRes.json();
        if (verifyData.verified) {
          setPaymentResult({
            success: true,
            message: "Payment simulated successfully (Test Mode)",
            transactionId: verifyData.transactionId,
          });
          await fetchTransactions();
        } else {
          setPaymentResult({
            success: false,
            message: verifyData.error || "Verification failed",
          });
        }
        setIsProcessing(false);
        return;
      }

      // Step 3: Real Razorpay Checkout popup
      const options = {
        key,
        amount: order.amount,
        currency: order.currency,
        name: "GeekBid",
        description: description || "Payment for GeekBid services",
        order_id: order.id,
        prefill: {
          name: currentUser?.fullName || "",
          email: currentUser?.email || "",
        },
        theme: { color: "#000000" },
        handler: async (response: Record<string, string>) => {
          // Verify payment
          const verifyRes = await fetch("/api/payments", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${auth.accessToken}`,
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: parsedAmount,
              currency: config?.currency || "INR",
              description,
            }),
          });

          const verifyData = await verifyRes.json();
          if (verifyData.verified) {
            setPaymentResult({
              success: true,
              message: "Payment successful!",
              transactionId: verifyData.transactionId,
            });
            await fetchTransactions();
          } else {
            setPaymentResult({
              success: false,
              message: verifyData.error || "Verification failed",
            });
          }
          setIsProcessing(false);
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setPaymentResult({
              success: false,
              message: "Payment was cancelled",
            });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Payment error:", err);
      setPaymentResult({
        success: false,
        message: "An unexpected error occurred",
      });
      setIsProcessing(false);
    }
  }, [amount, description, auth, config, scriptLoaded, currentUser, fetchTransactions]);

  if (!mounted || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  const typedTransactions = (transactions || []) as TransactionDisplay[];
  const razorpayTransactions = typedTransactions.filter(
    (t) => t.paymentMethod === "razorpay"
  );

  const stats = {
    total: typedTransactions.length,
    totalAmount: typedTransactions.reduce((sum, t) => sum + (t.grossAmount || 0), 0),
    razorpayCount: razorpayTransactions.length,
    heldCount: typedTransactions.filter((t) => t.escrowStatus === "held").length,
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-black tracking-tight">
                Payments
              </h1>
              <p className="text-sm text-neutral-500">
                Manage payments & escrow via Razorpay
              </p>
            </div>
            {config?.mock && (
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
                <Zap className="h-3 w-3" />
                Test Mode
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Transactions", value: stats.total, icon: CreditCard },
            { label: "Total Volume", value: formatCurrency(stats.totalAmount), icon: DollarSign },
            { label: "Razorpay Payments", value: stats.razorpayCount, icon: BadgeCheck },
            { label: "In Escrow", value: stats.heldCount, icon: Lock },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-neutral-200 p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="h-4 w-4 text-neutral-400" />
                <span className="text-xs text-neutral-500 font-medium">{stat.label}</span>
              </div>
              <p className="text-xl font-bold text-black">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Payment Form */}
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="border-b border-neutral-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-neutral-600" />
              <h2 className="text-base font-semibold text-black">
                Make a Payment
              </h2>
            </div>
            <p className="text-sm text-neutral-500 mt-1">
              Securely pay via Razorpay — funds held in escrow until work is delivered
            </p>
          </div>

          <div className="p-6 space-y-5">
            {/* Amount Input */}
            <div>
              <label
                htmlFor="payment-amount"
                className="block text-sm font-medium text-neutral-700 mb-1.5"
              >
                Amount ({config?.currency || "INR"})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-medium">
                  ₹
                </span>
                <input
                  id="payment-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500.00"
                  className="w-full h-11 pl-8 pr-4 rounded-lg border border-neutral-200 bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all placeholder:text-neutral-300"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="payment-description"
                className="block text-sm font-medium text-neutral-700 mb-1.5"
              >
                Description (optional)
              </label>
              <input
                id="payment-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Payment for AI chatbot project"
                className="w-full h-11 px-4 rounded-lg border border-neutral-200 bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all placeholder:text-neutral-300"
              />
            </div>

            {/* Pay Button */}
            <button
              id="pay-now-button"
              onClick={handlePayment}
              disabled={isProcessing || !amount || parseFloat(amount) <= 0}
              className="w-full h-12 rounded-xl bg-black text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Pay {amount ? formatCurrency(parseFloat(amount)) : "Now"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {/* Result Message */}
            {paymentResult && (
              <div
                className={`rounded-xl border p-4 flex items-start gap-3 animate-fade-in ${
                  paymentResult.success
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                {paymentResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                )}
                <div>
                  <p
                    className={`text-sm font-medium ${
                      paymentResult.success ? "text-emerald-800" : "text-red-800"
                    }`}
                  >
                    {paymentResult.message}
                  </p>
                  {paymentResult.transactionId && (
                    <p className="text-xs text-emerald-600 mt-1 font-mono">
                      TXN: {paymentResult.transactionId}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Security note */}
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <Lock className="h-3 w-3" />
              <span>
                Secured by Razorpay • 256-bit SSL encryption • PCI DSS compliant
              </span>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="border-b border-neutral-100 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-black">
                Transaction History
              </h2>
              <p className="text-sm text-neutral-500 mt-0.5">
                {typedTransactions.length} transaction{typedTransactions.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => fetchTransactions()}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-black transition-colors px-3 py-1.5 rounded-lg hover:bg-neutral-50"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>

          {typedTransactions.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <CreditCard className="h-10 w-10 text-neutral-200 mx-auto mb-3" />
              <p className="text-sm text-neutral-500 font-medium">
                No transactions yet
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Make your first payment to see it here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {typedTransactions.map((tx) => {
                const statusConfig = getStatusConfig(tx.escrowStatus);
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={tx.id || tx._id}
                    className="px-6 py-4 hover:bg-neutral-50/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100">
                          {tx.paymentMethod === "razorpay" ? (
                            <CreditCard className="h-4 w-4 text-neutral-600" />
                          ) : (
                            <DollarSign className="h-4 w-4 text-neutral-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-black">
                            {formatCurrency(tx.grossAmount, tx.currency || "INR")}
                          </p>
                          <p className="text-xs text-neutral-400">
                            {tx.description || (tx.paymentMethod === "razorpay" ? "Razorpay Payment" : "Escrow Payment")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </span>
                        {tx.mock && (
                          <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                            TEST
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-neutral-400">
                      <span>{formatDate(tx.createdAt)}</span>
                      {tx.razorpayPaymentId && (
                        <span className="font-mono">
                          ID: {tx.razorpayPaymentId}
                        </span>
                      )}
                      {tx.platformFee > 0 && (
                        <span>
                          Fee: {formatCurrency(tx.platformFee)} • Net:{" "}
                          {formatCurrency(tx.netAmount)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
