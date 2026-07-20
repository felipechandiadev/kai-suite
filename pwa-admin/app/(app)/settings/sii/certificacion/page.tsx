import { redirect } from "next/navigation";
import { siiCertificacionPath } from "@/navigation/sii-routes";

type PageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function LegacySiiCertificacionPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  redirect(siiCertificacionPath(params.tab));
}
