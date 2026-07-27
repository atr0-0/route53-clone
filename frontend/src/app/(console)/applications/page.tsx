"use client";

import { ComingSoonPage } from "@/components/shell/ComingSoonPage";

export default function ApplicationsPage() {
  return (
    <ComingSoonPage
      title="Applications"
      breadcrumbs={[
        { text: "Route 53", href: "/dashboard" },
        { text: "Applications", href: "/applications" },
      ]}
    />
  );
}
