import { redirect } from "next/navigation";

// Slice 0's R2 spike lived here; risk resolved (see docs/08-implementation-plan.md).
// Slice 6 built the real Dashboard (FR-F2, DD-18); AC-1 now lands sign-in there.
// proxy.ts handles the unauthenticated case by redirecting to /login first.
export default function RootPage() {
  redirect("/dashboard");
}
