"use client";

import { useState } from "react";
import Link from "next/link";
import type { MultimediaBannerSize } from "@/shared/components/FileUploader/multimedia-banner-size";
import { MultimediaField } from "@/shared/components/Multimedia";
import { MultimediaUploader } from "@/shared/components/FileUploader/MultimediaUploader";
import MultimediaUpdater from "@/shared/components/FileUploader/MultimediaUpdater";

const BANNER_SIZES: MultimediaBannerSize[] = ["xs", "sm", "md", "lg", "xl", "full"];

const DEMO_IMAGE_URL = "https://picsum.photos/seed/flowstore-multimedia/640/360";
const DEMO_LOGO_URL = "https://picsum.photos/seed/flowstore-logo/400/400";

function FileListHint({ files }: { files: File[] }) {
  if (files.length === 0) {
    return <p className="text-xs text-muted-foreground">Ningún archivo en cola (solo vista previa local).</p>;
  }
  return (
    <ul className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
      {files.map((f, i) => (
        <li key={`${f.name}-${i}`}>
          {f.name} · {(f.size / 1024).toFixed(1)} KB · {f.type || "—"}
        </li>
      ))}
    </ul>
  );
}

export default function MultimediaUiComponentsPage() {
  const [uploaderDefaultFiles, setUploaderDefaultFiles] = useState<File[]>([]);
  const [uploaderIconFiles, setUploaderIconFiles] = useState<File[]>([]);
  const [uploaderAvatarFiles, setUploaderAvatarFiles] = useState<File[]>([]);
  const [uploaderLogoFiles, setUploaderLogoFiles] = useState<File[]>([]);
  const [uploaderBannerFiles, setUploaderBannerFiles] = useState<File[]>([]);
  const [uploaderBannerSizesNote, setUploaderBannerSizesNote] = useState<string>("");

  const [updaterDefaultNote, setUpdaterDefaultNote] = useState<string>("");
  const [updaterBannerNote, setUpdaterBannerNote] = useState<string>("");
  const [updaterAvatarNote, setUpdaterAvatarNote] = useState<string>("");
  const [updaterLogoNote, setUpdaterLogoNote] = useState<string>("");

  return (
    <div className="mx-auto max-w-4xl space-y-14 p-8">
      <div>
        <Link href="/design-system/components" className="text-sm font-medium text-primary hover:underline">
          ← UI Components
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Multimedia</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Preferir <code className="rounded bg-muted px-1 py-0.5 text-xs">MultimediaField</code> (colección con rejilla,
          principal, galería y reorden). Abajo: wrappers legacy de{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">MultimediaUploader</code> /{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">MultimediaUpdater</code>.
        </p>
      </div>

      <section className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-6">
        <h2 className="text-xl font-semibold text-foreground">MultimediaField (recomendado)</h2>
        <p className="text-xs text-muted-foreground">Staging: varios archivos, icono +, rejilla y arrastre.</p>
        <MultimediaField
          mode="staging"
          layout="collection"
          title="Demo colección"
          value={uploaderDefaultFiles}
          onChange={setUploaderDefaultFiles}
          pickButton="icon"
          allowPrimary
          allowDragDrop
          maxFiles={6}
        />
        <FileListHint files={uploaderDefaultFiles} />
      </section>

      {/* ——— MultimediaUploader ——— */}
      <section className="space-y-6 border-t border-border pt-10">
        <h2 className="text-xl font-semibold text-foreground">MultimediaUploader</h2>

        <div className="rounded-xl border border-border bg-muted/20 p-6">
          <h3 className="text-sm font-semibold text-foreground">Variante collection — botón texto + rejilla</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Varios archivos imagen/video, miniaturas 16:9. Prop <code>uploadPath</code> es solo contexto (no sube sola).
          </p>
          <MultimediaUploader
            uploadPath="demo:showcase-default"
            variant="collection"
            label="Subir imágenes o videos"
            buttonType="normal"
            accept="image/*,video/*"
            maxFiles={6}
            maxSize={9}
            aspectRatio="16:9"
            previewSize="sm"
            onChange={setUploaderDefaultFiles}
          />
          <FileListHint files={uploaderDefaultFiles} />
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-6">
          <h3 className="text-sm font-semibold text-foreground">Variante collection — solo icono</h3>
          <MultimediaUploader
            uploadPath="demo:showcase-icon"
            variant="collection"
            label="Icono + etiqueta"
            buttonType="icon"
            accept="image/*"
            maxFiles={3}
            maxSize={9}
            aspectRatio="square"
            previewSize="xs"
            onChange={setUploaderIconFiles}
          />
          <FileListHint files={uploaderIconFiles} />
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-6">
          <h3 className="text-sm font-semibold text-foreground">Variante avatar</h3>
          <p className="mb-4 text-xs text-muted-foreground">Una sola imagen, recorte circular.</p>
          <MultimediaUploader
            uploadPath="demo:avatar"
            variant="avatar"
            accept="image/*"
            onChange={setUploaderAvatarFiles}
          />
          <FileListHint files={uploaderAvatarFiles} />
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-6">
          <h3 className="text-sm font-semibold text-foreground">Variante logo — 1:1 (prop logoSize)</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Misma escala <code className="rounded bg-muted px-1">xs</code> … <code className="rounded bg-muted px-1">full</code> que{" "}
            <code className="rounded bg-muted px-1">bannerSize</code>, pero área cuadrada (p. ej. logo de empresa).
          </p>
          <MultimediaUploader
            uploadPath="demo:logo"
            variant="logo"
            logoSize="md"
            accept="image/*"
            onChange={setUploaderLogoFiles}
          />
          <FileListHint files={uploaderLogoFiles} />
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-6">
          <h3 className="text-sm font-semibold text-foreground">Variante banner — tamaños (prop bannerSize)</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Prop <code className="rounded bg-muted px-1">bannerSize</code>: controla el ancho máximo del rectángulo 16:9
            (vacío y con imagen): <code className="rounded bg-muted px-1">xs</code> ·{" "}
            <code className="rounded bg-muted px-1">sm</code> · <code className="rounded bg-muted px-1">md</code>{" "}
            (por defecto) · <code className="rounded bg-muted px-1">lg</code> ·{" "}
            <code className="rounded bg-muted px-1">xl</code> · <code className="rounded bg-muted px-1">full</code>.
          </p>
          <div className="space-y-8">
            {BANNER_SIZES.map((size) => (
              <div key={size} className={size === "full" ? "w-full" : undefined}>
                <p className="mb-2 font-mono text-[11px] font-medium text-muted-foreground">
                  bannerSize=&quot;{size}&quot;
                  {size === "xs"
                    ? " · max 200px"
                    : size === "sm"
                      ? " · max 280px"
                      : size === "md"
                        ? " · max 480px"
                        : size === "lg"
                          ? " · max 640px"
                          : size === "xl"
                            ? " · max 960px"
                            : " · ancho completo del contenedor"}
                </p>
                <MultimediaUploader
                  uploadPath={`demo:banner:${size}`}
                  variant="banner"
                  bannerSize={size}
                  accept="image/*"
                  onChange={(files) => {
                    setUploaderBannerFiles(files);
                    setUploaderBannerSizesNote(`${size}: ${files.map((f) => f.name).join(", ") || "vacío"}`);
                  }}
                />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Última interacción: {uploaderBannerSizesNote || "—"}
          </p>
          <FileListHint files={uploaderBannerFiles} />
        </div>
      </section>

      {/* ——— MultimediaUpdater ——— */}
      <section className="space-y-6 border-t border-border pt-10">
        <h2 className="text-xl font-semibold text-foreground">MultimediaUpdater</h2>

        <div className="rounded-xl border border-border bg-muted/20 p-6">
          <h3 className="text-sm font-semibold text-foreground">Default — una selección + preview</h3>
          <MultimediaUpdater
            currentUrl={null}
            labelText="Pulse + para elegir un archivo"
            variant="default"
            aspectRatio="16:9"
            previewSize="sm"
            acceptedTypes={["image/*", "video/*"]}
            maxSize={9}
            onFileChange={(f) =>
              setUpdaterDefaultNote(f ? `Seleccionado: ${f.name}` : "Sin archivo")
            }
          />
          <p className="mt-2 text-xs text-muted-foreground">{updaterDefaultNote || "—"}</p>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-6">
          <h3 className="text-sm font-semibold text-foreground">Banner — bannerSize + URL + arrastrar</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Misma prop <code className="rounded bg-muted px-1">bannerSize</code> que en Uploader. Simula portada
            existente; al elegir archivo se muestra nota.
          </p>
          <div className="space-y-8">
            {BANNER_SIZES.map((size) => (
              <div key={`upd-${size}`} className={size === "full" ? "w-full" : undefined}>
                <p className="mb-2 font-mono text-[11px] font-medium text-muted-foreground">
                  bannerSize=&quot;{size}&quot;
                </p>
                <MultimediaUpdater
                  currentUrl={DEMO_IMAGE_URL}
                  currentType="image"
                  variant="banner"
                  bannerSize={size}
                  aspectRatio="16:9"
                  allowDragDrop
                  acceptedTypes={["image/*", "video/*"]}
                  maxSize={9}
                  previewSize="md"
                  onFileChange={(f) =>
                    setUpdaterBannerNote(
                      f
                        ? `[${size}] ${f.name} (${(f.size / 1024).toFixed(1)} KB)`
                        : `[${size}] limpiado`,
                    )
                  }
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{updaterBannerNote || "Suelte o elija un archivo en cualquier tamaño."}</p>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-6">
          <h3 className="text-sm font-semibold text-foreground">Logo — logoSize + URL + arrastrar</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Variante cuadrada; prop <code className="rounded bg-muted px-1">logoSize</code> (igual que escala de banner).
          </p>
          <MultimediaUpdater
            currentUrl={DEMO_LOGO_URL}
            currentType="image"
            variant="logo"
            logoSize="sm"
            allowDragDrop
            acceptedTypes={["image/*"]}
            maxSize={5}
            onFileChange={(f) =>
              setUpdaterLogoNote(f ? `Logo: ${f.name} (${(f.size / 1024).toFixed(1)} KB)` : "Sin archivo")
            }
          />
          <p className="mt-2 text-xs text-muted-foreground">{updaterLogoNote || "—"}</p>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-6">
          <h3 className="text-sm font-semibold text-foreground">Avatar</h3>
          <MultimediaUpdater
            currentUrl={null}
            variant="avatar"
            aspectRatio="1:1"
            allowDragDrop
            acceptedTypes={["image/*"]}
            maxSize={5}
            previewSize="sm"
            onFileChange={(f) =>
              setUpdaterAvatarNote(f ? `Avatar: ${f.name}` : "Sin archivo")
            }
          />
          <p className="mt-2 text-xs text-muted-foreground">{updaterAvatarNote || "—"}</p>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-6">
          <h3 className="text-sm font-semibold text-foreground">Disabled</h3>
          <MultimediaUpdater
            currentUrl={DEMO_IMAGE_URL}
            currentType="image"
            variant="banner"
            bannerSize="lg"
            disabled
            className="opacity-90"
          />
          <p className="mt-2 text-xs text-muted-foreground">Estado deshabilitado (mismo componente).</p>
        </div>
      </section>
    </div>
  );
}
