"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@cloudscape-design/components/app-layout";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Flashbar from "@cloudscape-design/components/flashbar";
import { useSession, useLogout } from "@/features/auth/queries";
import { useFlashItems, dismissFlash } from "@/lib/notifications";
import { BreadcrumbsProvider, useBreadcrumbItems } from "@/components/shell/BreadcrumbsContext";

// The single "use client" boundary holding AppLayout (risk R2, architecture §3.3).
// SideNavigation is minimal here — just Hosted zones — the full console tree
// (FR-E2) is Slice 6.
function ConsoleShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [navigationOpen, setNavigationOpen] = useState(true);
  const { data: user } = useSession();
  const logout = useLogout();
  const flashItems = useFlashItems();
  const breadcrumbItems = useBreadcrumbItems();

  function handleSignOut() {
    logout.mutate(undefined, { onSuccess: () => router.push("/login") });
  }

  return (
    <>
      <TopNavigation
        identity={{ title: "Route 53", href: "/hosted-zones" }}
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
            header={{ text: "Route 53", href: "/hosted-zones" }}
            items={[{ type: "link", text: "Hosted zones", href: "/hosted-zones" }]}
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
