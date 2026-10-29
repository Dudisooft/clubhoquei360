# Fase 3A.7 · Auditoria de privilegis PostgreSQL/Supabase

29/10/2026. **BLOQUEIG CONFIRMAT, NO RESOLT en producció: concessió SQL innecessària de risc B; no s’ha demostrat un exploit des del client.** No hi ha 49 vulnerabilitats independents. No s’han executat GRANT, REVOKE, ALTER OWNER, ALTER DEFAULT PRIVILEGES, TRUNCATE, migracions o canvis RLS en aquesta fase, tampoc per repetir la prova destructiva local. Cap compte/rol productiu, configuració o dada esportiva alterats. Cap PR fusionada o desplegament.

## 1. Recuperació i fonts exactes

| Font | SHA remot verificat |
|---|---|
| main | e009f4df40d9ed353cb7d865beafed99d736892d |
| PR #31 · feat/match-mode-access-server | 3cce75896b7e262811e1b9c59a2daea733aa6782 |
| PR #32 · fix/match-mode-access | b76afcd70bc1f04e95f8a550b38728d77a77bf65 |
| PR #33 · fix/federation-roster-import-safety | 7434ea5f5b03e9bb1592f4304d53b7ab730ee7a3 |
| Checkpoint conjunt 3A.6 | 11e8bfc5087cc64ce5b809407b6b383b8b07c930 |

Branca d’auditoria `audit/supabase-privileges-3a7`, des del checkpoint conjunt, primer checkpoint `2ecfb9d`. Les branques funcionals no es fusionen entre elles. Llegits l’informe final 3A.6, el bloqueig, el progrés i les evidències locals/remotes; arbres nets abans de començar. Les correccions funcionals i migracions de 3A.6 no s’han alterat.

## 2. Documentació contrastada

[Manifest de fonts i hashes dels documents recuperats](evidence/privileges-3a7-documentation.json).

- PostgreSQL 17: [privilegis/propietat](https://www.postgresql.org/docs/17/ddl-priv.html), [RLS](https://www.postgresql.org/docs/17/ddl-rowsecurity.html), [herència](https://www.postgresql.org/docs/17/role-membership.html), [default ACL](https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html), [TRUNCATE](https://www.postgresql.org/docs/17/sql-truncate.html) i [SECURITY DEFINER](https://www.postgresql.org/docs/17/sql-createfunction.html). Text font oficial recuperat de postgres/postgres REL_17_STABLE; les pàgines directes estaven bloquejades per la política de xarxa.
- Supabase, documentació actual recuperada via search_docs: [rols](https://supabase.com/docs/guides/database/postgres/roles), [limitacions de superusuari a Cloud](https://supabase.com/docs/guides/database/postgres/roles-superuser), [seguretat Data API](https://supabase.com/docs/guides/api/securing-your-api), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
- Canvi relacionat verificat: [anunci del maintainer de Supabase del 28/04/2026](https://github.com/orgs/supabase/discussions/45329), exposició opt-in de nous objectes/projectes. Els exemples de revocació DML/defaults de postgres no demostren que els defaults gestionats de supabase_admin hagin desaparegut ni que afectin retroactivament les taules existents. Comentaris de comunitat sobre TRUNCATE no es prenen com una resolució oficial de Support. `supabase.com/changelog.md` directe retorna CONNECT403; l’índex complet de canvis recents queda sense verificar. No s’ha intentat esquivar el bloqueig.
- PostgREST: [taules/vistes](https://docs.postgrest.org/en/stable/references/api/tables_views.html) i [RPC](https://docs.postgrest.org/en/stable/references/api/functions.html), fonts recuperades del repositori oficial. Les operacions de taula no exposen una ordre SQL TRUNCATE. Una funció exposada amb EXECUTE sí pot executar SQL/DDL implementat al seu cos: per això cal revisar les RPC i no limitar-se a afirmar que REST és segur.

Conclusions semàntiques: RLS no limita operacions globals TRUNCATE/REFERENCES. Propietat implica autoritat sobre l’objecte i capacitat de tornar a concedir permisos; un propietari pot revocar els seus privilegis ordinaris, però això no elimina la seva autoritat de propietari ni restringeix un superusuari. NOLOGIN no elimina privilegis quan un servei de confiança fa SET ROLE; sí impedeix una autenticació SQL directa amb aquell rol. CONNECT tampoc equival a LOGIN. Els defaults s’apliquen als futurs objectes del **creador efectiu**, no als ja existents ni als creadors per herència automàtica.

## 3. Inventari exacte dels 49 casos

[Captura de catàlegs](evidence/privileges-3a7-inventory.json), [49 casos anotats](evidence/privileges-3a7-annotated-cases.json), [consulta íntegra](../scripts/audit-privileges-3a7-readonly.sql).

**49 entrades sobre 27 taules: 22 anon + 27 authenticated.** Totes són ACL explícites actuals de l’objecte, amb propietari i grantor postgres, sense grant option, RLS activa i `has_table_privilege(...,'TRUNCATE')=true`. Cap entrada és el privilegi del propietari, una entrada de pg_default_acl o una concessió a PUBLIC. No es necessita herència per explicar-les. La prova efectiva de catàleg no promet que una ordre concreta superi també FK, locks, mode READ ONLY o altres restriccions operatives.

Llegenda d’origen de la taula: **ACL directa** vol dir que l’entrada és present a pg_class.relacl; no acredita que algú hagués executat manualment un GRANT. Els catàlegs no guarden aquesta procedència històrica ni la data. És compatible amb defaults antics GRANT ALL, però no es prova aquest origen per a cada taula.

| # | Esquema.taula | Propietari / grantor | Beneficiari | Origen | Heretat / owner / default | API / RLS | TRUNCATE efectiu | Via client demostrada | Risc |
|---|---|---|---|---|---|---|---|---|---|
| 1 | public.club_match_schedule_history | postgres / postgres | anon | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 2 | public.club_match_schedule_history | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 3 | public.club_match_schedules | postgres / postgres | anon | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 4 | public.club_match_schedules | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 5 | public.club_memberships | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 6 | public.clubs | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 7 | public.discipline_reviews | postgres / postgres | anon | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 8 | public.discipline_reviews | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 9 | public.discipline_rule_sets | postgres / postgres | anon | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 10 | public.discipline_rule_sets | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 11 | public.federation_calendar_cache | postgres / postgres | anon | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 12 | public.federation_calendar_cache | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 13 | public.federation_competitions | postgres / postgres | anon | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 14 | public.federation_competitions | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 15 | public.federation_groups | postgres / postgres | anon | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 16 | public.federation_groups | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 17 | public.federation_import_runs | postgres / postgres | anon | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 18 | public.federation_import_runs | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 19 | public.federation_match_events | postgres / postgres | anon | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 20 | public.federation_match_events | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 21 | public.federation_match_lineups | postgres / postgres | anon | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 22 | public.federation_match_lineups | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 23 | public.federation_match_sources | postgres / postgres | anon | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 24 | public.federation_match_sources | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 25 | public.federation_matches | postgres / postgres | anon | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 26 | public.federation_matches | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 27 | public.federation_player_competition_stats | postgres / postgres | anon | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 28 | public.federation_player_competition_stats | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 29 | public.federation_players | postgres / postgres | anon | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 30 | public.federation_players | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 31 | public.federation_sync_runs | postgres / postgres | anon | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 32 | public.federation_sync_runs | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 33 | public.federation_team_entries | postgres / postgres | anon | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 34 | public.federation_team_entries | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 35 | public.federation_team_roster | postgres / postgres | anon | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 36 | public.federation_team_roster | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 37 | public.pilot_events | postgres / postgres | anon | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 38 | public.pilot_events | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 39 | public.pilot_matches | postgres / postgres | anon | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 40 | public.pilot_matches | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 41 | public.pilot_members | postgres / postgres | anon | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 42 | public.pilot_members | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 43 | public.pilot_operator_state | postgres / postgres | anon | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 44 | public.pilot_operator_state | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 45 | public.pilot_players | postgres / postgres | anon | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 46 | public.pilot_players | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 47 | public.profiles | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 48 | public.seasons | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |
| 49 | public.teams | postgres / postgres | authenticated | ACL directa | No / No / No | Sí / Sí | Sí | No | B |


Per a **cada fila**: esquema public; propietari/grantor postgres; concessió directa a rol concret, no heretada ni del propietari; no és una entrada de default; ruta Data API confirmada; RLS sí; autorització SQL TRUNCATE efectiva sí; via client TRUNCATE demostrada no; risc **B**. La columna API indica existència de ruta, no permisos DML ni SQL arbitrari. Les 27 comprovacions GET select=*&limit=0 van retornar42501/HTTP401, sense files esportives retornades, pel rol anònim. No s’han usat comptes productius autenticats per provar-ho.

## 4. Consultes i preservació

La consulta principal utilitza pg_class/pg_namespace/pg_roles i `aclexplode(relacl)`; separa owner, grantor, beneficiary, grant option i propietat. `has_table_privilege` verifica permisos efectius. pg_auth_members inclou admin_option, inherit_option i set_option. pg_default_acl s’inventaria a part. No s’han executat ordres SQL sobre files esportives per demostrar capacitat destructiva.

[Consulta de superfície](../scripts/audit-privilege-surface-3a7-readonly.sql): definicions/EXECUTE/SECURITY DEFINER/search_path, pertinença a rols, CREATE/USAGE/CONNECT, event triggers i extensions. Les definicions completes resten privades; els informes només publiquen metadades i resums revisats. [Permisos efectius i exemples d’ACL](evidence/privileges-3a7-effective-roles.json).

Dos inventaris READ ONLY productius, abans/després de les comprovacions, són iguals per a **les 49 entrades, defaults, rols, membresies, configuració API consultable, actor i versió**: [preservació](evidence/privileges-3a7-metadata-preservation.json). Els GET productius només han demanat metadades o limit=0. No s’han iniciat sessions Auth, enviat correus, cridat importacions o invocat RPC privilegiades productives. No es confon aquesta comprovació amb una nova investigació de les tres empremtes esportives històriques de 3A.5.

## 5. Rols, propietat i herència

| Rol | LOGIN | Superusuari / BYPASSRLS | Relació efectiva i interpretació |
|---|---|---|---|
| anon | No | No / No | 22 TRUNCATE explícits; sense membresies cap a rols administratius; USAGE public sí, CREATE no |
| authenticated | No | No / No | 27 TRUNCATE explícits; igual límit; s’hi mapegen usuaris Auth, inclosos coordinador i operador temporal |
| service_role | No | No / Sí | Backend tècnic; no inclòs al client; autoritat no equivalent a credencial pública |
| authenticator | Sí | No / No | NOINHERIT; pot SET ROLE anon/authenticated/service_role, sense heretar-los automàticament; rol de connexió del servei, no del navegador |
| postgres | Sí | No / Sí | Propietari de les 27 taules; pot administrar aquestes ACL; membresies cap a rols de servei/lectura i supabase_privileged_role; no membre de supabase_admin |
| supabase_admin | Sí | Sí / Sí | Rol administratiu gestionat; no hi ha cadena anon/authenticated→supabase_admin; no s’ha utilitzat ni intentat assumir-lo |

La direcció de pg_auth_members és essencial: que postgres sigui membre d’authenticated **no** converteix authenticated en postgres. Els rols client no tenen cap cadena d’herència cap a postgres, supabase_admin o service_role, ni CREATE public. El rol d’aplicació «Superadministrador» és una fila/autorització de negoci sobre una sessió SQL authenticated, **no** el superusuari PostgreSQL supabase_admin. Un JWT signat amb user_metadata editable no és una via per elegir rol administratiu; això ja es va verificar amb Auth real a 3A.6.

pg_has_role consultat sobre un superusuari pot retornar autoritat sobre rols encara que no hi hagi una aresta explícita corresponent a pg_auth_members. No s’ha comptat això com una concessió al client. Els privilegis de propietat/administració són risc **C** mentre no hi hagi una via d’accés indegut; retirar-los indiscriminadament no és l’objectiu.

## 6. Default privileges: objectes presents i futurs

Les 49 entrades són **permisos presents de taules**, no 49 defaults. Per a public hi ha quatre entrades rellevants de default TRUNCATE: creador postgres→anon/authenticated i creador supabase_admin→anon/authenticated. A storage/graphql/graphql_public també hi ha defaults gestionats al mateix inventari, però no són les 27 taules aplicatives d’aquest encàrrec.

| Origen | Efecte acreditat | Tractament |
|---|---|---|
| relacl de les 27 taules postgres | Autorització SQL actual dels clients | Risc B confirmat; hardening mínim preparat, no aplicat a Cloud |
| Default public de postgres | Pot concedir TRUNCATE a clients en futurs objectes creats com postgres | Proposta de retirar només aquest privilegi/default aplicatiu, ja contrastada localment a 3A.6 |
| Default public de supabase_admin | Pot donar el mateix privilegi a futurs objectes creats **com supabase_admin** | Risc futur condicionat, configuració administrativa a aclarir; no és una concessió actual de les 27 taules postgres |
| Autoritat de propietari/superusuari | Administració de l’objecte o plataforma | Risc C, no tractar com una concessió ordinària del navegador |

No s’ha demostrat que supabase_admin sigui el creador efectiu d’una taula aplicativa futura ni que l’aplicació pugui ordenar-li DDL. El seu default no s’hereta quan postgres crea una taula simplement per relacions de rol. L’event trigger existent `ensure_rls` activa RLS després de CREATE TABLE; **no** revoca TRUNCATE i no serveix com a mitigació d’aquest privilegi global.

No s’ha intentat canviar supabase_admin, el seu owner, membresies o defaults. PostgreSQL local superusuari no és evidència d’autoritat equivalent a Supabase Cloud.

## 7. Exposició real des de l’aplicació i les API

[Funcions revisades](evidence/privileges-3a7-function-surface.json). Les 67 funcions public/app_private tenen definicions idèntiques a la captura 3A.6. S’ha revisat també el placeholder graphql_public.graphql: invoker que informa que pg_graphql no està habilitat; l’extensió no està instal·lada. Exposició REST confirmada per [PGRST106](evidence/privileges-3a7-private-schema.json): public i graphql_public, no app_private. L’OpenAPI arrel retorna «Secret API key required»; no s’ha utilitzat una credencial superior per consultar-lo.

No hi ha TRUNCATE ni una funció d’execució de SQL arbitrari al cos de les funcions aplicatives revisades. Únic EXECUTE dinàmic: `public.rls_auto_enable`, funció event_trigger amb identificadors escapats `%I`, search_path pg_catalog i EXECUTE denegat a anon/authenticated/service_role; no és una RPC ordinària. Les funcions aplicatives SECURITY DEFINER revisades tenen search_path buit i controls d’identitat/àmbit; els wrappers públics s’han contrastat amb els helpers. No s’ha identificat cap paràmetre que s’interpoli com a SQL executat. Una ruta REST DELETE normal no és una ordre TRUNCATE i continua subjecta a permisos DML/RLS.

[Edge Functions desplegades](evidence/privileges-3a7-edge-surface.json), font llegida via eina, sense invocar-les:

- federation-sync v6: valida scheduler o JWT amb getUser i membresia operator segons el flux; RPC amb noms estàtics. No hi ha entrada de SQL.
- ihc-sync v3: scheduler verificat per RPC tècnica abans de processar; importació limitada al manifest/identitats. #33 prepara millores, però no s’ha desplegat durant l’auditoria.
- temporary-access v1: via OTP/invitació limitada per reserva servidor, i via administrativa amb getUser/temporary_admin_access. No s’ha cridat request-code/send-invitation ni creat cap compte real. La font desplegada s’ha revisat separadament perquè aquest main no conté aquest directori de funció; no s’ha assimilat a una PR pendent o implementat una alternativa.

verify_jwt=false a aquestes Edge Functions **no** és prova d’endpoint administratiu obert: existeixen comprovacions explícites al codi. Tampoc és una certificació universal; s’han revisat els tres fluxos desplegats relacionats, sense correus o escriptures productives. Claus service_role/SMTP són consultades al backend via variables d’entorn; no s’han recuperat valors de secrets.

[Client i artefacte Pages](evidence/privileges-3a7-client-scan.json): 38 fitxers de font i 38 de l’artefacte, cap clau secreta, JWT administratiu o URL amb contrasenya de DB detectats. El client usa clau publishable pública. No és una auditoria de tot l’historial Git ni una prova absoluta d’absència de qualsevol filtració desconeguda.

**Risc A no demostrat en el perímetre revisat.** NOLOGIN i manca de RPC arbitrària acoten la via; no «anul·len» l’ACL SQL. Si aparegués una RPC arbitrària, una injecció o una credencial de connexió indeguda capaç d’assumir aquests rols, el privilegi podria ser explotable i caldria reclassificar-lo a A. No hi ha evidència d’aquest camí aquí.

## 8. Staging, proves negatives i límits

[Sessió local i comparació de còpies](evidence/privileges-3a7-staging.json). S’ha reutilitzat l’entorn 3A.6 etiquetat, xarxa interna i loopback; cap projecte o recurs de pagament creat. PostgreSQL17.11, GoTruev2.197.0 i PostgREST16.4 reals, sense PGlite per a aquestes proves. No s’han executat els inicialitzadors, migracions, GRANT/REVOKE, ALTER DEFAULT PRIVILEGES o TRUNCATE per recrear privilegis.

Dues restauracions completes **ja existents**: 47 taules public amb tres migracions/49 concessions i 47 taules amb quatre migracions/0 concessions. S’han inspeccionat mitjançant transaccions READ ONLY. La tercera restauració incompleta d’un intent antic no s’ha usat. Els noms/destinacions estan restringits al contenidor i projecte local etiquetats.

| Cas local | Comprovació nova i resultat |
|---|---|
| Anònim | 5 RPC genèriques SQL/TRUNCATE inexistents404, importador tècnic EXECUTE denegat42501, event trigger no callable |
| Operador extern temporal existent | Login GoTrue/JWT real; rol SQL authenticated; mateixes denegacions; no SQL arbitrari ni TRUNCATE disponibles |
| Coordinador principal existent | Login real; rol SQL continua authenticated, no rol PostgreSQL administrador; mateixes denegacions |
| Superadministrador d’aplicació, secció, entrenador, delegat, ordinari, altre club | Mateixa verificació: en total 8 usuaris Auth ficticis i 1 anònim, nou casos PASS |
| Backend tècnic service_role | Cap client key usat per impersonar-lo; privilegi SQL consultat per catàleg i diferenciat de l’accés d’usuari |
| Administrador PostgreSQL local postgres | Superusuari local preexistent, només per lectura de catàlegs/còpies; **no** es presenta com Cloud postgres ni com un usuari Auth |

has_table_privilege confirma denegació TRUNCATE de anon/authenticated en el staging ja endurit; la còpia antiga mostra la capacitat SQL contrària. En aquesta fase **no s’ha intentat executar TRUNCATE**. La reproducció amb SET ROLE i rollback pertany exclusivament a 3A.6 i s’ha conservat com a evidència anterior, sense repetir-la.

Les peticions noves són GET de REST/RPC; l’únic POST local és login password de comptes ficticis **ja existents**. El login crea sessions/auditoria Auth i actualitza metadades d’inici de sessió locals, però no crea comptes ni assigna rols. JWT obtingut de GoTrue i verificat per PostgREST, amb sub/role contrastats; no token d’usuari fabricat, service JWT o contrasenya administrativa utilitzats per fer-se passar per un ordinari. Empremta de **totes les taules public** igual abans/després dels nou casos: cap dada esportiva, membresia, grant o configuració aplicativa modificada.

[Proves](evidence/privileges-3a7-tests.json): **12 Node nous PASS**, 0 fallades/omissions, model pur de classificació sense mutacions SQL; **9 casos locals Auth/API PASS**, **2 casos de generador READ ONLY PASS**. No es declaren com a noves execucions les 216 Node/68 Chromium i 9 API/6 navegador de 3A.6. Es reutilitzen perquè el codi funcional i les migracions no han canviat; [CI conjunta anterior](https://github.com/Dudisooft/clubhoquei360/actions/runs/40816460858). No s’ha repetit la bateria per obtenir el mateix resultat. Nova prova diagnòstica sense suite Chromium productiva.

Límit de fidelitat explícit: el postgres local és superusuari; no s’han reproduït rols/defaults gestionats supabase_admin per fer canvis que Cloud no permet. No s’ha certificat l’aplicació d’una revocació de propietari gestionat.

## 9. Causes, riscos i falsos positius

| Conclusió | Classificació | Evidència |
|---|---|---|
| TRUNCATE efectiu explícit als clients sobre taules aplicatives | **B · concessió innecessària confirmada** | 49 ACL/27 taules, cap ús funcional del privilegi, capacitat antiga acreditada; la retirada actual encara no s’ha instal·lat a producció |
| Destrucció des d’una sessió ordinària de navegador | **A no demostrat** | Sense SQL login dels rols, CREATE public, herència privilegiada, SQL arbitrari o TRUNCATE RPC identificats; proves negatives locals |
| Autoritat de postgres propietari i supabase_admin superusuari | **C · administrativa** | No són els beneficiaris de les 49 entrades; no via client demostrada |
| Defaults gestionats que beneficiarien clients de futurs objectes | Risc futur condicionat **B**, dependència administrativa **C** | pg_default_acl, creador efectiu, sense actual object grant que se’n pugui inferir |
| Comptar49 vulnerabilitats, deduir exploit del navegador des de SET ROLE, confondre el propietari del default amb el de la taula | **D · inferències errònies corregides** | Model d’auditoria separat, 12 regressions, gràfic de rols i metadades |
| Exigir zero TRUNCATE de tots els propietaris administratius o canviar supabase_admin per donar verd | **D com a porta indiscriminada** | Autoritat inherent/gestionada no equivalent a ACL del client. No cal ni s’ha intentat eliminar-la |

Els 49 casos **no** són falsos positius de propietat: tots tenen beneficiari client diferent de l’owner. Sí s’esmenen les interpretacions massa àmplies de l’auditoria. El sistema no es fa segur simplement rebaixant avisos a verd; la porta d’ACL actuals de client continua fallant amb49 entrades.

## 10. Correcció mínima proposada, no executada

[Generador READ ONLY amb precondicions](../scripts/propose-minimal-truncate-3a7-readonly.sql). Retorna ordres **com a text**, mai les EXECUTEa: 49 revocacions a taula/rol exactes, només TRUNCATE, i proposta per retirar aquest default del creador aplicatiu postgres. No conté alteracions de supabase_admin, propietat, RLS, membresies, DML, comptes o dades. No proposa revocar l’autoritat del propietari.

Precondicions: inventari exacte de49, mateix esquema/taula/beneficiari/owner/grantor, actor postgres i absència de concessió PUBLIC no revisada. Diferències, objecte absent, owner distint o correcció ja aplicada produeixen STOP, sense ordres. Cal una recaptura actualitzada abans de qualsevol instal·lació autoritzada; no aplicar una llista antiga sobre un estat que hagi canviat. El generador preserva una reconstrucció de l’ACL anterior com a text per a revisió d’emergència, no com a rollback automàtic que reintrodueixi capacitats inadequades.

[Verificació del generador](evidence/privileges-3a7-proposal-verification.json): sobre la còpia anterior reconeix les49; sobre la còpia ja endurida s’atura. No s’ha executat cap ordre retornada. La correcció existent de #31 és més àmplia quant a llista d’objectes (`ALL TABLES IN SCHEMA public`) però sobre el predecessor verificat només retirava aquestes49 concessions i defaults de postgres, preservant DML/backend. Aquesta fase prepara una alternativa acotada per a revisió de la futura instal·lació, sense substituir silenciosament la migració provada o modificar les PR funcionals.

Cloud: per a les27 taules **propietat de postgres**, no cal superar la limitació supabase_admin per preparar la revocació dels seus GRANT de client. S’ha demostrat l’owner i l’ACL; no s’ha executat la correcció a Cloud per la prohibició expressa. La prova local no certifica una aplicació productiva.

Recuperació: snapshot de només lectura abans/després d’ACL/defaults i dades esportives; operació futura en transacció autoritzada amb verificació d’owner, grantor i cardinalitat, després repetir permisos negatius i recorreguts operatius. Davant error, abortar transacció i preservar estat; si ja es confirma, correcció endavant preferida. Cap necessitat de restaurar o eliminar dades esportives per retirar una ACL. No fer DROP/CASCADE, canviar owner o restaurar tot el DB per un avís de permisos. Reintroduir un GRANT només podria valorar-se després de demostrar una dependència legítima, mai per recuperar la comoditat d’un permís sobrant.

## 11. Necessitat de Supabase i relació amb les PR

[Consulta Support preparada i NO ENVIADA](PHASE_3A7_SUPABASE_SUPPORT_DRAFT.md), amb versions, catàlegs sanejats, impacte acotat i preguntes concretes. No s’ha enviat cap sol·licitud externa ni contractat servei.

**Support no és necessari per assumir la propietat de les27 taules o corregir-ne els GRANT de postgres.** És pertinent per confirmar la configuració suportada dels defaults gestionats de supabase_admin i les garanties sobre objectes futurs de plataforma. Les respostes comunitàries i una prova en un PostgreSQL superusuari no són substitutes d’aquesta confirmació.

#31 ja conté la correcció aplicativa verificada localment; no cal tocar frontend #32 ni importador #33 per diagnosticar els49 casos. El codi funcional no s’ha modificat en cap branca. Els scripts nous classifiquen/inspeccionen i generen una proposta no executable automàticament. No es modifica cap decisió esportiva o regla d’elegibilitat. Les tres PR segueixen en esborrany; no s’incorpora cap altra PR pendent ni es publica l’aplicació.

## 12. Condicions acotades de desbloqueig

1. Revisar i autoritzar separadament l’hardening mínim aplicatiu. Verificar després **zero privilegis efectius TRUNCATE de clients sobre les taules aplicatives actuals** i cap herència/EXECUTE nou. Mantenir DML, backend, RLS i dades invariants. Aquesta condició actual encara no es compleix a Cloud perquè les49 entrades continuen presents.
2. Verificar el default del creador aplicatiu postgres i exigir revisió d’ACL per a qualsevol taula aplicativa nova, independentment del creador. Un objecte nou amb TRUNCATE client no ha de passar automàticament a ús/publicació. L’aplicació no necessita DDL ni CREATE public per als rols client.
3. Delimitar amb la plataforma els defaults de supabase_admin abans d’aplicar-hi cap modificació. No convertir una comprovació de «zero drets administratius» en requisit fictici. La simple existència d’un default gestionat no acredita explotació actual; una excepció documental, si s’accepta, ha d’acreditar absència de camí client, política d’objectes futurs i responsabilitat de revisió, sense fer passar per zero les49 concessions existents.
4. Qualsevol RPC/endpoint/credencial nou que permeti SQL/DDL requereix una nova avaluació del camí d’invocació. Si apareix una via explotable, aturar la publicació i reclassificar a A.
5. Mantenir la resta de condicions de 3A.6: baseline/versions, recuperació real, autoritzacions, classificacions i fonts pendents sense inventar proves. Cap resultat d’aquesta fase autoritza desplegament ni execució del SQL preparat.

Aquesta correcció de l’auditoria **acota** el bloqueig de plataforma: no es prova que s’hagi de modificar supabase_admin per corregir les49 ACL actuals, ni que els seus drets siguin una concessió del navegador. La futura decisió de publicació ha de basar-se en els objectes i camins aplicatius verificats, no en un recompte indiscriminat de privilegis de sistema.

## 13. Veredicte

**VERD — COMPROVAT:** inventari/procedència immediata exactes, direcció de rols, superfície SQL/API/Edge revisada, absència de secrets al client revisat, proves negatives de nou clients locals,12 regressions del model i comparació no destructiva49/0. Cap ordre de permisos o destructiva executada durant la fase.

**TARONJA — PENDENT DE VALIDACIÓ:** política suportada de defaults gestionats/creadors futurs, índex complet de changelog no accessible, absència d’una prova Auth productiva (no autoritzada), límits inherents a una revisió de superfície i drift futur. Support draft preparat sense enviar.

**VERMELL — CONFIGURACIÓ ACTUAL PENDENT DE CORRECCIÓ:** les49 concessions explícites innecessàries continuen a Cloud, risc B. No es declaren49 vulnerabilitats, una presa de control o un exploit de navegador. La correcció aplicativa està preparada i localment contrastada, però la prohibició d’escriure a producció impedeix declarar-la resolta allí.

**BLOQUEIG CONFIRMAT, NO RESOLT.** El veredicte global de 3A.6 **NO APTE PER A PUBLICACIÓ no es transforma en apte** amb una auditoria de només lectura. Se’n precisa la justificació: actuals ACL de client i via real d’accés s’han de separar dels defaults/autoritat de plataforma; exigir canviar els privilegis inherents de supabase_admin o equiparar49 ACL amb49 exploits era una interpretació excessiva. Cal revisar la proposta mínima i les condicions acotades, sense automatitzar una publicació ni alterar propietaris gestionats.
