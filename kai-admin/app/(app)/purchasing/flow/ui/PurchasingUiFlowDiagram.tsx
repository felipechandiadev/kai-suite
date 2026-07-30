"use client";

import React, { memo, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@kai/ui";

export type PurchasingFlowStepData = {
  title: string;
  uiPath: string;
  uiSummary: string;
  transactionTypes: { code: string; detail?: string }[];
  implications: string[];
  /** Conexión entrante desde arriba (omitir en el primer paso del flujo). */
  showTargetTop?: boolean;
  /** Conexiones salientes por abajo: ninguna, una central o bifurcación (izq / der). */
  sourceBottom?: "none" | "center" | "split";
};

const PurchasingStepNode = memo(function PurchasingStepNode({
  data,
}: NodeProps<PurchasingFlowStepData>) {
  const showTarget = data.showTargetTop !== false;
  const sourceMode = data.sourceBottom ?? "center";

  return (
    <div
      className="max-w-[min(22rem,calc(100vw-3rem))] rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5 text-left shadow-sm"
      data-test-id="purchasing-flow-step-node"
    >
      {showTarget ? (
        <Handle type="target" position={Position.Top} className="!h-2 !w-2 !bg-zinc-500" />
      ) : null}
      {sourceMode === "center" ? (
        <Handle
          type="source"
          position={Position.Bottom}
          id="out-center"
          className="!h-2 !w-2 !bg-zinc-500"
          style={{ left: "50%" }}
        />
      ) : null}
      {sourceMode === "split" ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="out-left"
            className="!h-2 !w-2 !bg-zinc-500"
            style={{ left: "28%" }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="out-right"
            className="!h-2 !w-2 !bg-zinc-500"
            style={{ left: "72%" }}
          />
        </>
      ) : null}

      <h3 className="text-sm font-semibold leading-snug text-zinc-900">{data.title}</h3>
      <p className="mt-1 font-mono text-[11px] text-zinc-600">{data.uiPath}</p>
      <p className="mt-2 text-xs leading-relaxed text-zinc-700">{data.uiSummary}</p>

      <div className="mt-2 border-t border-zinc-200 pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Transacciones / backend
        </p>
        {data.transactionTypes.length === 0 ? (
          <p className="mt-1 text-xs italic text-zinc-600">
            No aplica tipo en el módulo de transacciones contables: es maestro de catálogo.
          </p>
        ) : (
          <ul className="mt-1 space-y-1">
            {data.transactionTypes.map((t, i) => (
              <li key={`${t.code}-${i}`} className="text-xs text-zinc-800">
                <span className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-[11px] font-medium text-zinc-900">
                  {t.code}
                </span>
                {t.detail ? <span className="ml-1.5 text-zinc-700">{t.detail}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-2 border-t border-zinc-200 pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Qué implica en el proceso
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-xs leading-relaxed text-zinc-700">
          {data.implications.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
});

function buildNodes(): Node<PurchasingFlowStepData>[] {
  const step = (
    id: string,
    position: { x: number; y: number },
    data: PurchasingFlowStepData,
  ): Node<PurchasingFlowStepData> => ({
    id,
    type: "purchasingStep",
    position,
    data,
  });

  return [
    step("suppliers", { x: -64.95793061033467, y: -191.25688882237722 }, {
      showTargetTop: false,
      sourceBottom: "center",
      title: "1. Alta y mantenimiento de proveedores",
      uiPath: "/purchasing/suppliers",
      uiSummary:
        "Desde el listado creás o actualizás la ficha del proveedor (datos fiscales, alias, condiciones). Es el maestro que luego elegís en órdenes, recepciones y facturas.",
      transactionTypes: [],
      implications: [
        "Sin proveedor válido no podés confirmar documentos de compra que exijan `supplierId`.",
        "Los cambios aquí afectan cómo se muestra el nombre en grillas y PDFs, no reescriben documentos ya emitidos.",
        "Las condiciones de pago configuradas orientan el flujo financiero (contado vs crédito), pero el pago registrado sigue siendo otro paso explícito.",
      ],
    }),
    step("purchase-order", { x: -69.28068979655512, y: 347.1419435993737 }, {
      sourceBottom: "split",
      title: "2. Orden de compra (compromiso con proveedor)",
      uiPath: "/purchasing/transactions/orders/new → /purchasing/transactions/orders",
      uiSummary:
        "Armás el documento con sucursal, proveedor, almacén opcional, líneas desde el buscador de variantes y totales. Podés guardar borrador o confirmar según validaciones de la pantalla.",
      transactionTypes: [
        {
          code: "PURCHASE_ORDER",
          detail:
            "Se crea vía API de órdenes (`POST …/purchase-orders`); el backend asigna folio y período contable.",
        },
      ],
      implications: [
        "En borrador (`DRAFT`) el documento es editable y no representa aún un compromiso operativo completo.",
        "Al confirmar, la orden queda como referencia para recepciones y para alinear cantidades y precios esperados.",
        "Por sí sola la orden no ejecuta el movimiento de inventario: el ingreso físico se registra en recepciones.",
      ],
    }),
    step("reception", { x: -276.4574457355159, y: 913.6290282003131 }, {
      title: "3a. Recepción de mercancía (ingreso a inventario)",
      uiPath: "/purchasing/transactions/receptions/new",
      uiSummary:
        "Misma experiencia de armado de documento que la OC: elegís proveedor, bodega, líneas y tributación. Refleja lo que realmente entró al almacén.",
      transactionTypes: [
        {
          code: "ADJUSTMENT_IN",
          detail:
            "El servicio de recepciones del backend crea una transacción de ajuste positivo de inventario asociada al ingreso.",
        },
      ],
      implications: [
        "Actualiza existencias en el almacén elegido; es el paso que acerca el stock a la realidad física.",
        "Puede originarse desde una orden (`from-purchase-order`) o flujo equivalente, según cómo cargues el documento.",
        "Los costos y cantidades de esta etapa alimentan el control operativo; la obligación con el proveedor se formaliza aparte en factura.",
      ],
    }),
    step("invoice", { x: 159.20000000000005, y: 914.4000000000001 }, {
      title: "3b. Registro de la factura de proveedor (documento)",
      uiPath: "/purchasing/dte/invoices (DataGrid + diálogo «Crear factura»)",
      uiSummary:
        "Cargás el comprobante fiscal/comercial: proveedor, líneas, impuestos, totales y vínculo opcional con recepción. Este paso **formaliza el documento** (`SUPPLIER_INVOICE`); no es lo mismo que operar la **cartera de deuda** día a día, que se ve en cuentas por pagar.",
      transactionTypes: [
        {
          code: "SUPPLIER_INVOICE",
          detail:
            "Crea o actualiza el documento transaccional de factura; deja montos y estado de pago base para lo que sigue.",
        },
      ],
      implications: [
        "Es el **proceso de captura del documento**: validación, numeración y datos de cabecera/líneas.",
        "El impacto en “cuánto debemos” se materializa en saldos y seguimiento de **CxP** (paso siguiente), aunque el origen sea esta factura.",
        "Podés registrar factura y recepción en distinto orden según la operación real; el stock no se corrige solo por facturar.",
      ],
    }),
    step("purchase-return", { x: -276, y: 1240 }, {
      title: "3d. Devolución a proveedor (logística / stock)",
      uiPath: "/purchasing/transactions/purchase-returns/new → /purchasing/transactions/purchase-returns",
      uiSummary:
        "Registrás la salida física (o el reverso operativo) hacia el proveedor. Es el ancla obligatoria para emitir después una **nota de crédito** fiscal asociada en la UI de notas de crédito.",
      transactionTypes: [
        {
          code: "PURCHASE_RETURN",
          detail:
            "Creación vía `POST …/purchase-returns`. Movimiento de inventario `OUT` según mapa de productos.",
        },
      ],
      implications: [
        "Requiere `supplierId` y `storageId` coherentes con el almacén del que sale mercadería.",
        "Las reglas contables seed suelen debitar proveedores (CxP) y acreditar inventario: es el **reverso de compra** a nivel operativo.",
        "Antes de cargar la NC en pantalla, esta transacción debe existir para validar `metadata.links.purchaseReturnId`.",
      ],
    }),
    step("supplier-credit-note", { x: 140, y: 1240 }, {
      title: "3e. Nota de crédito proveedor (documento fiscal)",
      uiPath: "/purchasing/dte/credit-notes (DataGrid + diálogo «Crear nota de crédito»)",
      uiSummary:
        "Formalizá el comprobante de crédito del proveedor que **reduce la deuda** en CxP sin repetir la salida de stock (esa parte la cubre la devolución).",
      transactionTypes: [
        {
          code: "SUPPLIER_CREDIT_NOTE",
          detail:
            "API `POST …/supplier-credit-notes`. Exige `metadata.links.purchaseReturnId` → transacción `PURCHASE_RETURN`; `relatedTransactionId` se setea al mismo id.",
        },
      ],
      implications: [
        "El backend valida que el id sea una devolución y que el `supplierId` coincida.",
        "Folio propio (`NCP-YY-00001`) independiente de la devolución (`DPC-…`).",
        "Contabilidad: reglas tipo transacción pueden debitar solo CxP y acreditar ingreso/descuento sobre compras para no duplicar el efecto inventario de la devolución.",
      ],
    }),
    step("accounts-payable", { x: 159.20000000000005, y: 1540 }, {
      title: "3c. Cuentas por pagar (cartera de deuda con proveedores)",
      uiPath: "/accounting/accounts-payable",
      uiSummary:
        "Aquí el foco es **la deuda viva**: qué facturas (u otras obligaciones) están abiertas, vencimientos, saldo pendiente y prioridad de pago. Es otro proceso de negocio que **deriva** de las facturas registradas, pero con objetivo distinto: gestionar cobranza al revés (vos como deudor).",
      transactionTypes: [
        {
          code: "SUPPLIER_INVOICE",
          detail:
            "Ancla del saldo: la cartera muestra obligaciones originadas en facturas de este tipo (estado `paymentStatus`, vencimientos y, si el modelo lo prevé, cuotas/installments asociados al documento).",
        },
      ],
      implications: [
        "**Factura ≠ CxP**: registrar la factura es **un proceso** (captura del comprobante). Gestionar **cuánto debés y cuándo** es **otro**: lectura de saldos abiertos, prioridades y vencimientos — sin sustituir al documento.",
        "En CxP no “volvés a cargar” la factura: **interpretás y operás** la deuda ya generada (aging, proveedor, sucursal, moneda, etc.).",
        "Incluye criterios de **antigüedad de saldos**, conciliación con estado de cuenta del proveedor y decisión de **qué documento** pagar primero.",
        "El **pago** no inventa la obligación: parte de un saldo reconocido en cartera; al imputar, bajás ese saldo y actualizás el estado de la factura.",
        "Varias facturas del mismo proveedor se ven en conjunto para decidir **imputación** (total/parcial) al registrar `SUPPLIER_PAYMENT`.",
        "Las **notas de crédito** (`SUPPLIER_CREDIT_NOTE`) y los pagos **reducen** el saldo mostrado cuando quedan imputados correctamente.",
      ],
    }),
    step("payment", { x: 161.59999999999997, y: 1920 }, {
      sourceBottom: "none",
      title: "4. Pago al proveedor (derivado de la deuda)",
      uiPath: "Desde CxP / tesorería al imputar contra saldo pendiente",
      uiSummary:
        "Registrás la **salida de dinero** imputada a una factura (u obligación) ya presente en cartera. El pago **no crea** la deuda: la deuda surge del documento y se ve en CxP; el pago **extingue o reduce** ese saldo.",
      transactionTypes: [
        {
          code: "SUPPLIER_PAYMENT",
          detail:
            "`relatedTransactionId` apunta a la `SUPPLIER_INVOICE` (u flujo equivalente definido en tu despliegue).",
        },
      ],
      implications: [
        "Orden lógico: **factura → saldo en CxP → decisión de pago → `SUPPLIER_PAYMENT`**.",
        "`paymentStatus` de la factura pasa a parcial o pagado según lo imputado.",
        "Conciliación bancaria y auditoría exigen que cada pago quede atado al documento de deuda que liquida.",
      ],
    }),
  ];
}

function buildEdges(): Edge[] {
  return [
    {
      id: "e-suppliers-po",
      source: "suppliers",
      target: "purchase-order",
      sourceHandle: "out-center",
      type: "smoothstep",
      label: "Datos maestros listos",
    },
    {
      id: "e-po-reception",
      source: "purchase-order",
      target: "reception",
      sourceHandle: "out-left",
      type: "smoothstep",
      label: "Ingreso físico",
    },
    {
      id: "e-po-invoice",
      source: "purchase-order",
      target: "invoice",
      sourceHandle: "out-right",
      type: "smoothstep",
      label: "Obligación fiscal / contable",
    },
    {
      id: "e-invoice-ap",
      source: "invoice",
      target: "accounts-payable",
      sourceHandle: "out-center",
      type: "smoothstep",
      label: "Saldo / cartera",
    },
    {
      id: "e-ap-payment",
      source: "accounts-payable",
      target: "payment",
      sourceHandle: "out-center",
      type: "smoothstep",
      label: "Imputación del pago",
    },
    {
      id: "e-reception-pr",
      source: "reception",
      target: "purchase-return",
      sourceHandle: "out-center",
      type: "smoothstep",
      style: { strokeDasharray: "6 4" },
      label: "Devolución física",
    },
    {
      id: "e-pr-nc",
      source: "purchase-return",
      target: "supplier-credit-note",
      sourceHandle: "out-center",
      type: "smoothstep",
      label: "Documento fiscal",
    },
    {
      id: "e-nc-ap",
      source: "supplier-credit-note",
      target: "accounts-payable",
      sourceHandle: "out-center",
      type: "smoothstep",
      label: "Reduce saldo CxP",
    },
  ];
}

const nodeTypes = { purchasingStep: PurchasingStepNode };

export function PurchasingUiFlowDiagram() {
  const initialNodes = useMemo(() => buildNodes(), []);
  const initialEdges = useMemo(() => buildEdges(), []);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const [copied, setCopied] = useState(false);

  const copyLayout = async () => {
    const payload = { nodes: nodes.map((n) => ({ id: n.id, position: n.position })) };
    const text = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="w-full space-y-3" data-test-id="purchasing-ui-flow-diagram">
      <p className="text-sm leading-relaxed text-zinc-700">
        Vista centrada en la UI del admin y en los tipos de transacción. **Recepción** y **factura** suelen ser paralelas.
        La **devolución** (`PURCHASE_RETURN`) y la **nota de crédito** (`SUPPLIER_CREDIT_NOTE`) enlazan logística y fiscal;
        **CxP** concentra la deuda; el **pago** la liquida.
      </p>
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={copyLayout} data-test-id="purchasing-ui-flow-copy-layout">
          {copied ? "Copiado" : "Copiar posiciones del diagrama"}
        </Button>
      </div>
      <div className="h-[min(78vh,52rem)] w-full min-h-[28rem] rounded-md border border-[var(--color-border)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodesDraggable
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.35}
          maxZoom={1.25}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <MiniMap pannable zoomable />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
