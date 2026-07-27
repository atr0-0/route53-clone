"use client";

import { ComingSoonPage } from "@/components/shell/ComingSoonPage";

export default function CIDRCollectionsPage() {
  return (
    <ComingSoonPage
      title="CIDR collections"
      breadcrumbs={[
        { text: "Route 53", href: "/dashboard" },
        { text: "CIDR collections", href: "/ip-based-routing/cidr-collections" },
      ]}
    />
  );
}
