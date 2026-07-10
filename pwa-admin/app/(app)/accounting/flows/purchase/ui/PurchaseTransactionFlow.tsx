"use client";

import React, { useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@kai/ui";

const nodeStyle = {
  border: "1px solid var(--color-border)",
  background: "var(--color-background)",
} as const;

function buildNodes(): Node[] {
  return [
    {
      id: "purchase-order",
      type: "input",
      position: { x: 0, y: 0 },
      data: { label: "TransactionType.PURCHASE_ORDER\n(orden de compra)" },
    },

    // Stock flow (PO -> Reception -> ADJUSTMENT_IN)
    {
      id: "reception",
      position: { x: 420, y: 140 },
      data: { label: "Recepción (GRN)\n(recepción física)" },
      style: { ...nodeStyle, fontWeight: 600 },
    },
    {
      id: "adjustment-in",
      position: { x: 260, y: 360 },
      data: {
        label:
          "Stock In\n(solo transacciones)\n\nTransactionType.ADJUSTMENT_IN\nrelatedTransactionId = RECEPTION (o metadata.links.receptionId)",
      },
      style: nodeStyle,
    },
    {
      id: "no-stock",
      position: { x: 580, y: 360 },
      data: {
        label:
          "No recibido aún\n\n(Sin movimiento de stock)",
      },
      style: nodeStyle,
    },

    // Invoice / Payment flow (Invoice -> Supplier Payment)
    {
      id: "supplier-invoice",
      position: { x: -320, y: 140 },
      data: { label: "TransactionType.SUPPLIER_INVOICE\n(factura proveedor / CxP)" },
      style: { ...nodeStyle, fontWeight: 600 },
    },
    {
      id: "supplier-payment",
      position: { x: -520, y: 360 },
      data: {
        label:
          "Pagado\n(paymentStatus=PAID)\n\nTransactionType.SUPPLIER_PAYMENT\nrelatedTransactionId = SUPPLIER_INVOICE.id",
      },
      style: nodeStyle,
    },
    {
      id: "ap",
      position: { x: -140, y: 360 },
      data: {
        label:
          "CxP pendiente\n\nSUPPLIER_PAYMENT (DRAFT)\npor cuota programada\n\nGET /accounts-payable",
      },
      style: nodeStyle,
    },
  ];
}

function buildEdges(): Edge[] {
  return [
    { id: "e-po-invoice", source: "purchase-order", target: "supplier-invoice", type: "smoothstep" },
    { id: "e-invoice-paid", source: "supplier-invoice", target: "supplier-payment", label: "PAID", type: "smoothstep" },
    { id: "e-invoice-ap", source: "supplier-invoice", target: "ap", label: "PENDING|PARTIAL", type: "smoothstep" },

    { id: "e-po-reception", source: "purchase-order", target: "reception", type: "smoothstep" },
    { id: "e-reception-stockin", source: "reception", target: "adjustment-in", label: "recibido", type: "smoothstep" },
    { id: "e-reception-nostock", source: "reception", target: "no-stock", label: "pendiente", type: "smoothstep" },
  ];
}

export function PurchaseTransactionFlow() {
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
    <div className="w-full space-y-3" data-test-id="purchase-transaction-flow">
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={copyLayout} data-test-id="purchase-flow-copy-layout">
          {copied ? "Copiado" : "Copiar layout"}
        </Button>
      </div>
      <div className="h-[70vh] w-full rounded-md border">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodesDraggable
          fitView
        >
          <Background />
          <MiniMap pannable zoomable />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}

