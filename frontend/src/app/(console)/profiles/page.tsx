"use client";

import { ComingSoonPage } from "@/components/shell/ComingSoonPage";

export default function ProfilesPage() {
  return (
    <ComingSoonPage
      title="Profiles"
      breadcrumbs={[
        { text: "Route 53", href: "/dashboard" },
        { text: "Profiles", href: "/profiles" },
      ]}
    />
  );
}
