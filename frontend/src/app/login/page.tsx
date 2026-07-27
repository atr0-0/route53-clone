"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Button from "@cloudscape-design/components/button";
import Alert from "@cloudscape-design/components/alert";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Grid from "@cloudscape-design/components/grid";
import Icon from "@cloudscape-design/components/icon";
import { useLogin } from "@/features/auth/queries";
import { getApiErrorMessage } from "@/lib/api/errors";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const DEMO_USERS = ["admin@example.com", "jane.doe@example.com", "devops@example.com"];
const DEMO_PASSWORD = "DemoPass123!";

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary for the build's static-shell
  // generation.
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: () => {
          const next = searchParams.get("next");
          router.push(next || "/dashboard");
        },
      }
    );
  }

  return (
    <Box padding={{ vertical: "xxl", horizontal: "l" }}>
      <Box textAlign="center" padding={{ bottom: "xl" }}>
        <SpaceBetween size="xs" alignItems="center">
          <Box variant="h1" fontSize="display-l" fontWeight="bold">
            Route 53
          </Box>
          <Box variant="p" color="text-body-secondary">
            DNS management console
          </Box>
        </SpaceBetween>
      </Box>

      <Grid gridDefinition={[{ colspan: { default: 12, xs: 6 }, offset: { xs: 3 } }]}>
        <SpaceBetween size="l">
          <Container>
            <SpaceBetween size="l">
              <Header
                variant="h2"
                description="Sign in with your seeded demo account to manage hosted zones and records."
              >
                <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                  <Icon name="lock-private" />
                  <span>Sign in</span>
                </SpaceBetween>
              </Header>
              <form onSubmit={handleSubmit}>
                <Form
                  errorText={login.isError ? getApiErrorMessage(login.error) : undefined}
                  actions={
                    <Button variant="primary" loading={login.isPending}>
                      Sign in
                    </Button>
                  }
                >
                  <SpaceBetween size="l">
                    <FormField label="Email">
                      <Input
                        value={email}
                        onChange={({ detail }) => setEmail(detail.value)}
                        type="email"
                        autoFocus
                      />
                    </FormField>
                    <FormField label="Password">
                      <Input
                        value={password}
                        onChange={({ detail }) => setPassword(detail.value)}
                        type="password"
                      />
                    </FormField>
                  </SpaceBetween>
                </Form>
              </form>
            </SpaceBetween>
          </Container>

          {DEMO_MODE && (
            <Alert type="info" header="Demo credentials">
              Sign in with any of <code>{DEMO_USERS.join(", ")}</code> — password{" "}
              <code>{DEMO_PASSWORD}</code>
            </Alert>
          )}
        </SpaceBetween>
      </Grid>

      <Box textAlign="center" padding={{ top: "xxl" }} color="text-body-secondary" fontSize="body-s">
        This is an educational clone built with Cloudscape. Not affiliated with, endorsed by, or
        connected to Amazon Web Services.
      </Box>
    </Box>
  );
}
