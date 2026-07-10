// Primitives
export { default as Alert } from "./components/Alert";
export type { AlertVariant } from "./components/Alert/Alert";
export { Button, ButtonPill, ButtonGroup, ButtonGroupItem, ButtonGroupToggle } from "./components/Button";
export type {
  ButtonGroupProps,
  ButtonGroupItemProps,
  ButtonGroupToggleProps,
  ButtonGroupToggleOption,
  ButtonGroupDensity,
} from "./components/Button";
export { Badge } from "./components/Badge";
export type { BadgeVariant } from "./components/Badge/Badge";
export { default as Switch } from "./components/Switch";
export type { SwitchOptionLabels, SwitchDensity } from "./components/Switch";
export { default as IconButton } from "./components/IconButton";
export { default as DotProgress } from "./components/DotProgress";

// Inputs
export { TextField, default } from "./components/TextField/TextField";
export { default as TextFieldDefault } from "./components/TextField/TextField";
export { Select } from "./components/Select";
export type { Option as SelectOption, Option } from "./components/Select";
export { default as SelectDefault } from "./components/Select/Select";
export { default as AutoComplete } from "./components/AutoComplete";
export { default as DropdownList } from "./components/DropdownList";
export { default as NumberStepper } from "./components/NumberStepper";
export {
  resolveTouchInputMode,
  type TouchInputMode,
} from "./components/TextField/resolve-touch-input-mode";

// Dialog
export { default as Dialog } from "./components/Dialog";
export { DeleteDialog, type DeleteDialogProps } from "./components/Dialog/DeleteDialog";
export { default as DialogToPrint } from "./components/Dialog/DialogToPrint";
export {
  PrintDialog,
  usePrint,
  type PrintDialogProps,
  type PageOrientation,
  type PageSize,
} from "./components/PrintDialog";

// Data display
export { default as DataGrid } from "./components/DataGrid";
export { default as DataGridTable } from "./components/DataGrid/DataGrid";
export { RowActions } from "./components/DataGrid";
export type { DataGridColumn, DataGridCellOverflow, DataGridProps } from "./components/DataGrid";
export {
  getCellOverflowClassNames,
  resolveColumnCellOverflow,
  useScreenSize,
  calculateColumnStyles,
  DataGridStyles,
  type ColumnStyle,
} from "./components/DataGrid/utils/columnStyles";
export { resolveRowCellBackgroundColor } from "./components/DataGrid/utils/rowAppearance";
export {
  useDataGridFillViewportHeight,
  dataGridFillViewportFallbackHeight,
  DATA_GRID_TAB_LAYOUT_FALLBACK_EXTRA_PX,
} from "./components/DataGrid/utils/useDataGridFillViewportHeight";

// Navigation & layout primitives
export { default as Tabs } from "./components/Tabs";
export type { TabItem, TabsProps } from "./components/Tabs";
export { Card, StatisticsCard } from "./components/Cards";
export type {
  CardAction,
  CardIconAction,
  CardProps,
  CardTextAction,
  LucideIconName,
  StatisticsCardProps,
  StatisticsValueTone,
} from "./components/Cards";
export { Stepper } from "./components/Stepper";
export type { StepperProps, StepperStepItem } from "./components/Stepper";
export { default as RangeSlider } from "./components/RangeSlider";
export { default as LoadingState } from "./components/LoadingState";
export type { LoadingStateProps } from "./components/LoadingState";
export { Skeleton } from "./components/Skeleton";
export type { SkeletonProps } from "./components/Skeleton";

// Layouts
export {
  BasicPageLayout,
  TabPageLayout,
  buildContentGridClassNames,
  CollectionPageLayout,
  adminFillViewportBelowTopBarClassName,
  dataGridFillViewportTabPageProps,
  layoutPageContentClassName,
  layoutPageHeaderClassName,
  layoutPageRootClassName,
  layoutPageRootClassNameCompact,
  layoutPageSubtitleClassName,
  layoutPageTitleClassName,
} from "./components/layouts";
export type {
  BasicPageLayoutProps,
  TabPageLayoutProps,
  CollectionGridColumnConfig,
  CollectionPageLayoutProps,
} from "./components/layouts";

// Hooks
export { useCoarsePointer } from "./hooks/useCoarsePointer";

// Shared types
export type {
  ButtonVariant,
  ButtonSize,
  TextFieldVariant,
  AutoCompleteOption,
  Tab,
  TabsProps as LegacyTabsProps,
  RangeValue,
  DialogProps,
  NumberStepperProps,
  SwitchProps,
  LocationCoordinates,
  UploadedFile,
  BaseFormField,
  BaseFormFieldType,
} from "./types";
