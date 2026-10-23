# Accessos temporals · auditoria i posada en servei

Encàrrec prioritari del 23/10/2026: [instrucció vigent](temporary-access-requirements.md). Substitueix la proposta anterior de comptes personals per a provadors; no elimina usuaris ni permisos interns.

## Auditoria abans de modificar codi

- Auth existent: Supabase Auth, login intern amb contrasenya, sense formulari públic de registre. No hi havia codi d’alta personal d’externs; el formulari estadístic només concedia assignacions a UUID ja existents.
- Rol global real: `platform_admins`, `enabled = true`, `role = platform_superadmin`, comprovat per `app_private.is_platform_superadmin()`. Consulta de producció: un únic superoperador habilitat, cap altre rol global habilitat. No es concedeix cap rol nou ni s’utilitza un correu al frontend per autoritzar.
- Clubs/equips: RLS existent per membres i superadministració. Estadístiques: RLS i RPC comprovades al servidor, amb assignacions per partit i àmbits sense solapament. Les invitacions reutilitzen aquestes assignacions, identificades amb `invitation_id`.
- No existien taules d’invitació. No s’han llegit secrets ni contingut de sessions. La configuració de correu/plantilla OTP de producció no s’ha verificat; no s’afirma que el correu extern funcioni.

## Bloc 1 · dades i autorització

Migració CLI: `supabase/migrations/20261023204937_temporary_external_invitations.sql`, **no aplicada a producció**. Taules d’invitació/auditoria amb RLS, cap accés directe del client; RPC públiques invoker i comandos privats amb comprovacions explícites. El servei de verificació només pot reservar peticions de correu mitjançant una RPC restringida a `service_role`.

Enllaç de 30 minuts, dos UUID aleatoris (244 bits aleatoris), només hash SHA-256 persistent; secret retornat una sola vegada en crear/rotar. Acceptació atòmica exigeix sessió Auth, `email_confirmed_at` real i correspondència amb el destinatari, abans de concedir assignacions. Token consumit no reutilitzable. Rotació només de pendents; l’anterior deixa de funcionar.

Perfils: analista amb categories aprovades i correcció pròpia; consulta sense escriptura; registre limitat amb partits i categories obligatoris. Club obligatori, equip opcional; els partits s’han de correspondre amb tots dos. Una invitació no revocada/no caducada per correu i club; cal modificar o rotar l’existent. Les assignacions d’operador incompatibles es rebutgen.

La revocació i els canvis actualitzen les assignacions en la mateixa transacció; la caducitat es comprova a cada petició. Les sessions Auth poden continuar existint, però no conserven accés estadístic per una invitació caducada/revocada. Els permisos interns independents es conserven. Els antics comandos d’assignació no poden eludir la gestió d’invitacions per identitats externes.

Els nous contexts de partit reben assignacions compatibles d’invitacions actives. Si hi ha conflicte d’operadors, es registra a l’auditoria sense bloquejar la importació federativa. No s’alteren marcador, rellotge oficial, actes ni estadístiques existents.

## Estat i continuació

Onze proves específiques de PostgreSQL/PGlite superades; suite Node consolidada 77/77 correcta. La preparació de la UI, l’endpoint de correu i els tests d’interfície són el bloc següent. No hi ha cap invitació real ni correu enviat. El mòdul encara no es declara operatiu en producció.

No desplegar ni aplicar la nova migració sense autorització. Les 66 proves Node i 14 Chromium anteriors continuen com a antecedent; repetir la suite pertinent perquè ara sí que hi ha canvis de codi/dades.
