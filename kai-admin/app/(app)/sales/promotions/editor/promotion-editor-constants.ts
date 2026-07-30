import type { StepperStepItem } from "@kai/ui";
import type { CreatePromotionInput } from "@/features/promotions/types/promotion.types";

export const PROMOTION_EDITOR_WIZARD_STEPS: StepperStepItem[] = [
  {
    id: "type",
    title: "Tipo de promoción",
    description: "Define cómo se aplica el descuento en el carrito o en el total.",
  },
  {
    id: "rules",
    title: "Reglas y valores",
    description: "Nombre, montos, prioridad y opciones de combinación.",
  },
  {
    id: "validity",
    title: "Vigencia y activación",
    description: "Cupón, fechas, horario y días de la semana.",
  },
  {
    id: "eligibility",
    title: "Condiciones y alcance",
    description: "Mínimos de carrito, producto o categoría, medio de pago y sucursales/POS.",
  },
  {
    id: "limits",
    title: "Límites y autorización",
    description: "Tope de usos y quién puede aplicar la promoción en caja.",
  },
  {
    id: "accounting",
    title: "Contabilidad y orden",
    description: "Etiqueta contable y orden en listas del POS.",
  },
];

export const DAYS_OF_WEEK = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
] as const;

export const defaultPromotionEditorInput = (): CreatePromotionInput => ({
  name: "",
  description: "",
  type: "PERCENT_ON_LINE",
  value: 0,
  maxValue: null,
  isActive: true,
  validFrom: null,
  validUntil: null,
  activation: "AUTO",
  redemptionCode: null,
  stackable: true,
  priority: 0,
  minSubtotal: null,
  minQuantity: null,
  daysOfWeek: null,
  hourFrom: null,
  hourTo: null,
  maxUsesTotal: null,
  maxUsesPerCustomer: null,
  authorization: "NONE",
  authorizationLimitPct: null,
  buyQuantity: null,
  getQuantity: null,
  getDiscountPercent: 100,
  preloadOnPaymentScreen: false,
  displayOrder: 0,
  accountingTag: null,
  scopes: {
    branches: [],
    pointsOfSale: [],
    products: [],
    variants: [],
    categories: [],
    customers: [],
    paymentMethods: [],
  },
});
