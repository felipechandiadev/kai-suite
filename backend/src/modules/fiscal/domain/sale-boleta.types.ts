/** Línea de detalle para boleta electrónica desde venta POS. */
export type SaleBoletaLine = {
  name: string;
  quantity: number;
  unitPriceWithIva: number;
  exempt?: boolean;
  unitMeasure?: string;
};

export type SaleBoletaReceptor = {
  rut: string;
  name: string;
};

export type SaleBoletaDocument = {
  lines: SaleBoletaLine[];
  receptor: SaleBoletaReceptor;
  observation?: string;
};
