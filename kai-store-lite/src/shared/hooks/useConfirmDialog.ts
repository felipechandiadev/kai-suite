import { useState } from "react";

export function useConfirmDialog() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);

  function confirm(msg: string): Promise<boolean> {
    setMessage(msg);
    setOpen(true);
    return new Promise((resolve) => {
      setResolver(() => resolve);
    });
  }

  function answer(v: boolean) {
    setOpen(false);
    resolver?.(v);
    setResolver(null);
  }

  return { open, message, confirm, answer };
}
