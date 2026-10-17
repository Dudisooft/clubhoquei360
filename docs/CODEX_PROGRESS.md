# ClubHoquei360 · Continuïtat de Codex

Actualitzat: 17/10/2026, Europe/Madrid. Instrucció única de represa: **CONTINUA CLUBHOQUEI360**.

## Objectiu i fase actual

Completar el mòdul d’estadístiques integrat al Centre de partit per registrar, conservar, corregir i consultar observacions reals amb permisos de dades i sense duplicar l’acta operativa. Temporada de referència 2026/27. Fase actual: desenvolupament; primer bloc de model/persistència verificat localment, integració d’interfície en curs.

## Estat real de Git

- Repositori: https://github.com/Dudisooft/clubhoquei360
- Branca: `feat/match-statistics-2026-27`.
- Checkout aïllat d’aquesta execució: `/workspace/work/clubhoquei360-stats`.
- Checkout inicial de l’usuari: `/workspace/clubhoquei360`, branca `work`, conservat intacte.
- Base remota verificada: `84e9872a8bce951f5bb56b8957ce64c11d570bcd`.
- Últim commit funcional verificat: es registrarà després del primer checkpoint; aquest document es versiona amb el bloc. `git log --oneline -5` és l’autoritat per al HEAD que el conté.
- No s’ha fusionat ni desplegat cap canvi. No s’ha aplicat la migració a Supabase de producció.

## Completat i verificat

1. Inventari complet del repositori i auditoria dels components, dependències, navegació, persistència, permisos, fonts federatives i publicació: `docs/statistics-audit.md`. No tornar a fer-la si el HEAD base no ha canviat.
2. Contrast de metadades reals de Supabase (taules, columnes, restriccions, polítiques, rols). Infraestructura compartida existent confirmada; estadística anterior exclusivament local confirmada.
3. Branca i worktree de desenvolupament independents.
4. Model canònic d’accions, agregats, referències oficials, CSV i cronòmetre manual amb possessió mesurada: `stats-model.js`, `stats-clock.js`.
5. Migració additiva `supabase/migrations/20261017005241_match_statistics.sql`: taules analítiques, RLS, assignacions amb caducitat/revocació/abast, revisions, idempotència, auditoria immutable, sessió amb CAS, intervals sense solapaments. Generada amb Supabase CLI 2.121.0.
6. Proves PostgreSQL reals locals via PGlite amb identitats de prova fictícies, sense comptes personals ni credencials: `tests/helpers/stats-db.mjs`, `tests/stats-database.test.mjs`.
7. Proves del model i cronòmetre: `tests/stats-model.test.mjs`.

## Proves executades

- Base original: `npm test`, 27/27 correctes. No hi havia fonts temporals per a les proves opcionals d’actes reals; no es compten com a executades.
- Bloc de dades/model: `node --test tests/stats-model.test.mjs tests/stats-database.test.mjs`, 20/20 correctes.
- `node --check stats-model.js`, `stats-clock.js`, `stats-ui.js`: sintaxi correcta. La sintaxi no acredita el funcionament de la UI.
- Les proves inclouen: correccions/auditoria, idempotència, revisions obsoletes, permisos entrenador/delegat/aliè, operador temporal limitat, caducitat, revocació, prohibició d’escriure dades oficials, incompatibilitat d’assignacions, identitats de jugadors i porters, possessió/solapaments, sessió recuperable, integritat del cronòmetre oficial i accés anònim rebutjat.

## En curs, encara NO verificat funcionalment

- `stats-store.js`: cua local identificada per usuari/partit i sincronització Supabase.
- `stats-ui.js`, `stats.css`: panell integrable, dues vies d’entrada, informes, correccions, assignacions i vídeo opcional. Encara no està connectat a `avancat.html` ni `federation-client.js`.
- Aquests fitxers es mantenen al worktree i es documenten aquí; no s’inclouen en el primer commit funcional fins que les seves proves siguin satisfactòries.

## Pendents per prioritat

1. Connectar el panell al Centre de partit; substituir l’iframe local; conservar la ruta `estadistiques.html` amb redirecció. Retirar només les crides obsoletes verificades. Corregir canvis de mode/període que poden perdre el valor seleccionat en pausar.
2. Adaptar `federation-client.js` per a usuaris autoritzats via anàlisi sense afegir-los a `pilot_members`. Restaurar formulari d’accés a dashboard (ara no hi ha pantalla d’inici de sessió).
3. Provar outbox/reconnexió/conflictes/canvi de partit i polir la UI. Comprovar ordenació estable de la paginació per taula i preservació dels formularis durant refresh.
4. Implementar proves Playwright en Chromium amb API local sobre el mateix PostgreSQL de prova; executar els 20 casos de l’encàrrec, amb mòbil/tauleta/escriptori i errors de consola. Identificar el pilot FEM15 com a fictici.
5. Revisar seguretat de migració, contextos de partit nous, procedència, resultats absents, percentatges, conflictes i restauració. No aplicar res a producció durant aquesta fase.
6. Afegir CI/validació estàtica i documentació de posada en servei/pilot FEM15. Executar suite completa i revisar diff.
7. Commit de cada bloc complet, publicar la branca i preparar PR si el connector ho permet. No fusionar/desplegar sense autorització.
8. Informe final A–F amb estat honest, proves executades, commits/PR, dependències i límits.

## Errors, dependències i bloquejos coneguts

- El lloc actual no ofereix formulari d’autenticació després de substituir l’index per dashboard. Cal corregir-ho per a l’accés real.
- Falta l’esquema inicial complet de Supabase al repositori. La migració nova assumeix l’esquema existent auditat; el bootstrap de prova recrea només les dependències necessàries.
- La migració encara no està instal·lada al servidor: el nou mòdul no és operatiu en producció fins que es publiqui i es verifiqui en l’entorn autoritzat.
- No s’han confirmat UUID reals d’Oriol Codinach ni Ventu. No crear comptes ficticis personals, ni concedir rols de club; documentar l’assignació temporal del pilot per a identitats existents verificades.
- L’eina web no ha pogut obrir Pages ni els portals federatius; la xarxa de l’executor no els inclou a la política actual. No afirmar revalidació federativa o prova visual de producció que no s’hagi fet.
- No hi ha sincronització automàtica amb el vídeo. El rellotge analític és manual i separat de l’oficial, tal com permet l’encàrrec.

## Fitxers modificats / nous

Versionats al primer bloc: aquest document, `docs/statistics-audit.md`, `package.json`, `package-lock.json`, `.gitignore`, `stats-model.js`, `stats-clock.js`, migració SQL, proves de model i base de dades, helper PostgreSQL.

En curs al worktree: `stats-store.js`, `stats-ui.js`, `stats.css`. Els següents checkpoints actualitzaran aquesta llista amb la integració real.

## Represa exacta

Quan es rebi **CONTINUA CLUBHOQUEI360**:

1. Llegir aquest document i les instruccions locals aplicables.
2. Executar `git status --short --branch` i `git log --oneline -5` al checkout de la branca indicada (o descarregar aquesta branca si és una sessió nova).
3. Verificar que els commits documentats i els fitxers en curs hi són. No repetir auditoria ni proves del bloc intacte; repetir proves només si canvien aquests fitxers o apareixen errors.
4. Continuar per la primera tasca pendent anterior i treballar autònomament.
5. Després de cada bloc: proves pertinents → actualitzar aquest document → commit descriptiu → comprovar recuperació amb `git show` i, si hi ha accés, pujar la branca.

La renovació de crèdits no inicia cap execució automàtica. La continuació requereix que l’usuari enviï la instrucció indicada. No s’ha creat cap automatització.
