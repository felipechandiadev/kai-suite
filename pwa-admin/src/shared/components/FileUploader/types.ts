import type { MultimediaBannerSize } from './multimedia-banner-size';
import type { MultimediaLogoSize } from './multimedia-logo-size';
import type {
  MultimediaAvatarActionPlacement,
  MultimediaAvatarSize,
} from '@/shared/components/Multimedia/types';

export type { MultimediaBannerSize, MultimediaLogoSize };
export type { MultimediaAvatarActionPlacement, MultimediaAvatarSize };

export interface MultimediaUpdaterProps {
  currentUrl?: string | null;
  currentType?: 'image' | 'video' | string;
  onFileChange?: (file: File | null) => void;
  buttonText?: string;
  labelText?: string;
  acceptedTypes?: string[];
  maxSize?: number;
  aspectRatio?: '1:1' | '16:9' | '9:16';
  variant?: 'default' | 'avatar' | 'banner' | 'logo';
  /** Solo `variant="avatar"`: sm | md | lg. Default md. */
  avatarSize?: MultimediaAvatarSize;
  /** Solo `variant="avatar"`: below (default) | edge (badge en borde). */
  actionPlacement?: MultimediaAvatarActionPlacement;
  /** Solo `variant="banner"`: controla ancho del área 16:9 (vacío + preview): xs … full. Por defecto `md`. */
  bannerSize?: MultimediaBannerSize;
  /** Solo `variant="logo"`: controla ancho del área 1:1 (vacío + preview): xs … full. Por defecto `md`. */
  logoSize?: MultimediaLogoSize;
  allowDragDrop?: boolean;
  className?: string;
  previewSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
}