"use client";

import { Loader, Modal, noop, Stack, Text, Title } from "@mantine/core";
import { Construction } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

interface MaintenanceModalProps {
  children: ReactNode;
}

export function MaintenanceModal({ children }: MaintenanceModalProps) {
  const t = useTranslations();
  const { data: systemSettings } = useSystemSettings();

  const isMaintenance = !!systemSettings?.isMaintenance;

  return (
    <>
      {children}
      <Modal
        opened={isMaintenance}
        centered
        withCloseButton={false}
        closeOnClickOutside={false}
        closeOnEscape={false}
        trapFocus
        lockScroll
        overlayProps={{
          blur: 3,
        }}
        onClose={noop}
      >
        <Stack align="center" gap="md" py="xl">
          <Construction size={56} />

          <Stack align="center" gap="md">
            <Title order={3} ta="center">
              {t("common.maintenance.title")}
            </Title>

            <Text size="sm" ta="center" c="dimmed">
              {t("common.maintenance.description")}
            </Text>
          </Stack>

          <Loader type="dots" size="md" color="purple" />
        </Stack>
      </Modal>
    </>
  );
}
