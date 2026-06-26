export type VariantMediaAsset = {
  id: string;
  publicUrl: string;
  mimeType: string;
  kind: string;
};

export type MultimediaAssetListItem = VariantMediaAsset & {
  isPrimary?: boolean;
  sortOrder?: number;
  linkId?: string;
};

export type AttributeListItem = {
  id: string;
  name: string;
};
