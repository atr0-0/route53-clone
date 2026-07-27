import { redirect } from "next/navigation";

// Slice 0's R2 spike lived here; risk resolved (see docs/08-implementation-plan.md).
// Slice 6 will point this at /dashboard once FR-F2 is built; until then AC-1 says
// sign-in lands on Hosted zones, so that's the root's destination too. proxy.ts
// handles the unauthenticated case by redirecting to /login first.
export default function RootPage() {
  redirect("/hosted-zones");
}
