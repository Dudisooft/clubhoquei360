# ClubHoquei360 · Continuïtat de Codex

Actualitzat: 17/10/2026, Europe/Madrid. Instrucció única de represa: **CONTINUA CLUBHOQUEI360**.

## Objectiu i fase actual

Mòdul d’estadístiques integrat al Centre de partit: registrar, conservar, corregir i consultar dades amb permisos de dades, sense duplicar el registre oficial. Temporada 2026/27. **Desenvolupament i pilot local verificats. Fase actual: comprovacions finals, documentació de lliurament i PR.** No s’ha publicat a producció.

## Estat real de Git i punts de recuperació

- Repositori: https://github.com/Dudisooft/clubhoquei360
- Branca: `feat/match-statistics-2026-27`.
- Checkout aïllat: `/workspace/work/clubhoquei360-stats`.
- Checkout inicial: `/workspace/clubhoquei360`, branca `work`, conservat intacte.
- Base remota auditada: `84e9872a8bce951f5bb56b8957ce64c11d570bcd`.
- Checkpoint 1 publicat i recuperable: `d64ca9483fd25d4672d4532830acbe9b71dc473c` — model i persistència verificats, 20 proves noves correctes.
- Checkpoint 2: aquest document acompanya el bloc integrat verificat; consultar `git log --oneline -5` per al SHA que el conté. El següent checkpoint registrarà el SHA concret.
- No s’ha fusionat, desplegat ni aplicat la migració a Supabase de producció.

## Completat i verificat

1. Auditoria completa i contrast de metadades reals de Supabase: `docs/statistics-audit.md`. No repetir-la si no canvia la base.
2. Model canònic d’accions/resultats, agregats, referències oficials, exportacions i cronòmetre manual separat amb possessió mesurada.
3. Migració additiva `supabase/migrations/20261017005241_match_statistics.sql`: RLS, assignacions temporals/revocables per partit/categoria/costat/jugador, principal únic, revisions optimistes, mutacions idempotents, auditoria immutable i sessió recuperable.
4. Contexts de partit per identificadors federatius verificats; trigger per a imports futurs sense reescriure dades analítiques ni permisos.
5. Panell dins del Centre de partit, sense iframe: equip sense jugador previ, jugador→acció i acció→jugador sobre els mateixos esdeveniments. Correccions, anul·lació, recuperació d’anul·lades, revisió de canvis i validació.
6. Informes d’equip, individuals, comparatives/evolució per UUID/codi federatiu, cobertura explícita, denominadors vàlids, CSV UTF-8 i JSON d’auditoria.
7. Persistència Supabase preparada, outbox local per usuari/partit, reintents sense duplicats, còpia del rellotge i recuperació d’interval de possessió obert amb identitat estable.
8. Accés d’operadors externs sense `pilot_members`; entrenador/coordinador segons equip; delegat sense accés avançat automàtic. No es creen comptes personals ni credencials.
9. Formulari de login restaurat al dashboard, client públic compartit i supabase-js fixat a 2.95.3.
10. Ruta antiga `estadistiques.html` preservada amb redirecció al partit. Claus locals del prototip conservades, sense migracions per nom/dorsal.
11. Controls i rellotge oficials bloquejats fora del perfil principal; el rellotge oficial flotant ja no tapa l’anàlisi. Comprovació visual de mòbil/tauleta/escriptori.
12. Guia de posada en servei i pilot real: `docs/statistics-operations.md`. CI de verificació sense desplegament; scripts de comprovació i artefacte estàtic per Pages.

## Proves executades i resultats

- Base original: 27/27 proves Node. Fonts reals temporals absents: no es compten les proves condicionals com a executades.
- Suite Node actual: **55/55 correctes** (`npm test`), incloses proves de PostgreSQL/PGlite, permisos, revisions, idempotència, possessió, agregats, recuperació i outbox.
- Chromium: **10/10 casos complets correctes**; dues proves addicionals de recuperació de possessió i conflicte de rellotge entre dispositius **2/2 correctes**. Pendent només consolidar una execució de la suite completa de 12 al checkpoint final.
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

## Pendents per prioritat

1. Consolidar la suite Chromium de 12 casos i comprovar-ne el resultat. No repetir auditoria ni proves intactes fora del necessari per al lliurament.
2. Publicar checkpoint 2 i comprovar-ne recuperació amb Git; crear PR amb el resultat final i observar CI.
3. Entregar informe estructurat A–F i còpia user-facing amb evidències/commits/PR verificats. Actualitzar aquest document amb SHA/PR/CI.
4. **Després d’autorització de publicació:** aplicar la migració, publicar a Pages i executar prova autenticada amb Auth/Realtime reals i dos dispositius. Ordre i reversió a `docs/statistics-operations.md`.
5. Confirmar UUID reals d’Oriol Codinach i Ventu i permisos exactes del partit FEM15. Crear només assignacions temporals per a comptes ja verificats, sense rols generals innecessaris.

## Dependències i límits

- Esquema inicial complet de Supabase no versionat; la migració assumeix l’esquema real auditat i les funcions `app_private.has_club_role`, `has_team_role`, `is_platform_superadmin` existents. No executar SQL històrics com si fossin migracions des de zero.
- Migració i frontend encara no instal·lats en producció. Cap comprovació local acredita que el lloc publicat ja disposi del mòdul.
- Portals federatius i Pages no accessibles amb l’eina web en aquesta execució; no es declara revalidació de fonts ni test visual de producció.
- Vídeo manual, sense sincronització automàtica; no hi ha app completa en fred sense xarxa. Les cues locals són recuperació d’escriptures, no un sistema d’autorització offline.
- Claus del prototip conservades; no hi ha importació automàtica d’estadístiques antigues per manca d’identificadors fiables.
- Dos registres esportius introduïts expressament com a accions diferents no es col·lapsen només pel temps. Hi ha avisos de possible duplicat, referències estables, identitat de mutacions i assignacions sense solapament.

## Fitxers modificats i nous

- Integració: `avancat.html`, `federation-client.js`, `estadistiques.html`, `dashboard.html`, `base.html`, `historial.html`.
- Components: `app-client.js`, `auth-ui.js`, `stats-model.js`, `stats-clock.js`, `stats-store.js`, `stats-ui.js`, `stats.css`.
- Dades: migració SQL indicada.
- Verificació: `tests/stats-{model,database,store}.test.mjs`, `tests/helpers/stats-{db,server}.mjs`, `tests/browser/statistics.spec.mjs`, prova d’interfície adaptada, `playwright.config.mjs`, `scripts/{verify,build}.mjs`, `.github/workflows/statistics.yml`, dependències/lockfile i `.gitignore`.
- Documents: auditoria, operació/pilot i aquest registre.

## Represa exacta

En rebre **CONTINUA CLUBHOQUEI360**:

1. Llegir aquest document i les instruccions locals aplicables.
2. Executar `git status --short --branch` i `git log --oneline -5` al checkout indicat, o descarregar la branca en una sessió nova.
3. Verificar commits i fitxers. No repetir auditories ni proves vàlides de blocs intactes.
4. Continuar per la primera tasca pendent, autònomament.
5. Després de cada bloc: proves pertinents → actualitzar aquest document → commit descriptiu → comprovar `git show` i pujar la branca si hi ha accés.

La renovació de crèdits no inicia automàticament una execució. Cal enviar la instrucció de represa. No s’ha creat cap automatització.
