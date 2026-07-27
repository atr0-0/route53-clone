"use client";

import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { useDeleteHostedZone } from "@/features/hosted-zones/queries";
import { getApiErrorMessage } from "@/lib/api/errors";
import { pushFlash } from "@/lib/notifications";

export interface ZoneDeleteModalProps {
  zone: { zoneId: string; name: string; recordCount: number };
  onDismiss: () => void;
  onDeleted: () => void;
}

const REQUIRED_RECORD_COUNT = 2; // SOA + apex NS, always present (FR-B13)

/**
 * Reconciles FR-B17/FR-B18/FR-B18a into one modal with two variants, decided
 * from the zone's already-known recordCount (no wasted round-trip): DD-10 —
 * friction scales with blast radius. An empty zone (only its required SOA +
 * apex NS) gets a plain Cancel/Delete; a populated one proactively shows the
 * HostedZoneNotEmpty message as context and requires typing "confirm" before
 * the escape-hatch cascade delete.
 */
export function ZoneDeleteModal({ zone, onDismiss, onDeleted }: ZoneDeleteModalProps) {
  const deleteZone = useDeleteHostedZone(zone.zoneId);
  const nonRequiredCount = Math.max(zone.recordCount - REQUIRED_RECORD_COUNT, 0);
  const isEmpty = nonRequiredCount === 0;

  function handleConfirm() {
    deleteZone.mutate(
      { cascade: !isEmpty },
      {
        onSuccess: () => {
          pushFlash({ type: "success", content: `Hosted zone ${zone.name} deleted` });
          onDeleted();
        },
        onError: (error) => {
          pushFlash({ type: "error", content: getApiErrorMessage(error) });
          onDismiss();
        },
      }
    );
  }

  if (isEmpty) {
    return (
      <DeleteConfirmModal
        header={`Delete ${zone.name}?`}
        description="Permanently delete this hosted zone? You can't undo this action."
        loading={deleteZone.isPending}
        onDismiss={onDismiss}
        onConfirm={handleConfirm}
      />
    );
  }

  return (
    <DeleteConfirmModal
      header={`Delete ${zone.name}?`}
      description="Permanently delete this hosted zone? You can't undo this action."
      warningText="The specified hosted zone contains non-required resource record sets and so cannot be deleted."
      requireTypedConfirmation
      confirmButtonText={`Delete all ${nonRequiredCount} records, then delete this zone`}
      loading={deleteZone.isPending}
      onDismiss={onDismiss}
      onConfirm={handleConfirm}
    />
  );
}
