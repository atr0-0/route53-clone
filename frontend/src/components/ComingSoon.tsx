"use client";

import { useRouter } from "next/navigation";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Container from "@cloudscape-design/components/container";

// Exact copy from 07-ui-spec.md §5.7 (FR-F1).
export function ComingSoon() {
  const router = useRouter();
  return (
    <Container>
      <Box textAlign="center" padding="xxl">
        <SpaceBetween size="m">
          <Box variant="h2">Coming soon</Box>
          <Box variant="p" color="text-body-secondary">
            This section isn&apos;t implemented in this demo. Hosted zones and records are fully
            functional.
          </Box>
          <Button onClick={() => router.push("/hosted-zones")}>Go to hosted zones</Button>
        </SpaceBetween>
      </Box>
    </Container>
  );
}
