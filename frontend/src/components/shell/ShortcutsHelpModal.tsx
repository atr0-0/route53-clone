"use client";

import Modal from "@cloudscape-design/components/modal";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";

const SHORTCUTS = [
  { key: "/", description: "Focus the search box" },
  { key: "c", description: "Create (on screens with a create action)" },
  { key: "Esc", description: "Close the open dialog" },
  { key: "?", description: "Show this reference" },
];

export function ShortcutsHelpModal({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  return (
    <Modal visible={visible} onDismiss={onDismiss} header="Keyboard shortcuts">
      <SpaceBetween size="l">
        <KeyValuePairs
          columns={1}
          items={SHORTCUTS.map((shortcut) => ({
            label: <Box variant="code">{shortcut.key}</Box>,
            value: shortcut.description,
          }))}
        />
        <Box color="text-body-secondary" fontSize="body-s">
          Suppressed while a text field has focus.
        </Box>
      </SpaceBetween>
    </Modal>
  );
}
