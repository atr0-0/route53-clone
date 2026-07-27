"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Container from "@cloudscape-design/components/container";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Textarea from "@cloudscape-design/components/textarea";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useHostedZone } from "@/features/hosted-zones/queries";
import { useRecord, useUpdateRecord } from "@/features/records/queries";
import { getApiErrorMessage } from "@/lib/api/errors";
import { pushFlash } from "@/lib/notifications";
import { useSetBreadcrumbs } from "@/components/shell/BreadcrumbsContext";

export default function EditRecordPage() {
  const params = useParams<{ zoneId: string; recordId: string }>();
  const router = useRouter();
  const { data: zone } = useHostedZone(params.zoneId);
  const { data: record } = useRecord(params.zoneId, params.recordId);
  const updateRecord = useUpdateRecord(params.zoneId, params.recordId);

  useSetBreadcrumbs([
    { text: "Route 53", href: "/dashboard" },
    { text: "Hosted zones", href: "/hosted-zones" },
    { text: zone?.name ?? params.zoneId, href: `/hosted-zones/${params.zoneId}` },
    { text: "Edit record", href: `/hosted-zones/${params.zoneId}/records/${params.recordId}/edit` },
  ]);

  const [valuesText, setValuesText] = useState("");
  const [ttl, setTtl] = useState("");
  const [initializedFor, setInitializedFor] = useState<string | undefined>(undefined);
  if (record && initializedFor !== record.recordId) {
    setInitializedFor(record.recordId);
    setValuesText(record.values.join("\n"));
    setTtl(record.ttl !== null ? String(record.ttl) : "");
  }

  if (!zone || !record) return null;

  const isAlias = record.aliasTarget !== null;

  function handleSubmit() {
    updateRecord.mutate(
      {
        values: isAlias ? undefined : valuesText.split("\n").map((v) => v.trim()).filter(Boolean),
        ttl: isAlias ? undefined : Number(ttl),
      },
      {
        onSuccess: () => {
          pushFlash({ type: "success", content: `Updated record ${record!.name}` });
          router.push(`/hosted-zones/${params.zoneId}`);
        },
        onError: (error) => {
          pushFlash({ type: "error", content: getApiErrorMessage(error) });
        },
      }
    );
  }

  return (
    <ContentLayout header={<Header variant="h1">Edit record</Header>}>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <Form
          errorText={updateRecord.isError ? getApiErrorMessage(updateRecord.error) : undefined}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" formAction="none" onClick={() => router.push(`/hosted-zones/${params.zoneId}`)}>
                Cancel
              </Button>
              <Button variant="primary" loading={updateRecord.isPending}>
                Save changes
              </Button>
            </SpaceBetween>
          }
        >
          <Container>
            <SpaceBetween size="l">
              {/* Name and type are the record's identity (FR-C14) — read-only text,
                  matching the zone-edit page's established pattern. */}
              <FormField label="Record name">
                <Box>{record.name}</Box>
              </FormField>
              <FormField label="Record type">
                <Box>{record.type}</Box>
              </FormField>

              {isAlias ? (
                <Box color="text-body-secondary">
                  This is an alias record. Alias targets aren&apos;t editable here.
                </Box>
              ) : (
                <>
                  <FormField
                    label="Value"
                    description="Enter multiple values on separate lines."
                  >
                    {record.type === "CNAME" ? (
                      <Input value={valuesText} onChange={({ detail }) => setValuesText(detail.value)} />
                    ) : (
                      <Textarea
                        value={valuesText}
                        onChange={({ detail }) => setValuesText(detail.value)}
                        rows={4}
                      />
                    )}
                  </FormField>

                  <FormField label="TTL (seconds)">
                    <Input value={ttl} onChange={({ detail }) => setTtl(detail.value)} type="number" />
                  </FormField>
                </>
              )}
            </SpaceBetween>
          </Container>
        </Form>
      </form>
    </ContentLayout>
  );
}
