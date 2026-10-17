# ClubHoquei360 · Informe de lliurament del mòdul d’estadístiques

17/10/2026, Europe/Madrid. Temporada de referència 2026/27.

**Resultat:** mòdul integrat i verificat en desenvolupament. L’usuari ha autoritzat la posada en servei amb «Endavant»: migració aplicada i permisos/comandos verificats al PostgreSQL de producció, sense alterar dades oficials. PR #1 fusionada a `main` (`5e1ce5e`) i publicació Pages confirmada per GitHub; evidències a [statistics-deployment.md](statistics-deployment.md).

## A. Auditoria inicial

Frontend estàtic HTML/CSS/JavaScript, sense framework ni compilació necessària de runtime. Navegació multipàgina relativa: dashboard, Centre de partit (`avancat.html`), Base i Historial. Supabase real existent: Auth, RLS, PostgreSQL, Realtime i Edge Functions federatives. El catàleg normalitzat inclou clubs, temporades, equips, identitats, plantilles, calendaris i actes; l’operació de partit usa `pilot_matches`, `pilot_players`, `pilot_events` i `pilot_operator_state`.

L’auditoria ha contrastat el HEAD remot, tots els fitxers del repositori i metadades reals de Supabase. En la consulta inicial hi havia 31 partits operatius, 153 participants, 342 incidències i sis estats. Aquestes xifres són un inventari del moment de consulta, no dades creades per a les proves. Les 27 proves inicials passaven. El pilot local utilitza set participants ficticis per equip, sense noms de menors reals.

El buit principal era el panell d’estadístiques: un iframe localStorage amb noms de partit/operador/dorsal lliures, sense sincronització, permisos de servidor ni identitats fiables. Hi havia codi estadístic ocult duplicat, notes d’entrenador locals i una pàgina d’entrada que ja no oferia login. La documentació antiga sobre cron federatiu contradeia documents recents: s’ha conservat l’estat existent sense alterar programacions.

Decisions: conservar el disseny principal, integrar un panell modular, reutilitzar UUID i fonts, separar totes les escriptures analítiques, comprovar permisos al servidor i preparar una migració additiva. No s’han creat comptes, missatgeria, serveis de pagament, plantilles inventades ni dades federatives simulades.

Detall i conflictes: [auditoria inicial](statistics-audit.md).

## B. Desenvolupament

Implementat:

- Registre global d’equip amb un toc, sense jugador previ; jugador→acció i acció→jugador sobre el mateix model.
- Catàleg dels indicadors ja documentats: passades/resultat, xuts/resultat, gols, assistències, recuperacions, pèrdues, faltes, porteria, defensa, construcció, atac, transicions i participació observada.
- Dos modes d’anàlisi, directe i vídeo, amb rellotge manual separat, pausa/represa, ajust, retrocés, període i vídeo extern o fitxer local opcional. Cap sincronització automàtica de reproductor declarada.
- Possessió per intervals mesurats, amb temps en disputa, rebuig de solapaments i recuperació estable d’interval obert. Els ajustos de temps no generen possessió.
- Persistència compartida, outbox local per usuari/partit, UUID d’esdeveniment i mutació, ACK idempotent, revisions optimistes i recuperació pausada. Conflictes visibles, sense sobreescriptura silenciosa.
- Correcció, anul·lació, recuperació d’anul·lades, validació i historial immutable de versions. Les referències oficials es poden revisar només a l’anàlisi.
- Assignacions de principal/operador/consulta, temporals i revocables, limitades per partit, categoria, costat i jugador. Els àmbits de registre no es poden solapar. Els delegats no obtenen permisos avançats automàticament.
- Consulta per entrenadors/coordinadors dels equips autoritzats. Les identitats d’evolució no es dedueixen pels noms.
- Informes globals, individuals i comparatives/evolució entre partits accessibles. Dades absents diferents de zero, cobertura explícita, percentatges només amb denominadors coherents. CSV UTF-8 protegit contra fórmules i JSON d’auditoria.
- Formulari de login del dashboard, versió fixada de supabase-js, protecció dels controls oficials fora del perfil principal i ruta antiga d’estadístiques preservada amb redirecció.
- Protocol persistent de continuïtat i punts de recuperació a Git.

Fitxers principals modificats: `avancat.html`, `federation-client.js`, `estadistiques.html`, `dashboard.html`, `base.html`, `historial.html`, `README.md`, `package.json`, `package-lock.json`, `.gitignore` i la prova d’interfície existent.

Components nous: `app-client.js`, `auth-ui.js`, `stats-model.js`, `stats-clock.js`, `stats-store.js`, `stats-ui.js`, `stats.css`. Verificació nova: proves de model/base de dades/outbox, helpers PostgreSQL i servidor local, suite Playwright, `playwright.config.mjs`, `scripts/verify.mjs`, `scripts/build.mjs`, `scripts/verify-production-statistics.sql` i `.github/workflows/statistics.yml`.

Model nou: `stats_matches`, `stats_actions`, `stats_assignments`, `stats_events`, `stats_event_audit`, `stats_sessions`, `stats_coverage`, `stats_access_audit`. Migració: `supabase/migrations/20261017005241_match_statistics.sql`. La migració ja consta a producció com `20261017130942_match_statistics`, amb 29 contexts verificats, 24 FEM15. Totes tenen RLS; no es concedeix DML directe al client. Les RPC exposades són invoker; els comandos privats implementen comprovacions explícites i transaccions atòmiques amb auditoria.

Les importacions FECAPA/RFEP es conserven. Només es reutilitzen identificadors verificats per crear contexts; els imports no modifiquen observacions analítiques. Les claus locals del prototip es conserven i no es concilien per nom/dorsal.

## C. Proves

Resultats locals: **58 proves Node i 12 casos Chromium**. Resultat consolidat correcte en local i en la CI de GitHub del HEAD fusionat ([39035723731](https://github.com/Dudisooft/clubhoquei360/actions/runs/39035723731)). [Evidències reproduïbles i casos executats](statistics-verification.json). Comprovació estàtica de 21 fitxers, artefacte `work/site` generat, diff sense errors i zero vulnerabilitats de dependències de producció comunicades per `npm audit --omit=dev`.

| Requisit | Evidència executada |
| --- | --- |
| Obrir partit i estadístiques | URL de partit i ruta antiga, panell integrat sense iframe |
| Iniciar, pausar i reprendre | Chromium i rellotge unitari; pausat després de recuperar |
| Passada, xut i gol | Accions realment desades al PostgreSQL local |
| Assignar a jugador i dues vies | Accions individuals, canvi de via i agregat d’equip sense segon registre |
| Corregir i desfer | Revisió incrementada, audit abans/després, anul·lació i recuperació |
| Desar i recuperar | Sessió en servidor, localStorage, recàrrega i possessió interrompuda |
| Agregats i percentatges | Proves unitàries i taules del navegador; absència/zero/denominadors |
| Permisos | PostgreSQL i navegador: entrenador, delegat, aliè, operador limitat, anon |
| Oficial immutable | Comparació abans/després d’incidències i estat oficial; escriptura rebutjada a l’extern |
| Mòbil/tauleta/PC | 390×844, 820×1180, 1440×1000; sense overflow, controls tàctils ≥44 px |
| Duplicats i reconnexió | ACK perdut després del commit, reintent, entrega repetida i outbox després de recarregar |
| Multioperador | Dos usuaris amb abast limitat, base compartida, consulta d’entrenador, revocació i altre partit denegat |
| Conflicte de rellotge | Dues pestanyes del mateix usuari, CAS, rebuig i recuperació explícita de còpia local |
| Integració federativa independent | Import verificat afegeix context sense alterar observacions existents |
| Exportacions | Descàrregues CSV/JSON, UTF-8, neutralització de fórmula |
| Seguretat de l’esquema | RLS a les vuit taules i zero comandos analítics executables per anon |
| Errors d’interfície | Recorregut principal sense excepcions JavaScript no capturades |

Verificació addicional executada al PostgreSQL de producció: comandos, RLS, idempotència, revisions, auditoria, sessions, operador per categoria/costat/jugador/partit, caducitat, revocació, entrenador/delegat/aliè/anon. Script íntegre amb BEGIN/ROLLBACK, sense comptes creats ni proves persistents. Recomptes i empremtes de les cinc taules oficials iguals abans/després. Proves HTTP reals: SELECT i RPC anònims denegats (401/42501), esquema privat no exposat (406/PGRST106). L’assessor de seguretat no detecta incidències noves del mòdul; [detall i avisos previs](statistics-deployment.md).

Errors corregits: superposició del rellotge oficial; controls oficials fora del perfil principal; selecció silenciosa d’un altre partit en una URL no autoritzada; pèrdua de selecció en canviar mode/període; recuperació d’interval obert; peticions en curs durant canvi de partit; lectura transitòria del rellotge a la prova de pausa. També s’han corregit errors del transport local de proves, sense atribuir-los a errors de producció.

Límits de l’evidència: PostgreSQL/PGlite és real, amb RLS i funcions SQL, però el transport d’Auth/PostgREST/WebSocket del navegador és local i identificat com a prova. No s’ha comprovat Realtime de Supabase en producció ni dos dispositius físics. No s’han executat les proves opcionals que depenen d’HTML federatiu temporal absent. Els portals i Pages no s’han pogut reobrir amb l’eina web en aquesta execució. No es declara una prova real d’Oriol/Ventu ni de credencials de producció.

## D. Estat funcional

Cada fila identifica l’entorn comprovat. El frontend està fusionat a `main` i la base està instal·lada; encara falta el recorregut autenticat complet a Pages amb comptes reals.

| Funcionalitat | Classificació | Límit |
| --- | --- | --- |
| Panell integrat, dispositius i dues vies d’entrada | OPERATIVA I VERIFICADA | Entorn local |
| Registre, correcció, desfer, auditoria i agregats | OPERATIVA I VERIFICADA | Entorn local |
| Persistència, recuperació i reintents | OPERATIVA I VERIFICADA | Entorn local; cal xarxa per validar permisos |
| Cronòmetre analític i possessió | OPERATIVA I VERIFICADA | Manual; no sincronització automàtica amb vídeo |
| Permisos, assignacions, caducitat i revocació | OPERATIVA I VERIFICADA | PostgreSQL local i de producció amb transacció revertida; comptes del pilot pendents |
| Multioperador amb dades compartides | OPERATIVA I VERIFICADA | Clients locals sobre la mateixa base de dades |
| Informes, comparatives/evolució i exportacions | OPERATIVA I VERIFICADA | Mostres observades, identitats explícites |
| Protecció del registre oficial i fonts | OPERATIVA I VERIFICADA | Proves locals i empremtes abans/després de la instal·lació real |
| Auth i Realtime reals del nou mòdul | IMPLEMENTADA PENDENT DE PROVES | Infraestructura instal·lada; falta sessió Auth i entrega WebSocket reals |
| Migració del projecte existent | OPERATIVA I VERIFICADA | Aplicada; RLS, comandos, contexts i API verificats en producció |
| Publicació Pages | OPERATIVA I VERIFICADA | GitHub confirma build i deploy correctes del SHA fusionat; smoke autenticat pendent |
| Pilot amb Oriol Codinach i Ventu | BLOQUEJADA PER DEPENDÈNCIA EXTERNA | UUID, accessos i disponibilitat reals per confirmar |
| Cronologia/plantilla que la federació no publica | BLOQUEJADA PER DEPENDÈNCIA EXTERNA | No s’inventa informació |
| Notes tàctiques compartides | PARCIALMENT IMPLEMENTADA | Funció prèvia local; fora d’aquest lliurament estadístic |
| Sincronització automàtica de vídeo | PENDENT | Opcional; l’anàlisi manual ja està implementada |

## E. GitHub i desplegament

- Base auditada: `84e9872a8bce951f5bb56b8957ce64c11d570bcd`.
- Branca: [`feat/match-statistics-2026-27`](https://github.com/Dudisooft/clubhoquei360/tree/feat/match-statistics-2026-27).
- Checkpoint 1: [`d64ca94`](https://github.com/Dudisooft/clubhoquei360/commit/d64ca9483fd25d4672d4532830acbe9b71dc473c), model/persistència verificats.
- Checkpoint 2: [`67958a3`](https://github.com/Dudisooft/clubhoquei360/commit/67958a35b0d2748fb2692d2c1c807a3371569b3e), integració i sessions recuperables.
- PR fusionada: [#1 · Estadístiques de partit amb permisos i sessions recuperables](https://github.com/Dudisooft/clubhoquei360/pull/1).
- Checkpoint 3: [`ac8ad5e`](https://github.com/Dudisooft/clubhoquei360/commit/ac8ad5ee754443804b1cdff3acbe434778877bc5), aïllament de cues, RLS i lliurament; [CI correcta](https://github.com/Dudisooft/clubhoquei360/actions/runs/39018424281).
- Codi final: [`a0145fa`](https://github.com/Dudisooft/clubhoquei360/commit/a0145fadf8be158cbe1b47707161c3803121616a); [CI final correcta](https://github.com/Dudisooft/clubhoquei360/actions/runs/39018684522), 58 Node i 12 Chromium.
- Registre de checkpoints i instrucció de represa: consultar [CODEX_PROGRESS.md](CODEX_PROGRESS.md), actualitzat després de preparar el lliurament.
- Checkpoint de producció: [`f119d1d`](https://github.com/Dudisooft/clubhoquei360/commit/f119d1d36ad6b8b9d31dcbab76aaceb096a9f419), migració i smoke SQL/HTTP reals verificats; [CI correcta](https://github.com/Dudisooft/clubhoquei360/actions/runs/39035723731).
- Fusió a `main`: [`5e1ce5e`](https://github.com/Dudisooft/clubhoquei360/commit/5e1ce5efdc9624ecd6edd5ab53194098c77d1f85). Migració aplicada. [Pages 39035824360](https://github.com/Dudisooft/clubhoquei360/actions/runs/39035824360): **success** en build i deploy del mateix SHA. [Aplicació](https://dudisooft.github.io/clubhoquei360/).
- Detall del desplegament, límits de prova i avisos previs: [statistics-deployment.md](statistics-deployment.md).

## F. Pendents necessaris

1. Confirmar comptes/UUID, partit FEM15 autoritzat i caducitat de la prova per al provador i l’entrenador receptor; assignar els accessos mínims corresponents.
2. Prova de fum autenticada a Pages amb Supabase Auth/Realtime reals i dos dispositius físics; verificar consulta i revocació. El recorregut i la recuperació ja estan provats localment; la manca de sessió real no es presenta com a prova superada.

No cal introduir cap servei nou de pagament, ni repetir la importació federativa o l’auditoria inicial per completar aquests passos. La represa de desenvolupament es fa amb **CONTINUA CLUBHOQUEI360**, llegint primer el registre persistent.
