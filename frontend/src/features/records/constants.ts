// Verified console copy (07-ui-spec.md §7) — exact type-option descriptions.
export const RECORD_TYPE_DESCRIPTIONS: Record<string, string> = {
  A: "A — IPv4 address",
  AAAA: "AAAA — IPv6 address",
  CAA: "CAA — Certificate Authority Authorization",
  CNAME: "CNAME — Canonical name",
  MX: "MX — Mail exchange",
  NS: "NS — Name server",
  PTR: "PTR — Pointer",
  SRV: "SRV — Service locator",
  TXT: "TXT — Text",
};

export const RECORD_TYPE_ORDER = ["A", "AAAA", "CNAME", "MX", "NS", "PTR", "SRV", "TXT", "CAA"];

// FR-C12 / DR-11: a static mocked list, not an API-served catalogue — mirrors
// backend/app/services/catalogues.py's ALIAS_TARGET_TYPES exactly. Kept in sync
// by hand since it's fixed reference data, not a grammar (unlike /record-types,
// which DD-9 requires never be duplicated).
export const ALIAS_TARGET_TYPES = [
  { id: "cloudfront", label: "CloudFront distribution" },
  { id: "s3-website", label: "S3 website endpoint" },
  { id: "elb", label: "Elastic Load Balancer" },
  { id: "api-gateway", label: "API Gateway" },
];

export const TTL_PRESETS = [
  { label: "1m", seconds: 60 },
  { label: "5m", seconds: 300 },
  { label: "1h", seconds: 3600 },
  { label: "1d", seconds: 86400 },
];

export const ROUTING_POLICIES = [
  { value: "SIMPLE", label: "Simple routing" },
  { value: "WEIGHTED", label: "Weighted" },
  { value: "LATENCY", label: "Latency" },
  { value: "GEOLOCATION", label: "Geolocation" },
  { value: "GEOPROXIMITY", label: "Geoproximity" },
  { value: "FAILOVER", label: "Failover" },
  { value: "MULTIVALUE_ANSWER", label: "Multivalue answer" },
  { value: "IP_BASED", label: "IP-based" },
];
