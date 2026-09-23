# Módulo — Scripts

## `scripts/issue-license.mjs`
| Export / entry | Rol |
|----------------|-----|
| CLI `main()` | parse args `--machine --licensee --out` |
| `loadPrivateKey(env)` | Ed25519 from `KSL_LICENSE_PRIVATE_KEY` |
| `buildPayload({ machineId, licensee })` | JSON v1 expiresAt null |
| `signPayload(payload, key)` | |
| `writeLicenseFile(path, blob)` | |
| `resolveMachineIdFromInstallCode(code)` | map KSL- display → hash (tabla o API interna) |

## `scripts/issue-license.keys.example.md`
Documentación: generar par de claves; **nunca** commit private key; public key embed en `verify.rs`.

## `scripts/generate-app-icons.mjs`
| Fn | Rol |
|----|-----|
| `main()` | PNG → icns/ico/tauri icons |

## `scripts/package-release.mjs`
| Fn | Rol |
|----|-----|
| `main()` | orquestar tauri build + copiar artefactos DMG/MSI naming |
