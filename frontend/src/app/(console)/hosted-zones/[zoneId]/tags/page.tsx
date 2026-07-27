"use client";

import { useParams } from "next/navigation";
import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import Box from "@cloudscape-design/components/box";
import { useHostedZone } from "@/features/hosted-zones/queries";

// Real functionality, not a placeholder — the zone's tags already exist as
// data (editable via the zone edit form's TagEditor); this tab just surfaces
// them read-only, matching the real console's dedicated Tags tab
// (docs/reference/04-records-table.png) rather than burying them only in
// the edit form.
export default function ZoneTagsTabPage() {
  const params = useParams<{ zoneId: string }>();
  const { data: zone, isLoading } = useHostedZone(params.zoneId);
  const tags = zone?.tags ?? [];

  return (
    <Table
      header={<Header counter={`(${tags.length})`}>Tags</Header>}
      loading={isLoading}
      loadingText="Loading tags"
      columnDefinitions={[
        { id: "key", header: "Key", cell: (tag) => tag.key },
        { id: "value", header: "Value", cell: (tag) => tag.value },
      ]}
      items={tags}
      trackBy="key"
      empty={
        <Box textAlign="center" color="inherit">
          No tags associated with this resource.
        </Box>
      }
    />
  );
}
