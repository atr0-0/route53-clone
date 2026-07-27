"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Container from "@cloudscape-design/components/container";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Textarea from "@cloudscape-design/components/textarea";
import RadioGroup from "@cloudscape-design/components/radio-group";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import TagEditor, { type TagEditorProps } from "@cloudscape-design/components/tag-editor";
import { useCreateHostedZone } from "@/features/hosted-zones/queries";
import { getApiErrorField, getApiErrorMessage } from "@/lib/api/errors";
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

export default function CreateHostedZonePage() {
  useSetBreadcrumbs([
    { text: "Route 53", href: "/dashboard" },
    { text: "Hosted zones", href: "/hosted-zones" },
    { text: "Create hosted zone", href: "/hosted-zones/create" },
  ]);
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [tags, setTags] = useState<TagEditorProps.Tag[]>([]);
  const [nameError, setNameError] = useState<string | undefined>();

  const createZone = useCreateHostedZone();

  function handleSubmit() {
    setNameError(undefined);
    createZone.mutate(
      {
        name,
        type,
        description: description || undefined,
        tags: tags.filter((t) => !t.markedForRemoval).map((t) => ({ key: t.key, value: t.value })),
      },
      {
        onSuccess: (zone) => {
          pushFlash({ type: "success", content: `Hosted zone ${zone.name} created` });
          router.push(`/hosted-zones/${zone.zoneId}`);
        },
        onError: (error) => {
          const field = getApiErrorField(error);
          const message = getApiErrorMessage(error);
          if (field === "name") setNameError(message);
          pushFlash({ type: "error", content: message });
        },
      }
    );
  }

  return (
    <ContentLayout header={<Header variant="h1">Create hosted zone</Header>}>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <Form
          errorText={createZone.isError && !nameError ? getApiErrorMessage(createZone.error) : undefined}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" formAction="none" onClick={() => router.push("/hosted-zones")}>
                Cancel
              </Button>
              <Button variant="primary" loading={createZone.isPending}>
                Create hosted zone
              </Button>
            </SpaceBetween>
          }
        >
          <SpaceBetween size="l">
            <Container header={<Header variant="h2">Hosted zone configuration</Header>}>
              <SpaceBetween size="l">
                <FormField
                  label="Domain name"
                  errorText={nameError}
                  description="The domain name for which you want to route traffic."
                >
                  <Input value={name} onChange={({ detail }) => setName(detail.value)} placeholder="example.com" />
                </FormField>
                <FormField label="Description - optional">
                  <Textarea value={description} onChange={({ detail }) => setDescription(detail.value)} />
                </FormField>
                <FormField label="Type">
                  <RadioGroup
                    value={type}
                    onChange={({ detail }) => setType(detail.value as "PUBLIC" | "PRIVATE")}
                    items={[
                      { value: "PUBLIC", label: "Public hosted zone" },
                      { value: "PRIVATE", label: "Private hosted zone" },
                    ]}
                  />
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
