# Emisión de claves Ed25519 para KaiStore Lite

No commits de claves privadas.

## Generar par (OpenSSL)

```bash
openssl genpkey -algorithm Ed25519 -out lite-license-ed25519.pem
openssl pkey -in lite-license-ed25519.pem -pubout -out lite-license-ed25519.pub.pem
```

Extraer seed/hex de la privada y pública según tu tooling, luego:

```bash
export LITE_LICENSE_PRIVATE_KEY_HEX=...   # 32-byte seed hex
export LITE_LICENSE_PUBKEY_HEX=...        # 32-byte pubkey hex (app / Rust)
```

En la app Tauri, `LITE_LICENSE_PUBKEY_HEX` debe coincidir. Si es todo ceros, Rust omite verify crypto (solo fingerprint) — solo para desarrollo.

## Emitir

```bash
npm run issue-license -- --fingerprint <hex> --company "Cliente SA" --out license.json
```

Entregar `license.json` al cliente para pegar en el gate de licencia.
