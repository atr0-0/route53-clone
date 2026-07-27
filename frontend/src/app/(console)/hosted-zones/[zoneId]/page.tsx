"use client";

import { Suspense, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Multiselect from "@cloudscape-design/components/multiselect";
import type { TableProps } from "@cloudscape-design/components/table";
import { ConsoleTable } from "@/components/table/ConsoleTable";
import { useTableState } from "@/components/table/useTableState";
import { useRecords, useBulkDeleteRecords, type RecordListItem } from "@/features/records/queries";
import { RECORD_TYPE_ORDER } from "@/features/records/constants";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { getApiErrorMessage } from "@/lib/api/errors";
import { pushFlash } from "@/lib/notifications";
import { useCreateShortcut } from "@/components/shell/KeyboardShortcutsContext";

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
          <Multiselect
            placeholder="Record type"
            selectedOptions={(table.type ? table.type.split(",") : []).map((t) => ({ value: t, label: t }))}
            onChange={({ detail }) =>
              table.setType(detail.selectedOptions.map((o) => o.value).join(","))
            }
            options={RECORD_TYPE_ORDER.map((t) => ({ value: t, label: t }))}
          />
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
