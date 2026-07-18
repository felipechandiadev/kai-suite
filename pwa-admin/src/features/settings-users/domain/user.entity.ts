import { z } from "zod";

const roleSchema = z.enum([
  "ADMIN",
  "POS_OPERATOR",
  "COURIER",
  "SUB_ADMIN",
  "WAITER",
  "STOCK_OPERATOR",
  "KDS_OPERATOR",
]);

const GOVERNANCE = new Set(["ADMIN", "SUB_ADMIN"]);
const OPERATIONAL = new Set([
  "POS_OPERATOR",
  "COURIER",
  "WAITER",
  "STOCK_OPERATOR",
  "KDS_OPERATOR",
]);

const personSchema = z.object({
  firstName: z.string().min(1, "El nombre es obligatorio"),
  lastName: z.string().max(100).optional(),
  documentType: z.enum(["RUT", "PASSPORT", "OTHER"]).default("RUT"),
  documentNumber: z.string().min(1, "El número de documento es obligatorio"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
});

const alsoAsEmployeeSchema = z.object({
  branchId: z.string().uuid().optional().nullable(),
  employmentType: z.string().min(1).default("FULL_TIME"),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  baseSalary: z.string().optional().nullable(),
});

export const CreateUserFormSchema = z
  .object({
    userName: z
      .string()
      .min(3, "El usuario debe tener al menos 3 caracteres")
      .max(100),
    mail: z.string().min(1, "El correo es obligatorio").email("Correo no válido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(200),
    rol: roleSchema.default("POS_OPERATOR"),
    personId: z.string().uuid().optional(),
    person: personSchema.optional(),
    alsoAsEmployee: alsoAsEmployeeSchema.optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.personId && !val.person) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe indicar persona (personId o datos de persona).",
        path: ["person"],
      });
    }
    if (val.personId && val.person) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Envíe solo personId o person, no ambos.",
        path: ["personId"],
      });
    }
  });

export type CreateUserFormInput = z.infer<typeof CreateUserFormSchema>;

const membershipSchema = z.object({
  companyId: z.string().uuid("Empresa no válida"),
  roles: z.array(roleSchema).min(1, "Cada empresa requiere al menos un rol"),
});

export const UpdateUserFormSchema = z
  .object({
    id: z.string().uuid("Identificador de usuario no válido"),
    userName: z.string().min(3, "El usuario debe tener al menos 3 caracteres").max(100),
    mail: z.string().min(1, "El correo es obligatorio").email("Correo no válido"),
    /** Legacy singular; se deriva de memberships si se envían. */
    rol: roleSchema.optional(),
    memberships: z
      .array(membershipSchema)
      .min(1, "Debe autorizar al menos una empresa"),
    personName: z.string().max(200).optional().nullable(),
    phone: z.string().max(50).optional().nullable(),
    personDni: z.string().max(50).optional().nullable(),
    personId: z.string().uuid().optional().nullable(),
  })
  .superRefine((val, ctx) => {
    const hasSubAdmin = val.memberships.some((m) =>
      m.roles.includes("SUB_ADMIN"),
    );
    if (hasSubAdmin && val.memberships.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SUB_ADMIN solo puede pertenecer a una empresa",
        path: ["memberships"],
      });
    }
    val.memberships.forEach((m, i) => {
      const hasGov = m.roles.some((r) => GOVERNANCE.has(r));
      const hasOps = m.roles.some((r) => OPERATIONAL.has(r));
      if (hasGov && hasOps) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "No se puede mezclar roles de gobierno y operativos en la misma empresa",
          path: ["memberships", i, "roles"],
        });
      }
      if (hasGov && m.roles.length > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Solo un rol de gobierno por empresa",
          path: ["memberships", i, "roles"],
        });
      }
    });
  });

export type UpdateUserFormInput = z.infer<typeof UpdateUserFormSchema>;
