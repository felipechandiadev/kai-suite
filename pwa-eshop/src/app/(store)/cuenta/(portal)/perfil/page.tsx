"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TextField } from "@/shared/admin-shared";
import {
  getCustomerProfileAction,
  updateCustomerProfileAction,
} from "@/features/e-shop-customer-account/actions/customer-account.action";

export default function CuentaPerfilPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getCustomerProfileAction().then((r) => {
      if (r.success) {
        setFirstName(r.profile.firstName);
        setLastName(r.profile.lastName ?? "");
        setPhone(r.profile.phone ?? "");
        setAddress(r.profile.address ?? "");
        setEmail(r.profile.email);
      } else setError(r.error);
    });
  }, []);

  return (
    <div className="max-w-md space-y-4">
      <h2 className="text-lg font-semibold">Mi perfil</h2>
      <p className="text-sm text-muted-foreground">Correo: {email}</p>
      <TextField label="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      <TextField label="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} />
      <TextField label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <TextField label="Dirección" value={address} onChange={(e) => setAddress(e.target.value)} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button
        variant="primary"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setError(null);
          void updateCustomerProfileAction({
            firstName,
            lastName,
            phone,
            address,
          })
            .then((r) => {
              if (!r.success) setError(r.error);
              else router.refresh();
            })
            .finally(() => setBusy(false));
        }}
      >
        Guardar cambios
      </Button>
    </div>
  );
}
