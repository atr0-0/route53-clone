"use client";

import { ComingSoonPage } from "@/components/shell/ComingSoonPage";

export default function RequestsPage() {
  return (
    <ComingSoonPage
      title="Requests"
      breadcrumbs={[
        { text: "Route 53", href: "/dashboard" },
        { text: "Requests", href: "/domains/requests" },
      ]}
    />
  );
}
