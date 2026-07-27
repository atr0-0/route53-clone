"use client";

import { ComingSoonPage } from "@/components/shell/ComingSoonPage";

export default function TrafficPoliciesPage() {
  return (
    <ComingSoonPage
      title="Traffic policies"
      breadcrumbs={[
        { text: "Route 53", href: "/dashboard" },
        { text: "Traffic policies", href: "/traffic-flow/traffic-policies" },
      ]}
    />
  );
}
