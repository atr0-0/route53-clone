"use client";

import { ComingSoonPage } from "@/components/shell/ComingSoonPage";

export default function OutboundEndpointsPage() {
  return (
    <ComingSoonPage
      title="Outbound endpoints"
      breadcrumbs={[
        { text: "Route 53", href: "/dashboard" },
        { text: "Outbound endpoints", href: "/resolver/outbound-endpoints" },
      ]}
    />
  );
}
