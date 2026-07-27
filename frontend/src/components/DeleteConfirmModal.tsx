"use client";

import { useState } from "react";
import Modal from "@cloudscape-design/components/modal";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import Alert from "@cloudscape-design/components/alert";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";

const CONFIRMATION_WORD = "confirm";

export interface DeleteConfirmModalProps {
  onDismiss: () => void;
  onConfirm: () => void;
  loading?: boolean;
  header: string;
  description: string;
  /** Requires typing the literal word "confirm" (case-insensitive) — the
   * verified Cloudscape console pattern (FR-B17), not the resource name.
   * Omit for the plain Cancel/Delete variant (single record, empty zone —
   * DD-10: friction scales with blast radius). */
  requireTypedConfirmation?: boolean;
  warningText?: string;
  confirmButtonText?: string;
  errorText?: string;
}

/**
 * Callers should conditionally render this component (`{open && <DeleteConfirmModal .../>}`)
 * rather than toggling a `visible` prop on an always-mounted instance — a fresh
 * mount per open means the typed-confirmation text always starts empty, with no
 * reset-on-reopen logic needed.
 */
export function DeleteConfirmModal({
  onDismiss,
  onConfirm,
  loading,
  header,
  description,
  requireTypedConfirmation,
  warningText,
  confirmButtonText = "Delete",
  errorText,
}: DeleteConfirmModalProps) {
  const [typedText, setTypedText] = useState("");

  const canConfirm = !requireTypedConfirmation || typedText.trim().toLowerCase() === CONFIRMATION_WORD;

  return (
    <Modal
      visible
      onDismiss={onDismiss}
      header={header}
      closeAriaLabel="Close"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!canConfirm} loading={loading} onClick={onConfirm}>
              {confirmButtonText}
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        <Box>{description}</Box>
        {warningText && <Alert type="warning">{warningText}</Alert>}
        {errorText && <Alert type="error">{errorText}</Alert>}
        {requireTypedConfirmation && (
          <FormField label='To confirm this deletion, type "confirm".'>
            <Input value={typedText} onChange={({ detail }) => setTypedText(detail.value)} />
          </FormField>
        )}
      </SpaceBetween>
    </Modal>
  );
}
