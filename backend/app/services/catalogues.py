"""Static mock catalogues: no CRUD, no database table — fixed constants (DR-11).

A table would imply a mutability that does not exist for these values.
"""

MOCKED_ACCOUNT_ID = "123456789012"

REGIONS = [
    {"id": "us-east-1", "label": "US East (N. Virginia)"},
    {"id": "us-west-2", "label": "US West (Oregon)"},
    {"id": "eu-west-1", "label": "Europe (Ireland)"},
    {"id": "ap-south-1", "label": "Asia Pacific (Mumbai)"},
]

# Alias target types (FR-C12) — the picker is populated from this static list;
# no real AWS resources are queried and targets are never resolved (AS-O4).
ALIAS_TARGET_TYPES = [
    {"id": "cloudfront", "label": "CloudFront distribution"},
    {"id": "s3-website", "label": "S3 website endpoint"},
    {"id": "elb", "label": "Elastic Load Balancer"},
    {"id": "api-gateway", "label": "API Gateway"},
]
