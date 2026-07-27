"use client";

import { ComingSoonPage } from "@/components/shell/ComingSoonPage";

export default function QueryLoggingPage() {
  return (
    <ComingSoonPage
      title="Query logging"
      breadcrumbs={[
        { text: "Route 53", href: "/dashboard" },
        { text: "Query logging", href: "/resolver/query-logging" },
      ]}
    />
  );
}
