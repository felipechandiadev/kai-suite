// Dominio ERP / admin — primitivos UI: importar desde `@kai/ui`.

export { MonthlyCalendar } from "./Calendar";
export type { MonthlyCalendarItem, MonthlyCalendarProps } from "./Calendar";

export { default as LocationPickerWrapper } from "./LocationPicker";

export {
  MultimediaField,
  MultimediaCollectionGrid,
  MultimediaLightbox,
  multimediaDefaultsForEntity,
} from "./Multimedia";
export type { MultimediaFieldProps } from "./Multimedia";
export { MultimediaThumbnailSlot } from "./Multimedia/MultimediaThumbnailSlot";
export type { MultimediaThumbnailSlotProps } from "./Multimedia/MultimediaThumbnailSlot";

export { MultimediaUploader, MultimediaUpdater } from "./FileUploader";
export type { MultimediaBannerSize, MultimediaLogoSize } from "./FileUploader";
export { default as FileUploader } from "./FileUploader/MultimediaUpdater";

export { default as SplashScreen } from "./SplashScreen";
export { default as TopBar } from "./TopBar";
export { CreateBaseForm, UpdateBaseForm, DeleteBaseForm } from "./BaseForm";

export { ErpPlaceholderPage } from "./ErpPlaceholderPage";

export type {
  BaseFormFieldType,
  BaseFormField,
  LocationCoordinates,
  UploadedFile,
  Tab,
  RangeValue,
  TopBarItem,
  TopBarProps,
} from "./types";
