'use client';

import {
  typographyAntipatterns,
  typographyCaptionClassName,
  typographyCompareAtPriceClassName,
  typographyDataGridRowExample,
  typographyEshopPriceExample,
  typographyFieldErrorClassName,
  typographyFieldHintClassName,
  typographyFieldLabelClassName,
  typographyFormFieldExample,
  typographyKpiRowExample,
  typographyMoneyNegativeClassName,
  typographyMoneyPositiveClassName,
  typographyMutedClassName,
  typographyOnErrorClassName,
  typographyOnSuccessClassName,
  typographyOnWarningClassName,
  typographyPageAnatomyExample,
  typographyPageSubtitleClassName,
  typographyPageTitleClassName,
  typographyPlaceholderClassName,
  typographyPosTotalExample,
  typographyPosTouchLabelClassName,
  typographyPosTouchTotalClassName,
  typographyPosTouchValueClassName,
  typographyProductTitleClassName,
  typographyQuantityClassName,
  typographySalePriceClassName,
  typographyShowcaseNav,
  typographySkuClassName,
  typographyStatusErrorClassName,
  typographyStatusInfoClassName,
  typographyStatusStackExample,
  typographyStatusSuccessClassName,
  typographyStatusWarningClassName,
  typographySubsectionTitleClassName,
  typographyTableCellTruncateClassName,
  typographyTableHeaderClassName,
  typographyBodyClassName,
} from '@kai/ui';
import ExampleBlock from './ExampleBlock';

export default function TypographyShowcase() {
  return (
    <div className="space-y-12">
      <nav className="rounded-lg border border-border bg-neutral/30 p-4" aria-label="Ejemplos tipográficos">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saltar a ejemplo</p>
        <ul className="flex flex-wrap gap-2">
          {typographyShowcaseNav.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="inline-block rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-neutral/50"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <ExampleBlock
        id="typo-page-anatomy"
        pattern="Layout · Jerarquía"
        title="Anatomía de página"
        description="Kicker caption + h1 layout + subtítulo muted + cuerpo. Un solo h1 por vista — lo provee el layout oficial."
      >
        <div className="max-w-xl space-y-2">
          <p className={typographyCaptionClassName}>{typographyPageAnatomyExample.kicker}</p>
          <h1 className={typographyPageTitleClassName}>{typographyPageAnatomyExample.title}</h1>
          <p className={typographyPageSubtitleClassName}>{typographyPageAnatomyExample.subtitle}</p>
          <p className={`mt-4 ${typographyBodyClassName}`}>{typographyPageAnatomyExample.body}</p>
        </div>
      </ExampleBlock>

      <ExampleBlock
        id="typo-datagrid-row"
        pattern="DataGrid · Datos + montos"
        title="Fila de grilla ERP"
        description="Nombre en body, SKU mono, stock tabular, montos con signo explícito (+ / -) y tabular-nums."
      >
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b border-border bg-neutral/40 px-4 py-2">
            <span className={typographyTableHeaderClassName}>Producto</span>
            <span className={`${typographyTableHeaderClassName} text-right`}>Stock</span>
            <span className={`${typographyTableHeaderClassName} text-right`}>Ingreso</span>
            <span className={`${typographyTableHeaderClassName} text-right`}>Egreso</span>
          </div>
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className={typographyTableCellTruncateClassName} title={typographyDataGridRowExample.name}>
                {typographyDataGridRowExample.name}
              </p>
              <p className={typographySkuClassName}>{typographyDataGridRowExample.sku}</p>
            </div>
            <span className={`${typographyQuantityClassName} text-right`}>{typographyDataGridRowExample.stock}</span>
            <span className={`${typographyMoneyPositiveClassName} text-right`}>
              {typographyDataGridRowExample.amountPositive}
            </span>
            <span className={`${typographyMoneyNegativeClassName} text-right`}>
              {typographyDataGridRowExample.amountNegative}
            </span>
          </div>
        </div>
      </ExampleBlock>

      <ExampleBlock
        id="typo-kpi-row"
        pattern="Dashboard · KPI"
        title="Métrica con variación"
        description="Label caption, valor tabular grande, variación semántica positive."
      >
        <div className="rounded-lg border border-border bg-surface/80 p-4">
          <p className={typographyCaptionClassName}>{typographyKpiRowExample.label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{typographyKpiRowExample.value}</p>
          <p className="mt-1 text-sm">
            <span className={typographyMoneyPositiveClassName}>{typographyKpiRowExample.variation}</span>
            <span className={`ml-1 ${typographyMutedClassName}`}>{typographyKpiRowExample.variationHint}</span>
          </p>
        </div>
      </ExampleBlock>

      <ExampleBlock
        id="typo-form-field"
        pattern="Formulario · Validación"
        title="Campo con label, hint y error"
        description="Label medium, hint xs muted, error xs text-text-error — estilos distintos para cada capa."
      >
        <div className="max-w-sm space-y-1.5">
          <label className={typographyFieldLabelClassName} htmlFor="typo-demo-field">
            {typographyFormFieldExample.label}
          </label>
          <input
            id="typo-demo-field"
            type="text"
            readOnly
            defaultValue=""
            placeholder={typographyFormFieldExample.placeholder}
            className={`w-full rounded-md border border-border bg-surface px-3 py-2 ${typographyPlaceholderClassName}`}
            aria-invalid="true"
            aria-describedby="typo-demo-hint typo-demo-error"
          />
          <p id="typo-demo-hint" className={typographyFieldHintClassName}>
            {typographyFormFieldExample.hint}
          </p>
          <p id="typo-demo-error" className={typographyFieldErrorClassName} role="alert">
            {typographyFormFieldExample.error}
          </p>
        </div>
      </ExampleBlock>

      <ExampleBlock
        id="typo-status-stack"
        pattern="Feedback · Estados semánticos"
        title="Stack de estados"
        description="Copy explícito con color semántico — no depender solo del color."
      >
        <ul className="space-y-2">
          {typographyStatusStackExample.map((item) => {
            const className =
              item.id === 'success'
                ? typographyStatusSuccessClassName
                : item.id === 'info'
                  ? typographyStatusInfoClassName
                  : item.id === 'warning'
                    ? typographyStatusWarningClassName
                    : typographyStatusErrorClassName;
            return (
              <li key={item.id} className={className}>
                {item.label}
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`inline-flex rounded-md bg-success px-3 py-1 text-sm ${typographyOnSuccessClassName}`}>
            Confirmado
          </span>
          <span className={`inline-flex rounded-md bg-warning px-3 py-1 text-sm ${typographyOnWarningClassName}`}>
            Pendiente
          </span>
          <span className={`inline-flex rounded-md bg-error px-3 py-1 text-sm ${typographyOnErrorClassName}`}>
            Anular
          </span>
        </div>
      </ExampleBlock>

      <ExampleBlock
        id="typo-pos-total"
        pattern="POS · Touch"
        title="Total en checkout táctil"
        description="Tokens posTouch* — labels base, líneas tabulares, total 2xl semibold."
      >
        <div className="max-w-xs space-y-3 rounded-lg border border-border bg-neutral/20 p-6">
          <div className="flex items-baseline justify-between gap-4">
            <span className={typographyPosTouchLabelClassName}>{typographyPosTotalExample.label}</span>
            <span className={typographyPosTouchValueClassName}>{typographyPosTotalExample.lines}</span>
          </div>
          <p className={`border-t border-border pt-3 ${typographyPosTouchTotalClassName}`}>
            {typographyPosTotalExample.total}
          </p>
        </div>
      </ExampleBlock>

      <ExampleBlock
        id="typo-eshop-price"
        pattern="eShop · Precios"
        title="Producto con oferta"
        description="Título display, precio oferta positive, compare-at tachado muted."
      >
        <div className="max-w-sm space-y-2">
          <h3 className={typographyProductTitleClassName}>{typographyEshopPriceExample.title}</h3>
          <div className="flex items-baseline gap-2">
            <span className={typographySalePriceClassName}>{typographyEshopPriceExample.salePrice}</span>
            <span className={typographyCompareAtPriceClassName}>{typographyEshopPriceExample.compareAtPrice}</span>
          </div>
        </div>
      </ExampleBlock>

      <ExampleBlock
        id="typo-correct-vs-wrong"
        pattern="Antipatrones · Do / Don't"
        title="Correcto vs incorrecto"
        description="Pares documentados en typographyAntipatterns — evitar clases sueltas fuera del contrato."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {typographyAntipatterns.slice(0, 4).map((item) => (
            <div key={item.id} className="rounded-lg border border-border p-4">
              <p className={typographySubsectionTitleClassName}>{item.wrong.split(' ').slice(0, 4).join(' ')}…</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-text-error">Incorrecto</p>
              <p className={`mt-1 ${item.wrongClassName}`}>{item.wrong}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-text-positive">Correcto</p>
              <p className={`mt-1 ${item.rightClassName}`}>{item.right}</p>
              <p className={`mt-2 ${typographyMutedClassName}`}>{item.why}</p>
            </div>
          ))}
        </div>
      </ExampleBlock>
    </div>
  );
}
