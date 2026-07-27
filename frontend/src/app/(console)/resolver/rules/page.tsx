"use client";

import { ComingSoonPage } from "@/components/shell/ComingSoonPage";

export default function RulesPage() {
  return (
    <ComingSoonPage
      title="Rules"
      breadcrumbs={[
        { text: "Route 53", href: "/dashboard" },
        { text: "Rules", href: "/resolver/rules" },
      ]}
    />
  );
}
