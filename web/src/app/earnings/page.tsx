"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatMoney, timeAgo } from "@/lib/utils";
import { DollarSign, ArrowUpRight, Clock, CheckCircle2, AlertCircle, Wallet } from "lucide-react";

export default function EarningsPage() {
  const { transactions, currentUser, mounted, releaseEscrow } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (mounted && !currentUser) router.replace("/login");
  }, [mounted, currentUser, router]);

  const myTxns = useMemo(() => transactions.filter(t =>
    t.freelancerId === (currentUser?.id ?? currentUser?._id) ||
    t.clientId === (currentUser?.id ?? currentUser?._id)
  ), [transactions, currentUser]);

  const released = useMemo(() => myTxns.filter(t => t.escrowStatus === "released").reduce((s, t) => s + t.netAmount, 0), [myTxns]);
  const pending = useMemo(() => myTxns.filter(t => t.escrowStatus === "held").reduce((s, t) => s + t.netAmount, 0), [myTxns]);
  const totalEarned = released + pending;

  if (!mounted) return <div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 border-2 border-black border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-black flex items-center justify-center">
          <DollarSign className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-black">Earnings</h1>
          <p className="text-xs text-neutral-400">{myTxns.length} transactions</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Card className="border-neutral-200 bg-black text-white">
          <CardContent className="p-5">
            <Wallet className="h-5 w-5 text-white/50 mb-3" />
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Available Balance</p>
            <p className="text-3xl font-black mt-1">{formatMoney(released)}</p>
            <Button variant="outline" size="sm" className="mt-3 border-white/20 text-white/70 hover:bg-white/10 hover:text-white text-xs rounded-lg">
              Withdraw <ArrowUpRight className="ml-1 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardContent className="p-5">
            <Clock className="h-5 w-5 text-neutral-400 mb-3" />
            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Pending</p>
            <p className="text-3xl font-black text-black mt-1">{formatMoney(pending)}</p>
            <p className="text-[11px] text-neutral-400 mt-1">In escrow</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardContent className="p-5">
            <DollarSign className="h-5 w-5 text-neutral-400 mb-3" />
            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Total Earned</p>
            <p className="text-3xl font-black text-black mt-1">{formatMoney(totalEarned)}</p>
            <p className="text-[11px] text-neutral-400 mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction list */}
      <Card className="border-neutral-200">
        <CardContent className="p-0">
          <div className="px-5 py-4 border-b border-neutral-100">
            <h2 className="text-sm font-bold text-black">Transaction History</h2>
          </div>
          {myTxns.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-3">
                <DollarSign className="h-6 w-6 text-neutral-300" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-600">No transactions yet</h3>
              <p className="text-xs text-neutral-400 mt-1">Transactions will appear here after you accept or post jobs.</p>
            </div>
          ) : (
            <div>
              {myTxns.map((t, i) => (
                <div key={t.id ?? t._id}>
                  <div className="px-5 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                        t.escrowStatus === "released" ? "bg-neutral-100" :
                        t.escrowStatus === "held" ? "bg-black" : "bg-red-100"
                      }`}>
                        {t.escrowStatus === "released" ? <CheckCircle2 className="h-5 w-5 text-neutral-500" /> :
                         t.escrowStatus === "held" ? <Clock className="h-5 w-5 text-white" /> :
                         <AlertCircle className="h-5 w-5 text-red-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black">Job #{t.jobId?.slice(-6)}</p>
                        <p className="text-[11px] text-neutral-400">{timeAgo(t.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div className="hidden sm:flex gap-3">
                        <div className="bg-neutral-50 rounded-lg px-3 py-1.5 text-center">
                          <p className="text-[10px] text-neutral-400">Gross</p>
                          <p className="text-xs font-bold text-black">{formatMoney(t.grossAmount)}</p>
                        </div>
                        <div className="bg-neutral-50 rounded-lg px-3 py-1.5 text-center">
                          <p className="text-[10px] text-neutral-400">Net</p>
                          <p className="text-xs font-bold text-black">{formatMoney(t.netAmount)}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] rounded-full px-2.5 ${
                        t.escrowStatus === "released" ? "border-neutral-300 text-neutral-600" :
                        t.escrowStatus === "held" ? "border-black bg-black text-white" :
                        "border-red-200 text-red-600"
                      }`}>{t.escrowStatus}</Badge>
                    </div>
                  </div>
                  {i < myTxns.length - 1 && <Separator className="bg-neutral-50" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
