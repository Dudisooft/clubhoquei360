# ClubHoquei360 · Continuïtat de Codex

Actualitzat: 17/10/2026, Europe/Madrid. Instrucció única de represa: **CONTINUA CLUBHOQUEI360**.

## Objectiu i fase actual

Mòdul d’estadístiques integrat al Centre de partit: registrar, conservar, corregir i consultar dades amb permisos de dades, sense duplicar el registre oficial. Temporada 2026/27. **Desenvolupament, pilot local i CI completats. L’usuari ha autoritzat la posada en servei amb «Endavant». Migració aplicada i verificada al PostgreSQL de producció; PR #1 fusionada i publicació Pages confirmada per GitHub. El responsable ha ajornat els comptes temporals fins a validar-ho amb el seu superadministrador. Accés directe de registre propi amb assignació de vuit hores verificat localment, en CI i publicat a Pages. **Només resten la validació real del responsable i el pilot posterior quan el demani.**** Detall: [statistics-deployment.md](statistics-deployment.md).

## Estat real de Git i punts de recuperació

- Repositori: https://github.com/Dudisooft/clubhoquei360
- Branca de desenvolupament: `feat/match-statistics-2026-27` (fusionada). Checkpoint documental publicat a `docs/statistics-deployment-record` (`ac699c4`). Branca de la validació pròpia: `feat/statistics-admin-validation` (PR #2 fusionada). Branca d’aquest registre final: `docs/statistics-release-status`.
- Checkout aïllat: `/workspace/work/clubhoquei360-stats`.
- Checkout inicial: `/workspace/clubhoquei360`, branca `work`, conservat intacte.
- Base remota auditada: `84e9872a8bce951f5bb56b8957ce64c11d570bcd`.
- Checkpoint 1 publicat i recuperable: `d64ca9483fd25d4672d4532830acbe9b71dc473c` — model i persistència verificats, 20 proves noves correctes.
- Checkpoint 2 publicat i recuperable: `67958a35b0d2748fb2692d2c1c807a3371569b3e` — integració, permisos i sessions recuperables.
- Checkpoint 3 publicat i verificat per CI: `ac8ad5ee754443804b1cdff3acbe434778877bc5` — aïllament de cues entre partits, paginació estable, RLS/anon i informe A–F.
- Checkpoint inicial de codi verificat localment i per CI: `a0145fadf8be158cbe1b47707161c3803121616a` — procedència oficial vinculada a font real, visibilitat del login i pilot amb set participants ficticis per equip.
- El checkpoint documental final només actualitza aquests informes i les evidències; `git log -1` identifica el commit que els conté.
- PR #1 fusionada: https://github.com/Dudisooft/clubhoquei360/pull/1. Commit a `main`: `5e1ce5efdc9624ecd6edd5ab53194098c77d1f85`.
- CI del codi final: https://github.com/Dudisooft/clubhoquei360/actions/runs/39018684522 — **success**, totes les etapes correctes, inclòs Chromium (58 Node + 12 navegador).
- Migració instal·lada a Supabase: `20261017130942_match_statistics`; font local `20261017005241_match_statistics.sql` sense canvis. Frontend publicat: https://github.com/Dudisooft/clubhoquei360/actions/runs/39035824360 — **success**, build i deploy de `5e1ce5e`.
- Últim checkpoint operatiu verificat: `f119d1d36ad6b8b9d31dcbab76aaceb096a9f419`, recuperable remotament; CI https://github.com/Dudisooft/clubhoquei360/actions/runs/39035723731 — **success**. Últim commit de codi verificat: `7745628f9e4b5ad32c93125e8486945ac1fae09e`, [CI 39036356807](https://github.com/Dudisooft/clubhoquei360/actions/runs/39036356807), 58 Node i 13 Chromium. Últim commit amb canvis d’aplicació verificat per Pages: `960837efae194663f40f97325a5f2eef68b6453c`, [Pages 39036449169](https://github.com/Dudisooft/clubhoquei360/actions/runs/39036449169), **success**, PR #2 fusionada. El commit del registre final s’identifica amb `git log -1` a la branca documental.

## Completat i verificat

1. Auditoria completa i contrast de metadades reals de Supabase: `docs/statistics-audit.md`. No repetir-la si no canvia la base.
2. Model canònic d’accions/resultats, agregats, referències oficials, exportacions i cronòmetre manual separat amb possessió mesurada.
3. Migració additiva `supabase/migrations/20261017005241_match_statistics.sql`: RLS, assignacions temporals/revocables per partit/categoria/costat/jugador, principal únic, revisions optimistes, mutacions idempotents, auditoria immutable i sessió recuperable.
4. Contexts de partit per identificadors federatius verificats; trigger per a imports futurs sense reescriure dades analítiques ni permisos.
5. Panell dins del Centre de partit, sense iframe: equip sense jugador previ, jugador→acció i acció→jugador sobre els mateixos esdeveniments. Correccions, anul·lació, recuperació d’anul·lades, revisió de canvis i validació.
6. Informes d’equip, individuals, comparatives/evolució per UUID/codi federatiu, cobertura explícita, denominadors vàlids, CSV UTF-8 i JSON d’auditoria.
7. Persistència Supabase instal·lada, outbox local per usuari/partit, reintents sense duplicats, còpia del rellotge i recuperació d’interval de possessió obert amb identitat estable.
8. Accés d’operadors externs sense `pilot_members`; entrenador/coordinador segons equip; delegat sense accés avançat automàtic. No es creen comptes personals ni credencials.
9. Formulari de login restaurat al dashboard, client públic compartit i supabase-js fixat a 2.95.3.
10. Ruta antiga `estadistiques.html` preservada amb redirecció al partit. Claus locals del prototip conservades, sense migracions per nom/dorsal.
11. Controls i rellotge oficials bloquejats fora del perfil principal; el rellotge oficial flotant ja no tapa l’anàlisi. Comprovació visual de mòbil/tauleta/escriptori.
12. Guia de posada en servei i pilot real: `docs/statistics-operations.md`. CI de verificació sense desplegament; scripts de comprovació i artefacte estàtic per Pages.
13. Instal·lació real autoritzada: 29 contexts verificats (24 FEM15), RLS/privilegis, API anònima denegada, esquema privat no exposat i publicació SQL de Realtime. Prova transaccional real de comandos/permisos, revertida íntegrament. Cap dada oficial alterada ni compte/assignació personal creat. Script reproduïble: `scripts/verify-production-statistics.sql`.
14. PR #1 fusionada amb CI correcta al HEAD. Pages existent ha construït i desplegat el SHA de fusió; logs amb URL d’entorn i «Reported success!». No repetir la migració.
15. Accés directe «Activa el meu registre (8 h)»: compte actual, només partit seleccionat, principal existent conservat fins a revocació explícita. Verificat en navegador amb gestor autoritzat, persistència de l’assignació, acció pròpia i registre oficial intacte; CI correcta i ajust publicat amb Pages 39036449169. No s’han creat assignacions personals a producció automàticament: l’usuari l’activa amb el botó.

16. Reforç de concurrència instal·lat: `20261017133038_require_session_revision`. La RPC rebutja revisions de sessió nul·les/negatives; regressió reproduïda abans del canvi i Node 59/59 després. Smoke SQL real PASS, tot revertit, empremtes oficials iguals i cap avís nou de seguretat. El frontend publicat no canvia. El codi i la verificació d’aquest reforç són a la PR #3 i al HEAD de `docs/statistics-release-status`; comprovar-ne l’estat remot en reprendre.

## Proves executades i resultats

- Base original: 27/27 proves Node. Fonts reals temporals absents: no es compten les proves condicionals com a executades.
- Suite Node actual: **59/59 correctes** (`npm test`), incloses proves de PostgreSQL/PGlite, permisos, revisions, idempotència, possessió, agregats, recuperació i outbox.
- Chromium: **13/13 casos correctes** en una execució consolidada de la suite completa, incloses recuperació de possessió i conflicte de rellotge entre dispositius.
- Resolucions provades: 390×844, 820×1180, 1440×1000, sense overflow horitzontal i amb botons estadístics ≥44 px. Captures locals a `work/statistics-*.png` (dades fictícies).
- `npm run check`: 21 fitxers HTML/JS/CSS correctes; sintaxi, scripts inline, IDs i enllaços relatius.
- `npm run build`: artefacte estàtic correcte a `work/site`, sense tests/SQL/node_modules/credencials.
- `npm audit --omit=dev`: zero vulnerabilitats comunicades.
- `git diff --check`: sense errors.

El navegador utilitza un transport local d’Auth/PostgREST/WebSocket amb identitats fictícies i una base PostgreSQL real local, amb les mateixes polítiques i funcions. La prova multioperador registra i consulta dades compartides persistents, però **no acredita Realtime/Auth de producció ni dos dispositius físics**. No atribuir aquestes proves a una sessió real d’Oriol/Ventu.

## Errors detectats i resolts

- El prototip anterior no tenia persistència ni permisos compartits; reemplaçat per la capa integrada.
- El dashboard no permetia iniciar sessió; formulari restaurat.
- Superposició del rellotge oficial sobre la UI analítica i controls oficials accessibles visualment; corregit i comprovat.
- Una URL de partit no autoritzat podia seleccionar silenciosament un altre partit accessible; ara mostra rebuig explícit.
- Canvis de mode/període podien perdre la selecció en pausar; corregit.
- Risc de perdre l’interval de possessió obert en una interrupció; còpia local amb UUID estable i prova de recuperació.
- Errors inicials del transport de proves i una lectura transitòria del rellotge pausat: corregits. No hi ha fallades conegudes en les proves actuals.
- La prova nova de registre propi necessitava assignacions al snapshot local i restaurar el principal fictici entre casos; helper corregit. La prova de redirecció podia acabar abans de la càrrega de dades i tallar el transport de prova; ara espera la connexió completa.
- La revisió de sessió nul·la podia eludir CAS: regressió confirmada abans del canvi, guard explícit al servidor i prova al PostgreSQL real després del reforç.

## Pendents per prioritat

No queda cap bloc de desenvolupament o prova local obert. PR #1 i #2 fusionades, migració instal·lada i Pages publicat, inclòs l’accés de registre propi; `docs/statistics-delivery.md` conté l’informe A–F i `docs/statistics-verification.json` les evidències de verificació.

1. Validació del responsable amb el seu superadministrador: dashboard → Centre de partit → Estadístic → seleccionar partit → **Activa el meu registre (8 h)**. La guia completa és a `docs/statistics-operations.md`. Les accions es desen al partit; anul·lar les introduïdes només per provar. El botó no reemplaça un principal actiu.
2. Completar el recorregut autenticat amb Supabase Auth/Realtime reals i dos dispositius físics. La xarxa actual impedeix obrir Pages directament; no evitar la restricció. Aquest límit no invalida les proves SQL/HTTP reals ni el desplegament confirmat per GitHub.
3. Només quan el responsable ho demani després de validar: crear comptes temporals i confirmar UUID, partit FEM15 i caducitat per al pilot. Els comptes d’Oriol/Ventu encara no existeixen i estan ajornats expressament. No tornar a demanar aquestes dades com a bloqueig de la validació pròpia.

Una ordre **CONTINUA CLUBHOQUEI360** ha de verificar primer aquest estat i si hi ha noves autoritzacions/dades per resoldre aquests pendents. No repetir auditoria o suites vàlides ni començar una nova refactorització sense necessitat.

## Dependències i límits

- Esquema inicial complet de Supabase no versionat; la migració assumeix l’esquema real auditat i les funcions `app_private.has_club_role`, `has_team_role`, `is_platform_superadmin` existents. No executar SQL històrics com si fossin migracions des de zero.
- Migració instal·lada i provada realment amb BEGIN/ROLLBACK; frontend fusionat i publicat amb workflow correcte. Les proves SQL amb claims no acrediten una sessió real de Supabase Auth.
- Portals federatius i Pages no accessibles amb l’eina web en aquesta execució; no es declara revalidació de fonts ni test visual de producció. GitHub sí confirma el desplegament; la Data API real s’ha comprovat per HTTP i PostgreSQL.
- Vídeo manual, sense sincronització automàtica; no hi ha app completa en fred sense xarxa. Les cues locals són recuperació d’escriptures, no un sistema d’autorització offline.
- Claus del prototip conservades; no hi ha importació automàtica d’estadístiques antigues per manca d’identificadors fiables.
- Dos registres esportius introduïts expressament com a accions diferents no es col·lapsen només pel temps. Hi ha avisos de possible duplicat, referències estables, identitat de mutacions i assignacions sense solapament.

## Fitxers modificats i nous

- Integració: `avancat.html`, `federation-client.js`, `estadistiques.html`, `dashboard.html`, `base.html`, `historial.html`.
- Components: `app-client.js`, `auth-ui.js`, `stats-model.js`, `stats-clock.js`, `stats-store.js`, `stats-ui.js`, `stats.css`.
- Dades: migració inicial indicada i `supabase/migrations/20261017133038_require_session_revision.sql` (ja aplicada). No reaplicar-ne cap.
- Verificació: `tests/stats-{model,database,store}.test.mjs`, `tests/helpers/stats-{db,server}.mjs`, `tests/browser/statistics.spec.mjs`, prova d’interfície adaptada, `playwright.config.mjs`, `scripts/{verify,build}.mjs`, `.github/workflows/statistics.yml`, dependències/lockfile i `.gitignore`.
- Documents: README, auditoria, operació/pilot, informe A–F (`docs/statistics-delivery.md`), evidència JSON (`docs/statistics-verification.json`), posada en servei (`docs/statistics-deployment.md`) i aquest registre. Verificació operativa: `scripts/verify-production-statistics.sql` (BEGIN/ROLLBACK).

## Represa exacta

En rebre **CONTINUA CLUBHOQUEI360**:

1. Llegir aquest document i les instruccions locals aplicables.
2. Executar `git status --short --branch` i `git log --oneline -5` al checkout indicat, o descarregar la branca en una sessió nova.
3. Verificar commits i fitxers. No repetir auditories ni proves vàlides de blocs intactes.
4. Continuar per la primera tasca pendent, autònomament.
5. Després de cada bloc: proves pertinents → actualitzar aquest document → commit descriptiu → comprovar `git show` i pujar la branca si hi ha accés.

La renovació de crèdits no inicia automàticament una execució. Cal enviar la instrucció de represa. No s’ha creat cap automatització.
