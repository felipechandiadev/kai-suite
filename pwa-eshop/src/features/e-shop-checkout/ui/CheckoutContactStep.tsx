"use client";

import Link from "next/link";
import { TextField } from "@kai/ui";
import { chilePhoneTextFieldProps } from "@/shared/lib/chile-phone-field";
import { eshopUsernameTextFieldProps } from "@/shared/lib/eshop-username-field";
import { checkUsernameAvailabilityAction } from "@/features/e-shop-customer-account/actions/customer-account.action";

const MIN_PASSWORD_LENGTH = 8;

export type CheckoutContactStepProps = {
  showAccountChoice: boolean;
  wantsAccount: boolean;
  onWantsAccountChange: (v: boolean) => void;
  phoneRequired: boolean;
  requireRut: boolean;
  name: string;
  email: string;
  phone: string;
  username: string;
  documentNumber: string;
  password: string;
  confirmPassword: string;
  usernameError: string | null;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onUsernameChange: (v: string) => void;
  onDocumentNumberChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onConfirmPasswordChange: (v: string) => void;
  onUsernameErrorChange: (v: string | null) => void;
};

export function CheckoutContactStep(props: CheckoutContactStepProps) {
  return (
    <div className="space-y-4">
      {props.showAccountChoice ? (
        <p className="text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link href="/cuenta/login?next=/checkout" className="font-medium text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      ) : null}

      {props.showAccountChoice ? (
        <fieldset className="space-y-2 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-medium">¿Cómo quieres continuar?</legend>
          <label className="flex cursor-pointer gap-3 rounded-md p-2 has-[:checked]:bg-muted/50">
            <input
              type="radio"
              name="accountChoice"
              checked={!props.wantsAccount}
              onChange={() => props.onWantsAccountChange(false)}
              className="mt-0.5"
            />
            <span className="text-sm">
              <span className="font-medium">Como invitado</span>
              <span className="mt-0.5 block text-muted-foreground">
                Sin cuenta. Necesitamos tu teléfono para coordinar el encargo.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer gap-3 rounded-md p-2 has-[:checked]:bg-muted/50">
            <input
              type="radio"
              name="accountChoice"
              checked={props.wantsAccount}
              onChange={() => props.onWantsAccountChange(true)}
              className="mt-0.5"
            />
            <span className="text-sm">
              <span className="font-medium">Crear cuenta</span>
              <span className="mt-0.5 block text-muted-foreground">
                Elige una contraseña y podrás ver tus pedidos en Mi cuenta.
              </span>
            </span>
          </label>
        </fieldset>
      ) : null}

      <TextField label="Nombre" value={props.name} onChange={(e) => props.onNameChange(e.target.value)} required />
      <TextField
        label="Correo"
        type="email"
        value={props.email}
        onChange={(e) => props.onEmailChange(e.target.value)}
        required
        autoComplete="email"
      />
      <TextField
        label="Teléfono"
        value={props.phone}
        onChange={(e) => props.onPhoneChange(e.target.value)}
        required={props.phoneRequired}
        helperText={
          props.phoneRequired
            ? "Obligatorio para encargos: te contactaremos para coordinar entrega y pago."
            : undefined
        }
        {...chilePhoneTextFieldProps}
      />

      {props.showAccountChoice && props.wantsAccount ? (
        <>
          <TextField
            label="Nombre de usuario"
            value={props.username}
            onChange={(e) => {
              props.onUsernameChange(e.target.value);
              props.onUsernameErrorChange(null);
            }}
            onBlur={() => {
              if (!props.username.trim()) return;
              void checkUsernameAvailabilityAction(props.username).then((r) => {
                if (!r.success || !r.available) {
                  props.onUsernameErrorChange(r.message ?? "Este nombre de usuario ya está en uso");
                } else {
                  props.onUsernameErrorChange(null);
                }
              });
            }}
            required
            {...eshopUsernameTextFieldProps}
          />
          {props.usernameError ? <p className="text-sm text-destructive">{props.usernameError}</p> : null}
          {props.requireRut ? (
            <TextField
              label="RUT"
              value={props.documentNumber}
              onChange={(e) => props.onDocumentNumberChange(e.target.value)}
              required
              helperText="Obligatorio para registrarse en esta tienda."
            />
          ) : (
            <TextField
              label="RUT (opcional)"
              value={props.documentNumber}
              onChange={(e) => props.onDocumentNumberChange(e.target.value)}
            />
          )}
          <TextField
            label="Contraseña"
            type="password"
            value={props.password}
            onChange={(e) => props.onPasswordChange(e.target.value)}
            autoComplete="new-password"
            helperText={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}
            required
          />
          <TextField
            label="Confirmar contraseña"
            type="password"
            value={props.confirmPassword}
            onChange={(e) => props.onConfirmPasswordChange(e.target.value)}
            autoComplete="new-password"
            required
          />
        </>
      ) : null}
    </div>
  );
}

export { MIN_PASSWORD_LENGTH };
