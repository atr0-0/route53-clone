"use client";

import { ComingSoonPage } from "@/components/shell/ComingSoonPage";

export default function VPCsPage() {
  return (
    <ComingSoonPage
      title="VPCs"
      breadcrumbs={[
        { text: "Route 53", href: "/dashboard" },
        { text: "VPCs", href: "/resolver/vpcs" },
      ]}
    />
  );
}
