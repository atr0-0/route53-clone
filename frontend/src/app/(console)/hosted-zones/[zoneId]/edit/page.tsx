"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Container from "@cloudscape-design/components/container";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Textarea from "@cloudscape-design/components/textarea";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import TagEditor, { type TagEditorProps } from "@cloudscape-design/components/tag-editor";
import { useHostedZone, useUpdateHostedZone } from "@/features/hosted-zones/queries";
import { getApiErrorMessage } from "@/lib/api/errors";
import { pushFlash } from "@/lib/notifications";
import { useSetBreadcrumbs } from "@/components/shell/BreadcrumbsContext";

const TAG_EDITOR_I18N_STRINGS: TagEditorProps.I18nStrings = {
  keyPlaceholder: "Enter key",
  valuePlaceholder: "Enter value",
  addButton: "Add tag",
  removeButton: "Remove",
  undoButton: "Undo",
  undoPrompt: "This tag will be removed",
  keyHeader: "Key",
  valueHeader: "Value - optional",
  optional: "optional",
  emptyTags: "No tags associated with the resource.",
};

export default function EditHostedZonePage() {
  const params = useParams<{ zoneId: string }>();
  const router = useRouter();
  const { data: zone } = useHostedZone(params.zoneId);
  const updateZone = useUpdateHostedZone(params.zoneId);

  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<TagEditorProps.Tag[]>([]);

  useSetBreadcrumbs([
    { text: "Route 53", href: "/dashboard" },
    { text: "Hosted zones", href: "/hosted-zones" },
    { text: zone?.name ?? params.zoneId, href: `/hosted-zones/${params.zoneId}` },
    { text: "Edit", href: `/hosted-zones/${params.zoneId}/edit` },
  ]);

  // Initialize the form from fetched data once it arrives — adjusted during
  // render (React's documented pattern) rather than in an effect, keyed on the
  // zone's id so it re-initializes if the route's zoneId ever changes.
  const [initializedFor, setInitializedFor] = useState<string | undefined>(undefined);
  if (zone && initializedFor !== zone.zoneId) {
    setInitializedFor(zone.zoneId);
    setDescription(zone.description ?? "");
    setTags(zone.tags.map((t) => ({ ...t, existing: true })));
  }

  if (!zone) return null;

  function handleSubmit() {
    updateZone.mutate(
      {
        description: description || undefined,
        tags: tags.filter((t) => !t.markedForRemoval).map((t) => ({ key: t.key, value: t.value })),
      },
      {
        onSuccess: () => {
          pushFlash({ type: "success", content: `Hosted zone ${zone!.name} updated` });
          router.push(`/hosted-zones/${params.zoneId}`);
        },
        onError: (error) => {
          pushFlash({ type: "error", content: getApiErrorMessage(error) });
        },
      }
    );
  }

  return (
    <ContentLayout header={<Header variant="h1">Edit hosted zone</Header>}>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <Form
          errorText={updateZone.isError ? getApiErrorMessage(updateZone.error) : undefined}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" formAction="none" onClick={() => router.push(`/hosted-zones/${params.zoneId}`)}>
                Cancel
              </Button>
              <Button variant="primary" loading={updateZone.isPending}>
                Save changes
              </Button>
            </SpaceBetween>
          }
        >
          <SpaceBetween size="l">
            <Container>
              <SpaceBetween size="l">
                {/* AC-5: immutable fields render as plain text with explanatory
                    helper text — never disabled inputs, per FR-B15 / DD-6. */}
                <FormField
                  label="Domain name"
                  description="Route 53 doesn't support renaming a hosted zone, because the zone name forms the suffix of every record it contains."
                >
                  <Box>{zone.name}</Box>
                </FormField>
                <FormField label="Type">
                  <Box>{zone.type === "PUBLIC" ? "Public hosted zone" : "Private hosted zone"}</Box>
                </FormField>
                <FormField label="Description - optional">
                  <Textarea value={description} onChange={({ detail }) => setDescription(detail.value)} />
                </FormField>
              </SpaceBetween>
            </Container>
            <Container header={<Header variant="h2">Tags</Header>}>
              <TagEditor
                tags={tags}
                onChange={({ detail }) => setTags([...detail.tags])}
                i18nStrings={TAG_EDITOR_I18N_STRINGS}
              />
            </Container>
          </SpaceBetween>
        </Form>
      </form>
    </ContentLayout>
  );
}
