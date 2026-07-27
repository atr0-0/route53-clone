"use client";

import { Suspense, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Multiselect from "@cloudscape-design/components/multiselect";
import Select from "@cloudscape-design/components/select";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import type { TableProps } from "@cloudscape-design/components/table";
import { ConsoleTable } from "@/components/table/ConsoleTable";
import { useTableState } from "@/components/table/useTableState";
import { useRecords, useBulkDeleteRecords, type RecordListItem } from "@/features/records/queries";
import { RECORD_TYPE_ORDER, ROUTING_POLICIES } from "@/features/records/constants";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { getApiErrorMessage } from "@/lib/api/errors";
import { pushFlash } from "@/lib/notifications";
import { useCreateShortcut } from "@/components/shell/KeyboardShortcutsContext";
import { useSetSplitPanel } from "@/components/shell/SplitPanelContext";

const ALIAS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
];

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
  const router = useRouter();
  useCreateShortcut(`/hosted-zones/${params.zoneId}/records/create`);
  const table = useTableState({ defaultPageSize: 10 });
  const [selected, setSelected] = useState<RecordListItem[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const bulkDeleteRecords = useBulkDeleteRecords(params.zoneId);

  const { data, isLoading } = useRecords({
    zoneId: params.zoneId,
    search: table.search,
    types: table.type ? table.type.split(",") : undefined,
    routingPolicy: table.routingPolicy || undefined,
    alias: table.alias ? table.alias === "true" : undefined,
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

  const selectedRecord = selected[0];
  const hasRequiredSelected = selected.some((record) => record.isRequired);

  // Real Records tab has a split panel showing the selected record's details
  // (docs/reference/04-records-table.png: "N records selected" / "Select a
  // record to see its details").
  useSetSplitPanel(
    {
      header: selected.length === 1 ? "1 record selected" : `${selected.length} records selected`,
      content:
      selected.length === 0 ? (
        <Box color="text-body-secondary">Select a record to see its details.</Box>
      ) : selected.length > 1 ? (
        <Box color="text-body-secondary">Select a single record to see its details.</Box>
      ) : (
        <ColumnLayout columns={2} variant="text-grid">
          <div>
            <Box variant="awsui-key-label">Record name</Box>
            <div>{selectedRecord.name}</div>
          </div>
          <div>
            <Box variant="awsui-key-label">Type</Box>
            <div>{selectedRecord.type}</div>
          </div>
          <div>
            <Box variant="awsui-key-label">Routing policy</Box>
            <div>{selectedRecord.routingPolicy === "SIMPLE" ? "Simple" : selectedRecord.routingPolicy}</div>
          </div>
          <div>
            <Box variant="awsui-key-label">Alias</Box>
            <div>{selectedRecord.aliasTarget ? "Yes" : "No"}</div>
          </div>
          <div>
            <Box variant="awsui-key-label">TTL (seconds)</Box>
            <div>{selectedRecord.ttl ?? "-"}</div>
          </div>
          <div>
            <Box variant="awsui-key-label">Value/Route traffic to</Box>
            <SpaceBetween size="xxs">
              {selectedRecord.values.map((value, index) => (
                <div key={index}>{value}</div>
              ))}
            </SpaceBetween>
          </div>
        </ColumnLayout>
      ),
    },
    selected.map((record) => record.recordId).join(",")
  );

  return (
    <>
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
        filterExtras={
          <SpaceBetween direction="horizontal" size="s">
            <Multiselect
              placeholder="Record type"
              selectedOptions={(table.type ? table.type.split(",") : []).map((t) => ({ value: t, label: t }))}
              onChange={({ detail }) =>
                table.setType(detail.selectedOptions.map((o) => o.value).join(","))
              }
              options={RECORD_TYPE_ORDER.map((t) => ({ value: t, label: t }))}
            />
            <Select
              placeholder="Routing policy"
              selectedOption={
                table.routingPolicy
                  ? ROUTING_POLICIES.find((p) => p.value === table.routingPolicy) ?? null
                  : { label: "All routing policies", value: "" }
              }
              onChange={({ detail }) => table.setRoutingPolicy(detail.selectedOption.value ?? "")}
              options={[{ label: "All routing policies", value: "" }, ...ROUTING_POLICIES]}
            />
            <Select
              placeholder="Alias"
              selectedOption={ALIAS_OPTIONS.find((o) => o.value === table.alias) ?? ALIAS_OPTIONS[0]}
              onChange={({ detail }) => table.setAlias(detail.selectedOption.value ?? "")}
              options={ALIAS_OPTIONS}
            />
          </SpaceBetween>
        }
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        selectionType="multi"
        onSelectionChange={setSelected}
        emptyText="No records"
        headerActions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              disabled={selected.length !== 1}
              onClick={() => router.push(`/hosted-zones/${params.zoneId}/records/${selectedRecord.recordId}/edit`)}
            >
              Edit
            </Button>
            <Button
              disabled={selected.length === 0 || hasRequiredSelected}
              disabledReason={
                hasRequiredSelected
                  ? "Required records are included in the selection and cannot be deleted."
                  : undefined
              }
              onClick={() => setConfirmingDelete(true)}
            >
              Delete
            </Button>
            <Button
              variant="primary"
              onClick={() => router.push(`/hosted-zones/${params.zoneId}/records/create`)}
            >
              Create record
            </Button>
          </SpaceBetween>
        }
      />
      {confirmingDelete && (
        <DeleteConfirmModal
          // FR-G4: the same type-"confirm" pattern as cascade zone delete
          // (DD-10) — bulk-select is the only delete path left on this table.
          header={selected.length === 1 ? "Delete record?" : `Delete ${selected.length} records?`}
          description={
            selected.length === 1
              ? `Permanently delete ${selectedRecord.name} (${selectedRecord.type})? You can't undo this action.`
              : `Permanently delete ${selected.length} records? You can't undo this action.`
          }
          requireTypedConfirmation
          confirmButtonText="Delete"
          loading={bulkDeleteRecords.isPending}
          onDismiss={() => setConfirmingDelete(false)}
          onConfirm={() => {
            const names = selected.map((record) => record.name);
            bulkDeleteRecords.mutate(
              selected.map((record) => record.recordId),
              {
                onSuccess: () => {
                  pushFlash({
                    type: "success",
                    content:
                      names.length === 1 ? `Deleted record ${names[0]}` : `Deleted ${names.length} records`,
                  });
                  setConfirmingDelete(false);
                  setSelected([]);
                },
                onError: (error) => {
                  pushFlash({ type: "error", content: getApiErrorMessage(error) });
                  setConfirmingDelete(false);
                },
              }
            );
          }}
        />
      )}
    </>
  );
}
