import {
  findVariantByExactSelection,
  isOptionAvailable,
  isOptionCompatibleWithSelection,
  resolveInitialVariant,
  selectionAfterOptionPick,
} from "./variant-selection";

describe("variant-selection", () => {
  const variants = [
    {
      id: "1",
      sku: "A-S-B",
      attributeValues: { Color: "Blanco", Talla: "S" },
      inStock: true,
    },
    {
      id: "2",
      sku: "A-M-N",
      attributeValues: { Color: "Negro", Talla: "M" },
      inStock: true,
    },
    {
      id: "3",
      sku: "A-L-N",
      attributeValues: { Color: "Negro", Talla: "L" },
      inStock: true,
    },
  ];
  const dimensions = ["Color", "Talla"];

  it("elige otra talla con stock ajustando color si no combina", () => {
    const selection = { Color: "Blanco", Talla: "S" };
    expect(isOptionAvailable(variants, "Talla", "M", selection)).toBe(false);
    expect(isOptionCompatibleWithSelection(variants, "Talla", "M", selection)).toBe(false);

    const next = selectionAfterOptionPick(variants, "Talla", "M", selection, dimensions);
    expect(next).toEqual({ Color: "Negro", Talla: "M" });
  });

  it("resuelve variante exacta tras ajustar atributos", () => {
    const selection = selectionAfterOptionPick(
      variants,
      "Talla",
      "L",
      { Color: "Blanco", Talla: "S" },
      dimensions,
    );
    expect(findVariantByExactSelection(variants, selection, dimensions)?.sku).toBe("A-L-N");
  });

  it("deshabilita opciones sin stock compatible con la selección parcial", () => {
    const withOos = [
      ...variants,
      {
        id: "4",
        sku: "A-M-B",
        attributeValues: { Color: "Blanco", Talla: "M" },
        inStock: false,
      },
    ];
    const selection = { Color: "Blanco", Talla: "S" };
    expect(isOptionAvailable(withOos, "Talla", "M", selection)).toBe(false);
    expect(isOptionAvailable(withOos, "Talla", "M", {})).toBe(false);
    expect(isOptionAvailable(withOos, "Talla", "L", selection)).toBe(false);
    expect(isOptionAvailable(withOos, "Color", "Negro", { Talla: "M" })).toBe(true);
  });

  it("resolveInitialVariant prioriza preferida con stock y cae a la primera disponible", () => {
    const withOosPreferred = variants.map((v) =>
      v.id === "1" ? { ...v, inStock: false } : v,
    );
    expect(resolveInitialVariant(withOosPreferred, "1", "1")?.id).toBe("2");
    expect(resolveInitialVariant(variants, "2", "1")?.id).toBe("2");
    expect(resolveInitialVariant(variants, null, "1")?.id).toBe("1");
  });
});
