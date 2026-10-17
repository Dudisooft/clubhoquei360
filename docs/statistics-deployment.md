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

Recomptes i empremtes de les files oficials iguals abans/després de la migració:

| Taula | Files | MD5 del conjunt ordenat |
| --- | ---: | --- |
| `pilot_matches` | 31 | `417f08a5ffa2158586704d3601f08d74` |
| `pilot_players` | 153 | `af479f11bc16438ec5a2c33ea9a80eab` |
| `pilot_events` | 342 | `b439347e63705e020c8443a142d0fc97` |
| `pilot_operator_state` | 6 | `d770b79d1c253d465b93785949b29535` |
| `federation_match_sources` | 30 | `6f12940fb3e725f9e69b0c35bebeea06` |

L’assessor de seguretat no identifica incidències noves d’estadístiques. Conserva els avisos previs: [pg_net a public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [dues funcions definer públiques preexistents](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [protecció de contrasenyes filtrades desactivada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) i tres taules administratives/importació amb RLS sense polítiques de client. No s’han canviat configuracions alienes al mòdul.

## Publicació

En curs: checkpoint SQL verificat; falta fusionar la PR #1 i comprovar la construcció/publicació Pages existent de `main`. La CI del codi de la PR és correcta: [39018839361](https://github.com/Dudisooft/clubhoquei360/actions/runs/39018839361).

L’eina web no pot obrir l’URL Pages i la política de xarxa de l’executor no permet aquell host. No s’ha executat una prova visual del lloc publicat. No s’ha intentat evitar aquesta restricció.

## Pendents de prova real

Confirmar UUID i partits autoritzats d’Oriol Codinach/Ventu, designar principal i fer el recorregut autenticat amb Supabase Auth/Realtime reals i dos dispositius físics. No hi ha cap compte o permís personal creat per aquest desplegament. Procediment a [statistics-operations.md](statistics-operations.md).
