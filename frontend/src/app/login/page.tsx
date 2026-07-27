"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Button from "@cloudscape-design/components/button";
import Alert from "@cloudscape-design/components/alert";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Icon from "@cloudscape-design/components/icon";
import TopNavigation from "@cloudscape-design/components/top-navigation";
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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Same TopNavigation the authenticated console uses (console)/layout.tsx —
          the dark identity bar carries over from sign-in into the app, rather
          than inventing separate pre-auth branding. */}
      <TopNavigation identity={{ title: "Route 53", href: "/login" }} utilities={[]} />

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Box padding={{ vertical: "xxl", horizontal: "l" }}>
          <SpaceBetween size="l" alignItems="center">
            <div style={{ width: "440px", maxWidth: "100%" }}>
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
                    <SpaceBetween size="l">
                      {login.isError && (
                        <Alert type="error">{getApiErrorMessage(login.error)}</Alert>
                      )}
                      <FormField label="Email address">
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
                      <Button variant="primary" loading={login.isPending} fullWidth>
                        Sign in
                      </Button>
                    </SpaceBetween>
                  </form>
                </SpaceBetween>
              </Container>
            </div>

            {DEMO_MODE && (
              <div style={{ width: "440px", maxWidth: "100%" }}>
                <Alert type="info" header="Demo credentials">
                  Sign in with any of <code>{DEMO_USERS.join(", ")}</code> — password{" "}
                  <code>{DEMO_PASSWORD}</code>
                </Alert>
              </div>
            )}
          </SpaceBetween>
        </Box>
      </div>

      <Box textAlign="center" padding={{ vertical: "l", horizontal: "l" }} color="text-body-secondary" fontSize="body-s">
        This is an educational clone built with Cloudscape. Not affiliated with, endorsed by, or
        connected to Amazon Web Services.
      </Box>
    </div>
  );
}
