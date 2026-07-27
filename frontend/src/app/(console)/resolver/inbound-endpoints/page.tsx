"use client";

import { ComingSoonPage } from "@/components/shell/ComingSoonPage";

export default function InboundEndpointsPage() {
  return (
    <ComingSoonPage
      title="Inbound endpoints"
      breadcrumbs={[
        { text: "Route 53", href: "/dashboard" },
        { text: "Inbound endpoints", href: "/resolver/inbound-endpoints" },
      ]}
    />
  );
}
