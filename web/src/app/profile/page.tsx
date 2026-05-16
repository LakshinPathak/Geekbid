"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatMoney, getGeekTier } from "@/lib/utils";
import {
  User, Star, Briefcase, Clock, DollarSign, MessageSquare,
  MapPin, Globe, CheckCircle2, Code, Shield
} from "lucide-react";

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="border-neutral-100">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">{icon}</div>
        <div>
          <p className="text-lg font-bold text-black">{value}</p>
          <p className="text-xs text-neutral-400">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  const { currentUser, jobs, bids, mounted } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (mounted && !currentUser) router.replace("/login");
  }, [mounted, currentUser, router]);

  const wonJobs = useMemo(() => jobs.filter(j => j.status === "accepted" && (j.acceptedBy === currentUser?.id || j.acceptedBy === currentUser?._id)), [jobs, currentUser]);
  const myBids = useMemo(() => bids.filter(b => b.freelancerId === currentUser?.id || b.freelancerId === currentUser?._id), [bids, currentUser]);
  const myPosted = useMemo(() => jobs.filter(j => j.clientId === currentUser?.id || j.clientId === currentUser?._id), [jobs, currentUser]);

  if (!mounted || !currentUser) return <div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 border-2 border-black border-t-transparent rounded-full animate-spin" /></div>;

  const tier = getGeekTier(currentUser.geekScore ?? 0);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6">
      {/* Profile header */}
      <Card className="border-neutral-200 overflow-hidden mb-6">
        <div className="h-24 bg-black" />
        <CardContent className="p-6 relative">
          <Avatar className="h-20 w-20 border-4 border-white shadow-lg absolute -top-10">
            <AvatarFallback className="text-2xl bg-black text-white font-bold">{currentUser.avatarInitial}</AvatarFallback>
          </Avatar>
          <div className="pt-12 sm:pt-0 sm:pl-24">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h1 className="text-xl font-bold text-black flex items-center gap-2">
                  {currentUser.fullName}
                  {currentUser.isVerified && <CheckCircle2 className="h-5 w-5 text-neutral-400" />}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs capitalize border-neutral-200 text-neutral-500">{currentUser.role}</Badge>
                  {currentUser.availability && (
                    <Badge variant="outline" className={`text-xs ${currentUser.availability === "available" ? "border-neutral-300 text-neutral-600" : "border-neutral-200 text-neutral-400"}`}>
                      {currentUser.availability}
                    </Badge>
                  )}
                </div>
              </div>
              {currentUser.role === "freelancer" && currentUser.geekScore && (
                <div className="text-right">
                  <p className="text-2xl font-black text-black">{currentUser.geekScore}</p>
                  <p className="text-[11px] text-neutral-400 font-medium">GeekScore™ • {tier.label}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {currentUser.role === "freelancer" ? (
          <>
            <StatCard icon={<Star className="h-5 w-5 text-neutral-500" />} label="Jobs Won" value={String(wonJobs.length)} />
            <StatCard icon={<MessageSquare className="h-5 w-5 text-neutral-500" />} label="Bids Made" value={String(myBids.length)} />
            <StatCard icon={<DollarSign className="h-5 w-5 text-neutral-500" />} label="Rate" value={`$${currentUser.hourlyRateMin ?? 0}-${currentUser.hourlyRateMax ?? 0}/hr`} />
            <StatCard icon={<Clock className="h-5 w-5 text-neutral-500" />} label="Joined" value="2024" />
          </>
        ) : (
          <>
            <StatCard icon={<Briefcase className="h-5 w-5 text-neutral-500" />} label="Posted" value={String(myPosted.length)} />
            <StatCard icon={<Clock className="h-5 w-5 text-neutral-500" />} label="Active" value={String(myPosted.filter(j => j.status === "open").length)} />
            <StatCard icon={<Star className="h-5 w-5 text-neutral-500" />} label="Completed" value={String(myPosted.filter(j => j.status === "accepted").length)} />
            <StatCard icon={<DollarSign className="h-5 w-5 text-neutral-500" />} label="Spent" value={formatMoney(myPosted.filter(j => j.finalPrice).reduce((s, j) => s + (j.finalPrice ?? 0), 0))} />
          </>
        )}
      </div>

      {/* Details */}
      <Tabs defaultValue="about" className="space-y-4">
        <TabsList className="bg-white border border-neutral-200 shadow-sm h-10 p-1 rounded-xl">
          <TabsTrigger value="about" className="text-xs rounded-lg px-4">About</TabsTrigger>
          <TabsTrigger value="skills" className="text-xs rounded-lg px-4">Skills</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs rounded-lg px-4">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="about">
          <Card className="border-neutral-200">
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider mb-1">Bio</p>
                <p className="text-sm text-neutral-700 leading-relaxed">{currentUser.bio ?? "No bio yet."}</p>
              </div>
              <Separator className="bg-neutral-100" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2.5 text-sm text-neutral-600">
                  <MapPin className="h-4 w-4 text-neutral-400" />
                  {currentUser.company ?? "Not specified"}
                </div>
                <div className="flex items-center gap-2.5 text-sm text-neutral-600">
                  <Globe className="h-4 w-4 text-neutral-400" />
                  {currentUser.email}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills">
          <Card className="border-neutral-200">
            <CardContent className="p-6">
              <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider mb-3">Technical Skills</p>
              {currentUser.skills && currentUser.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {currentUser.skills.map(s => (
                    <Badge key={s} variant="outline" className="text-xs py-1.5 px-3 rounded-lg border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors">{s}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">No skills listed yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card className="border-neutral-200">
            <CardContent className="p-6">
              <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider mb-3">Recent Activity</p>
              {wonJobs.length > 0 ? (
                <div className="space-y-3">
                  {wonJobs.slice(0, 5).map(j => (
                    <div key={j.id ?? j._id} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-black">{j.title}</p>
                        <p className="text-[11px] text-neutral-400">Won at {formatMoney(j.finalPrice ?? 0)}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-neutral-200">Completed</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">No activity yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
