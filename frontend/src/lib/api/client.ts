import createClient from "openapi-fetch";
import type { paths } from "./schema";
import { queryClient } from "@/lib/queryClient";

export const apiClient = createClient<paths>({ baseUrl: "/api" });

// FR-A8: a 401 from any call clears client state and redirects once — no loops,
// no toast spam. This runs outside React (it's fetch middleware), so the "once"
// guard is a plain module-level flag rather than component state.
let redirecting = false;

apiClient.use({
  onResponse({ response }) {
    if (response.status === 401 && !redirecting && typeof window !== "undefined") {
      redirecting = true;
      queryClient.clear();
      const next = window.location.pathname + window.location.search;
      const isAlreadyOnLogin = window.location.pathname === "/login";
      window.location.assign(isAlreadyOnLogin ? "/login" : `/login?next=${encodeURIComponent(next)}`);
    }
    return response;
  },
});
