"use client";

import { useEffect, useState } from "react";
import AppLayout from "@cloudscape-design/components/app-layout";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Container from "@cloudscape-design/components/container";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import SpaceBetween from "@cloudscape-design/components/space-between";

type HealthState = "loading" | "ok" | "error";

export default function Home() {
  const [health, setHealth] = useState<HealthState>("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((body) => {
        if (!cancelled) setHealth(body?.status === "ok" ? "ok" : "error");
      })
      .catch(() => {
        if (!cancelled) setHealth("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppLayout
      navigationOpen
      toolsHide
      navigation={
        <SideNavigation
          header={{ text: "Route 53", href: "/" }}
          items={[{ type: "link", text: "Hosted zones", href: "/" }]}
        />
      }
      content={
        <ContentLayout header={<Header variant="h1">Route 53</Header>}>
          <SpaceBetween size="l">
            <Container header={<Header variant="h2">Slice 0 spike</Header>}>
              <SpaceBetween size="s">
                <div>
                  Backend reachability, through the <code>/api/*</code> rewrite:
                </div>
                {health === "loading" && (
                  <StatusIndicator type="loading">Checking backend…</StatusIndicator>
                )}
                {health === "ok" && (
                  <StatusIndicator type="success">Backend reachable</StatusIndicator>
                )}
                {health === "error" && (
                  <StatusIndicator type="error">Backend unreachable</StatusIndicator>
                )}
              </SpaceBetween>
            </Container>
          </SpaceBetween>
        </ContentLayout>
      }
    />
  );
}
