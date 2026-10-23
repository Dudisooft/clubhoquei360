# ClubHoquei360 · Continuïtat de Codex

Actualitzat: 23/10/2026, Europe/Madrid. Instrucció única de represa: **CONTINUA CLUBHOQUEI360**.

## Objectiu i fase actual

Mòdul d’estadístiques integrat al Centre de partit, temporada 2026/27. **Base instal·lada i publicada; ampliació de l’estat de connexió verificada localment i per CI (66 Node, 14 Chromium), fusionada amb la PR #6 i publicada a Pages. Prova bàsica real amb el superadministrador completada: registre d’una acció, desament i lectura posterior de la sessió confirmats.** Realtime entre ordinador i mòbil físics confirmat pel responsable el 23/10/2026. Els comptes temporals continuen ajornats fins que el responsable demani preparar el pilot.

El 20/10/2026 el responsable ha respost «Fet» al recorregut d’inici, registre, pausa, desament i recàrrega. La consulta de producció de les 07:41:05 UTC confirma una passada completada, una auditoria, una sessió de vídeo en P1 amb 19.202 ms i revisió 7. Els logs confirmen un POST d’esdeveniment, set desaments de sessió i una lectura de sessió posterior, tots HTTP 200. Identitats/auditoria/revisions coherents, sense errors als logs delimitats. [Evidència sanejada](statistics-acceptance-20261020.json); la [fotografia anterior](statistics-live-verification.json) es conserva com a antecedent.

El 23/10/2026 el responsable confirma que l’acció apareix a l’historial del mòbil sense recarregar i que apareix o avança «Darrera actualització en directe». La prova física de Realtime queda acceptada amb aquesta evidència humana: [registre sanejat](statistics-realtime-acceptance-20261023.json). L’agent no ha controlat els dispositius ni inspeccionat logs d’aquesta prova. Les correccions, el registre individual i la resta de proves locals/SQL continuen vàlides amb el seu abast original; no s’han presentat com a nous passos reals executats pel responsable.

## Estat real de Git i punts de recuperació

- Repositori: https://github.com/Dudisooft/clubhoquei360
- Branca de desenvolupament: `feat/match-statistics-2026-27` (fusionada). Checkpoint documental publicat a `docs/statistics-deployment-record` (`ac699c4`). Branca de la validació pròpia: `feat/statistics-admin-validation` (PR #2 fusionada). Branca del reforç final: `docs/statistics-release-status` (PR #3 fusionada). Branca de la primera comprovació real: `docs/statistics-live-checkpoint` (PR #4 fusionada a `af702f4`). Checkpoint d’acceptació real: PR #5, fusionada a `235b71f56e89503e90b91716e6967e3dd7885122`. Branca del codi: `feat/statistics-live-status` (PR #6 fusionada). Branca del registre de publicació: `docs/statistics-live-status-release` (PR #7 fusionada a `3458532e75c709cfdedf9be0eb8e251f893695e3`). Branca del checkpoint d’acceptació física: `docs/statistics-realtime-acceptance`.
- Checkout aïllat: `/workspace/work/clubhoquei360-stats`.
- Checkout inicial: `/workspace/clubhoquei360`, branca `work`, conservat intacte.
- Base remota auditada: `84e9872a8bce951f5bb56b8957ce64c11d570bcd`.
- Checkpoint 1 publicat i recuperable: `d64ca9483fd25d4672d4532830acbe9b71dc473c` — model i persistència verificats, 20 proves noves correctes.
- Checkpoint 2 publicat i recuperable: `67958a35b0d2748fb2692d2c1c807a3371569b3e` — integració, permisos i sessions recuperables.
- Checkpoint 3 publicat i verificat per CI: `ac8ad5ee754443804b1cdff3acbe434778877bc5` — aïllament de cues entre partits, paginació estable, RLS/anon i informe A–F.
- Checkpoint inicial de codi verificat localment i per CI: `a0145fadf8be158cbe1b47707161c3803121616a` — procedència oficial vinculada a font real, visibilitat del login i pilot amb set participants ficticis per equip.
- Checkpoint anterior de codi verificat: `4aee0c0997e8dac359411da170856410e8158eb4`, [CI 39037080177](https://github.com/Dudisooft/clubhoquei360/actions/runs/39037080177), **59 Node i 13 Chromium correctes**.
- PR #1, #2 i #3 fusionades. Commit de publicació del codi: `5baee53cacc590c9cd18caef1f3d7464b6aae99f`, [Pages 39037185964](https://github.com/Dudisooft/clubhoquei360/actions/runs/39037185964), **success**.
- Migracions instal·lades: `20261017130942_match_statistics` (font local `20261017005241_match_statistics.sql`) i `20261017133038_require_session_revision`. No reaplicar-les.
- Últim commit de codi verificat: `b8cec59f08cca7cc57fec05f6ece3b6619145a3d`, [PR #6](https://github.com/Dudisooft/clubhoquei360/pull/6), [CI 39413527452](https://github.com/Dudisooft/clubhoquei360/actions/runs/39413527452) **success**, 66 Node i 14 Chromium. Fusió: `c53406a9d1263d766de4e9163e6eb225666dc510`. [Pages 39413843911](https://github.com/Dudisooft/clubhoquei360/actions/runs/39413843911) **success** en build/deploy; URL d’entorn confirmada als logs.
- Aquest checkpoint registra la confirmació humana de Realtime del 23/10/2026, sobre la publicació ja verificada. `git log -1` identifica el commit documental d’acceptació. No hi ha canvis SQL, dependències, dades esportives ni comptes; no repetir suites de runtime del codi intacte.

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

17. Activitat real del superadministrador observada en lectura: Auth/consulta/assignació HTTP 200, principal propi durant vuit hores desat i auditat. No s’han registrat observacions ni sessions des d’aquesta continuació, ni s’han creat comptes. Snapshot i límits a `docs/statistics-live-verification.json`.

18. Prova real bàsica completada el 20/10/2026 amb confirmació del responsable: esdeveniment i sessió persistents, lectura HTTP 200 després del desament, una sola observació/auditoria i comprovacions d’integritat sense anomalies. Captura sanejada a `docs/statistics-acceptance-20261020.json`. Cap escriptura de l’agent a producció.

19. Connexió compartida observable: estat de subscripció real, darrera actualització només després de notificació i lectura correcta, refresc en reconnexió i protecció contra callbacks de partits anteriors. Set proves unitàries noves i un cas Chromium amb WebSocket tallat/HTTP operatiu. CI i publicació de la PR #6 correctes. Protocol físic sense comptes nous a `docs/statistics-operations.md`; acceptació física posterior al punt 20.

20. Prova física de Realtime acceptada el 23/10/2026 pel responsable: ordinador → mòbil, mateix partit, acció visible sense recàrrega i indicador d’actualització en directe que apareix o avança. Abast: protocol amb compte propi; no es presenta com a prova amb dos operadors diferents ni del pilot FEM15. Evidència a `docs/statistics-realtime-acceptance-20261023.json`.

## Proves executades i resultats

- Base original: 27/27 proves Node. Fonts reals temporals absents: no es compten les proves condicionals com a executades.
- Suite Node actual: **66/66 correctes** (`npm test`), incloses proves de PostgreSQL/PGlite, permisos, revisions, idempotència, possessió, agregats, recuperació i outbox.
- Chromium: **14/14 casos correctes** en una execució consolidada de la suite completa, incloses recuperació de possessió i conflicte de rellotge entre dispositius.
- Resolucions provades: 390×844, 820×1180, 1440×1000, sense overflow horitzontal i amb botons estadístics ≥44 px. Captures locals a `work/statistics-*.png` (dades fictícies).
- `npm run check`: 22 fitxers HTML/JS/CSS correctes; sintaxi, scripts inline, IDs i enllaços relatius.
- `npm run build`: artefacte estàtic correcte a `work/site`, sense tests/SQL/node_modules/credencials.
- `npm audit --omit=dev`: zero vulnerabilitats comunicades.
- `git diff --check`: sense errors.

El navegador utilitza un transport local d’Auth/PostgREST/WebSocket amb identitats fictícies i una base PostgreSQL real local, amb les mateixes polítiques i funcions. La prova multioperador registra i consulta dades compartides persistents, però **no acredita Realtime/Auth de producció ni dos dispositius físics**. No atribuir aquestes proves a una sessió real d’Oriol/Ventu.

- Bloc de connexió del 20/10/2026: `node --test tests/stats-realtime.test.mjs` 7/7; `npm test` 66/66; Chromium 14/14, zero fallits/omesos/inestables; check 22 fitxers; build correcte i diff net. Resultats sanejats a `docs/statistics-live-status-verification.json`. El cas de navegador talla expressament WebSocket i espera el refresc HTTP de quinze segons; no simula una validació de producció.

- Verificació real del 20/10/2026: una acció i una sessió persistents; POST/GET HTTP 200; zero discrepàncies de dades/auditoria i zero errors als logs de la finestra consultada. Confirmació humana del recorregut bàsic. No s’han repetit suites vàlides ni migracions.

- Confirmació humana del 23/10/2026: **PASS del protocol Realtime físic ordinador → mòbil**. Sense control visual/logs independents de l’agent; sense prova de dos comptes diferents, tauleta o portàtil. Canvi només documental: JSON, enllaços i diff verificats; codi/SQL/dependències intactes, suites anteriors conservades.

## Errors detectats i resolts

- La pantalla no distingia notificacions en directe del refresc HTTP: estat i hora explícits, sense marcar lectures inicials/periòdiques com a entrega Realtime.
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

Cap bloc de codi o prova local obert. Indicador de connexió verificat localment i per CI, PR #6 fusionada i publicació Pages confirmada. Registre documental del resultat desat en aquest checkpoint, sense canvis d’aplicació. `docs/statistics-delivery.md` conté l’informe A–F; no repetir migracions ni la prova bàsica real ja acceptada.

Realtime físic ja acceptat; no tornar a demanar aquesta prova només per una ordre de represa. No queda cap bloc tècnic independent pendent de desenvolupament.

1. Preparar el pilot FEM15 només quan el responsable ho demani: confirmar comptes verificats, partit, abasts i caducitat. Els comptes d’Oriol/Ventu encara no s’han creat des d’aquest encàrrec i la creació continua ajornada. No exigir-los per validar el compte propi, que ja ha funcionat.
2. Dins del pilot autoritzat, comprovar consulta i revocació amb un segon usuari. Si es vol ampliar l’evidència real, comprovar registre individual i correcció/desfer amb les assignacions corresponents. Aquestes funcions ja tenen proves locals i SQL; no repetir-les sense dades o incidències noves.

Una ordre **CONTINUA CLUBHOQUEI360** ha de verificar primer aquest estat i si hi ha noves autoritzacions/dades per resoldre aquests pendents. No repetir auditoria o suites vàlides ni començar una nova refactorització sense necessitat.

## Dependències i límits

- Esquema inicial complet de Supabase no versionat; la migració assumeix l’esquema real auditat i les funcions `app_private.has_club_role`, `has_team_role`, `is_platform_superadmin` existents. No executar SQL històrics com si fossin migracions des de zero.
- Migració instal·lada i provada realment amb BEGIN/ROLLBACK; frontend fusionat i publicat amb workflow correcte. Les proves SQL amb claims no acrediten una sessió real de Supabase Auth. Les comprovacions posteriors observen Auth/consulta/activació i registre/desament/lectura reals HTTP 200, amb confirmació del recorregut bàsic pel responsable. Realtime ordinador → mòbil confirmat pel responsable el 23/10/2026; la consulta/revocació entre comptes diferents queda per al pilot autoritzat.
- Portals federatius i Pages no accessibles amb l’eina web en aquesta execució; no es declara revalidació de fonts ni test visual de producció. GitHub sí confirma el desplegament; la Data API real s’ha comprovat per HTTP i PostgreSQL.
- Vídeo manual, sense sincronització automàtica; no hi ha app completa en fred sense xarxa. Les cues locals són recuperació d’escriptures, no un sistema d’autorització offline.
- Claus del prototip conservades; no hi ha importació automàtica d’estadístiques antigues per manca d’identificadors fiables.
- Dos registres esportius introduïts expressament com a accions diferents no es col·lapsen només pel temps. Hi ha avisos de possible duplicat, referències estables, identitat de mutacions i assignacions sense solapament.

## Fitxers modificats i nous

- Integració: `avancat.html`, `federation-client.js`, `estadistiques.html`, `dashboard.html`, `base.html`, `historial.html`.
- Components: `app-client.js`, `auth-ui.js`, `stats-model.js`, `stats-clock.js`, `stats-store.js`, `stats-ui.js`, `stats-realtime.js`, `stats.css`.
- Dades: migració inicial indicada i `supabase/migrations/20261017133038_require_session_revision.sql` (ja aplicada). No reaplicar-ne cap.
- Verificació: `tests/stats-{model,database,store,realtime}.test.mjs`, `tests/helpers/stats-{db,server}.mjs`, `tests/browser/statistics.spec.mjs`, prova d’interfície adaptada, `playwright.config.mjs`, `scripts/{verify,build}.mjs`, `.github/workflows/statistics.yml`, dependències/lockfile i `.gitignore`.
- Documents: README, auditoria, operació/pilot, informe A–F (`docs/statistics-delivery.md`), evidència JSON (`docs/statistics-verification.json`), posada en servei (`docs/statistics-deployment.md`) i aquest registre. Verificació operativa: `scripts/verify-production-statistics.sql` (BEGIN/ROLLBACK).

## Represa exacta

En rebre **CONTINUA CLUBHOQUEI360**:

1. Llegir aquest document i les instruccions locals aplicables.
2. Executar `git status --short --branch` i `git log --oneline -5` al checkout indicat, o descarregar la branca en una sessió nova.
3. Verificar commits i fitxers. No repetir auditories ni proves vàlides de blocs intactes.
4. Continuar per la primera tasca pendent, autònomament. Si el codi no ha canviat i no hi ha dades o errors nous, conservar les proves vàlides i el pendent concret de validació humana; evitar tornar a proposar activacions o recorreguts bàsics ja confirmats. La resposta «Fet» del 20/10/2026 completa el recorregut bàsic, i la confirmació del 23/10/2026 completa Realtime ordinador → mòbil; una nova ordre de represa no reobre aquestes proves. Continuar amb el pilot només quan el responsable ho demani explícitament, sense crear comptes automàticament.
5. Després de cada bloc: proves pertinents → actualitzar aquest document → commit descriptiu → comprovar `git show` i pujar la branca si hi ha accés.

La renovació de crèdits no inicia automàticament una execució. Cal enviar la instrucció de represa. No s’ha creat cap automatització.

## Mode Bàsic prioritari · 23/10/2026

Represa: **CONTINUA MODE BÀSIC CLUBHOQUEI360**. Aquest bloc és independent dels checkpoints d’estadístiques anteriors; no repetir les migracions ja instal·lades.

- Base `4950940` (main amb PR #8). Worktree `/workspace/work/clubhoquei360-basic`, branca `feat/basic-match-20261024`. Checkout inicial conservat. Cap PR oberta en començar segons GitHub; visibilitat global d’altres tasques Codex no disponible.
- Completat: pantalla bàsica mòbil amb convocats editables, golejador opcional, gols rivals, targetes individuals i generals de banqueta, anul·lació, cua persistent/reintent, marcador fix, finalització/reobertura local i taula de discrepàncies. Reutilitza el flux pilot i no modifica els fitxers avançats ni l’esquema.
- FECAPA: consulta manual de l’Edge Function existent i consulta en finalitzar, amb memòria cau de sis hores declarada. Dades manuals conservades. Estat cru de la font visible; tancament i targetes oficials de banqueta no verificables. Enllaç al portal per revisió manual. Cap desplegament de funcions ni consulta contínua nova.
- Auditoria real només de lectura: esquema/CHECK/FK/RLS verificats. La política `pilot_events_direct_club_fixture` és RESTRICTIVE. No s’han canviat permisos, comptes, dades esportives ni producció.
- **Bloqueig de la prova concreta:** no existeix al calendari pilot consultat el partit Infantil D – Aplicat A del 24/10. Hi ha un FEM15 contra Alpicat, que no s’ha assimilat. Cal font verificable, importació autoritzada del partit correcte, plantilla i accés operador. No crear IDs manuals ni deduir competició/horari.
- Proves: suite Node 74/74; Chromium completa 17/17 (14 regressions avançades i 3 bàsics). Vuit casos específics Node inclouen permisos/escriptures PostgreSQL local, participants, gols/targetes/correccions, persistència/reintent, errors federatius, discrepàncies i finalització/estat. Check 24 fitxers, build i diff correctes. Dades fictícies en navegador; la nova UI usa transport sintètic i els permisos també es proven separadament en PostgreSQL local. Cap prova d’escriptura esportiva en producció. Retoc final comprovat de nou amb els 8 casos Node bàsics i els 3 Chromium bàsics.
- Limitacions: arrencada en fred amb xarxa, memòria cau FECAPA sense bypass, contracte d’estats no verificat, partit prioritari absent, CORS existent restringit a GitHub Pages. Bloqueig HTTP 403 al portal i al changelog Supabase des de l’entorn; documentació RLS consultada via MCP. Finalització bàsica no bloqueja el Centre Avançat. No emprar simultàniament dos operadors oficials entre modes durant la prova.
- Fitxers: `base.html`, `base.js`, `basic-model.js`, `basic-store.js`, `tests/basic.test.mjs`, `tests/browser/basic.spec.mjs`, `tests/helpers/basic-browser-client.js`, `docs/basic-match-delivery.md`, aquest document.
- Represa: revisar branca/status i [informe detallat](basic-match-delivery.md); verificar el partit/plantilla correcte; inspeccionar revisions remotes abans de qualsevol integració. La publicació a producció i qualsevol importació de dades reals queden pendents d’autorització expressa. Els commits de branca i la PR són revisables i no activen Pages.

### Publicació autoritzada i prova Salt · continuació 23/10/2026

El responsable autoritza expressament publicar la versió i provar-la amb el partit anterior Igualada HC – Salt; també demana contrastar FECAPA. S’ha localitzat a les taules federatives generals Igualada HC D – Oxford HC Salt A, 10/10/2026 16.45 Europe/Madrid, 8–0, codi 152035, acta importada el 23/10 a les 11.17 amb estat `FINALIZAT` i resultat coincident calendari/acta. No existia a `pilot_matches`; no se n’ha inventat ni creat una còpia de producció.

S’afegeix `basic-practice.js` i la ruta `base.html?practice=b89dd91d-933f-841a-ad43-f03553ca14a5`: mateixa pantalla i controls amb convocats federatius verificats, anotacions de prova només al dispositiu per usuari/partit i lectura RLS de les dades federatives. No escriu a l’històric ni modifica permisos. La UI declara clarament «PROVA LOCAL» i la naturalesa de la consulta de dades importades. Fitxers addicionals modificats: base.js/base.html i les tres proves/fixtures bàsiques. Informe ampliat a `docs/basic-match-delivery.md`.

La CI del checkpoint anterior `8969261` és correcta: run 40021877440. Nova suite Node ampliada 76/76 correcta; navegador ampliat en execució abans de publicar. La publicació s’ha de completar després de la CI del nou HEAD; l’autorització ja és vigent, no cal tornar-la a demanar.

### Resultat final de publicació del Mode Bàsic

**PUBLICAT amb autorització expressa del responsable.** CI del codi `d24f97c`: [40024273839](https://github.com/Dudisooft/clubhoquei360/actions/runs/40024273839), success. Suites locals finals: 76/76 Node i 18/18 Chromium, check/build/diff correctes. PR #9 fusionada a `12444a9eba4af1f5ee3a130a60c160c8f7b02840`. Pages [40025155786](https://github.com/Dudisooft/clubhoquei360/actions/runs/40025155786): build/deploy/report success; logs acrediten el SHA i «Reported success!» a les 21.14.18 UTC del 23/10/2026.

Enllaç mòbil: https://dudisooft.github.io/clubhoquei360/base.html?practice=b89dd91d-933f-841a-ad43-f03553ca14a5 . Cal iniciar sessió al Dashboard si no n’hi ha una d’activa, i tornar a obrir l’enllaç. La prova comença a 0–0; FECAPA conserva 8–0. Marcar convocats, desar, registrar gols/targetes, corregir, finalitzar i comparar. Les anotacions d’aquesta ruta es desen només al dispositiu i no s’envien a l’històric.

Les lectures reals comproven grants authenticated SELECT i RLS de les taules federatives. No s’ha creat cap dada esportiva, compte, permís o esquema de producció. No s’ha pogut visitar Pages amb l’eina web; el recorregut autenticat del responsable al mòbil queda pendent. No repetir publicació, migracions ni suites de codi intacte; en reprendre, recollir el resultat de la prova humana i corregir únicament incidències noves. Aquest checkpoint documental posterior es conserva a la branca pròpia i no altera el SHA desplegat.
