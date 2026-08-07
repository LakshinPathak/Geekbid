"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import ClientFeed from "@/components/feed/ClientFeed";
import FreelancerFeed from "@/components/feed/FreelancerFeed";

/**
 * Thin router — renders role-specific feed.
 * ClientFeed → "Procurement Terminal" (client role)
 * FreelancerFeed → "Mission Control" (freelancer role)
 * Admins have their own dashboard at /admin — they never had a "feed" of
 * their own, so falling through to the freelancer branch (the old
 * `else` here) landed them on Mission Control with 403s from every
 * freelancer-only API it calls. Any other/unknown role redirects to login
 * rather than guessing.
 */
export default function FeedPage() {
  const { currentUser, mounted } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!mounted) return;
    if (!currentUser) { router.replace("/login"); return; }
    if (currentUser.role === "admin") { router.replace("/admin"); return; }
    if (currentUser.role !== "client" && currentUser.role !== "freelancer") {
      router.replace("/login");
    }
  }, [mounted, currentUser, router]);

  const showLoading =
    !mounted ||
    !currentUser ||
    currentUser.role === "admin" ||
    (currentUser.role !== "client" && currentUser.role !== "freelancer");

  if (showLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#ffffff]">
        <div className="h-8 w-8 border-2 border-[rgba(75,63,143,0.40)] border-t-[#4b3f8f] rounded-full animate-spin" />
      </div>
    );
  }

  if (currentUser.role === "client") return <ClientFeed />;
  return <FreelancerFeed />;
}
