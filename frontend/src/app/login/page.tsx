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
import Grid from "@cloudscape-design/components/grid";
import Icon from "@cloudscape-design/components/icon";
import Link from "@cloudscape-design/components/link";
import Flashbar from "@cloudscape-design/components/flashbar";
import { useLogin } from "@/features/auth/queries";
import { getApiErrorMessage } from "@/lib/api/errors";
import { pushDemoLimitationToast, useFlashItems, dismissFlash } from "@/lib/notifications";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const DEMO_USERS = ["admin@example.com", "jane.doe@example.com", "devops@example.com"];
const DEMO_PASSWORD = "DemoPass123!";

const FEATURES: { icon: "globe" | "security" | "refresh"; title: string; description: string }[] = [
  {
    icon: "globe",
    title: "Global DNS management",
    description: "Create and manage hosted zones the same way you would in the real console.",
  },
  {
    icon: "security",
    title: "Safe to explore",
    description: "Every action here is sandboxed — nothing you do affects real DNS.",
  },
  {
    icon: "refresh",
    title: "Real record validation",
    description: "All nine Route 53 record types are validated against their real grammars.",
  },
];

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
  const flashItems = useFlashItems();

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
      {flashItems.length > 0 && (
        <Box padding={{ horizontal: "xxl", top: "l" }}>
          <Flashbar
            items={flashItems.map((item) => ({
              id: item.id,
              type: item.type,
              header: item.header,
              content: item.content,
              dismissible: true,
              onDismiss: () => dismissFlash(item.id),
            }))}
          />
        </Box>
      )}
      <Box padding={{ horizontal: "xxl", vertical: "l" }}>
        <Grid gridDefinition={[{ colspan: 6 }, { colspan: 6 }]}>
          <Box fontSize="heading-m" fontWeight="bold">
            Route 53
          </Box>
          <Box textAlign="right">
            <Link variant="secondary" onFollow={pushDemoLimitationToast}>
              English <Icon name="caret-down-filled" size="small" />
            </Link>
          </Box>
        </Grid>
      </Box>

      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        <Box padding={{ horizontal: "xxl", vertical: "xl" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto", width: "100%" }}>
            <Grid gridDefinition={[{ colspan: { default: 12, s: 6 } }, { colspan: { default: 12, s: 6 } }]}>
              <SpaceBetween size="l">
                <Box fontSize="display-l" fontWeight="bold">
                  Manage DNS without the busywork
                </Box>
                <Box color="text-body-secondary" fontSize="body-m">
                  A hosted-zone and DNS-record console built to feel like the real Route 53 —
                  right down to the record-set model and validation rules.
                </Box>
                <SpaceBetween size="m">
                  {FEATURES.map((feature) => (
                    <Grid key={feature.title} gridDefinition={[{ colspan: 1 }, { colspan: 11 }]}>
                      <Icon name={feature.icon} size="medium" variant="subtle" />
                      <SpaceBetween size="xxs">
                        <Box fontWeight="bold">{feature.title}</Box>
                        <Box color="text-body-secondary" fontSize="body-s">
                          {feature.description}
                        </Box>
                      </SpaceBetween>
                    </Grid>
                  ))}
                </SpaceBetween>
              </SpaceBetween>

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

                {DEMO_MODE && (
                  <Alert type="info" header="Demo credentials">
                    Sign in with any of <code>{DEMO_USERS.join(", ")}</code> — password{" "}
                    <code>{DEMO_PASSWORD}</code>
                  </Alert>
                )}
              </SpaceBetween>
            </Grid>
          </div>
        </Box>
      </div>

      <Box textAlign="center" padding={{ bottom: "xs" }}>
        <SpaceBetween direction="horizontal" size="l" alignItems="center">
          <Link variant="secondary" onFollow={pushDemoLimitationToast}>
            Privacy
          </Link>
          <Link variant="secondary" onFollow={pushDemoLimitationToast}>
            Terms of use
          </Link>
        </SpaceBetween>
      </Box>
      <Box textAlign="center" padding={{ top: "n", bottom: "xxl" }} color="text-body-secondary" fontSize="body-s">
        This is an educational clone built with Cloudscape. Not affiliated with, endorsed by, or
        connected to Amazon Web Services.
      </Box>
    </div>
  );
}
