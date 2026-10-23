# Sincronització federativa multiclub

Estat: implementació revisable en branca, **sense desplegament ni importacions noves a producció**. Data: 23/10/2026, Europe/Madrid. Base auditada: `4950940`, repositori real `Dudisooft/clubhoquei360` (l'encàrrec escrivia `Dudisoft`). Branca: `feat/multiclub-federation`; worktree: `/workspace/work/clubhoquei360-multiclub`.

## 1. Auditoria inicial

- `clubs` → `seasons`/`teams` → `federation_team_entries` → competicions/grups/partits. Jugadors per `(federation,external_player_id)`; plantilles, alineacions, incidències i staff tenen relacions pròpies. `club-catalog.js` ja normalitza la lectura. No s'ha creat un segon catàleg esportiu.
- Producció consultada exclusivament en lectura: un club, UUID `a48efe2f-c218-633e-6be6-4ce26e61f5cd`, temporada `94b6c5ab-ecc9-b4a5-4a2a-ad8d5446ff2e`, 2026/27, 36 equips, 22 competicions (19 FECAPA + 3 RFEP), 553 partits. Els últims cinc imports horaris consultats del 23/10 són `success`.
- Identificadors inventariats a `docs/ihc-inventory-2026-27.json` i `supabase/functions/ihc-sync/manifest.json`. Clubs externs IHC: FECAPA 252, RFEP 69, temporada externa 41. No confondre club, equip i logotip. FEM15 4802/12419 conserva el seu importador dedicat.
- `club-theme.js` només seleccionava una identitat estàtica per URL/localStorage. No vinculava la selecció a UUID ni a catàleg/temporada. `historial.js` triava per defecte IHC independentment de la identitat visual.
- RLS real existent: membres per club/equip i superadministrador; `pilot_*` i `stats_*` tenen permisos independents. No s'han ampliat afiliacions ni permisos esportius. Les noves lectures depenen de la visibilitat de `clubs` per RLS.
- Branques revisades: `feat/basic-match-20261024` (`8969261`, UI/model/store bàsics), `feat/temporary-external-invitations` (`8de409c`, migració i proves d'invitacions), i checkpoints d'estadístiques. No s'han fusionat ni modificat aquestes branques. El canvi a `tests/helpers/stats-db.mjs` limita el fixture antic a les dues migracions d'estadístiques que realment modela; la migració multiclub té fixture propi. Pot requerir conciliació amb l'ampliació del helper d'invitacions en integrar branques.
- Es preserven la PR #8 i l'acceptació Realtime ordinador→mòbil del responsable; no es reobre aquella validació.
- `cron.job` confirma `ihc-federation-hourly`, actiu a `17 * * * *`, i extensions `pg_cron`/`pg_net`. Això corregeix la fotografia més antiga de `docs/federation-integration.md`, que deia que no hi havia programació activa. No s'ha alterat aquesta tasca.

## 2. Arquitectura implementada

Migració additiva `supabase/migrations/20261023210142_multiclub_federation.sql`, encara **no aplicada**:

- `club_settings`: UUID, slug, nom oficial/abreujat, escut opcional, tres colors, temporada activa i verificació. Configuració al servidor; afegir clubs no requereix editar JavaScript. Un trigger rebutja una temporada activa aliena.
- `club_federation_sources`: vincle club/temporada/competició/federació, identificadors verificats d'equips, intervals, permís de consulta i estat temporal. El trigger rebutja relacions entre clubs diferents.
- `club_sync_jobs`: abast, actor, font, dates, estat, intents, lease/token i comptadors. Índex únic parcial: un sol treball pendent/en curs per font. Repetir el clic comparteix el treball existent; les peticions manuals respecten el cooldown.
- `club_sync_observations`: última observació oficial per clau estable, amb marca de verificació; sense accés de client. Comptadors de nous/actualitzats/sense canvis per recurs observat, no per intents d'upsert. Les claus de partit exclouen horari i marcador.
- `request_club_sync`: entrada pública SECURITY INVOKER amb implementació en esquema privat, cerca `auth.uid()` i comprova admin/coordinador general del club o superadministrador. Rebutja equip/partit aliè. No accepta identitat d'actor del navegador.
- `claim_club_sync`, `finish_club_sync`, `fail_club_sync`, `federation_commit_club`: només servidor. Claim amb `FOR UPDATE SKIP LOCKED`; lease de tres minuts i token únic; màxim tres intents. Un worker caducat no pot consolidar dades. Canvi de catàleg, observacions, comptadors i finalització en una transacció.
- Importador generalitzat a partir del codi IHC existent; conserva UUIDs d'IHC. Les altres identitats d'equip/grup/partit incorporen club per permetre dos clubs a la mateixa competició. Les persones continuen identificades per federació/codi, segons el model existent.
- `club-context.js`: selecció explícita; si el club no és accessible no retorna silenciosament un altre club. Contrast mínim de text 4,5:1 amb alternativa blanc/negre. `club-theme.js` carrega configuració, escut i selector i aplica colors a capçalera i botons de marca.
- `federacio.html` / `club-sync-ui.js`: catàleg, equips/categories, calendari, resultats, classificacions i historial amb comptadors/errors. «Actualitza dades federatives» per club/equip/partit. Els abasts equip/partit es resolen a les seves competicions, sense peticions per cada registre.
- Historial carrega el UUID actiu i actualitza la identitat en canviar el seu selector. El Centre de partit conserva la seva selecció de partit autoritzat i els seus permisos propis; la selecció visual no els substitueix.

## 3. Clubs configurats

`supabase/multiclub-seed.sql`, idempotent i pendent d'aplicar:

- **IHC**: reutilitza club/temporada/equips/competicions importats. Conserva escut i colors de la configuració existent. Prepara 21 fonts de competició; FEM15 conserva l'importador existent.
- **CP Manresa**: registre i configuració de presentació amb estat pendent; sense escut, temporada, afiliacions, equips ni identificadors federatius inventats. Els colors provenen del prototip existent i són provisionals, no certificats com a colors oficials.
- Per un tercer club: crear club/temporada i les relacions canòniques verificades, afegir `club_settings` i `club_federation_sources`; cap canvi estructural o al frontend. El descobriment existent `ihc-sync/discover` continua específic d'IHC; el nou worker no descobreix automàticament clubs/equips desconeguts.

## 4. Fonts federatives verificades i bloquejos

Les proves i identificadors històrics són a `docs/federation-integration.md` i `docs/ihc-import-2026-27.md`. Els portals utilitzen fragments HTML SIDGAD, no una API JSON pública documentada. Calendaris, plantilles i classificacions són POST a `www.server2.sidgad.es/{federacio}/...`, amb capçaleres del portal. Es reutilitza el parser existent, amb connectors de transport seleccionats per federació i sortida normalitzada comuna.

En aquesta execució, les connexions als portals FECAPA/RFEP i al changelog Supabase han rebut **403 del proxy abans d'arribar a la font**. La política de xarxa només afegeix CDN i el projecte Supabase als dominis de treball. No s'ha intentat eludir-la ni s'ha declarat una comprovació federativa nova. La documentació actual Supabase sobre cron, Vault i RLS s'ha consultat per MCP. La consulta de producció confirma execucions recents de l'importador preexistent, però no revalida des d'aquí l'estructura HTML actual ni el permís de reutilització.

Pendent: autoritzar els dominis de portals i `www.server2.sidgad.es` a la configuració de xarxa de l'entorn; verificar accessos i condicions reals; identificar club/equips/competicions/temporada de Manresa a partir de fonts oficials. No s'han inventat endpoints nous ni permisos federatius.

## 5. Dades importades i conciliació

**Zero imports nous a producció des d'aquesta branca.** Els 36 equips/553 partits són dades ja existents, confirmades en lectura. Les proves creen exclusivament dades fictícies en PostgreSQL local.

L'importador no escriu `pilot_events`, `pilot_operator_state`, `stats_events`, sessions o assignacions. Els marcadors/cronòmetres manuals segueixen independents. Tampoc elimina persones/plantilles històriques: conserva el mecanisme existent de baixes lògiques i valors incomplets.

Per camps locals a `federation_matches`, la llista `raw_data.manual_fields` protegeix `home_score`, `away_score`, `federation_start_at` i `venue`. L'observació oficial es conserva per separat; la UI etiqueta un registre amb aquests overrides com a local. La política és conservar el valor local fins a una conciliació explícita, no reemplaçar-lo automàticament.

## 6. Sincronització manual i automàtica

- Peticions manuals: Auth al servidor, RPC amb permisos, cua; no accepten forçar límits o inventar fonts. El botó queda desactivat si no hi ha font amb accés verificat.
- Worker `supabase/functions/club-sync`: consulta seqüencialment calendari, plantilla i classificació (màxim tres peticions per treball), sense redireccions, timeout de 20 segons, mida limitada i rebuig de resposta buida/format invàlid.
- Errors recuperables: reintents de 5/10 minuts, màxim tres intents. HTTP 401/403/429 pausa la font (`access_verified=false`) fins a revisió, sense insistir contra una restricció d'accés.
- Política configurable: 720 minuts calendari/classificació, 120 pròxims set dies, 15 el dia de partit a Europe/Madrid. Sempre preval `min_interval_minutes`; seed conservador 720 i `access_verified=false`, `automatic_enabled=false`.
- `supabase/multiclub-schedule.sql`: prepara cron cada minut que consumeix un treball; es crea desactivat dins una transacció. No és una automatització de Codex. Requereix worker desplegat, Vault i extensions existents. Les peticions manuals necessiten aquest consumidor actiu, encara que la generació de treballs automàtics per font estigui desactivada.
- Durant l'activació, substituir la rotació IHC existent per la nova només per fonts aprovades; no executar-les en paral·lel sobre les mateixes competicions. La branca no modifica el cron actual.

## 7. Proves

- Suite Node inicial del canvi: 74/74, incloses vuit proves multiclub noves; després s'afegeix una novena prova de dos clubs a la mateixa competició. Bloc final federació: **15/15** (9 multiclub + 6 IHC).
- Bloc final de federació: proves de configuració de club, escut/colors/contrast, transport i errors, intervals a Europe/Madrid, parser d'un altre club amb IDs verificats, RLS/privilegis, equip aliè, clics duplicats, claims solapats, imports repetits, marcador/horari, preservació manual, leases/reintents i identitats entre clubs.
- Chromium: 16/16 en la suite completa (14 regressions estadístiques i dos casos multiclub). Els casos nous usen transport sintètic; els permisos es comproven separadament amb PostgreSQL/PGlite. No són una importació federativa ni una sessió de producció.
- `npm run check`: 25 fitxers d'aplicació; `npm run build`: artefacte estàtic; `git diff --check`: correcte. Repetició dels dos casos multiclub després dels retocs finals: **2/2**, inclosa amplada mòbil de 390 px sense overflow. El build no incorpora SQL ni tests ni credencials.
- No hi ha runtime Deno instal·lat en aquest entorn: el desplegament Edge i la integració Auth/Vault/HTTP reals de la nova funció resten pendents de staging. Les funcions SQL sí s'executen realment en PostgreSQL local.

## 8. Limitacions i configuracions pendents

1. Cal aplicar migració/seed i desplegar la nova funció en staging, verificar-hi el flux complet amb font accessible i després autoritzar producció. El frontend necessita les taules noves; si encara no existeixen mostra configuració pendent.
2. Manresa té estructura de configuració, no inventari verificat. La nova importació no està acreditada amb dades reals actuals de cap club; l'evidència actual d'IHC correspon al servei existent.
3. El worker nou cobreix calendari/plantilla/classificació. Les actes, alineacions/incidències detallades i estadístiques oficials continuen en els importadors existents `federation-sync`, `ihc-sync` i `report-sync.ts`; **no s'han migrat al worker multiclub**. Cal completar aquesta migració després de verificar el contracte actual i l'abast permès de consulta.
4. No s'infereix el tancament oficial de l'acta d'un resultat ni d'una finalització local. El parser existent només exposa `official_status` cru; falta un contracte verificat de tancament per activar una política «fins a acta tancada». El nou worker no pot declarar aquesta funcionalitat completada.
5. La UI manté llista de partits autoritzats independent al Centre de partit. La nova selecció de club regeix catàleg/historial/identitat; falta conciliar la selecció de partit operatiu amb les branques paral·leles de Mode Bàsic i invitacions. No s'ha modificat el seu codi ni creat comptes.
6. SQL pressuposa l'esquema existent auditat: no reconstruir una base des de zero aplicant tots els SQL històrics. No reaplicar les migracions estadístiques ja instal·lades.
7. Advisors de producció consultats sense modificar-los: pg_net a public, funcions antigues SECURITY DEFINER i protecció de contrasenyes filtrades desactivada; registres interns sense política pública. Vegeu [linter de Supabase](https://supabase.com/docs/guides/database/database-linter) i [protecció de contrasenyes](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No es presenta aquest control com un advisor de la migració encara no desplegada.

## 9. Desplegament després d'autorització

1. Conciliar revisions remotes de les branques paral·leles. Preparar staging amb esquema compatible i executar proves. Revisar migració i permisos; aplicar **només** `20261023210142_multiclub_federation.sql`, després `supabase/multiclub-seed.sql`. No crear afiliacions implícites.
2. Executar advisors en staging i resoldre incidències noves. Validar RLS amb dos comptes/clubs diferents i verificar que `app_private` no és un esquema exposat a PostgREST.
3. Desplegar únicament la funció nova, amb el CLI verificat:
   `supabase functions deploy club-sync --project-ref <STAGING_PROJECT_REF> --no-verify-jwt`
   L'opció és necessària perquè el scheduler utilitza el token de Vault, no un JWT d'usuari. La funció comprova explícitament token de scheduler o `auth.getUser` i RPC d'autorització. El frontend ja no rep secrets de servei. Verificar que les variables de plataforma `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` i la RPC `federation_scheduler_authorized` estan disponibles. Si staging té un altre origen web, configurar el CORS abans del desplegament; el valor actual conserva Pages.
4. Confirmar llicència/condicions i accés real a cada font. Establir `access_verified=true` només després d'aquesta verificació i configurar els intervals aprovats; no activar 15 minuts per defecte. Per Manresa incorporar primer IDs i relacions canòniques verificades.
5. Adaptar la URL de `multiclub-schedule.sql` al projecte de staging. Confirmar secret existent `federation_sync_scheduler` a Vault sense mostrar-ne el valor. Instal·lar el job desactivat. Activar-lo per consumir una petició manual i comprovar execució final, comptadors, preservació i idempotència. Per refresc periòdic cal a més `automatic_enabled=true` a les fonts aprovades.
6. A producció, només després d'autorització expressa: aplicar SQL/seed, desplegar funció i frontend junts, substituir el cron antic de forma controlada i validar. No aplicar el seed com a permís per consultar fonts.
7. Retorn: desactivar `multiclub-federation-worker`, deixar acabar/caducar leases i tornar al frontend anterior. Reactivar la rotació antiga només si era l'autoritzada prèviament. Conservar les taules noves per traçabilitat; no eliminar dades manuals ni oficials per fer rollback.

La infraestructura existent és compatible amb cron/Edge/Vault; això acredita una via viable, no un desplegament nou completat. L'objectiu final requereix encara els passos i les verificacions pendents anteriors.
