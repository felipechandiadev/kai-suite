import { redirect } from "next/navigation";
import { siiFoliosPath } from "@/navigation/sii-routes";

type PageProps = {
  searchParams?: Promise<{ tab?: string; package?: string }>;
};

export default async function LegacySiiFoliosPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  redirect(
    siiFoliosPath({
      tab: params.tab ?? "boleta",
      package: params.package,
    }),
  );
}
