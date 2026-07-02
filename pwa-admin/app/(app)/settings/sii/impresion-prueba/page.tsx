import { BasicPageLayout } from "@/shared/components/layouts/BasicPageLayout";
import { getBoletaPrintPreviewAction } from "@/features/fiscal/actions/fiscal.actions";
import { SiiBoletaPrintSection } from "@/features/fiscal/ui/SiiBoletaPrintSection";
import { SiiNarrowContent } from "@/features/fiscal/ui/SiiNarrowContent";

export const dynamic = "force-dynamic";

export default async function SiiImpresionPruebaPage() {
  const res = await getBoletaPrintPreviewAction("CASO-1");
  if (!res.success) {
    return (
      <SiiNarrowContent>
        <BasicPageLayout
          title="Impresión de prueba"
          subtitle="Boleta electrónica simulada (Set BE)"
        >
          <p className="text-sm text-destructive">{res.error}</p>
        </BasicPageLayout>
      </SiiNarrowContent>
    );
  }

  return (
    <SiiNarrowContent>
      <BasicPageLayout
        title="Impresión de prueba"
        subtitle="Simula la representación impresa de una boleta electrónica sin consumir folios ni enviar al SII"
      >
        <SiiBoletaPrintSection initialPreview={res.preview} />
      </BasicPageLayout>
    </SiiNarrowContent>
  );
}
