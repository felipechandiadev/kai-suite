# kai-sami — Guía para agentes

- Asistente analítico SaMI. Solo UI + Server Actions; OpenAI y SQL viven en kai-core.
- Primitivos UI: `@kai/ui`. Único `fetch` al backend: `src/features/assistant/infrastructure/assistant.request.ts`.
- Auth: NextAuth credentials; Bearer = UUID de usuario; `X-Kai-App: kai-sami`.
