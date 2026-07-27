"use client";

import { ComingSoonPage } from "@/components/shell/ComingSoonPage";

export default function HealthChecksPage() {
  return (
    <ComingSoonPage
      title="Health checks"
      breadcrumbs={[
        { text: "Route 53", href: "/dashboard" },
        { text: "Health checks", href: "/health-checks" },
      ]}
    />
  );
}
