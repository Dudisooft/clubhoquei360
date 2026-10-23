# Accessos temporals · lliurament i posada en servei

Encàrrec prioritari del 23/10/2026: [instrucció vigent](temporary-access-requirements.md). Substitueix la proposta anterior de comptes personals per a provadors; no elimina usuaris ni permisos interns.

## 1. Funcionalitats implementades

Una pantalla `accessos-temporals.html`, accessible des del dashboard només després de validar el rol global al servidor: correu, club obligatori, equip opcional, perfil, partits/catègores del registre limitat i caducitat 24 h / 7 dies / 30 dies / personalitzada. La caducitat personalitzada s’interpreta a Europe/Madrid; la durada compta des de la generació. Els àmbits de club/equip delimiten els partits autoritzats; el rival forma part de la comparativa d’aquell partit.

Taula de pendents/actives/caducades/revocades, dates i darrer accés verificat. Modificació de permisos/caducitat, revocació, regeneració d’enllaços pendents, còpia i enviament SMTP opcional. Regenerar invalida l’enllaç anterior; per reenviar després d’una recàrrega cal regenerar-lo perquè el secret no es recupera de la base.

Migració additiva `supabase/migrations/20261023204937_temporary_external_invitations.sql`, **no aplicada a producció**: invitacions, auditoria, límits d’intents i `invitation_id` a les assignacions estadístiques. No hi ha DML directe del client. RPC públiques invoker i comandos privats amb comprovacions explícites. RLS a les taules noves; els hashes no s’exposen per SELECT ni pels snapshots.

Un enllaç de 30 minuts conté dos UUID aleatoris (244 bits aleatoris); només SHA-256 persisteix. El secret es retorna en crear/rotar, s’envia en fragment de l’URL i queda només en memòria després d’obrir-lo: no s’emmagatzema en localStorage/sessionStorage. Acceptació atòmica, d’un sol ús. La URL enviada per SMTP i el destinatari provenen de configuració/dades verificades del servidor; no s’accepten destinataris ni redireccions arbitraris del navegador.

La revocació i els canvis actualitzen les assignacions en la mateixa transacció; la caducitat es comprova en cada petició, també amb sessions actives. Les dades ja descarregades no es poden «desveure»; el panell es refresca i amaga l’accés en perdre permisos. Es conserven les facultats internes independents. Els comandos antics d’assignació no poden gestionar les files vinculades ni eludir el cicle d’invitació per a externs.

Els nous contexts de partit reben assignacions compatibles d’invitacions actives. Si hi ha conflicte d’operadors es registra a l’auditoria i no es bloqueja la importació federativa. No es modifiquen marcador, rellotge oficial ni actes.

## 2. Autenticació i auditoria prèvia

- Auth existent: Supabase Auth, login intern amb contrasenya i cap formulari públic de registre. No hi havia codi d’alta personal d’externs; el formulari estadístic només assignava UUID existents.
- Rol global real: `platform_admins`, `enabled = true`, `role = platform_superadmin`, comprovat per `app_private.is_platform_superadmin()`. Consulta de producció: un únic superoperador habilitat, cap altre rol global habilitat. No s’ha concedit cap rol nou ni s’autoritza per correu al frontend.
- Clubs/equips i estadístiques disposaven de RLS i permisos de servidor. Les invitacions reutilitzen aquestes assignacions. No hi ha triggers d’alta a `auth.users` en l’auditoria consultada; els comandos antics de partit revisats requereixen membres/identitat autoritzada. No s’han modificat els seus permisos.
- No existien taules d’invitació. No s’han llegit secrets ni contingut de sessions. La configuració de correu de producció no s’ha verificat.

El convidat usa `convidat.html`: rep un codi amb Supabase Auth, el verifica amb `verifyOtp(type: email)` i accepta l’enllaç. El servidor exigeix `auth.uid()`, `auth.users.email_confirmed_at` i correspondència exacta del correu normalitzat; ignora `user_metadata` com a autorització. Un compte diferent no pot consumir la invitació.

Només l’endpoint servidor, després de validar una invitació i aplicar límits d’intents, pot crear una identitat tècnica mínima **sense contrasenya i sense confirmar el correu per endavant**. La petició OTP usa `shouldCreateUser: false`. No s’afegeix registre públic ni membresia de club/equip. Els usuaris interns existents es reutilitzen; les seves contrasenyes, rols i permisos es conserven.

Un cop consumit l’enllaç, el convidat pot tornar a entrar a `convidat.html` amb un nou codi de correu mentre existeixi una invitació activa; no reutilitza l’enllaç d’acceptació. «Darrer accés verificat» correspon a acceptació o entrada posterior pel flux convidat.

## 3. Permisos

| Perfil | Abast i facultats |
| --- | --- |
| Analista d’estadístiques | Consulta i categories estadístiques aprovades en els partits de l’àmbit; correcció pròpia; sense administració ni escriptura oficial |
| Consulta | Lectura de partits i estadístiques de l’àmbit; sense accions ni desament de rellotge |
| Registre limitat | Partits i categories seleccionats explícitament; sense administració; correcció pròpia dins de l’assignació |

Una invitació no revocada/no caducada per correu i club; modificar o regenerar l’existent en lloc de duplicar-la. Els àmbits incompatibles d’operadors es rebutgen. Un administrador de club no pot crear, modificar, enviar ni revocar invitacions. La taula d’auditoria registra creació, acceptació, canvis, rotació i revocació, sense secrets.

## 4. Estat de correus

**Implementat, pendent de configuració i prova real. No s’ha enviat cap correu de producció.**

L’Edge Function `temporary-access` separa el correu d’invitació de la verificació del correu:

- Invitació: SMTP opcional (`nodemailer` 10.2.1, TLS obligatori, ports 465/587). Sense configuració es pot generar/copiar l’enllaç i la UI indica que no s’ha enviat cap correu. Només es confirma enviament després que SMTP accepti el destinatari; això no garanteix lliurament a la bústia.
- Verificació: Supabase Auth envia el codi. Si no hi ha un servei de correu verificat, **no s’ha d’activar** `TEMPORARY_ACCESS_OTP_READY`. Sense aquest indicador l’endpoint rebutja sol·licitar codis i no crea identitats. Copiar l’enllaç no substitueix la verificació de correu.
- Límits: 6 peticions de codi per correu/hora, 30 per adreça resumida/hora i 200 globals/hora; 3 intents d’enviament per invitació/hora, a més dels límits de Supabase Auth. Els comptadors es conserven també per peticions invàlides. Els límits globals s’apliquen abans de crear files noves de comptador; es retiren comptadors de més de 48 hores. Resposta pública uniforme per a invitacions inexistents o limitades.

No s’introdueix cap proveïdor de pagament. Les credencials SMTP i `SUPABASE_SERVICE_ROLE_KEY` existeixen només a l’Edge Function; cap valor és al repositori o al navegador.

## 5. Proves executades

- PostgreSQL/PGlite: rols global/normal/admin de club, correu no verificat o d’un altre destinatari, consum únic, club/equip/partit, consulta sense escriptura, registre per categoria, caducitat, revocació sense canviar de sessió, modificació auditada, rotació, comptadors, assignacions futures i conservació dels permisos interns. La suite consolidada i els resultats exactes es registren a `temporary-access-verification.json`.
- Endpoint: rol servidor obligatori, SMTP absent, destinatari/URL fixats al servidor, rebuig SMTP/OTP sense fals èxit, identitat mínima no verificada, sense creació pública d’usuaris i límits/origen invàlid. Transport de correu doble de prova, no enviament real.
- Navegador: accés administratiu denegat a normal/admin, generació/còpia sense correu, verificació amb transport Auth local fictici sobre PostgreSQL, consulta, canvi a registre limitat, revocació i registre oficial intacte; destinatari incorrecte, enllaç consumit, entrada posterior i mòbil a 390 px. La resta de la suite cobreix 820 i 1440 px.
- Corregit durant les proves: reobrir un enllaç a la mateixa pestanya feia només navegació de fragment i no reiniciava el formulari; ara es reinicia amb protecció contra respostes d’un flux anterior. Els secrets es tornen a retirar de la URL.
- Compilació Deno de l’Edge Function, verificació de 31 fitxers estàtics, build Pages, diff i auditoria npm executats. Auth/SMTP d’invitacions en producció encara no provats. La prova Realtime ordinador → mòbil del 23/10 es conserva, sense repetir-la.

## 6. Configuració i publicació pendents

**No fusionar ni aplicar/desplegar aquest canvi a producció sense autorització.** La branca de treball és `feat/temporary-external-invitations`; `main` conserva la versió anterior. Checkpoints `8de409c` i `ef8f50e`; `main` bàsic `12444a9` integrat sense modificar-ne els fitxers. [PR #11 draft](https://github.com/Dudisooft/clubhoquei360/pull/11); consultar `git log` per als següents. La primera CI `40026215722` ha superat 98 Node i 22 Chromium; comprovar l’últim HEAD abans d’instal·lar.

Després de l’autorització:

1. Aplicar només la nova migració `20261023204937_temporary_external_invitations.sql`. No repetir les migracions estadístiques anteriors. Comprovar el rol global existent i executar una prova transaccional de RPC/RLS amb reversió; no concedir superoperador a altres persones.
2. Verificar SMTP de Supabase Auth per a destinataris externs, límits i caducitat OTP. Incloure `{{ .Token }}` a les plantilles aplicables de confirmació/enllaç màgic, conservant els fluxos interns existents. L’SMTP per defecte pot no admetre destinataris externs: no pressuposa lliurament.
3. Configurar secrets de l’Edge Function al dashboard de Supabase. Variables integrades: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Variables pròpies: `TEMPORARY_ACCESS_APP_URL=https://dudisooft.github.io/clubhoquei360/convidat.html`; `TEMPORARY_ACCESS_OTP_READY=true` només després de verificar el servei. SMTP d’invitacions opcional: `TEMPORARY_SMTP_HOST`, `TEMPORARY_SMTP_PORT`, `TEMPORARY_SMTP_USER`, `TEMPORARY_SMTP_PASSWORD`, `TEMPORARY_SMTP_FROM`. No passar secrets al xat, a fitxers versionats ni als arguments de comandes.
4. Desplegar exclusivament aquesta funció (CLI contrastada amb `--help`): `npx supabase functions deploy temporary-access --project-ref oevprbchlhyglhvopnvy --use-api`. `supabase/config.toml` desactiva el JWT de passarel·la només en aquesta funció perquè el convidat encara no té sessió. El handler aplica els seus controls; totes les accions administratives exigeixen `getUser` i el rol global al servidor. No usar `--prune` ni modificar altres funcions.
5. Fer una prova real amb un destinatari expressament autoritzat: recepció de codi, correu/destinatari correcte, consum únic, consulta/registre segons perfil i revocació. No utilitzar un flux fictici com a prova de Supabase Auth/SMTP real. Publicar el frontend només després de les comprovacions satisfactòries.

## 7. Primera invitació

Un cop instal·lat i verificat: entrar amb el compte propi al dashboard → **Accessos temporals** → correu destinatari → club → equip opcional → perfil → durada. En registre limitat, seleccionar també partits i categories. Prémer **Genera invitació**. Copiar l’enllaç o prémer **Envia invitació per correu** quan SMTP consti configurat. La persona l’obre, verifica el correu i accedeix només als partits autoritzats.

Per FEM15: seleccionar Igualada HC i l’equip importat de la temporada 2026/27. Oriol pot ser convidat com a analista o registre limitat sense rol d’entrenador/coordinador. La consulta de Ventu reutilitza permisos interns existents o una invitació de consulta si correspon. **No s’han creat comptes, invitacions, permisos ni correus reals per al pilot.**
