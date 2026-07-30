/**
 * Clasificación operativa de gastos (catálogo cerrado).
 * Cada valor tiene etiqueta y descripción para UI y documentación.
 */
export enum ExpenseCategoryOperationalGroup {
  PERSONAL_NOMINA = 'PERSONAL_NOMINA',
  LOCALES_INSTALACIONES = 'LOCALES_INSTALACIONES',
  SUMINISTROS_CONSUMIBLES = 'SUMINISTROS_CONSUMIBLES',
  LOGISTICA_DISTRIBUCION = 'LOGISTICA_DISTRIBUCION',
  TECNOLOGIA_SISTEMAS = 'TECNOLOGIA_SISTEMAS',
  COMUNICACION_MARKETING_OPERATIVO = 'COMUNICACION_MARKETING_OPERATIVO',
  SERVICIOS_EXTERNOS = 'SERVICIOS_EXTERNOS',
  FINANCIEROS_TESORERIA = 'FINANCIEROS_TESORERIA',
  PERDIDAS_AJUSTES_OPERATIVOS = 'PERDIDAS_AJUSTES_OPERATIVOS',
  REGULATORIO_CUMPLIMIENTO = 'REGULATORIO_CUMPLIMIENTO',
}

export type OperationalExpenseGroupMeta = {
  value: ExpenseCategoryOperationalGroup;
  label: string;
  description: string;
};

export const OPERATIONAL_EXPENSE_GROUP_META: readonly OperationalExpenseGroupMeta[] = [
  {
    value: ExpenseCategoryOperationalGroup.PERSONAL_NOMINA,
    label: 'Personal y nómina',
    description:
      'Comprende todos los costos directos e indirectos asociados a la fuerza laboral, incluyendo remuneraciones, beneficios legales, previsionales y el desarrollo de competencias técnicas para la operación.',
  },
  {
    value: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES,
    label: 'Locales e instalaciones',
    description:
      'Gastos derivados de la ocupación, conservación y resguardo de la infraestructura física necesaria para el funcionamiento de los puntos de venta o administración.',
  },
  {
    value: ExpenseCategoryOperationalGroup.SUMINISTROS_CONSUMIBLES,
    label: 'Suministros y consumibles',
    description:
      'Agrupa los recursos materiales fungibles utilizados en el ciclo operativo diario y los elementos de seguridad requeridos para la protección del personal.',
  },
  {
    value: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION,
    label: 'Logística y distribución',
    description:
      'Costos vinculados al movimiento de mercancías, servicios de mensajería, gestión de flotas y el almacenamiento transitorio fuera de las instalaciones principales.',
  },
  {
    value: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS,
    label: 'Tecnología y sistemas',
    description:
      'Inversión recurrente en infraestructura digital, herramientas de software bajo modelo de suscripción, mantenimiento de plataformas tecnológicas y servicios de soporte técnico.',
  },
  {
    value: ExpenseCategoryOperationalGroup.COMUNICACION_MARKETING_OPERATIVO,
    label: 'Comunicación y marketing operativo',
    description:
      'Gastos destinados a la promoción directa en el punto de venta y la implementación de elementos de señalización o visibilidad para la captación de clientes.',
  },
  {
    value: ExpenseCategoryOperationalGroup.SERVICIOS_EXTERNOS,
    label: 'Servicios externos',
    description:
      'Contratación de asesorías especializadas y servicios de outsourcing profesional para la gestión administrativa, legal y contable de la entidad.',
  },
  {
    value: ExpenseCategoryOperationalGroup.FINANCIEROS_TESORERIA,
    label: 'Financieros / tesorería',
    description:
      'Costos derivados de la intermediación bancaria, protección de activos mediante pólizas de seguro y el costo financiero de los instrumentos de liquidez de corto plazo.',
  },
  {
    value: ExpenseCategoryOperationalGroup.PERDIDAS_AJUSTES_OPERATIVOS,
    label: 'Pérdidas y ajustes operativos',
    description:
      'Registro de disminuciones de valor por mermas físicas, desajustes en el flujo de efectivo o depreciación técnica de activos que afectan el resultado operativo.',
  },
  {
    value: ExpenseCategoryOperationalGroup.REGULATORIO_CUMPLIMIENTO,
    label: 'Regulatorio y cumplimiento',
    description:
      'Erogaciones obligatorias destinadas a mantener la vigencia legal de la operación frente a entidades gubernamentales, municipales y organismos de certificación.',
  },
] as const;

export function isExpenseCategoryOperationalGroup(
  v: string,
): v is ExpenseCategoryOperationalGroup {
  return (Object.values(ExpenseCategoryOperationalGroup) as string[]).includes(v);
}
