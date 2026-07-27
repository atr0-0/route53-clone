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
import SpaceBetween from "@cloudscape-design/components/space-between";
import ColumnLayout from "@cloudscape-design/components/column-layout";
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
import { pushFlash } from "@/lib/notifications";
import { useSetBreadcrumbs } from "@/components/shell/BreadcrumbsContext";

export default function CreateRecordPage() {
  const params = useParams<{ zoneId: string }>();
  const router = useRouter();
  const { data: zone } = useHostedZone(params.zoneId);
  const { data: recordTypes } = useRecordTypes();
  const createRecord = useCreateRecord(params.zoneId);

  useSetBreadcrumbs([
    { text: "Route 53", href: "/hosted-zones" },
    { text: "Hosted zones", href: "/hosted-zones" },
    { text: zone?.name ?? params.zoneId, href: `/hosted-zones/${params.zoneId}` },
    { text: "Create record", href: `/hosted-zones/${params.zoneId}/records/create` },
  ]);

  const [namePrefix, setNamePrefix] = useState("");
  const [type, setType] = useState("A");
  const [isAlias, setIsAlias] = useState(false);
  const [aliasTargetType, setAliasTargetType] = useState(ALIAS_TARGET_TYPES[0].id);
  const [aliasTargetValue, setAliasTargetValue] = useState("");
  const [valuesText, setValuesText] = useState("");
  const [ttl, setTtl] = useState("300");
  const [routingPolicy, setRoutingPolicy] = useState("SIMPLE");
  const [setIdentifier, setSetIdentifier] = useState("");
  const [routingConfigValue, setRoutingConfigValue] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!zone) return null;

  const grammar = recordTypes?.find((t) => t.type === type);
  const isNs = type === "NS";
  const effectiveRoutingPolicy = isNs ? "SIMPLE" : routingPolicy;

  function buildRoutingConfig(): Record<string, string> | null {
    if (effectiveRoutingPolicy === "SIMPLE" || !routingConfigValue) return null;
    const key =
      effectiveRoutingPolicy === "WEIGHTED"
        ? "weight"
        : effectiveRoutingPolicy === "LATENCY" || effectiveRoutingPolicy === "GEOLOCATION"
          ? "region"
          : effectiveRoutingPolicy === "FAILOVER"
            ? "failoverRole"
            : "value";
    return { [key]: routingConfigValue };
  }

  function handleSubmit() {
    setFieldErrors({});
    createRecord.mutate(
      {
        name: namePrefix,
        type: type as never,
        ttl: isAlias ? undefined : Number(ttl),
        values: isAlias ? [] : valuesText.split("\n").map((v) => v.trim()).filter(Boolean),
        routingPolicy: effectiveRoutingPolicy,
        setIdentifier: effectiveRoutingPolicy === "SIMPLE" ? "" : setIdentifier,
        routingConfig: buildRoutingConfig(),
        aliasTarget: isAlias ? { type: aliasTargetType, target: aliasTargetValue } : null,
      },
      {
        onSuccess: (record) => {
          pushFlash({ type: "success", content: `Created record ${record.name}` });
          router.push(`/hosted-zones/${params.zoneId}`);
        },
        onError: (error) => {
          const field = getApiErrorField(error);
          const message = getApiErrorMessage(error);
          if (field) setFieldErrors({ [field.split("[")[0]]: message });
          pushFlash({ type: "error", content: message });
        },
      }
    );
  }

  return (
    <ContentLayout header={<Header variant="h1">Create record</Header>}>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <Form
          errorText={createRecord.isError && Object.keys(fieldErrors).length === 0 ? getApiErrorMessage(createRecord.error) : undefined}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => router.push(`/hosted-zones/${params.zoneId}`)}>
                Cancel
              </Button>
              <Button variant="primary" loading={createRecord.isPending}>
                Create records
              </Button>
            </SpaceBetween>
          }
        >
          <Container header={<Header variant="h2">Quick create record</Header>}>
            <SpaceBetween size="l">
              <FormField
                label="Record name"
                description="Enter the name of the domain or subdomain that you want to route traffic for. The default value is the name of the hosted zone."
                constraintText="Keep blank to create a record for the root domain."
                errorText={fieldErrors.name}
              >
                <ColumnLayout columns={2}>
                  <Input value={namePrefix} onChange={({ detail }) => setNamePrefix(detail.value)} />
                  <Input value={`.${zone.name}`} disabled readOnly />
                </ColumnLayout>
              </FormField>

              <FormField label="Record type">
                <Select
                  selectedOption={{ value: type, label: RECORD_TYPE_DESCRIPTIONS[type] }}
                  onChange={({ detail }) => setType(detail.selectedOption.value ?? "A")}
                  options={RECORD_TYPE_ORDER.map((t) => ({ value: t, label: RECORD_TYPE_DESCRIPTIONS[t] }))}
                />
              </FormField>

              <FormField label="Alias">
                <Toggle checked={isAlias} onChange={({ detail }) => setIsAlias(detail.checked)}>
                  {isAlias ? "Yes" : "No"}
                </Toggle>
              </FormField>

              {isAlias ? (
                <FormField label="Route traffic to">
                  <ColumnLayout columns={2}>
                    <Select
                      selectedOption={
                        ALIAS_TARGET_TYPES.find((o) => o.id === aliasTargetType)
                          ? { value: aliasTargetType, label: ALIAS_TARGET_TYPES.find((o) => o.id === aliasTargetType)!.label }
                          : null
                      }
                      onChange={({ detail }) => setAliasTargetType(detail.selectedOption.value ?? "")}
                      options={ALIAS_TARGET_TYPES.map((o) => ({ value: o.id, label: o.label }))}
                    />
                    <Input
                      value={aliasTargetValue}
                      onChange={({ detail }) => setAliasTargetValue(detail.value)}
                      placeholder="Target endpoint"
                    />
                  </ColumnLayout>
                </FormField>
              ) : (
                <>
                  <FormField
                    label="Value/Route traffic to"
                    description="Enter each value on a separate line."
                    errorText={fieldErrors.values}
                    constraintText={grammar?.placeholder ? `Example: ${grammar.placeholder}` : undefined}
                  >
                    {type === "CNAME" ? (
                      <Input
                        value={valuesText}
                        onChange={({ detail }) => setValuesText(detail.value)}
                        placeholder={grammar?.placeholder}
                      />
                    ) : (
                      <Textarea
                        value={valuesText}
                        onChange={({ detail }) => setValuesText(detail.value)}
                        placeholder={grammar?.placeholder}
                        rows={4}
                      />
                    )}
                  </FormField>

                  <FormField
                    label="TTL (seconds)"
                    description="The amount of time, in seconds, that you want DNS recursive resolvers to cache information about this record."
                    errorText={fieldErrors.ttl}
                  >
                    <SpaceBetween direction="horizontal" size="xs">
                      <Input value={ttl} onChange={({ detail }) => setTtl(detail.value)} type="number" />
                      {TTL_PRESETS.map((preset) => (
                        <Button key={preset.label} onClick={() => setTtl(String(preset.seconds))}>
                          {preset.label}
                        </Button>
                      ))}
                    </SpaceBetween>
                  </FormField>
                </>
              )}

              <FormField label="Routing policy">
                <Select
                  disabled={isNs}
                  selectedOption={
                    ROUTING_POLICIES.find((p) => p.value === effectiveRoutingPolicy) ?? ROUTING_POLICIES[0]
                  }
                  onChange={({ detail }) => setRoutingPolicy(detail.selectedOption.value ?? "SIMPLE")}
                  options={ROUTING_POLICIES}
                />
                {isNs && (
                  <Box fontSize="body-s" color="text-body-secondary">
                    You can specify an NS record with only simple routing policy.
                  </Box>
                )}
              </FormField>

              {effectiveRoutingPolicy !== "SIMPLE" && (
                <FormField label="Set identifier" description="Differentiates this record set from others sharing the same name and type.">
                  <ColumnLayout columns={2}>
                    <Input value={setIdentifier} onChange={({ detail }) => setSetIdentifier(detail.value)} />
                    <Input
                      value={routingConfigValue}
                      onChange={({ detail }) => setRoutingConfigValue(detail.value)}
                      placeholder="Routing value (stored and displayed, never evaluated)"
                    />
                  </ColumnLayout>
                </FormField>
              )}
            </SpaceBetween>
          </Container>
        </Form>
      </form>
    </ContentLayout>
  );
}
