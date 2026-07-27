"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Select from "@cloudscape-design/components/select";
import Box from "@cloudscape-design/components/box";
import CopyToClipboard from "@cloudscape-design/components/copy-to-clipboard";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import type { TableProps } from "@cloudscape-design/components/table";
import { Suspense, useState } from "react";
import { ConsoleTable } from "@/components/table/ConsoleTable";
import { useTableState } from "@/components/table/useTableState";
import { useHostedZones, type HostedZoneListItem } from "@/features/hosted-zones/queries";
import { ZoneDeleteModal } from "@/features/hosted-zones/components/ZoneDeleteModal";
import { useSetBreadcrumbs } from "@/components/shell/BreadcrumbsContext";
import { useCreateShortcut } from "@/components/shell/KeyboardShortcutsContext";

const TYPE_OPTIONS = [
  { label: "All types", value: "" },
  { label: "Public hosted zone", value: "PUBLIC" },
  { label: "Private hosted zone", value: "PRIVATE" },
];

export default function HostedZonesPage() {
  // useTableState reads useSearchParams, which Next.js requires to sit under a
  // Suspense boundary for the build's static-shell generation.
  return (
    <Suspense fallback={null}>
      <HostedZonesPageContent />
    </Suspense>
  );
}

function HostedZonesPageContent() {
  useSetBreadcrumbs([{ text: "Route 53", href: "/dashboard" }, { text: "Hosted zones", href: "/hosted-zones" }]);
  useCreateShortcut("/hosted-zones/create");
  const router = useRouter();
  const table = useTableState({ defaultSort: "name", defaultPageSize: 10 });
  const [selected, setSelected] = useState<HostedZoneListItem[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<HostedZoneListItem | null>(null);

  const { data, isLoading } = useHostedZones({
    search: table.search,
    type: table.type as "PUBLIC" | "PRIVATE" | "",
    sort: table.sort as "name" | "recordCount" | "type" | "createdAt",
    order: table.order,
    page: table.page,
    pageSize: table.pageSize,
  });

  const columnDefinitions: TableProps<HostedZoneListItem>["columnDefinitions"] = [
    {
      id: "name",
      header: "Hosted zone name",
      sortingField: "name",
      cell: (item) => <Link href={`/hosted-zones/${item.zoneId}`}>{item.name}</Link>,
    },
    { id: "type", header: "Type", sortingField: "type", cell: (item) => (item.type === "PUBLIC" ? "Public" : "Private") },
    { id: "createdBy", header: "Created by", cell: (item) => item.createdBy },
    { id: "recordCount", header: "Record count", sortingField: "recordCount", cell: (item) => item.recordCount },
    { id: "description", header: "Description", cell: (item) => item.description ?? "-" },
    {
      id: "zoneId",
      header: "Hosted zone ID",
      cell: (item) => (
        <Box fontSize="body-s">
          <CopyToClipboard
            copyButtonAriaLabel="Copy hosted zone ID"
            copySuccessText="Hosted zone ID copied"
            copyErrorText="Hosted zone ID failed to copy"
            textToCopy={item.zoneId}
            variant="inline"
          />
        </Box>
      ),
    },
  ];

  const sortingColumn = columnDefinitions.find((c) => c.sortingField === table.sort);

  return (
    <ContentLayout header={<Header variant="h1">Route 53</Header>}>
      {deleteTarget && (
        <ZoneDeleteModal
          zone={deleteTarget}
          onDismiss={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            setSelected([]);
          }}
        />
      )}
      <ConsoleTable
        title="Hosted zones"
        columnDefinitions={columnDefinitions}
        items={data?.items ?? []}
        loading={isLoading}
        totalCount={data?.total ?? 0}
        getItemKey={(item) => item.zoneId}
        filteringText={table.filteringText}
        onFilteringTextChange={table.setFilteringText}
        onDelayedFilteringTextChange={table.setSearch}
        filteringPlaceholder="Find hosted zones"
        filterExtras={
          <Select
            selectedOption={TYPE_OPTIONS.find((o) => o.value === table.type) ?? TYPE_OPTIONS[0]}
            onChange={({ detail }) => table.setType(detail.selectedOption.value ?? "")}
            options={TYPE_OPTIONS}
          />
        }
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        sortingColumn={sortingColumn}
        sortingDescending={table.order === "desc"}
        onSortingChange={({ detail }) => {
          const field = (detail.sortingColumn.sortingField as typeof table.sort) ?? "name";
          table.setSorting(field, detail.isDescending ? "desc" : "asc");
        }}
        selectionType="single"
        onSelectionChange={setSelected}
        emptyText="No hosted zones"
        headerActions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              disabled={selected.length !== 1}
              onClick={() => router.push(`/hosted-zones/${selected[0].zoneId}/edit`)}
            >
              Edit
            </Button>
            <Button disabled={selected.length !== 1} onClick={() => setDeleteTarget(selected[0])}>
              Delete
            </Button>
            <Button variant="primary" onClick={() => router.push("/hosted-zones/create")}>
              Create hosted zone
            </Button>
          </SpaceBetween>
        }
      />
    </ContentLayout>
  );
}
