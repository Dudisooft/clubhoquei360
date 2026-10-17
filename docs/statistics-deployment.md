# Posada en servei · estadístiques de ClubHoquei360

17/10/2026, Europe/Madrid. L’ordre «Endavant», rebuda després del lliurament de la PR #1, autoritza la migració, fusió i publicació verificades. No autoritza inventar identitats ni concedir accessos personals sense UUID confirmats.

## Checkpoint de base de dades completat

- Projecte existent: `oevprbchlhyglhvopnvy`.
- Migració aplicada amb èxit: `20261017130942_match_statistics`, registrada per Supabase. Font revisada: `supabase/migrations/20261017005241_match_statistics.sql`; SHA-256 `5c5ff1cfda8a83c5f81abc57e680e5417249e2021337c87a864349b85c29d9a1`. La versió de l’historial remot correspon a l’hora d’aplicació, no al nom del fitxer font.
- Vuit taules analítiques amb RLS, SELECT autenticat i sense INSERT/UPDATE/DELETE directes del client. Set RPC públiques invoker, cap executable per anon.
- 29 contexts de club de 2026/27, inclosos 24 de FEM15, vinculats per identificadors verificats. Una font RFEP és un partit entre tercers (3706–3734, competició 3575; l’equip vinculat del club és 3697) i no genera un context de club. El partit manual sense font no s’ha vinculat per nom.
- `stats_events`, `stats_assignments` i `stats_coverage` incloses a `supabase_realtime`. Això comprova la publicació SQL, no una entrega WebSocket entre dispositius reals.

## Verificacions executades a producció

El fitxer [verify-production-statistics.sql](../scripts/verify-production-statistics.sql) s’ha executat íntegrament en una connexió. Usa l’administrador existent, claims de sessió SQL i canvis de rol només dins de BEGIN/ROLLBACK. No crea comptes Auth, no usa credencials personals i no representa una entrada real al navegador.

Resultat PASS: permisos de gestor; assignació temporal; registre amb identitat derivada; reintent sense duplicat; correcció, anul·lació i recuperació; revisions obsoletes rebutjades; audit immutable; desament de sessió pausada i conflicte de sessió; operador limitat per categoria, costat, jugador i partit; caducitat i revocació; consulta d’entrenador limitada a l’equip; delegat sense accés avançat; identitat aliena i anon rebutjats. Tots els canvis s’han revertit. Després: zero observacions, assignacions, sessions i auditories de prova persistents; comptes i autoritat administrativa conservats.

Proves HTTP reals amb la clau pública de l’aplicació:

| Petició | Resultat |
| --- | --- |
| SELECT anònim de `stats_events` | HTTP 401, PostgreSQL 42501 |
| RPC anònima `stats_access` | HTTP 401, PostgreSQL 42501 |
| Lectura amb `Accept-Profile: app_private` | HTTP 406, PGRST106: esquema no exposat |

Recomptes i empremtes de les files oficials iguals abans/després de la migració i de la prova transaccional:

| Taula | Files | MD5 del conjunt ordenat |
| --- | ---: | --- |
| `pilot_matches` | 31 | `417f08a5ffa2158586704d3601f08d74` |
| `pilot_players` | 153 | `af479f11bc16438ec5a2c33ea9a80eab` |
| `pilot_events` | 342 | `b439347e63705e020c8443a142d0fc97` |
| `pilot_operator_state` | 6 | `d770b79d1c253d465b93785949b29535` |
| `federation_match_sources` | 30 | `6f12940fb3e725f9e69b0c35bebeea06` |

L’assessor de seguretat no identifica incidències noves d’estadístiques. Conserva els avisos previs: [pg_net a public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [dues funcions definer públiques preexistents](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [protecció de contrasenyes filtrades desactivada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) i tres taules administratives/importació amb RLS sense polítiques de client. No s’han canviat configuracions alienes al mòdul.

## Publicació

**PUBLICAT.** [PR #1 fusionada](https://github.com/Dudisooft/clubhoquei360/pull/1) amb CI correcta al HEAD `f119d1d36ad6b8b9d31dcbab76aaceb096a9f419`: [39035723731](https://github.com/Dudisooft/clubhoquei360/actions/runs/39035723731), 58 proves Node i 12 Chromium.

Commit de fusió a `main`: [`5e1ce5e`](https://github.com/Dudisooft/clubhoquei360/commit/5e1ce5efdc9624ecd6edd5ab53194098c77d1f85). [Pages 39035824360](https://github.com/Dudisooft/clubhoquei360/actions/runs/39035824360) completat amb **success**: build/Jekyll, càrrega de l’artefacte, deploy i report-build-status correctes. Logs: font `/github/workspace/.`; deployment creat per aquest SHA; «Reported success!» a les 13:16:16 UTC; URL d’entorn [ClubHoquei360](https://dudisooft.github.io/clubhoquei360/). No s’ha modificat la configuració existent de Pages.

Aquest estat acredita la instal·lació de base i el desplegament confirmat per GitHub. El recorregut autenticat de producció continua pendent; no es dedueix del resultat del workflow.

L’eina web no pot obrir l’URL Pages i la política de xarxa de l’executor no permet aquell host. No s’ha executat una prova visual del lloc publicat. No s’ha intentat evitar aquesta restricció.

## Pendents de prova real

El responsable ha indicat que els comptes d’Oriol Codinach/Ventu encara no existeixen i que es crearan després de la seva validació com a superadministrador. Primer: comprovar amb el compte propi i una assignació limitada al partit; després, quan es demani, preparar el pilot extern. Encara falta el recorregut autenticat amb Supabase Auth/Realtime reals i dos dispositius físics. Procediment a [statistics-operations.md](statistics-operations.md).

## Ajust de validació pròpia del superadministrador

Decisió posterior del responsable: comprovar primer el mòdul amb el seu compte; ajornar la creació dels comptes d’Oriol/Ventu. S’ha implementat «Activa el meu registre (8 h)» amb la mateixa RPC protegida, compte actual, abast de partit i caducitat explícita. Un principal actiu impedeix l’activació fins a la seva revocació expressa. No canvia la migració instal·lada.

Verificació local: 13/13 casos Chromium, inclòs el gestor sense assignació prèvia, revocació explícita del principal anterior, nova assignació de vuit hores, registre d’acció, recàrrega, mateix recompte de comptes Auth i registre oficial intacte. **Publicat.** Codi [`7745628`](https://github.com/Dudisooft/clubhoquei360/commit/7745628f9e4b5ad32c93125e8486945ac1fae09e), [CI 39036356807](https://github.com/Dudisooft/clubhoquei360/actions/runs/39036356807) correcta (58 Node i 13 Chromium). [PR #2 fusionada](https://github.com/Dudisooft/clubhoquei360/pull/2), SHA `960837efae194663f40f97325a5f2eef68b6453c`. [Pages 39036449169](https://github.com/Dudisooft/clubhoquei360/actions/runs/39036449169): **success**; logs de deploy amb «Reported success!» a les 13:25:46 UTC i URL d’entorn de ClubHoquei360. No s’ha reaplicat la migració. El recorregut autenticat real continua pendent de la validació del responsable.

## Reforç de concurrència de sessió

La revisió final ha reproduït un cas límit: una petició RPC amb `p_expected = null` eludia la comparació de revisió del rellotge. Els clients normals ja envien enters; la validació també ha de ser obligatòria al servidor.

Migració aplicada i verificada: `20261017133038_require_session_revision`, amb fitxer del mateix nom a `supabase/migrations/`. SHA-256 `7785df5ea7c1a1f3db3d2f529a85fee6a38e7636f19554e51d81e2dc08fff6cc`. Només substitueix la funció privada per rebutjar revisió nul·la/negativa (SQLSTATE 22023); preserva permisos i comportament vàlid.

Regressió local: falla abans del canvi («Missing expected rejection») i passa després, amb 59/59 proves Node. Smoke SQL íntegre a producció PASS, inclòs el rebuig explícit de revisió nul·la i totes les proves anteriors; tot revertit. Empremtes oficials idèntiques a la taula anterior, zero registres/assignacions/sessions de prova persistents, privilegis preservats i cap nova incidència de seguretat d’estadístiques. Codi i comprovacions remotes: [PR #3](https://github.com/Dudisooft/clubhoquei360/pull/3). No cal tornar a aplicar la migració.

## Activitat real observada després de la publicació

Continuació del 17/10/2026: repositori net i codi coincident amb la publicació `5baee53` de la PR #3; [CI 39037080177](https://github.com/Dudisooft/clubhoquei360/actions/runs/39037080177), 59 Node i 13 Chromium, i [Pages 39037185964](https://github.com/Dudisooft/clubhoquei360/actions/runs/39037185964) correctes. No s’han repetit les suites de runtime ni les migracions.

El servidor confirma una assignació de principal al compte existent del superadministrador, creada a les 14:38:27 UTC per al partit «Revisió vídeo · Alcobendas – Simar Igualada», durant vuit hores, amb entrada d’auditoria. Els logs de servei consultats des de les 14:35 UTC mostren HTTP 200 per a Auth `/user`, `stats_access`, `stats_grant` i les lectures analítiques; els registres PostgreSQL consultats només tenen severitat LOG/estat 00000. La consulta de les 14:40:18 UTC mostra una assignació activa, zero observacions i zero sessions d’anàlisi. No apareixen intents de `stats_write_event` o `stats_save_session` en aquella finestra.

Aquesta és evidència real de sessió/consulta/activació, independent del banc de proves local i del smoke SQL amb claims. El registre, correcció, recuperació i entrega Realtime de producció continuen pendents de completar. No s’ha controlat el navegador del responsable ni s’han creat dades des d’aquesta continuació. [Evidència sanejada](statistics-live-verification.json).
