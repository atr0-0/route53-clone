"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Container from "@cloudscape-design/components/container";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table from "@cloudscape-design/components/table";
import { useSetBreadcrumbs } from "@/components/shell/BreadcrumbsContext";
import { useDashboardStats } from "@/features/dashboard/queries";

// FR-F2, UI spec §5.1: the real post-sign-in landing page (DD-18), built from
// data we already hold rather than left as a "Coming Soon" placeholder.
export default function DashboardPage() {
  useSetBreadcrumbs([{ text: "Route 53", href: "/dashboard" }, { text: "Dashboard", href: "/dashboard" }]);
  const router = useRouter();
  const { isLoading, zoneCount, recordCount, healthCheckCount, recentZones } = useDashboardStats();

  return (
    <ContentLayout header={<Header variant="h1">Dashboard</Header>}>
      <SpaceBetween size="l">
        <ColumnLayout columns={3} variant="text-grid">
          <Container header={<Header variant="h2">Hosted zones</Header>}>
            <Box variant="h1">{isLoading ? "-" : zoneCount}</Box>
          </Container>
          <Container header={<Header variant="h2">Records</Header>}>
            <Box variant="h1">{isLoading ? "-" : recordCount}</Box>
          </Container>
          <Container header={<Header variant="h2">Health checks</Header>}>
            <Box variant="h1">{isLoading ? "-" : healthCheckCount}</Box>
          </Container>
        </ColumnLayout>

        <Table
          header={
            <Header
              actions={
                <Button onClick={() => router.push("/hosted-zones")}>View all</Button>
              }
            >
              Recently created hosted zones
            </Header>
          }
          columnDefinitions={[
            {
              id: "name",
              header: "Hosted zone name",
              cell: (item) => <Link href={`/hosted-zones/${item.zoneId}`}>{item.name}</Link>,
            },
            { id: "type", header: "Type", cell: (item) => (item.type === "PUBLIC" ? "Public" : "Private") },
            { id: "recordCount", header: "Records", cell: (item) => item.recordCount },
            {
              id: "createdAt",
              header: "Created",
              cell: (item) => new Date(item.createdAt).toLocaleDateString(),
            },
          ]}
          items={recentZones}
          loading={isLoading}
          loadingText="Loading recently created hosted zones"
          trackBy="zoneId"
          empty={
            <Box textAlign="center" color="inherit">
              No hosted zones yet
            </Box>
          }
        />

        <Box>
          <Button variant="primary" onClick={() => router.push("/hosted-zones/create")}>
            Create hosted zone
          </Button>
        </Box>
      </SpaceBetween>
    </ContentLayout>
  );
}
