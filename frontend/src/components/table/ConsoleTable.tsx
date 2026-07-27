"use client";

import { useState } from "react";
import Table, { type TableProps } from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import TextFilter from "@cloudscape-design/components/text-filter";
import Pagination from "@cloudscape-design/components/pagination";
import CollectionPreferences from "@cloudscape-design/components/collection-preferences";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";

function counterText(total: number | undefined, selected: number): string | undefined {
  if (total === undefined) return undefined;
  return selected > 0 ? `(${selected}/${total})` : `(${total})`;
}

export interface ConsoleTableProps<T> {
  title: string;
  columnDefinitions: TableProps<T>["columnDefinitions"];
  items: T[];
  loading: boolean;
  totalCount: number;
  getItemKey: (item: T) => string;
  filteringText: string;
  onFilteringTextChange: (text: string) => void;
  onDelayedFilteringTextChange: (text: string) => void;
  filteringPlaceholder: string;
  filterExtras?: React.ReactNode;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  sortingColumn?: TableProps<T>["sortingColumn"];
  sortingDescending?: boolean;
  onSortingChange?: TableProps<T>["onSortingChange"];
  selectionType?: "single" | "multi";
  onSelectionChange?: (items: T[]) => void;
  headerActions?: React.ReactNode;
  emptyText?: string;
}

/**
 * The reusable table wrapper (implementation-plan.md Slice 3: "get it right once
 * here"). Server-side counter hidden while loading, debounced filtering via
 * TextFilter's onDelayedChange, selection reconciled whenever `items` changes
 * (Cloudscape does not do this itself — a stale selection from a previous page
 * would otherwise silently linger), stickyHeader/resizableColumns/
 * enableKeyboardNavigation. CollectionPreferences covers page size only for
 * now — density/striping/sticky-column prefs are Stage 2 (UI spec §11).
 */
export function ConsoleTable<T>({
  title,
  columnDefinitions,
  items,
  loading,
  totalCount,
  getItemKey,
  filteringText,
  onFilteringTextChange,
  onDelayedFilteringTextChange,
  filteringPlaceholder,
  filterExtras,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  sortingColumn,
  sortingDescending,
  onSortingChange,
  selectionType,
  onSelectionChange,
  headerActions,
  emptyText = "No items",
}: ConsoleTableProps<T>) {
  const [selectedItems, setSelectedItems] = useState<T[]>([]);

  // Selection reconciliation across page changes (UI spec §6 item 2): without
  // this, selectedItems keeps referencing rows that scrolled off the current page.
  // Adjusted during render (React's documented pattern for state that must react
  // to a prop change) rather than in an effect, which would cost an extra render.
  const [reconciledFor, setReconciledFor] = useState(items);
  if (reconciledFor !== items) {
    setReconciledFor(items);
    const currentKeys = new Set(items.map(getItemKey));
    const reconciled = selectedItems.filter((item) => currentKeys.has(getItemKey(item)));
    if (reconciled.length !== selectedItems.length) {
      setSelectedItems(reconciled);
    }
  }

  function handleSelectionChange(newSelection: T[]) {
    setSelectedItems(newSelection);
    onSelectionChange?.(newSelection);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <Table
      columnDefinitions={columnDefinitions}
      items={items}
      loading={loading}
      loadingText={`Loading ${title.toLowerCase()}`}
      trackBy={(item) => getItemKey(item as T)}
      selectionType={selectionType}
      selectedItems={selectionType ? selectedItems : undefined}
      onSelectionChange={({ detail }) => handleSelectionChange(detail.selectedItems as T[])}
      sortingColumn={sortingColumn}
      sortingDescending={sortingDescending}
      onSortingChange={onSortingChange}
      stickyHeader
      resizableColumns
      enableKeyboardNavigation
      variant="full-page"
      header={
        <Header counter={loading ? undefined : counterText(totalCount, selectedItems.length)} actions={headerActions}>
          {title}
        </Header>
      }
      filter={
        <SpaceBetween direction="horizontal" size="s">
          <TextFilter
            filteringText={filteringText}
            onChange={({ detail }) => onFilteringTextChange(detail.filteringText)}
            onDelayedChange={({ detail }) => onDelayedFilteringTextChange(detail.filteringText)}
            filteringPlaceholder={filteringPlaceholder}
          />
          {filterExtras}
        </SpaceBetween>
      }
      pagination={
        <Pagination
          currentPageIndex={page}
          pagesCount={totalPages}
          onChange={({ detail }) => onPageChange(detail.currentPageIndex)}
        />
      }
      preferences={
        <CollectionPreferences
          title="Preferences"
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          preferences={{ pageSize }}
          pageSizePreference={{
            title: "Page size",
            options: pageSizeOptions.map((size) => ({ value: size, label: `${size}` })),
          }}
          onConfirm={({ detail }) => {
            if (detail.pageSize) onPageSizeChange(detail.pageSize);
          }}
        />
      }
      empty={
        <Box textAlign="center" color="inherit">
          <SpaceBetween size="xs">
            <b key="message">{filteringText ? "No matches" : emptyText}</b>
            {filteringText ? (
              <Button
                key="clear"
                onClick={() => {
                  onFilteringTextChange("");
                  onDelayedFilteringTextChange("");
                }}
              >
                Clear filter
              </Button>
            ) : (
              <></>
            )}
          </SpaceBetween>
        </Box>
      }
    />
  );
}
