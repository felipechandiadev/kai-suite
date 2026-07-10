#!/usr/bin/env node
/**
 * Reemplaza implementaciones locales por re-exports desde @kai/ui.
 * Mantiene rutas @/shared/components/... para compatibilidad.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const apps = ["pwa-admin", "pwa-pos"];
const componentsRoot = "src/shared/components";

const stubs = {
  Alert: {
    "index.ts": `export { Alert as default, type AlertVariant } from "@kai/ui";\n`,
    "Alert.tsx": `export { Alert as default, type AlertVariant } from "@kai/ui";\n`,
  },
  Badge: {
    "index.ts": `export { Badge, type BadgeVariant } from "@kai/ui";\nexport { Badge as default } from "@kai/ui";\n`,
    "Badge.tsx": `export { Badge as default, type BadgeVariant } from "@kai/ui";\n`,
  },
  Button: {
    "index.ts": `export { Button, ButtonPill, ButtonGroup, ButtonGroupItem, ButtonGroupToggle } from "@kai/ui";\nexport type { ButtonGroupProps, ButtonGroupItemProps, ButtonGroupToggleProps, ButtonGroupToggleOption, ButtonGroupDensity } from "@kai/ui";\n`,
    "Button.tsx": `export { Button } from "@kai/ui";\n`,
    "ButtonPill.tsx": `export { ButtonPill } from "@kai/ui";\n`,
    "ButtonGroup.tsx": `export { ButtonGroup, ButtonGroupItem, ButtonGroupToggle } from "@kai/ui";\nexport type { ButtonGroupProps, ButtonGroupItemProps, ButtonGroupToggleProps, ButtonGroupToggleOption, ButtonGroupDensity } from "@kai/ui";\n`,
  },
  IconButton: {
    "index.ts": `export { IconButton as default } from "@kai/ui";\n`,
    "IconButton.tsx": `export { IconButton as default } from "@kai/ui";\n`,
  },
  Switch: {
    "index.ts": `export { Switch as default, type SwitchOptionLabels, type SwitchDensity } from "@kai/ui";\n`,
    "Switch.tsx": `export { Switch as default, type SwitchOptionLabels, type SwitchDensity } from "@kai/ui";\n`,
  },
  DotProgress: {
    "index.ts": `export { DotProgress as default } from "@kai/ui";\n`,
    "DotProgress.tsx": `export { DotProgress as default } from "@kai/ui";\n`,
  },
  Select: {
    "index.ts": `export { Select, type SelectOption, type Option } from "@kai/ui";\nexport { default } from "@kai/ui/components/Select/Select";\n`,
    "Select.tsx": `export { default, type Option } from "@kai/ui/components/Select/Select";\n`,
  },
  AutoComplete: {
    "index.ts": `export { AutoComplete as default } from "@kai/ui";\n`,
    "AutoComplete.tsx": `export { AutoComplete as default } from "@kai/ui";\n`,
  },
  DropdownList: {
    "index.ts": `export { DropdownList as default } from "@kai/ui";\n`,
    "DropdownList.tsx": `export { DropdownList as default } from "@kai/ui";\n`,
  },
  NumberStepper: {
    "index.ts": `export { NumberStepper as default } from "@kai/ui";\n`,
    "NumberStepper.tsx": `export { NumberStepper as default } from "@kai/ui";\n`,
  },
  TextField: {
    "index.ts": `export { default, TextField } from "@kai/ui";\n`,
    "TextField.tsx": `export { TextField, default } from "@kai/ui";\n`,
    "resolve-touch-input-mode.ts": `export * from "@kai/ui/components/TextField/resolve-touch-input-mode";\n`,
  },
  Dialog: {
    "index.ts": `export { Dialog as default, DeleteDialog, type DeleteDialogProps } from "@kai/ui";\n`,
    "Dialog.tsx": `export { Dialog as default } from "@kai/ui";\n`,
    "DeleteDialog.tsx": `export { DeleteDialog as default, DeleteDialog, type DeleteDialogProps } from "@kai/ui";\n`,
    "ChangePasswordDialog.tsx": null,
  },
  layouts: {
    "index.ts": `export * from "@kai/ui/components/layouts";\n`,
    "BasicPageLayout.tsx": `export { BasicPageLayout, type BasicPageLayoutProps } from "@kai/ui";\n`,
    "CollectionPageLayout.tsx": `export { CollectionPageLayout, buildContentGridClassNames, type CollectionGridColumnConfig, type CollectionPageLayoutProps } from "@kai/ui";\n`,
    "TabPageLayout.tsx": `export { TabPageLayout, type TabPageLayoutProps } from "@kai/ui";\n`,
    "layoutPageTokens.ts": `export { adminFillViewportBelowTopBarClassName, dataGridFillViewportTabPageProps, layoutPageContentClassName, layoutPageHeaderClassName, layoutPageRootClassName, layoutPageRootClassNameCompact, layoutPageSubtitleClassName, layoutPageTitleClassName } from "@kai/ui";\n`,
  },
  DataGrid: {
    "index.ts": `export { DataGrid as default, RowActions } from "@kai/ui";\nexport type { DataGridColumn, DataGridCellOverflow, DataGridProps } from "@kai/ui";\n`,
    "DataGrid.tsx": `export { DataGridTable as default } from "@kai/ui";\nexport type { DataGridColumn, DataGridCellOverflow, DataGridProps } from "@kai/ui";\n`,
    "DataGridWrapper.tsx": `export { DataGrid as default } from "@kai/ui";\n`,
    "components/RowActions.tsx": `export { RowActions } from "@kai/ui";\n`,
  },
};

for (const app of apps) {
  for (const [folder, files] of Object.entries(stubs)) {
    const dir = path.join(root, app, componentsRoot, folder);
    if (!fs.existsSync(dir)) {
      continue;
    }
    if (folder === "DataGrid") {
      const compDir = path.join(dir, "components");
      if (fs.existsSync(compDir)) {
        fs.rmSync(compDir, { recursive: true, force: true });
      }
    }
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (fs.statSync(full).isFile()) {
        fs.unlinkSync(full);
      } else if (fs.statSync(full).isDirectory()) {
        fs.rmSync(full, { recursive: true, force: true });
      }
    }
    for (const [file, content] of Object.entries(files)) {
      if (content == null) {
        continue;
      }
      const target = path.join(dir, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content, "utf8");
    }
    console.log(`stubbed ${app}/${folder}`);
  }
}

// POS hook stub
const posHook = path.join(root, "pwa-pos/src/shared/hooks/useCoarsePointer.ts");
if (fs.existsSync(posHook)) {
  fs.writeFileSync(posHook, `export { useCoarsePointer } from "@kai/ui";\n`, "utf8");
}

// admin-shared.ts
const adminShared = path.join(root, "pwa-pos/src/shared/admin-shared.ts");
fs.writeFileSync(
  adminShared,
  `// Re-exports desde @kai/ui (fuente: packages/ui)
export { Dialog, Alert, Button, TextField, DotProgress, Select, IconButton, NumberStepper, Switch, DataGrid } from "@kai/ui";
export type { SwitchOptionLabels, DataGridColumn } from "@kai/ui";
`,
  "utf8",
);

console.log("done");
