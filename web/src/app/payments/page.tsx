"use client";
import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/lib/store";
import { useRouter } from "next/navigation";
import { formatMoney, timeAgo } from "@/lib/utils";
import { toast } from "sonner";
import {
 CreditCard, Shield, CheckCircle2, AlertCircle, Clock,
 DollarSign, ArrowRight, Loader2, XCircle,
 Zap, Lock, RefreshCw,
} from "lucide-react";

type TransactionDisplay = {
 id: string;
 _id?: string;
 jobId?: string;
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

export default function PaymentsPage() {
 const { auth, currentUser, mounted, transactions, fetchTransactions, releaseEscrow, raiseDispute } = useApp();
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
 const [statusFilter, setStatusFilter] = useState<string>("all");
 const [releaseConfirm, setReleaseConfirm] = useState<string | null>(null);
 const [disputeConfirm, setDisputeConfirm] = useState<string | null>(null);
 const [disputeReason, setDisputeReason] = useState("");
 const [disputeSubmitting, setDisputeSubmitting] = useState(false);

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

 useEffect(() => {
 fetch("/api/payments")
 .then((res) => res.json())
 .then((data) => setConfig(data))
 .catch(console.error);
 }, []);

 useEffect(() => {
 if (mounted && !auth.isLoggedIn) router.push("/login");
 }, [mounted, auth.isLoggedIn, router]);

 const handlePayment = useCallback(async () => {
 const parsedAmount = parseFloat(amount);
 if (!parsedAmount || parsedAmount <= 0) return;

 setIsProcessing(true);
 setPaymentResult(null);

 try {
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

 if (mock || !scriptLoaded || !window.Razorpay) {
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
 theme: { color: "#4b3f8f" },
 handler: async (response: Record<string, string>) => {
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

 const handleRelease = async (txId: string) => {
 const r = await releaseEscrow(txId);
 if (r.ok) {
 toast.success("Escrow released!", { description: r.message });
 setReleaseConfirm(null);
 } else {
 toast.error("Release failed", { description: r.message });
 }
 };

 const handleDispute = async (txId: string) => {
 if (!disputeReason.trim()) return;
 setDisputeSubmitting(true);
 const r = await raiseDispute(txId, disputeReason.trim());
 setDisputeSubmitting(false);
 if (r.ok) {
 toast.success("Dispute raised", { description: "Our team will review this transaction." });
 setDisputeConfirm(null);
 setDisputeReason("");
 } else {
 toast.error("Failed to raise dispute", { description: r.message });
 }
 };

 if (!mounted || !currentUser) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-[#ffffff]">
 <Loader2 className="h-8 w-8 animate-spin text-[#6f6a7d]" />
 </div>
 );
 }

 const typedTransactions = (transactions || []) as TransactionDisplay[];

 const filteredTxns = statusFilter === "all"
 ? typedTransactions
 : typedTransactions.filter(t => t.escrowStatus === statusFilter);

 const totalAmount = typedTransactions.reduce((sum, t) => sum + (t.grossAmount || 0), 0);
 const heldAmount = typedTransactions.filter(t => t.escrowStatus === "held").reduce((sum, t) => sum + (t.grossAmount || 0), 0);
 const releasedAmount = typedTransactions.filter(t => t.escrowStatus === "released").reduce((sum, t) => sum + (t.netAmount || 0), 0);

 const STATUS_FILTERS = ["all", "held", "released", "disputed"];

 function getStatusBadgeClass(status: string) {
 switch (status) {
 case "released": return "px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ffffff] text-[#3d3a45]";
 case "held": return "badge-pending";
 case "disputed": return "badge-disputed";
 default: return "badge-completed";
 }
 }

 return (
 <div className="min-h-screen bg-[#fbfaf7] grid-bg">
 <div className="bg-[#fbfaf7] max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
 {/* Header */}
 <div className="flex items-center justify-between mb-8 animate-fade-in-up">
 <div>
 <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#3d3a45]">Financial Terminal</h1>
 <p className="text-[#6f6a7d] text-sm mt-1">Manage escrow, transactions, and payment methods</p>
 </div>
 {config?.mock && (
 <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(75,63,143,0.12)] border border-[rgba(75,63,143,0.25)] px-3 py-1 text-xs font-medium text-[#4b3f8f]">
 <Zap className="h-3 w-3" />
 Test Mode
 </span>
 )}
 </div>

 {/* Stats Row */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
 <div className="finance-card p-5 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
 <p className="text-[#6f6a7d] text-xs uppercase tracking-wider font-medium">Total Spent / Earned</p>
 <p className="font-heading text-2xl font-bold text-[#3d3a45] mt-1 terminal-amount">{formatMoney(totalAmount)}</p>
 </div>
 <div className="finance-card p-5 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
 <p className="text-[#6f6a7d] text-xs uppercase tracking-wider font-medium">In Escrow</p>
 <p className="font-heading text-2xl font-bold text-[#4b3f8f] mt-1 terminal-amount">{formatMoney(heldAmount)}</p>
 </div>
 <div className="finance-card p-5 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
 <p className="text-[#6f6a7d] text-xs uppercase tracking-wider font-medium">Available</p>
 <p className="font-heading text-2xl font-bold text-[#4b3f8f] mt-1 terminal-amount">{formatMoney(releasedAmount)}</p>
 </div>
 </div>

 {/* Make Payment Section */}
 <div className="finance-card scanline overflow-hidden mb-8">
 <div className="border-b border-[rgba(75,63,143,0.22)] px-4 sm:px-6 py-4">
 <div className="flex items-center gap-2">
 <CreditCard className="h-4 w-4 text-[#4b3f8f]" />
 <h2 className="font-heading text-lg font-semibold text-[#3d3a45]">Fund Escrow</h2>
 </div>
 <p className="text-sm text-[#6f6a7d] mt-1">Securely pay via Razorpay — funds held in escrow until work is delivered</p>
 </div>

 <div className="p-6 space-y-5">
 <div>
 <label className="block text-sm font-medium text-[#6f6a7d] mb-1.5">
 Amount ({config?.currency || "INR"})
 </label>
 <div className="relative">
 <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6f6a7d]" />
 <input
 type="number"
 min="1"
 step="0.01"
 value={amount}
 onChange={(e) => setAmount(e.target.value)}
 placeholder="500.00"
 className="glass-input pl-10 rounded-2xl terminal-amount"
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-[#6f6a7d] mb-1.5">
 Description (optional)
 </label>
 <input
 type="text"
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder="e.g. Payment for AI chatbot project"
 className="glass-input rounded-2xl"
 />
 </div>

 <button
 onClick={handlePayment}
 disabled={isProcessing || !amount || parseFloat(amount) <= 0}
 className="btn-primary w-full h-12 rounded-2xl payment-ready disabled:opacity-40 disabled:cursor-not-allowed"
 >
 {isProcessing ? (
 <>
 <Loader2 className="h-4 w-4 animate-spin" />
 Processing...
 </>
 ) : (
 <>
 <Lock className="h-4 w-4" />
 Pay with Razorpay
 <ArrowRight className="h-4 w-4" />
 </>
 )}
 </button>

 {paymentResult && (
 <div
 className={`rounded-2xl border p-4 flex items-start gap-3 animate-fade-in-up ${
 paymentResult.success
 ? "bg-[#4b3f8f]/5 border-[rgba(75,63,143,0.30)]"
 : "bg-red-500/5 border-[rgba(193,77,58,0.20)]"
 }`}
 >
 {paymentResult.success ? (
 <CheckCircle2 className="h-5 w-5 text-[#4b3f8f] mt-0.5 shrink-0" />
 ) : (
 <XCircle className="h-5 w-5 text-[#c14d3a] mt-0.5 shrink-0" />
 )}
 <div>
 <p className={`text-sm font-medium ${paymentResult.success ? "text-[#4b3f8f]" : "text-[#c14d3a]"}`}>
 {paymentResult.message}
 </p>
 {paymentResult.transactionId && (
 <p className="text-xs text-[#6f6a7d] mt-1 font-mono-il terminal-amount">
 TXN: {paymentResult.transactionId}
 </p>
 )}
 </div>
 </div>
 )}

 <div className="flex items-center gap-2 text-xs text-[#6f6a7d]">
 <Lock className="h-3 w-3" />
 <span>Secured by Razorpay • 256-bit SSL encryption • PCI DSS compliant</span>
 </div>
 </div>
 </div>

 {/* Transaction History */}
 <div className="glass-panel overflow-hidden">
 <div className="border-b border-[rgba(75,63,143,0.22)] px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h2 className="font-heading text-lg font-semibold text-[#3d3a45]">Transaction History</h2>
 <p className="text-sm text-[#6f6a7d] mt-0.5">{typedTransactions.length} transaction{typedTransactions.length !== 1 ? "s" : ""}</p>
 </div>
 <div className="flex items-center gap-2 glass-panel-sm p-1" style={{ borderRadius: "12px" }}>
 {STATUS_FILTERS.map(f => (
 <button
 key={f}
 onClick={() => setStatusFilter(f)}
 className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize ${
 statusFilter === f
 ? "bg-[#4b3f8f] text-[#ffffff] border border-transparent"
 : "text-[#6f6a7d] hover:text-[#3d3a45]"
 }`}
 >
 {f}
 </button>
 ))}
 <button
 onClick={() => fetchTransactions()}
 className="ml-1 inline-flex items-center gap-1.5 text-xs font-medium text-[#6f6a7d] hover:text-[#4b3f8f] transition-colors px-3 py-1.5 rounded-full hover:bg-[#f4f2ee]"
 >
 <RefreshCw className="h-3 w-3" />
 Refresh
 </button>
 </div>
 </div>

 {filteredTxns.length === 0 ? (
 <div className="px-4 sm:px-6 py-16 text-center">
 <CreditCard className="h-10 w-10 text-[#6f6a7d] mx-auto mb-3" />
 <p className="text-sm text-[#6f6a7d] font-medium">No transactions found</p>
 <p className="text-xs text-[#6f6a7d] mt-1">
 {statusFilter !== "all" ? "Try a different filter" : "Make your first payment to see it here"}
 </p>
 </div>
 ) : (
 <>
 {/* Table header */}
 <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-4 sm:px-6 py-3 bg-[#ffffff]/60 text-[#6f6a7d] text-xs uppercase tracking-wider font-semibold border-b border-[rgba(75,63,143,0.22)]">
 <span>Transaction</span>
 <span className="text-right w-20">Amount</span>
 <span className="text-right w-16">Fee</span>
 <span className="text-right w-20">Net</span>
 <span className="text-center w-24">Status</span>
 <span className="text-right w-24">Action</span>
 </div>

 <div className="divide-y divide-[rgba(236,233,226,0.2)]">
 {filteredTxns.map((tx) => (
 <div
 key={tx.id || tx._id}
 className="tx-row px-4 sm:px-6 py-4 transition-all"
 >
 <div className="sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto_auto] sm:gap-4 sm:items-center">
 {/* Transaction info */}
 <div className="flex items-center gap-3 mb-2 sm:mb-0">
 <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4f2ee] border border-[rgba(75,63,143,0.22)] shrink-0">
 {tx.paymentMethod === "razorpay" ? (
 <CreditCard className="h-4 w-4 text-[#6f6a7d]" />
 ) : (
 <DollarSign className="h-4 w-4 text-[#6f6a7d]" />
 )}
 </div>
 <div>
 <p className="text-sm font-medium text-[#3d3a45]">
 {tx.description || (tx.paymentMethod === "razorpay" ? "Razorpay Payment" : `Job #${(tx.jobId || "").slice(-6)}`)}
 </p>
 <p className="text-xs text-[#6f6a7d]">{formatDate(tx.createdAt)}</p>
 </div>
 </div>

 {/* Amount */}
 <p className="font-heading text-sm text-[#3d3a45] text-right w-20 hidden sm:block terminal-amount">
 {formatCurrency(tx.grossAmount)}
 </p>

 {/* Fee */}
 <p className="text-sm text-[#6f6a7d] text-right w-16 hidden sm:block terminal-amount">
 {tx.platformFee > 0 ? formatCurrency(tx.platformFee) : "—"}
 </p>

 {/* Net */}
 <p className="text-sm font-medium text-[#4b3f8f] text-right w-20 hidden sm:block terminal-amount">
 {tx.netAmount > 0 ? formatCurrency(tx.netAmount) : "—"}
 </p>

 {/* Status */}
 <div className="flex items-center justify-center w-24">
 <span className={`inline-flex items-center gap-1 ${getStatusBadgeClass(tx.escrowStatus)} ${tx.escrowStatus === "held" ? "status-held" : ""}`}>
 {tx.escrowStatus === "released" && <CheckCircle2 className="h-3 w-3" />}
 {tx.escrowStatus === "held" && <Clock className="h-3 w-3" />}
 {tx.escrowStatus === "disputed" && <AlertCircle className="h-3 w-3" />}
 {tx.escrowStatus}
 </span>
 {tx.mock && (
 <span className="ml-1.5 text-[11px] text-[#6f6a7d] font-medium">TEST</span>
 )}
 </div>

 {/* Action */}
 <div className="text-right w-24 flex items-center justify-end gap-2">
 {tx.escrowStatus === "held" ? (
 <>
 <button
 onClick={() => setReleaseConfirm(tx.id || tx._id || "")}
 className="text-[#4b3f8f] text-xs hover:underline font-medium"
 >
 Release
 </button>
 <span className="text-[#6f6a7d]/40">|</span>
 <button
 onClick={() => setDisputeConfirm(tx.id || tx._id || "")}
 className="text-[#6f6a7d] text-xs hover:underline hover:text-[#3d3a45] font-medium"
 >
 Dispute
 </button>
 </>
 ) : (
 <span className="text-[#6f6a7d] text-xs">—</span>
 )}
 </div>
 </div>

 {/* Mobile amounts */}
 <div className="flex items-center gap-4 mt-2 sm:hidden text-xs text-[#6f6a7d]">
 <span className="terminal-amount">Gross: {formatCurrency(tx.grossAmount)}</span>
 {tx.platformFee > 0 && <span className="terminal-amount">Fee: {formatCurrency(tx.platformFee)}</span>}
 {tx.netAmount > 0 && <span className="text-[#4b3f8f] terminal-amount">Net: {formatCurrency(tx.netAmount)}</span>}
 </div>
 </div>
 ))}
 </div>
 </>
 )}
 </div>
 </div>

 {/* Release confirmation dialog */}
 {releaseConfirm && (
 <div className="fixed inset-0 z-50 flex items-center justify-center victory-overlay" onClick={() => setReleaseConfirm(null)}>
 <div className="glass-panel-lg p-8 max-w-sm w-full mx-4 animate-scale-in" onClick={e => e.stopPropagation()}>
 <h3 className="font-heading text-lg font-bold text-[#3d3a45] mb-2">Release Escrow?</h3>
 <p className="text-sm text-[#6f6a7d] mb-1">
 This will release the held funds to the freelancer. This action cannot be undone.
 </p>
 {(() => {
 const tx = typedTransactions.find(t => (t.id || t._id) === releaseConfirm);
 return tx ? (
 <p className="text-lg font-heading font-bold text-[#4b3f8f] mt-3 mb-6 terminal-amount">
 {formatCurrency(tx.netAmount)} will be released
 </p>
 ) : null;
 })()}
 <div className="flex gap-3">
 <button
 onClick={() => setReleaseConfirm(null)}
 className="btn-ghost flex-1 h-10 rounded-2xl text-sm"
 >
 Cancel
 </button>
 <button
 onClick={() => handleRelease(releaseConfirm)}
 className="btn-primary flex-1 h-10 rounded-2xl text-sm"
 >
 Confirm Release
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Dispute confirmation dialog */}
 {disputeConfirm && (
 <div className="fixed inset-0 z-50 flex items-center justify-center victory-overlay" onClick={() => { setDisputeConfirm(null); setDisputeReason(""); }}>
 <div className="glass-panel-lg p-8 max-w-sm w-full mx-4 animate-scale-in" onClick={e => e.stopPropagation()}>
 <h3 className="font-heading text-lg font-bold text-[#3d3a45] mb-2">Raise a Dispute?</h3>
 <p className="text-sm text-[#6f6a7d] mb-4">
 This flags the transaction for admin review and holds the funds until resolved.
 </p>
 <textarea
 value={disputeReason}
 onChange={e => setDisputeReason(e.target.value)}
 placeholder="Describe the issue (required)..."
 rows={3}
 className="glass-input w-full text-sm rounded-2xl p-3 mb-6 resize-none"
 />
 <div className="flex gap-3">
 <button
 onClick={() => { setDisputeConfirm(null); setDisputeReason(""); }}
 className="btn-ghost flex-1 h-10 rounded-2xl text-sm"
 >
 Cancel
 </button>
 <button
 onClick={() => handleDispute(disputeConfirm)}
 disabled={!disputeReason.trim() || disputeSubmitting}
 className="btn-primary flex-1 h-10 rounded-2xl text-sm disabled:opacity-50"
 >
 {disputeSubmitting ? "Submitting..." : "Confirm Dispute"}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
