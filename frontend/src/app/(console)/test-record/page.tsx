"use client";

import { ComingSoonPage } from "@/components/shell/ComingSoonPage";

export default function TestRecordPage() {
  return (
    <ComingSoonPage
      title="Test record"
      breadcrumbs={[
        { text: "Route 53", href: "/dashboard" },
        { text: "Test record", href: "/test-record" },
      ]}
    />
  );
}
