import { Alert } from "@kai/ui";

export function SiiSoapCertificationPlaceholder({
  documentLabel,
  dteType,
}: {
  documentLabel: string;
  dteType: number;
}) {
  return (
    <div className="space-y-4">
      <Alert variant="info">
        La certificación de {documentLabel} (tipo {dteType}) vía Web Services SOAP (maullin /
        palena) está planificada. Use el set ampliado del SII cuando el motor esté disponible.
      </Alert>
      <section className="rounded-lg border border-border p-4 space-y-2">
        <h2 className="font-semibold">Prerrequisitos</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Contribuyente y credenciales configurados</li>
          <li>CAF tipo {dteType} cargado en Folios</li>
          <li>Postulación y permisos en portal SII</li>
          <li>Ambiente certificación activo</li>
        </ul>
      </section>
    </div>
  );
}
