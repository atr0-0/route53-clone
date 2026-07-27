"use client";

import { useParams } from "next/navigation";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Box from "@cloudscape-design/components/box";
import CopyToClipboard from "@cloudscape-design/components/copy-to-clipboard";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useHostedZone } from "@/features/hosted-zones/queries";

// FR-B23. The layout's summary block already shows zone ID/type/record count/
// created — this tab adds description, created by, and the copyable nameservers.
export default function HostedZoneDetailsTabPage() {
  const params = useParams<{ zoneId: string }>();
  const { data: zone } = useHostedZone(params.zoneId);

  if (!zone) return null;

  return (
    <Container header={<Header variant="h2">Hosted zone details</Header>}>
      <SpaceBetween size="l">
        <ColumnLayout columns={2} variant="text-grid">
          <div>
            <Box variant="awsui-key-label">Description</Box>
            <div>{zone.description || "-"}</div>
          </div>
          <div>
            <Box variant="awsui-key-label">Created by</Box>
            <div>{zone.createdBy}</div>
          </div>
        </ColumnLayout>

        <div>
          <Box variant="awsui-key-label">Hosted zone ID</Box>
          <CopyToClipboard
            copyButtonAriaLabel="Copy hosted zone ID"
            copySuccessText="Hosted zone ID copied"
            copyErrorText="Failed to copy hosted zone ID"
            textToCopy={zone.zoneId}
            variant="inline"
          />
          <Box fontSize="body-s" fontWeight="bold">
            {zone.zoneId}
          </Box>
        </div>

        <div>
          <Box variant="awsui-key-label">Name servers</Box>
          <SpaceBetween size="xs">
            {zone.nameServers.map((ns) => (
              <div key={ns}>
                <CopyToClipboard
                  copyButtonAriaLabel={`Copy ${ns}`}
                  copySuccessText="Name server copied"
                  copyErrorText="Failed to copy name server"
                  textToCopy={ns}
                  variant="inline"
                />
                <Box fontSize="body-s">{ns}</Box>
              </div>
            ))}
          </SpaceBetween>
        </div>
      </SpaceBetween>
    </Container>
  );
}
