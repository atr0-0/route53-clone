"use client";

import { ComingSoonPage } from "@/components/shell/ComingSoonPage";

export default function PolicyRecordsPage() {
  return (
    <ComingSoonPage
      title="Policy records"
      breadcrumbs={[
        { text: "Route 53", href: "/dashboard" },
        { text: "Policy records", href: "/traffic-flow/policy-records" },
      ]}
    />
  );
}
