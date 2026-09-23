import { useCallback, useEffect, useState } from "react";
import { coreFetch } from "@/lib/http";
import { toUserMessage } from "@/lib/errors";
import type { LiteCompanyPayload } from "@/lib/lite-api";

export function useLiteCompany() {
  const [data, setData] = useState<LiteCompanyPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    void coreFetch<LiteCompanyPayload>("/lite/company")
      .then((r) => {
        setData(r);
        setLoading(false);
      })
      .catch((e) => {
        setError(toUserMessage(e));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}
