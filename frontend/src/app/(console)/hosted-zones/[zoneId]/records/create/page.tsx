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
import Select from "@cloudscape-design/components/select";
import Toggle from "@cloudscape-design/components/toggle";
import Button from "@cloudscape-design/components/button";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import ExpandableSection from "@cloudscape-design/components/expandable-section";
import Box from "@cloudscape-design/components/box";
import { useHostedZone } from "@/features/hosted-zones/queries";
import { useCreateRecord, useRecordTypes } from "@/features/records/queries";
import {
  ALIAS_TARGET_TYPES,
  RECORD_TYPE_DESCRIPTIONS,
  RECORD_TYPE_ORDER,
  ROUTING_POLICIES,
  TTL_PRESETS,
} from "@/features/records/constants";
import { getApiErrorField, getApiErrorMessage } from "@/lib/api/errors";
import { pushFlash, pushDemoLimitationToast } from "@/lib/notifications";
import { useSetBreadcrumbs } from "@/components/shell/BreadcrumbsContext";

interface RecordDraft {
  key: string;
  namePrefix: string;
  type: string;
  isAlias: boolean;
  aliasTargetType: string;
  aliasTargetValue: string;
  valuesText: string;
  ttl: string;
  routingPolicy: string;
  setIdentifier: string;
  routingConfigValue: string;
}

function makeDraft(): RecordDraft {
  return {
    key: crypto.randomUUID(),
    namePrefix: "",
    type: "A",
    isAlias: false,
    aliasTargetType: ALIAS_TARGET_TYPES[0].id,
    aliasTargetValue: "",
    valuesText: "",
    ttl: "300",
    routingPolicy: "SIMPLE",
    setIdentifier: "",
    routingConfigValue: "",
  };
}

function buildRoutingConfig(draft: RecordDraft, effectiveRoutingPolicy: string): Record<string, string> | null {
  if (effectiveRoutingPolicy === "SIMPLE" || !draft.routingConfigValue) return null;
  const key =
    effectiveRoutingPolicy === "WEIGHTED"
      ? "weight"
      : effectiveRoutingPolicy === "LATENCY" || effectiveRoutingPolicy === "GEOLOCATION"
        ? "region"
        : effectiveRoutingPolicy === "FAILOVER"
          ? "failoverRole"
          : "value";
  return { [key]: draft.routingConfigValue };
}

export default function CreateRecordPage() {
  const params = useParams<{ zoneId: string }>();
  const router = useRouter();
  const { data: zone } = useHostedZone(params.zoneId);
  const { data: recordTypes } = useRecordTypes();
  const createRecord = useCreateRecord(params.zoneId);

  useSetBreadcrumbs([
    { text: "Route 53", href: "/dashboard" },
    { text: "Hosted zones", href: "/hosted-zones" },
    { text: zone?.name ?? params.zoneId, href: `/hosted-zones/${params.zoneId}` },
    { text: "Create record", href: `/hosted-zones/${params.zoneId}/records/create` },
  ]);

  const [drafts, setDrafts] = useState<RecordDraft[]>(() => [makeDraft()]);
  const [draftErrors, setDraftErrors] = useState<Record<string, Record<string, string>>>({});
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!zone) return null;

  function updateDraft(index: number, patch: Partial<RecordDraft>) {
    setDrafts((prev) => prev.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)));
  }

  async function handleSubmit() {
    setDraftErrors({});
    setFormError(undefined);
    setIsSubmitting(true);
    const createdNames: string[] = [];
    for (let i = 0; i < drafts.length; i++) {
      const draft = drafts[i];
      const isNs = draft.type === "NS";
      const effectiveRoutingPolicy = isNs ? "SIMPLE" : draft.routingPolicy;
      try {
        const record = await createRecord.mutateAsync({
          name: draft.namePrefix,
          type: draft.type as never,
          ttl: draft.isAlias ? undefined : Number(draft.ttl),
          values: draft.isAlias ? [] : draft.valuesText.split("\n").map((v) => v.trim()).filter(Boolean),
          routingPolicy: effectiveRoutingPolicy,
          setIdentifier: effectiveRoutingPolicy === "SIMPLE" ? "" : draft.setIdentifier,
          routingConfig: buildRoutingConfig(draft, effectiveRoutingPolicy),
          aliasTarget: draft.isAlias ? { type: draft.aliasTargetType, target: draft.aliasTargetValue } : null,
        });
        createdNames.push(record.name);
      } catch (error) {
        const field = getApiErrorField(error);
        const message = getApiErrorMessage(error);
        setDraftErrors({ [draft.key]: field ? { [field.split("[")[0]]: message } : {} });
        setFormError(
          drafts.length === 1 ? message : `Record ${i + 1}: ${message} (${createdNames.length} of ${drafts.length} created before this failure)`
        );
        pushFlash({ type: "error", content: message });
        setIsSubmitting(false);
        return;
      }
    }
    pushFlash({
      type: "success",
      content: createdNames.length === 1 ? `Created record ${createdNames[0]}` : `Created ${createdNames.length} records`,
    });
    router.push(`/hosted-zones/${params.zoneId}`);
  }

  return (
    <ContentLayout header={<Header variant="h1" info={<Link variant="info" onFollow={pushDemoLimitationToast}>Info</Link>}>Create record</Header>}>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <Form
          errorText={formError}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" formAction="none" onClick={() => router.push(`/hosted-zones/${params.zoneId}`)}>
                Cancel
              </Button>
              <Button variant="primary" loading={isSubmitting}>
                Create records
              </Button>
            </SpaceBetween>
          }
        >
          <Container
            header={
              <Header
                variant="h2"
                actions={<Link variant="info" onFollow={pushDemoLimitationToast}>Switch to wizard</Link>}
              >
                Quick create record
              </Header>
            }
          >
            <SpaceBetween size="l">
              {drafts.map((draft, index) => {
                const grammar = recordTypes?.find((t) => t.type === draft.type);
                const isNs = draft.type === "NS";
                const effectiveRoutingPolicy = isNs ? "SIMPLE" : draft.routingPolicy;
                const fieldErrors = draftErrors[draft.key] ?? {};

                return (
                  <ExpandableSection
                    key={draft.key}
                    variant="container"
                    defaultExpanded
                    headerText={`Record ${index + 1}`}
                    headerActions={
                      <Button
                        formAction="none"
                        disabled={drafts.length === 1}
                        onClick={() => setDrafts((prev) => prev.filter((d) => d.key !== draft.key))}
                      >
                        Delete
                      </Button>
                    }
                  >
                    <ColumnLayout columns={2}>
                      <SpaceBetween size="l">
                        <FormField
                          label="Record name"
                          info={<Link variant="info" onFollow={pushDemoLimitationToast}>Info</Link>}
                          constraintText="Keep blank to create a record for the root domain."
                          errorText={fieldErrors.name}
                        >
                          <SpaceBetween direction="horizontal" size="xs">
                            <Input
                              value={draft.namePrefix}
                              onChange={({ detail }) => updateDraft(index, { namePrefix: detail.value })}
                              placeholder="subdomain"
                            />
                            <Box padding={{ top: "xs" }}>{zone.name}</Box>
                          </SpaceBetween>
                        </FormField>

                        <FormField label="Alias">
                          <Toggle
                            checked={draft.isAlias}
                            onChange={({ detail }) => updateDraft(index, { isAlias: detail.checked })}
                          >
                            {draft.isAlias ? "Yes" : "No"}
                          </Toggle>
                        </FormField>

                        {draft.isAlias ? (
                          <FormField label="Route traffic to">
                            <ColumnLayout columns={2}>
                              <Select
                                selectedOption={
                                  ALIAS_TARGET_TYPES.find((o) => o.id === draft.aliasTargetType)
                                    ? {
                                        value: draft.aliasTargetType,
                                        label: ALIAS_TARGET_TYPES.find((o) => o.id === draft.aliasTargetType)!.label,
                                      }
                                    : null
                                }
                                onChange={({ detail }) => updateDraft(index, { aliasTargetType: detail.selectedOption.value ?? "" })}
                                options={ALIAS_TARGET_TYPES.map((o) => ({ value: o.id, label: o.label }))}
                              />
                              <Input
                                value={draft.aliasTargetValue}
                                onChange={({ detail }) => updateDraft(index, { aliasTargetValue: detail.value })}
                                placeholder="Target endpoint"
                              />
                            </ColumnLayout>
                          </FormField>
                        ) : (
                          <FormField
                            label="Value"
                            info={<Link variant="info" onFollow={pushDemoLimitationToast}>Info</Link>}
                            description="Enter multiple values on separate lines."
                            errorText={fieldErrors.values}
                          >
                            {draft.type === "CNAME" ? (
                              <Input
                                value={draft.valuesText}
                                onChange={({ detail }) => updateDraft(index, { valuesText: detail.value })}
                                placeholder={grammar?.placeholder}
                              />
                            ) : (
                              <Textarea
                                value={draft.valuesText}
                                onChange={({ detail }) => updateDraft(index, { valuesText: detail.value })}
                                placeholder={grammar?.placeholder}
                                rows={4}
                              />
                            )}
                          </FormField>
                        )}
                      </SpaceBetween>

                      <SpaceBetween size="l">
                        <FormField label="Record type" info={<Link variant="info" onFollow={pushDemoLimitationToast}>Info</Link>}>
                          <Select
                            selectedOption={{ value: draft.type, label: RECORD_TYPE_DESCRIPTIONS[draft.type] }}
                            onChange={({ detail }) => updateDraft(index, { type: detail.selectedOption.value ?? "A" })}
                            options={RECORD_TYPE_ORDER.map((t) => ({ value: t, label: RECORD_TYPE_DESCRIPTIONS[t] }))}
                          />
                        </FormField>

                        {!draft.isAlias && (
                          <FormField
                            label="TTL (seconds)"
                            info={<Link variant="info" onFollow={pushDemoLimitationToast}>Info</Link>}
                            constraintText="Recommended values: 60 to 172800 (two days)"
                            errorText={fieldErrors.ttl}
                          >
                            <SpaceBetween direction="horizontal" size="xs">
                              <Input
                                value={draft.ttl}
                                onChange={({ detail }) => updateDraft(index, { ttl: detail.value })}
                                type="number"
                              />
                              {TTL_PRESETS.map((preset) => (
                                <Button
                                  key={preset.label}
                                  formAction="none"
                                  onClick={() => updateDraft(index, { ttl: String(preset.seconds) })}
                                >
                                  {preset.label}
                                </Button>
                              ))}
                            </SpaceBetween>
                          </FormField>
                        )}

                        <FormField label="Routing policy" info={<Link variant="info" onFollow={pushDemoLimitationToast}>Info</Link>}>
                          <Select
                            disabled={isNs}
                            selectedOption={
                              ROUTING_POLICIES.find((p) => p.value === effectiveRoutingPolicy) ?? ROUTING_POLICIES[0]
                            }
                            onChange={({ detail }) => updateDraft(index, { routingPolicy: detail.selectedOption.value ?? "SIMPLE" })}
                            options={ROUTING_POLICIES}
                          />
                          {isNs && (
                            <Box fontSize="body-s" color="text-body-secondary">
                              You can specify an NS record with only simple routing policy.
                            </Box>
                          )}
                        </FormField>

                        {effectiveRoutingPolicy !== "SIMPLE" && (
                          <FormField
                            label="Set identifier"
                            description="Differentiates this record set from others sharing the same name and type."
                          >
                            <ColumnLayout columns={2}>
                              <Input
                                value={draft.setIdentifier}
                                onChange={({ detail }) => updateDraft(index, { setIdentifier: detail.value })}
                              />
                              <Input
                                value={draft.routingConfigValue}
                                onChange={({ detail }) => updateDraft(index, { routingConfigValue: detail.value })}
                                placeholder="Routing value (stored and displayed, never evaluated)"
                              />
                            </ColumnLayout>
                          </FormField>
                        )}
                      </SpaceBetween>
                    </ColumnLayout>
                  </ExpandableSection>
                );
              })}

              <Box float="right">
                <Button formAction="none" onClick={() => setDrafts((prev) => [...prev, makeDraft()])}>
                  Add another record
                </Button>
              </Box>
            </SpaceBetween>
          </Container>
        </Form>
      </form>
    </ContentLayout>
  );
}
