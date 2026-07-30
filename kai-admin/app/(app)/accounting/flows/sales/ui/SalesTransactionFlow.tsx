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
      id: "sale",
      type: "input",
      position: { x: 0, y: 0 },
      data: { label: "TransactionType.SALE\n(venta)" },
    },

    // Stock decision
    {
      id: "stock-decision",
      position: { x: 408.0819672131147, y: 142.9253187613843 },
      data: { label: "Stock\n(según deliveryMode)" },
      style: { ...nodeStyle, fontWeight: 600 },
    },

    // deliveryMode=IMMEDIATE (entrega inmediata) -> baja stock con transacción inventario
    {
      id: "immediate-stock",
      position: { x: 243.15482695810567, y: 357.5209471766849 },
      data: {
        label:
          "deliveryMode=IMMEDIATE\n(paymentStatus=PAID)\n\nTransactionType.ADJUSTMENT_OUT\n(baja stock)",
      },
      style: nodeStyle,
    },

    // deliveryMode=DEFERRED (entrega diferida) -> reserva stock con transacción inventario
    {
      id: "deferred-reservation",
      position: { x: 564.2331511839709, y: 358.98360655737713 },
      data: {
        label:
          "deliveryMode=DEFERRED\n(paymentStatus=PAID)\n\nTransactionType.INVENTORY_RESERVATION\n(reserva stock)",
      },
      style: nodeStyle,
    },

    // Payment branch: contado vs crédito (independiente del stock)
    {
      id: "payment-decision",
      position: { x: -311.5464480874317, y: 148.45355191256823 },
      data: { label: "Pago\n(según paymentStatus)" },
      style: { ...nodeStyle, fontWeight: 600 },
    },
    {
      id: "cash-payment",
      position: { x: -489.6375227686703, y: 358.66120218579226 },
      data: {
        label:
          "Contado\n(paymentStatus=PAID)\n\nTransactionType.PAYMENT_IN\nrelatedTransactionId = SALE.id",
      },
      style: nodeStyle,
    },
    {
      id: "credit-ar",
      position: { x: -115.90346083788711, y: 358.6612021857924 },
      data: {
        label:
          "Crédito\n(paymentStatus=PENDING|PARTIAL)\n\nNO se crea TransactionType.PAYMENT_IN\n\nSe genera CxC / Cuotas\n(registro de cuotas/estado)\n(sin mostrar pagos posteriores)",
      },
      style: nodeStyle,
    },
  ];
}

function buildEdges(): Edge[] {
  return [
    // Stock tree
    { id: "e-sale-stock", source: "sale", target: "stock-decision", type: "smoothstep" },
    {
      id: "e-stock-immediate",
      source: "stock-decision",
      target: "immediate-stock",
      label: "IMMEDIATE",
      type: "smoothstep",
    },
    {
      id: "e-stock-deferred",
      source: "stock-decision",
      target: "deferred-reservation",
      label: "DEFERRED",
      type: "smoothstep",
    },

    // Payment tree
    { id: "e-sale-payment", source: "sale", target: "payment-decision", type: "smoothstep" },
    {
      id: "e-payment-cash",
      source: "payment-decision",
      target: "cash-payment",
      label: "PAID",
      type: "smoothstep",
    },
    {
      id: "e-payment-credit",
      source: "payment-decision",
      target: "credit-ar",
      label: "PENDING|PARTIAL",
      type: "smoothstep",
    },
  ];
}

export function SalesTransactionFlow() {
  const initialNodes = useMemo(() => buildNodes(), []);
  const initialEdges = useMemo(() => buildEdges(), []);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const [copied, setCopied] = useState(false);

  const copyLayout = async () => {
    const payload = {
      nodes: nodes.map((n) => ({ id: n.id, position: n.position })),
    };
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
    <div className="w-full space-y-3" data-test-id="sales-transaction-flow">
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={copyLayout} data-test-id="sales-flow-copy-layout">
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

