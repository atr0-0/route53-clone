"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import AppLayout from "@cloudscape-design/components/app-layout";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import SideNavigation, { type SideNavigationProps } from "@cloudscape-design/components/side-navigation";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Flashbar from "@cloudscape-design/components/flashbar";
import { useSession, useLogout } from "@/features/auth/queries";
import { useFlashItems, dismissFlash } from "@/lib/notifications";
import { BreadcrumbsProvider, useBreadcrumbItems } from "@/components/shell/BreadcrumbsContext";

// Reproduces Route53's real console tree (FR-E2, UI spec §3), including
// sections the brief never names — a short nav is one of the first things
// that reads as "not the real thing." Every leaf but Hosted zones routes to
// the shared ComingSoon page.
const NAV_ITEMS: SideNavigationProps["items"] = [
  { type: "link", text: "Dashboard", href: "/dashboard" },
  { type: "divider" },
  {
    type: "section",
    text: "Domains",
    items: [
      { type: "link", text: "Registered domains", href: "/domains/registered-domains" },
      { type: "link", text: "Requests", href: "/domains/requests" },
    ],
  },
  { type: "divider" },
  {
    type: "section",
    text: "Hosted zones",
    items: [
      { type: "link", text: "Hosted zones", href: "/hosted-zones" },
      { type: "link", text: "Health checks", href: "/health-checks" },
    ],
  },
  { type: "divider" },
  {
    type: "section",
    text: "Traffic flow",
    items: [
      { type: "link", text: "Traffic policies", href: "/traffic-flow/traffic-policies" },
      { type: "link", text: "Policy records", href: "/traffic-flow/policy-records" },
    ],
  },
  { type: "divider" },
  {
    type: "section",
    text: "Resolver",
    items: [
      { type: "link", text: "VPCs", href: "/resolver/vpcs" },
      { type: "link", text: "Inbound endpoints", href: "/resolver/inbound-endpoints" },
      { type: "link", text: "Outbound endpoints", href: "/resolver/outbound-endpoints" },
      { type: "link", text: "Rules", href: "/resolver/rules" },
      { type: "link", text: "Query logging", href: "/resolver/query-logging" },
    ],
  },
  { type: "divider" },
  {
    type: "section",
    text: "IP-based routing",
    items: [{ type: "link", text: "CIDR collections", href: "/ip-based-routing/cidr-collections" }],
  },
  { type: "divider" },
  { type: "link", text: "Applications", href: "/applications" },
  { type: "link", text: "Profiles", href: "/profiles" },
  { type: "link", text: "Test record", href: "/test-record" },
];

// The single "use client" boundary holding AppLayout (risk R2, architecture §3.3).
function ConsoleShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [navigationOpen, setNavigationOpen] = useState(true);
  const { data: user } = useSession();
  const logout = useLogout();
  const flashItems = useFlashItems();
  const breadcrumbItems = useBreadcrumbItems();
  // Every zone-detail sub-route lives under /hosted-zones — keep that section
  // highlighted throughout rather than only on the exact list URL.
  const activeHref = pathname.startsWith("/hosted-zones") ? "/hosted-zones" : pathname;

  function handleSignOut() {
    logout.mutate(undefined, { onSuccess: () => router.push("/login") });
  }

  return (
    <>
      <TopNavigation
        identity={{ title: "Route 53", href: "/dashboard" }}
        utilities={[
          {
            type: "button",
            text: "N. Virginia",
            iconName: "map",
            ariaLabel: "Region (mocked — selecting a region changes nothing)",
          },
          {
            type: "menu-dropdown",
            text: user?.displayName ?? "Account",
            description: user?.accountId,
            iconName: "user-profile",
            items: [{ id: "signout", text: "Sign out" }],
            onItemClick: ({ detail }) => {
              if (detail.id === "signout") handleSignOut();
            },
          },
        ]}
      />
      <AppLayout
        navigationOpen={navigationOpen}
        onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
        toolsHide
        navigation={
          <SideNavigation
            header={{ text: "Route 53", href: "/dashboard" }}
            items={NAV_ITEMS}
            activeHref={activeHref}
            onFollow={(event) => {
              event.preventDefault();
              router.push(event.detail.href);
            }}
          />
        }
        breadcrumbs={
          <BreadcrumbGroup
            items={breadcrumbItems}
            onFollow={(event) => {
              event.preventDefault();
              router.push(event.detail.href);
            }}
          />
        }
        notifications={
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
        }
        content={children}
        contentType="table"
      />
    </>
  );
}

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <BreadcrumbsProvider>
      <ConsoleShell>{children}</ConsoleShell>
    </BreadcrumbsProvider>
  );
}
