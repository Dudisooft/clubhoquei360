# Fase 3A.6 · Integració conjunta i preparació del desplegament

29/10/2026. **NO APTE PER A PUBLICACIÓ.** Integració funcional demostrada en entorn aïllat; bloqueig de seguretat del predecessor/plataforma pendent. Aquest informe no autoritza publicació. No s’ha fusionat cap PR, actualitzat main, aplicat SQL productiu ni modificat comptes o dades esportives reals.

## 1. Fonts i SHA

| Font | Punt inicial verificat | Codi final provat | Cap després de documentació |
|---|---|---|---|
| main | e009f4df40d9ed353cb7d865beafed99d736892d | Sense canvis | Mateix SHA |
| [PR #31](https://github.com/Dudisooft/clubhoquei360/pull/31) | 18a57b28932e0ffa20a0674e25fc791736682920 | 60d7d1b159e710ca226adad628dc7bf8b9c5059b | 3cce75896b7e262811e1b9c59a2daea733aa6782 |
| [PR #32](https://github.com/Dudisooft/clubhoquei360/pull/32) | 6838bca231c38e699731e60c0df5c40827f7190d | 69da6d4c4d807c0734f35da25d06732f81bc9ad0 | b76afcd70bc1f04e95f8a550b38728d77a77bf65 |
| [PR #33](https://github.com/Dudisooft/clubhoquei360/pull/33) | 7434ea5f5b03e9bb1592f4304d53b7ab730ee7a3 | Mateix codi | Mateix SHA |

Les tres PR continuen obertes i en esborrany. Els dos darrers commits de documentació no canvien codi, fixtures ni migracions provats. Branques originals preservades i responsabilitats separades.

## 2. Estratègia i conflictes

Branca temporal `audit/integration-3a6` creada des del main exacte. Diffs binaris de les PR aplicats amb `git apply --3way` en ordre #31 → #32 → #33; cap git merge ni fusió de PR. Commits de muntatge `64c3cec`, `777d595`, `63ae291`; validació i checkpoints `df64708`, `8a6eafce8f106706b4d65f2a00c846984d20bc58`. Documentació posterior no altera aquest codi integrat.

Conflictes resolts només aquí: `docs/CODEX_PROGRESS.md` conserva historial del servidor i referències dels altres checkpoints; `tests/helpers/stats-db.mjs` conserva `skipModes` de #31, la càrrega opcional externa de #32 i l’exclusió de la migració d’importador del fixture operatiu limitat de #33. Aquesta exclusió no omet la prova d’importació: hi ha fixture específic complet i proves conjuntes sobre l’esquema aplicatiu capturat. El workflow combinat executa també els dos recorreguts FEM15/futur amb totes les migracions de modes pertinents.

Correccions a les branques responsables:

- #31 `60d7d1b`: migració mínima de revocació TRUNCATE, preflight i regressió. #31 `3cce758`: evidències i bloqueig de plataforma.
- #32 `f7014ab`: el test de vídeo acabava amb una petició de jugadors encara oberta; espera el resultat i la identitat abans d’acabar. Cap canvi funcional. Repetició 3/3 PASS.
- #32 `69da6d4`: CI apuntava al servidor antic `07504fd`; ara fixa `60d7d1b` i inclou el nou hardening als recorreguts conjunts. `b76afcd` documenta resultats.
- #33 no necessita una correcció funcional addicional demostrada en aquesta fase.

## 3. Baseline real, esquema versionat i diferències

Captura mitjançant SELECT autoritzats: **45 taules public, 392 columnes i 67 funcions public/app_private**, més constraints, índexs, polítiques RLS, triggers, grants de taula/columna/esquema i ACL de funcions. Reconstrucció local sense files productives. Abans de migrar: correspondència exacta de taules, columnes/defaults, constraints, polítiques, triggers i definicions de les 67 funcions. Empremta de la captura a [baseline](evidence/integration-3a6-baseline.json); DDL/metadades privades a work/3a6, fora de Git.

No s’ha presentat el fixture sintètic de PGlite com a producció. El predecessor aplicatiu capturat és més fidel que els fixtures històrics i ha rebut les migracions reals. La reconstrucció NO clona tota la plataforma: Auth/providers productius, vault i secrets, treballadors pg_net, cron/jobs, configuració Supabase i defaults d’altres propietaris no s’han reproduït íntegrament. PostgreSQL productiu consultat: **17.11**, igual que el local; GoTrue local **v2.197.0**, PostgREST **16.4**, CLI **2.121.0**, Docker **28.4.0**, Node **24.19.0**. La versió/configuració Auth gestionada de producció no queda certificada pel runtime local.

Les dades reals no s’han clonat. La migració s’ha provat amb dades fictícies que respecten els constraints reals i amb preflight productiu de només lectura: `READY_SCHEMA`, dependències absents 0, contextos equip/club/temporada incoherents 0, cap instal·lació parcial de modes detectada. `READY_SCHEMA` no certifica les ACL ni autoritza publicar. Inventari actual: **36 equips / 38 inscripcions / 4 equips Júnior**, consultat només en agregat.

Ajustos exclusius dels fixtures: estat `finished` substituït pel valor real permès `closed`; columnes obligatòries explícites; empremtes de partits de prova diferenciades; accions de referència extretes de l’INSERT versionat. No s’han relaxat constraints, introduït dades federatives inventades o canviat polítiques per fer passar proves.

## 4. Migracions i dependències

Ordre conjunt validat localment; les migracions predecessores ja instal·lades no s’han de reproduir cegament:

1. #31 `20261027170248_match_mode_access.sql`.
2. #31 `20261027183214_temporary_match_operators.sql`.
3. #33 `20261028191801_preserve_partial_federation_rosters.sql`.
4. #31 `20261029040738_revoke_client_truncate.sql`.

[Manifest amb SHA256](evidence/integration-3a6-migrations.json). L’ordre cronològic posa la reparació d’importació abans de l’hardening de TRUNCATE; aquest últim no depèn del codi d’importació. #32 necessita el contracte RPC/RLS de #31 i no inclou SQL propi. #33 depèn del predecessor d’importació i no amplia permisos de modes.

Aplicació local guardada per projecte/contenidor, marcador i SHA de cada fitxer; una migració aplicada amb SHA diferent és rebutjada. Funcions d’activació idempotents, locks d’assessorament, integritat d’identitats, CAS d’esdeveniments/sessions i concurrència verificats. RLS/SECURITY DEFINER/search_path/EXECUTE, dependències i instal·lació parcial coberts pels tests del servidor. Les migracions de modes que reanomenen funcions no s’han de considerar universalment reexecutables; usar historial i preflight. Reiniciar els scripts de staging conserva les migracions ja reconegudes.

La substitució de funcions i canvis de polítiques/ACL adquireixen locks de catàleg; no es promet absència de bloqueig a producció. En una futura finestra autoritzada, definir lock_timeout/statement_timeout, revisar transaccions llargues i avortar davant incompatibilitat o instal·lació parcial. No hi ha execució d’UPDATE de classificacions dins d’aquest ordre.

## 5. Defecte de permisos detectat i bloqueig

El predecessor real conté **49 concessions TRUNCATE a anon/authenticated** sobre taules esportives i operatives. RLS no protegeix TRUNCATE. Reproducció només a staging: `SET LOCAL ROLE authenticated; TRUNCATE federation_match_lineups`, dins d’una transacció revertida. No és una prova Auth/JWT ni demostra que PostgREST exposi un endpoint de SQL arbitrari; sí demostra una capacitat SQL indeguda del rol que RLS no atura.

La nova migració de #31 revoca TRUNCATE de clients sobre public i dels defaults de postgres. Proves: denegació dels dos rols, preservació de files/RLS/DML i permisos tècnics, segona aplicació segura i noves taules sense aquell default. [ACL conjunt](evidence/integration-3a6-acl.json): els únics canvis als grants de taules preexistents són les 49 revocacions i SELECT/INSERT de `federation_match_events` per service_role, previstos a #33. No es concedeix INSERT d’aquesta taula a authenticated.

**Bloqueig no resolt:** el SELECT dels defaults productius mostra també TRUNCATE per a anon/authenticated sota el propietari `supabase_admin`. El rol disponible postgres **no és superusuari ni membre de supabase_admin**. La migració preparada no intenta elevar privilegis ni manipular el propietari de plataforma. La reconstrucció local no acreditava aquests defaults; la diferència es registra explícitament.

Cal una resolució autoritzada del propietari de plataforma, mitjançant un mecanisme admès per Supabase, i verificar zero defaults/concessions de TRUNCATE de clients abans de publicar. Si el mecanisme no és disponible, ajornar la publicació; no relaxar la porta de seguretat. Vegeu [bloqueig detallat](PHASE_3A6_SECURITY_BLOCKER.md) i [preflight productiu](evidence/integration-3a6-production-preflight.json). Els grants productius existents continuen intactes: aquesta fase no els ha revocat.

## 6. Staging amb Auth real i RLS

Perfil separat `clubhoquei360-3a6-local`, contenidors etiquetats `ch360_3a6_*`, xarxa Docker interna, volum propi. API només `127.0.0.1:56331`, PostgreSQL `127.0.0.1:56332`, web `127.0.0.1:56390`. Guardes rebutgen URL/projecte productiu, recursos no etiquetats i destins no loopback. El frontend de staging reescriu els dos clients Supabase al perfil local i verifica l’absència del ref productiu. SDK local, peticions externes del navegador bloquejades; zero peticions productives als recorreguts de staging.

Vuit comptes ficticis @ch360.invalid: superadministrador habilitat, coordinador principal, coordinador de secció, entrenador, delegat, operador temporal, ordinari i segon club. Signup/login i sessions reals de GoTrue, JWT signats verificats per PostgREST/RLS. Sense contrasenyes fixes al codi, invitacions reals, claus de servei productives o user JWT fabricats. El backend d’importació usa SET ROLE service_role només dins del contenidor etiquetat: prova explícita d’un servei tècnic, mai substitut d’un usuari ordinari.

Auth/RLS real **COMPLETADA EN LOCAL** per l’aplicació i els recorreguts indicats; no certifica Auth/configuració de producció. Les proves PGlite/CI continuen diferenciades. [9 blocs API](evidence/integration-3a6-auth-api.json) i [6 blocs navegador](evidence/integration-3a6-auth-browser.json): sènior/Júnior dos modes; inferiors ordinari Base; excepcions root/principal; secció/entrenador/delegat sense elevació; metadata/URL/JWT falsificats; denegació anònima i entre clubs; límit 168 h, proposta 24 h; scopes d’accions/costats/jugador; caducitat i revocació amb JWT vigent; bypass de notes denegat; conservació d’estadístiques i acta oficial.

## 7. Resultats conjunts A–H

[Resultats federatius amb Auth/DB real i dades fictícies](evidence/integration-3a6-federation.json). No es presenten com a recuperacions de plantilles reals.

| Cas | Resultat executat | Límit de l’evidència |
|---|---|---|
| A Rigat | Competició 3568 equivalent, dos modes; consulta sense crear context; selector i consulta navegador | Equip/jugadors ficticis; no aprova la classificació real |
| B SIMAR | Competició 3575 equivalent; futur, importació pròpia/rival, activació explícita per coordinador autoritzat, permís estadístic explícit, passada, recàrrega i idempotència | No es confon delegat lector amb operador autoritzat; no es registra un futur mitjançant la RPC antiga que exigeix acta verificada |
| C FEM15 | Operador amb Auth real, partit i termini exactes, estadístiques d’equip/jugador, pausa/recàrrega, revocació/caducitat, denegació d’importació/acta/resultat/targeta/altres partits/clubs | Dades i identitats fictícies; permisos reals de producció intactes |
| D Alpicat | Vuit rivals d’alineació desada recuperables; materialització explícita i repetida sense duplicats | No s’infereix que activar el context convoqui jugadors; test de contracte, no canvi de l’alineació real |
| E Salt | Vuit persones de catàleg, set participants d’alineació; només set materialitzats com a participants | No s’inventa el vuitè participant |
| F Vic | Revocar INSERT tècnic dins transacció local reprodueix l’error real; fallada conserva alineació prèvia; permís de #33 permet importar/repetir sense duplicar | Plantilla real del Vic continua no recuperada en aquesta fase |
| G HC Valls | Homònims de competicions/categoria diferents no es confonen; ID rival aliè rebutjat | Fixture verificable, no resolució nominal arbitrària d’un rival real |
| H Júnior/Shum Alea | Participant de categoria inferior continua reforç; altre candidat no verificat bloquejat; no clonat com a habitual Júnior | Manté separats plantilla, evidència d’habitualitat, candidats i convocats; regressions #29/#30 |

[Selector real en 390/820/1440 px](evidence/integration-3a6-selector.json): tres viewports × dues competicions importades, quatre nivells explícits, Base/Avançat, recàrrega sense preselecció, identitat correcta i empremtes de contextos/incidències/estadístiques invariants durant consulta. No s’han tocat els registres reals de les incidències històriques.

## 8. Importació segura i permisos tècnics

Migració #33 provada sobre el predecessor capturat i conjuntament amb #31: actualització additiva, resposta parcial/error no elimina plantilla vàlida, repetició amb identitats estables, rival sense crear equip gestionat, competició/grup/temporada/costat verificats. Restricció explícita de l’importador IHC existent preservada; no s’ha introduït multiclub nou.

`federation_commit_ihc` continua invoker i EXECUTE només backend. Permís reparador de `federation_match_events`: només SELECT/INSERT tècnics. Operador temporal amb JWT real no pot cridar importadors, escriure gols/targetes/resultats oficials o plantilles, ni accedir a altres àmbits. Error INSERT força rollback de la petició oficial completa: no queda importació esportiva parcial silenciosa. Les proves d’error/timeout/403/identitat ambigua/plantilla incompleta/buida i preservació formen part dels 216 tests, diferenciades dels recorreguts federatius interactius no accessibles.

## 9. Classificacions i matriu

[Matriu dels 36 equips / 38 inscripcions](PHASE_3A6_TEAM_MATRIX.md), sense forçar el catàleg a representar tots els equips federats. Proposta conservada 6 senior / 4 junior / 26 youth; tots els apply_approved continuen false. Les captures van ser revisades en la conversa segons el responsable; fitxers originals no examinats directament per Codex. Correspondència d’IDs procedeix del catàleg, no de les captures.

| Equip | Competició / federació | ID equip catàleg | Estat |
|---|---|---|---|
| Igualada Rigat HC | OK Lliga masculina 3568 / RFEP | 3696 | Participació comunicada i ID del catàleg; senior proposat, aprovació pendent |
| SIMAR Igualada HC | OK Lliga Plata Sud 3575 / RFEP | 3697 | Idem; no duplicat del primer equip |
| Igualada HC | Nacional Catalana 4774 / FECAPA | 12077 | Senior proposat, aprovació pendent |
| Igualada HC | Segona Catalana D 4779 / FECAPA | 12078 | Senior proposat, aprovació pendent |
| Igualada HC A | Tercera Catalana F 4781 / FECAPA | 12079 | Senior proposat, aprovació pendent |
| Igualada HC B | Tercera Catalana E 4781 / FECAPA | 12080 | Senior proposat, aprovació pendent |

No s’ha executat cap dels sis UPDATE ni modificat JSON d’aprovació. Fixtures utilitzen altres IDs esportius explícitament ficticis per provar compatibilitat: una classificació senior aprovada habilitaria disponibilitat esportiva dels dos modes, sense concedir operació. Desconeguts continuen protegits. Europa fora d’abast.

## 10. Suites i CI

[Manifest de proves i empremtes de logs](evidence/integration-3a6-tests.json).

| Execució | Superades | Fallades finals | Omeses |
|---|---:|---:|---:|
| Node conjunt, inclou PostgreSQL/PGlite i regressions #28/#29/#30 | 216 | 0 | 0 |
| Chromium conjunt després del hardening | 68 | 0 | 0 |
| Node branca servidor | 195 | 0 | 0 |
| API local Auth/RLS reals (blocs, no tests Node addicionals) | 9 | 0 | 0 |
| Navegador local Auth real (blocs) | 6 | 0 | 0 |
| Federació conjunta A–H amb fixtures i Auth real (blocs) | 8 | 0 | 0 |
| Selector real, tres resolucions | 3 | 0 | 0 |

Check/build conjunt PASS: 38 fitxers d’aplicació; artefacte Pages sense SQL/tests/credencials/node_modules. Primera bateria Chromium: 67/68, error de finalització de test corregit a #32, no error d’app observat; 3/3 repeticions i després 68/68 complets. Errors inicials del nou harness (actor sense activació/assignació, materialització implícita assumida, assercions que no admetien represa, columna SQL ambigua) corregits al harness, sense relaxar seguretat. Primera restauració de prova va detectar canvis Auth concurrents i després la particularitat del public schema de pg_dump 17; ajustos del procediment local fins a comparació estable correcta, no ocultats com a resultats superats inicialment.

CI verificada per conclusió i logs:

- [Conjunta 40816460858](https://github.com/Dudisooft/clubhoquei360/actions/runs/40816460858), codi `8a6eafc`: **success, 216 Node / 68 Chromium**, check/build i dos recorreguts conjunts addicionals PASS.
- [#31 40816276462](https://github.com/Dudisooft/clubhoquei360/actions/runs/40816276462), codi `60d7d1b`: **success, 195 Node / 47 Chromium**.
- [#32 40816361610](https://github.com/Dudisooft/clubhoquei360/actions/runs/40816361610), codi `69da6d4`: **success, 158 Node / 67 Chromium**, dos recorreguts amb servidor `60d7d1b` incloent hardening.
- #33 codi funcional preservat: [CI anterior 40756623866](https://github.com/Dudisooft/clubhoquei360/actions/runs/40756623866), 169 Node / 48 Chromium documentats a 3A.5. No es presenta com una nova execució independent: la nova prova és la conjunta 216/68.

La CI usa fixtures PostgreSQL/PGlite. La prova real GoTrue/PostgreSQL/PostgREST és local i separada, amb evidències pròpies; no afirmar validació Auth productiva o CI Auth real.

## 11. Integritat i limitacions federatives

[Empremtes 3A.6](evidence/integration-3a6-integrity.json): **23/23 conjunts iguals** entre les dues transaccions de només lectura d’aquesta fase; inclou equips, convocatòries/registres disponibles, incidències, estadístiques, sessions, assignacions, comptes i permisos auditats. Cap ordre mutativa remota. Conjunts de taules absents encara a producció (autoritzacions noves) no s’inventen com a presents.

Comprovació suplementària al final: [45/45 taules public invariants](evidence/integration-3a6-integrity-all-public.json), incloent federation_match_lineups, staff, estadístiques de competició i preparacions no inclosos a l’antic conjunt de 23. Aquest segon parell de captures cobreix l’interval final indicat, no s’inventa una captura completa inicial inexistent.

Investigació de les tres empremtes 3A.5: federation_matches 558, federation_team_entries 38, federation_team_roster 939 van canviar amb recompte estable. JSONB canònic i hashes de files ordenats exclouen l’explicació simple de diferent ordre de retorn SQL. No hi ha abans/després de files per distingir fetched_at/raw_data d’altres canvis. Cron horari actiu i imports amb success observats són un mecanisme possible, no una causa demostrada d’aquelles tres variacions. **Causa històrica pendent**; no s’ha qualificat de benigna ni alterat dades per investigar-la. Per resoldre-la, cal evidència temporal/fila mínima autoritzada o logs d’aquell interval, sense exportar informació personal innecessària.

Navegació federativa observada per l’usuari: portal → temporada → competició → grup → escut → pestanya → «Tornar a competicions». No s’ha substituït pel goBack del navegador. Política de xarxa 141 vigent exclou portals RFEP/FECAPA/SIDGAD; no s’ha intentat esquivar el bloqueig. Proves locals de transicions/contracts/retorn/cache/error executades; cookies, tokens, efecte real del control i plantilles reals no es declaren verificats. CONNECT 403 de l’entorn no prova una denegació atribuïble a la federació.

## 12. Reinici, còpia i recuperació provats

[Reinici](evidence/integration-3a6-restart.json): stop/start dels quatre contenidors etiquetats, mateix volum; comptes i totes les taules public comparades, alineacions, actes, estadístiques, sessions, assignacions i autoritzacions preservades. JWT Auth anterior encara vàlid, PostgREST/RLS restringeix lectura de l’operador revocat després del reinici. Gateway resol adreces Docker noves; no s’ha eliminat el volum.

[Backup final i restauració](evidence/integration-3a6-backup.json): writers i manteniment Auth locals pausats; pg_dump privat, restaurat a **una altra base nova local**, 76 taules public/app_private/auth amb recomptes i empremtes exactes, font invariant. Secrets/contrasenyes/hash d’autenticació ficticis només al dump privat ignorat, cap token o dada personal productiva als informes. Restauracions de diagnòstic locals es conserven; no hi ha neteja destructiva automàtica.

Això no verifica backup/PITR real, vault/cron/configuració Auth de producció, restauració multiservei o canvis posteriors a una futura publicació. No prometem rollback SQL invers segur per les migracions de modes.

## 13. Pla preparat, NO executat

1. **Aturar publicació mentre el bloqueig de plataforma sigui obert.** Resoldre de manera autoritzada els defaults de supabase_admin; conservar evidència de la correcció i comprovar tots els propietaris. Revisió humana de classificacions independent; sense aprovació mantenir-les unknown i explicar limitació esportiva.
2. Fixar SHA dels tres components, verificar que main no hagi canviat i repetir només les proves afectades. Detectar conflictes del helper com en aquesta branca; no usar aquest muntatge d’auditoria com una fusió automàtica.
3. Preflight productiu exclusivament de lectura: scripts `preflight-match-mode-access.sql` i `preflight-client-table-privileges.sql`, metadades/definicions/ACL/defaults/versions, estat d’instal·lació, cardinalitats exactes d’equip/club/temporada/inscripció, referències i empremtes. Verificar prerequisits d’importador i referències d’accions ja existents. Qualsevol drift, absència o estat parcial atura el procés.
4. Backup productiu autoritzat i restauració de comprovació en destí separat, incloent actes/alineacions/estadístiques/sessions/assignacions/autoritzacions i configuració indispensable. Definir finestra/quiescència i captura dels canvis posteriors: una restauració antiga sense reconciliació podria perdre dades legítimes noves. No procedir sense prova de recuperació del sistema real i autorització expressa.
5. Només amb autorització posterior: instal·lar les quatre migracions pendents de l’ordre de l’apartat 4, amb historial/locks/timeouts, transacció i evidències. No executar els sis UPDATE, crear comptes o canviar permisos personals per aquesta instal·lació. Desplegar backend d’importació compatible amb el contracte SQL i després frontend #32 amb revisió Pages; cap d’aquests passos s’ha fet.
6. Porta d’aturada automàtica: qualsevol error SQL, SHA diferent, estat parcial, lock timeout, cardinalitat diferent de l’esperada, privilegi indegut, default client TRUNCATE, pèrdua d’identitats/files, context duplicat, resultat oficial alterat o fallada Auth/RLS obliga a interrompre. El procés consumidor del preflight ha de refusar qualsevol resposta que no sigui l’estat esperat; `READY_SCHEMA` sol no basta. Sense mecanisme de correcció del propietari de plataforma, aquesta porta continua tancada.
7. Validació posterior autoritzada: revisar RPC/EXECUTE/search_path/RLS/defaults, zero concessions clients TRUNCATE, lectura per rols, scopes/revocació/caducitat, activació idempotent de fixtures dedicats i registres oficials invariants. No fer proves destructives o d’escriptura en actes reals. Fonts federatives accessibles i casos rivals pendents s’han de comprovar sense afirmar recuperacions inexistents.
8. Recuperació davant fallada: impedir noves activacions/escriptures des del frontend afectat, preservar SQL error/historial/snapshots, evitar reinstal·lacions cegues. Si una transacció no es confirma, verificar rollback i invariants. Si ja hi ha canvis confirmats, preferir correcció endavant versionada i reprovada; no reactivar polítiques vulnerables, fer DROP CASCADE o esborrar autoritzacions/estadístiques. Restaurar només en entorn nou, contrastar diferències i reconciliar dades legítimes posteriors abans de qualsevol substitució autoritzada. Restaurar només frontend no desfà l’esquema SQL.

## Continuïtat tècnica de staging

El perfil local resta recuperable sense eliminar volums. Amb l’arbre actual, comprovar primer Git i els marcadors/versions; `node scripts/integration-runtime.mjs start` només arrenca recursos etiquetats. Gateway `node scripts/integration-api.mjs`, web `node scripts/integration-site.mjs .`; no arrencar un segon procés si els ports ja estan ocupats pel mateix perfil. Els scripts de verify es troben a scripts/verify-integration-*.mjs. `integration-provision.mjs` verifica SHA de migracions ja reconegudes i no reinitialitza dades esportives existents. No repetir les suites acreditades si el codi és idèntic.

Per una reconstrucció nova: calen les metadades capturades privades o una recaptura de només lectura autoritzada, revisada per no incloure secrets; no copiar files productives. Després runtime → integration-schema → integration-baseline-check **abans** de migrar → integration-provision → gateway/web → verificacions. La comprovació estructural inicial no es torna a executar cegament sobre una base ja migrada. Guardes de destí i etiquetes obligatòries. Sense captura o dependència fidel, marcar limitació i no substituir-la silenciosament per un fixture sintètic.

## 14. Estat final

**VERD — COMPLETAT:** muntatge de les tres PR, conflictes conciliats, predecessor aplicatiu contrastat, quatre migracions provades localment, hardening de 49 grants locals, suites conjuntes/CI, Auth/RLS reals locals, escenaris A–H ficticis, selector responsive, reinici i backup/restauració local; dades i main productius preservats.

**VERMELL — BLOQUEJANT:** defaults TRUNCATE de supabase_admin no corregibles amb el rol disponible, més les concessions actuals pendents de la instal·lació autoritzada. L’hardening preparat no es pot presentar com una resolució completa productiva. Exigir resolució de plataforma i zero-row gate abans de publicar.

**TARONJA — LIMITACIONS:** causa històrica de tres hashes sense evidència suficient; navegació/plantilles federatives reals inaccessibles; diferències de plataforma i dades preexistents no clonades. No declarar recuperada la plantilla del Vic o resoltes individualment les incidències reals per tenir fixtures verdes.

**NEUTRE — PENDENT:** aprovacions de classificació, evidències originals quan calgui, verificació backup/recuperació productius, revisió humana i autorització expressa de qualsevol futur desplegament. No s’ha obert cap fase funcional nova.

**VEREDICTE FINAL: NO APTE PER A PUBLICACIÓ.** La integració funcional passa, però la comprovació de seguretat de plataforma continua bloquejada. Corregir el bloqueig mitjançant un mecanisme autoritzat, tornar a passar el preflight i revisar les condicions documentades abans d’una nova decisió humana. Cap veredicte implica autorització automàtica.
