import { NextResponse } from "next/server";

// Concurrent-session consistency (blueprint §18): stamps the caller's
// current plan onto the response so other open tabs/sessions (each with
// their own cached `currentUser.plan`) can detect drift and refresh via
// store.tsx's apiRequest. Wired into the plan-gated routes from Phase 2
// (job/bid/AI/team/invite/key/feature creation) rather than every route in
// the app — those are exactly the surfaces where a stale plan value would
// show visibly wrong limits to the user.
export function withPlanHeader<T extends NextResponse>(response: T, plan: string): T {
  response.headers.set("X-User-Plan", plan);
  return response;
}
