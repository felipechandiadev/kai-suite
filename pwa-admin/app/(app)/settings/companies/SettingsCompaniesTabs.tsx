"use client";

import { Tabs } from "@kai/ui";

export function SettingsCompaniesTabs() {
  const items = [
    { label: "Empresas", url: "/settings/companies" },
    { label: "Administradores globales", url: "/settings/companies/super-admins" },
  ];
  return <Tabs items={items} />;
}
