import { z } from "zod";

const roleSchema = z.enum(["ADMIN", "OPERATOR", "COURIER"]);

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
    rol: roleSchema.default("OPERATOR"),
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

export const UpdateUserFormSchema = z.object({
  id: z.string().uuid("Identificador de usuario no válido"),
  userName: z.string().min(3, "El usuario debe tener al menos 3 caracteres").max(100),
  mail: z.string().min(1, "El correo es obligatorio").email("Correo no válido"),
  rol: roleSchema,
  personName: z.string().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  personDni: z.string().max(50).optional().nullable(),
  personId: z.string().uuid().optional().nullable(),
});

export type UpdateUserFormInput = z.infer<typeof UpdateUserFormSchema>;
