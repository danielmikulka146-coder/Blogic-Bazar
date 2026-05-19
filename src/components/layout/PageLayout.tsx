"use client";

import { AppShell, Container, Group } from "@mantine/core";
import type { PropsWithChildren } from "react";
import { HeaderSearch } from "@/components/layout/Header";
import { PageLogo } from "@/components/layout/PageLogo";

const BODY_MAX_WIDTH = 1280;

export function PageLayout({ children }: PropsWithChildren) {
  return (
    <AppShell header={{ height: 0 }} padding="md" withBorder={false} bg="transparent">
      <AppShell.Header px="md">
        <Container size={BODY_MAX_WIDTH} h="100%">
          <Group h="100%" align="center" justify="space-between">
            <HeaderSearch />
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main style={{ paddingTop: 80 }}>
        <Container size={BODY_MAX_WIDTH} px="md">
          {children}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
