"use client";

import { ComingSoonPage } from "@/components/shell/ComingSoonPage";

export default function RegisteredDomainsPage() {
  return (
    <ComingSoonPage
      title="Registered domains"
      breadcrumbs={[
        { text: "Route 53", href: "/dashboard" },
        { text: "Registered domains", href: "/domains/registered-domains" },
      ]}
    />
  );
}
