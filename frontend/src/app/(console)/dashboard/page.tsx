"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Container from "@cloudscape-design/components/container";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Input from "@cloudscape-design/components/input";
import TextFilter from "@cloudscape-design/components/text-filter";
import Table from "@cloudscape-design/components/table";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useSetBreadcrumbs } from "@/components/shell/BreadcrumbsContext";
import { useDashboardStats } from "@/features/dashboard/queries";
import { pushDemoLimitationToast } from "@/lib/notifications";

// Always empty — Notifications is a mocked, visual-only section (no real
// activity feed exists). Typed so the table's columnDefinitions aren't stuck
// inferring from an empty array's `never[]`.
interface NotificationRow {
  resource: string;
  status: string;
  lastUpdate: string;
}

// FR-F2, UI spec §5.1 — rebuilt against docs/reference/08-dashboard.png. The
// real Dashboard is a feature-overview page (4 cards + Register domain +
// Notifications), not a stats-and-recent-activity page — an assumption this
// project made before that reference existed and got wrong. AS-O4-style
// mocked actions throughout (Create health check / Create policy / Register
// domain / Check / Notifications refresh) all show the shared demo toast.
export default function DashboardPage() {
  useSetBreadcrumbs([{ text: "Route 53", href: "/dashboard" }, { text: "Dashboard", href: "/dashboard" }]);
  const router = useRouter();
  const { isLoading, zoneCount, recordCount } = useDashboardStats();
  const [domainQuery, setDomainQuery] = useState("");
  const [notificationsFilter, setNotificationsFilter] = useState("");

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          info={
            <Link variant="info" onFollow={pushDemoLimitationToast}>
              Info
            </Link>
          }
        >
          Route 53 Dashboard
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Container>
          <ColumnLayout columns={4} variant="text-grid">
            <SpaceBetween size="s">
              <Box variant="h3">DNS management</Box>
              <Box variant="p" color="text-body-secondary">
                A hosted zone tells Route 53 how to respond to DNS queries for a domain such as
                example.com.
              </Box>
              {!isLoading && (
                <Box fontSize="body-s" color="text-body-secondary">
                  You currently have {zoneCount} hosted {zoneCount === 1 ? "zone" : "zones"} and{" "}
                  {recordCount} {recordCount === 1 ? "record" : "records"}.
                </Box>
              )}
              <Button onClick={() => router.push("/hosted-zones/create")}>Create hosted zone</Button>
            </SpaceBetween>

            <SpaceBetween size="s">
              <Box variant="h3">Availability monitoring</Box>
              <Box variant="p" color="text-body-secondary">
                Health checks monitor your applications and web resources, and direct DNS queries to
                healthy resources.
              </Box>
              <Button onClick={pushDemoLimitationToast}>Create health check</Button>
            </SpaceBetween>

            <SpaceBetween size="s">
              <Box variant="h3">Traffic management</Box>
              <Box variant="p" color="text-body-secondary">
                A visual tool that lets you easily create policies for multiple endpoints in complex
                configurations.
              </Box>
              <Button onClick={pushDemoLimitationToast}>Create policy</Button>
            </SpaceBetween>

            <SpaceBetween size="s">
              <Box variant="h3">Domain registration</Box>
              <Box variant="p" color="text-body-secondary">
                A domain is the name, such as example.com, that your users use to access your
                application.
              </Box>
              <Button onClick={pushDemoLimitationToast}>Register domain</Button>
            </SpaceBetween>
          </ColumnLayout>
        </Container>

        <Container header={<Header variant="h2">Register domain</Header>}>
          <SpaceBetween size="m">
            <Box>
              Find and register an available domain, or{" "}
              <Link onFollow={pushDemoLimitationToast}>transfer your existing domains</Link> to
              Route 53.
            </Box>
            <Input
              value={domainQuery}
              onChange={({ detail }) => setDomainQuery(detail.value)}
              placeholder="example.com"
            />
            <Box fontSize="body-s" color="text-body-secondary">
              Each label (each part between dots) can be up to 63 characters long and must start
              with a-z or 0-9. Maximum length: 255 characters, including dots. Valid characters:
              a-z, 0-9, and - (hyphen)
            </Box>
            <Button onClick={pushDemoLimitationToast}>Check</Button>
          </SpaceBetween>
        </Container>

        <Table
          header={
            <Header
              actions={
                <Button iconName="refresh" onClick={pushDemoLimitationToast} ariaLabel="Refresh notifications" />
              }
            >
              Notifications
            </Header>
          }
          filter={
            <TextFilter
              filteringText={notificationsFilter}
              onChange={({ detail }) => setNotificationsFilter(detail.filteringText)}
              filteringPlaceholder="Find notifications"
            />
          }
          columnDefinitions={[
            { id: "resource", header: "Resource", cell: (item: NotificationRow) => item.resource },
            { id: "status", header: "Status", cell: (item: NotificationRow) => item.status },
            { id: "lastUpdate", header: "Last update", cell: (item: NotificationRow) => item.lastUpdate },
          ]}
          items={[] as NotificationRow[]}
          trackBy="resource"
          empty={
            <Box textAlign="center" color="inherit">
              No notifications
            </Box>
          }
        />
      </SpaceBetween>
    </ContentLayout>
  );
}
