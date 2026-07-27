// Only A's wording is screenshot-verified (docs/reference/05-create-record-form.png:
// "A – Routes traffic to an IPv4 address and some AWS resources"). The rest follow
// the same "Routes traffic to..."/"Contains/Specifies..." phrasing from the AWS
// Route53 developer guide but aren't directly captured — best-effort, not [VERIFIED].
export const RECORD_TYPE_DESCRIPTIONS: Record<string, string> = {
  A: "A – Routes traffic to an IPv4 address and some AWS resources", // [VERIFIED]
  AAAA: "AAAA – Routes traffic to an IPv6 address and some AWS resources",
  CAA: "CAA – Restricts the certificate authorities allowed to issue certificates for the domain",
  CNAME: "CNAME – Routes traffic to another domain name",
  MX: "MX – Specifies mail servers for the domain and a priority for each",
  NS: "NS – Contains the name servers for the hosted zone",
  PTR: "PTR – Maps an IP address to a domain name, for reverse DNS lookups",
  SRV: "SRV – Specifies the hostname and port for servers that provide a service",
  TXT: "TXT – Contains text information, often used for domain ownership verification",
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

// docs/reference/05-create-record-form.png shows exactly 1m/1h/1d — no 5m preset.
export const TTL_PRESETS = [
  { label: "1m", seconds: 60 },
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
