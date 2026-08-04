export type CloseCashSessionResult =
  | { success: true; message?: string }
  | { success: false; error: string; statusCode?: number };
