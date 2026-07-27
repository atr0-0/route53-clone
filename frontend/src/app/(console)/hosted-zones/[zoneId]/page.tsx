"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import Box from "@cloudscape-design/components/box";
import type { TableProps } from "@cloudscape-design/components/table";
import { ConsoleTable } from "@/components/table/ConsoleTable";
import { useTableState } from "@/components/table/useTableState";
import { useRecords, type RecordListItem } from "@/features/records/queries";

// Read-only for now (Slice 3, AC-2) — create/edit/delete and the type multiselect
// filter are Slice 4 (session C). ConsoleTable is reused as-is, just without
// mutation actions wired up yet.
export default function RecordsTabPage() {
  // useTableState reads useSearchParams, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <RecordsTabPageContent />
    </Suspense>
  );
}

function RecordsTabPageContent() {
  const params = useParams<{ zoneId: string }>();
  const table = useTableState({ defaultPageSize: 10 });

  const { data, isLoading } = useRecords({
    zoneId: params.zoneId,
    search: table.search,
    page: table.page,
    pageSize: table.pageSize,
  });

  const columnDefinitions: TableProps<RecordListItem>["columnDefinitions"] = [
    { id: "name", header: "Record name", cell: (item) => item.name },
    { id: "type", header: "Type", cell: (item) => item.type },
    {
      id: "routingPolicy",
      header: "Routing policy",
      cell: (item) => (item.routingPolicy === "SIMPLE" ? "Simple" : item.routingPolicy),
    },
    { id: "alias", header: "Alias", cell: (item) => (item.aliasTarget ? "Yes" : "No") },
    {
      id: "values",
      header: "Value/Route traffic to",
      cell: (item) => (
        <Box>
          {item.values.slice(0, 3).map((value, index) => (
            <div key={index}>{value}</div>
          ))}
          {item.values.length > 3 && (
            <Box color="text-body-secondary">+{item.values.length - 3} more</Box>
          )}
        </Box>
      ),
    },
    { id: "ttl", header: "TTL (seconds)", cell: (item) => item.ttl ?? "-" },
  ];

  return (
    <ConsoleTable
      title="Records"
      columnDefinitions={columnDefinitions}
      items={data?.items ?? []}
      loading={isLoading}
      totalCount={data?.total ?? 0}
      getItemKey={(item) => item.recordId}
      filteringText={table.filteringText}
      onFilteringTextChange={table.setFilteringText}
      onDelayedFilteringTextChange={table.setSearch}
      filteringPlaceholder="Filter records by property or value"
      page={table.page}
      pageSize={table.pageSize}
      onPageChange={table.setPage}
      onPageSizeChange={table.setPageSize}
      emptyText="No records"
    />
  );
}
