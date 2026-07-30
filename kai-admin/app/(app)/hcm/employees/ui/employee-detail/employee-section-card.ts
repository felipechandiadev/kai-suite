/** Section chrome aligned with product variant detail (`VariantDetailPageSections`). */
export function employeeSectionCardClass(editing = false): string {
  return `relative space-y-3 rounded-lg border border-border bg-background p-4 pb-12 ${
    editing ? "ring-1 ring-primary/25" : ""
  }`;
}
