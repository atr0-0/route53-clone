"use client";

import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import { ComingSoon } from "@/components/ComingSoon";
import { useSetBreadcrumbs, type BreadcrumbItem } from "@/components/shell/BreadcrumbsContext";

// FR-F1: every placeholder nav leaf renders inside the real shell with correct
// breadcrumbs and nav highlighting — one component, N routes (07-ui-spec.md §5.7).
export function ComingSoonPage({
  title,
  breadcrumbs,
}: {
  title: string;
  breadcrumbs: BreadcrumbItem[];
}) {
  useSetBreadcrumbs(breadcrumbs);
  return (
    <ContentLayout header={<Header variant="h1">{title}</Header>}>
      <ComingSoon />
    </ContentLayout>
  );
}
