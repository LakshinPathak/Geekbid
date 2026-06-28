"use client";
import { useApp } from "@/lib/store";
import ClientFeed from "@/components/feed/ClientFeed";
import FreelancerFeed from "@/components/feed/FreelancerFeed";

/**
 * Thin router — renders role-specific feed.
 * ClientFeed   → "Procurement Terminal" (client role)
 * FreelancerFeed → "Mission Control" (freelancer role)
 */
export default function FeedPage() {
  const { currentUser, mounted } = useApp();

  // Loading state — both feeds handle their own loading skeleton internally
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#FCFAF4]">
        <div className="h-8 w-8 border-2 border-[#C8923D]/40 border-t-[#C8923D] rounded-full animate-spin" />
      </div>
    );
  }

  if (currentUser?.role === "client") return <ClientFeed />;
  return <FreelancerFeed />;
}
