"use client";

import { useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Container from "@cloudscape-design/components/container";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Box from "@cloudscape-design/components/box";
import Tabs from "@cloudscape-design/components/tabs";
import Button from "@cloudscape-design/components/button";
import ButtonDropdown from "@cloudscape-design/components/button-dropdown";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Spinner from "@cloudscape-design/components/spinner";
import CopyToClipboard from "@cloudscape-design/components/copy-to-clipboard";
import { useHostedZone } from "@/features/hosted-zones/queries";
import { ZoneDeleteModal } from "@/features/hosted-zones/components/ZoneDeleteModal";
import { useSetBreadcrumbs } from "@/components/shell/BreadcrumbsContext";

function activeTabId(pathname: string): string {
  if (pathname.endsWith("/details")) return "details";
  if (pathname.endsWith("/query-logging")) return "query-logging";
  if (pathname.endsWith("/dnssec-signing")) return "dnssec-signing";
  return "records";
}

export default function ZoneDetailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ zoneId: string }>();
  const zoneId = params.zoneId;
  const router = useRouter();
  const pathname = usePathname();
  const { data: zone, isLoading } = useHostedZone(zoneId);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useSetBreadcrumbs([
    { text: "Route 53", href: "/dashboard" },
    { text: "Hosted zones", href: "/hosted-zones" },
    { text: zone?.name ?? zoneId, href: `/hosted-zones/${zoneId}` },
  ]);

  if (isLoading || !zone) {
    return (
      <ContentLayout header={<Header variant="h1">Loading…</Header>}>
        <Box textAlign="center" padding="xxl">
          <Spinner size="large" />
        </Box>
      </ContentLayout>
    );
  }

  return (
    <>
      {deleteModalOpen && (
        <ZoneDeleteModal
          zone={zone}
          onDismiss={() => setDeleteModalOpen(false)}
          onDeleted={() => router.push("/hosted-zones")}
        />
      )}
      <ContentLayout
        header={
          <Header
            variant="h1"
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <ButtonDropdown
                  items={[
                    { id: "test-record", text: "Test record", disabled: true },
                    { id: "import", text: "Import zone file", disabled: true },
                    { id: "export", text: "Export zone file" },
                  ]}
                  onItemClick={({ detail }) => {
                    if (detail.id === "export") {
                      window.location.href = `/api/v1/hosted-zones/${zoneId}/export?format=bind`;
                    }
                  }}
                >
                  Actions
                </ButtonDropdown>
                <Button onClick={() => router.push(`/hosted-zones/${zoneId}/edit`)}>Edit</Button>
                <Button onClick={() => setDeleteModalOpen(true)}>Delete</Button>
              </SpaceBetween>
            }
          >
            {zone.name}
          </Header>
        }
      >
        <SpaceBetween size="l">
          <Container>
            <ColumnLayout columns={4} variant="text-grid">
              <div>
                <Box variant="awsui-key-label">Hosted zone ID</Box>
                <CopyToClipboard
                  copyButtonAriaLabel="Copy hosted zone ID"
                  copySuccessText="Hosted zone ID copied"
                  copyErrorText="Hosted zone ID failed to copy"
                  textToCopy={zone.zoneId}
                  variant="inline"
                />
              </div>
              <div>
                <Box variant="awsui-key-label">Type</Box>
                <div>{zone.type === "PUBLIC" ? "Public" : "Private"}</div>
              </div>
              <div>
                <Box variant="awsui-key-label">Record count</Box>
                <div>{zone.recordCount}</div>
              </div>
              <div>
                <Box variant="awsui-key-label">Created</Box>
                <div>{new Date(zone.createdAt).toLocaleDateString()}</div>
              </div>
            </ColumnLayout>
          </Container>

          <Tabs
            ariaLabel="Resource details"
            activeTabId={activeTabId(pathname)}
            onChange={({ detail }) => {
              const base = `/hosted-zones/${zoneId}`;
              const target = detail.activeTabId === "records" ? base : `${base}/${detail.activeTabId}`;
              router.push(target);
            }}
            tabs={(["records", "details", "query-logging", "dnssec-signing"] as const).map((id) => ({
              id,
              label:
                id === "records"
                  ? "Records"
                  : id === "details"
                    ? "Hosted zone details"
                    : id === "query-logging"
                      ? "Query logging"
                      : "DNSSEC signing",
              // Only the active tab gets the real page content — Next.js routing
              // already selected it via `children`. Passing it to all four tabs
              // would mount the Records table (and its fetch) up to four times,
              // whether or not Cloudscape itself renders inactive tab content.
              content: activeTabId(pathname) === id ? children : null,
            }))}
          />
        </SpaceBetween>
      </ContentLayout>
    </>
  );
}
