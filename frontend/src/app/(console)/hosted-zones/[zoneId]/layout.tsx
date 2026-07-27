"use client";

import { useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import ExpandableSection from "@cloudscape-design/components/expandable-section";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Box from "@cloudscape-design/components/box";
import Badge from "@cloudscape-design/components/badge";
import Tabs from "@cloudscape-design/components/tabs";
import Button from "@cloudscape-design/components/button";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Spinner from "@cloudscape-design/components/spinner";
import CopyToClipboard from "@cloudscape-design/components/copy-to-clipboard";
import { useHostedZone } from "@/features/hosted-zones/queries";
import { ZoneDeleteModal } from "@/features/hosted-zones/components/ZoneDeleteModal";
import { useSetBreadcrumbs } from "@/components/shell/BreadcrumbsContext";
import { pushDemoLimitationToast } from "@/lib/notifications";

// Matches docs/reference/04-records-table.png's real tab set: Records,
// Accelerated recovery, DNSSEC signing, Tags. "Hosted zone details" and
// "Query logging" aren't tabs in the real product -- the former is the
// persistent expandable panel below, the latter is a header action.
function activeTabId(pathname: string): string {
  if (pathname.endsWith("/tags")) return "tags";
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
                {/* Not in the real console's header (docs/reference/04-records-table.png shows only
                    the 3 buttons below) — kept as an extra button rather than dropped, since export
                    is a genuinely working feature here (DD-6: real behavior over literal fidelity). */}
                <Button
                  onClick={() => {
                    window.location.href = `/api/v1/hosted-zones/${zoneId}/export?format=bind`;
                  }}
                >
                  Export zone file
                </Button>
                <Button onClick={() => setDeleteModalOpen(true)}>Delete zone</Button>
                <Button onClick={pushDemoLimitationToast}>Test record</Button>
                <Button onClick={pushDemoLimitationToast}>Configure query logging</Button>
              </SpaceBetween>
            }
          >
            <SpaceBetween direction="horizontal" size="xs" alignItems="center">
              <Badge color={zone.type === "PUBLIC" ? "blue" : "grey"}>
                {zone.type === "PUBLIC" ? "Public" : "Private"}
              </Badge>
              <span>{zone.name}</span>
            </SpaceBetween>
          </Header>
        }
      >
        <SpaceBetween size="l">
          <ExpandableSection headerText="Hosted zone details" defaultExpanded variant="container">
            <SpaceBetween size="l">
              <ColumnLayout columns={3} variant="text-grid">
                <div>
                  <Box variant="awsui-key-label">Hosted zone name</Box>
                  <div>{zone.name}</div>
                </div>
                <div>
                  <Box variant="awsui-key-label">Record count</Box>
                  <div>{zone.recordCount}</div>
                </div>
                <div>
                  <Box variant="awsui-key-label">Created</Box>
                  <div>{new Date(zone.createdAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <Box variant="awsui-key-label">Description</Box>
                  <div>{zone.description || "-"}</div>
                </div>
                <div>
                  <Box variant="awsui-key-label">Created by</Box>
                  <div>{zone.createdBy}</div>
                </div>
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
              </ColumnLayout>

              <div>
                <Box variant="awsui-key-label">Name servers</Box>
                <SpaceBetween size="xs">
                  {zone.nameServers.map((ns) => (
                    <CopyToClipboard
                      key={ns}
                      copyButtonAriaLabel={`Copy ${ns}`}
                      copySuccessText="Name server copied"
                      copyErrorText="Failed to copy name server"
                      textToCopy={ns}
                      variant="inline"
                    />
                  ))}
                </SpaceBetween>
              </div>

              <Link onFollow={() => router.push(`/hosted-zones/${zoneId}/edit`)}>Edit</Link>
            </SpaceBetween>
          </ExpandableSection>

          <Tabs
            ariaLabel="Resource details"
            activeTabId={activeTabId(pathname)}
            onChange={({ detail }) => {
              if (detail.activeTabId === "accelerated-recovery") {
                pushDemoLimitationToast();
                return;
              }
              const base = `/hosted-zones/${zoneId}`;
              const target = detail.activeTabId === "records" ? base : `${base}/${detail.activeTabId}`;
              router.push(target);
            }}
            tabs={(["records", "accelerated-recovery", "dnssec-signing", "tags"] as const).map((id) => ({
              id,
              label:
                id === "records"
                  ? "Records"
                  : id === "accelerated-recovery"
                    ? "Accelerated recovery"
                    : id === "dnssec-signing"
                      ? "DNSSEC signing"
                      : "Tags",
              // Only the active tab gets the real page content — Next.js routing
              // already selected it via `children`. Passing it to all tabs would
              // mount every tab's fetch simultaneously, whether or not Cloudscape
              // itself renders inactive tab content. "Accelerated recovery" never
              // has content — selecting it is intercepted above before the route
              // ever changes.
              content: activeTabId(pathname) === id ? children : null,
            }))}
          />
        </SpaceBetween>
      </ContentLayout>
    </>
  );
}
