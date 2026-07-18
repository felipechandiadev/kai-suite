/**
 * Alineado con el dominio y respuestas de `GET/POST/PUT` de `/api/users`.
 * No persistir `pass` en UI; el backend podría incluirlo en JSON en algunas rutas: ignorar.
 */
export type UserListItem = {
  id: string;
  userName: string;
  mail: string;
  rol: string;
  personId?: string | null;
  person?: {
    id?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    documentNumber?: string | null;
    documentType?: string | null;
  } | null;
};

export type ListUsersResult =
  | { success: true; users: UserListItem[] }
  | { success: false; error: string; users: [] };

export type CreateUserResult =
  | { success: true; data: UserListItem }
  | { success: false; error: string };

export type UpdateUserResult =
  | { success: true; data: UserListItem }
  | { success: false; error: string };

export type DeleteUserResult = { success: true } | { success: false; error: string };

export const USER_ROLE_OPTIONS: { id: string; label: string }[] = [
  { id: "OPERATOR", label: "Operador" },
  { id: "ADMIN", label: "Administrador" },
];
