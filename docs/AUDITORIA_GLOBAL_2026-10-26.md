# ClubHoquei360 — Auditoria global de continuïtat

**Data:** 26/10/2026, Europe/Madrid. **Abast exclusiu d'auditoria.** S'han llegit codi, Git, documentació, logs de CI/desplegament i metadades/recomptes de Supabase. No s'ha implementat cap funcionalitat, executat cap importació, escrit dades de producció, fusionat branques ni desplegat res.

## 1. Conclusió executiva

L'aplicació publicada és `main` **`a5e54e7fd4f1ac2e3a723ef175b34f3850c40d96`**, amb el codi de vídeo `81714a7` i els canvis anteriors de Base, estadístiques i preparació del cinc inicial. GitHub Pages confirma aquest SHA; la darrera CI funcional publicada acredita **112 Node i 37 Chromium**. No s'ha controlat un navegador de producció durant aquesta auditoria.

Hi ha **quatre PR obertes, totes draft**, que no equivalen a funcionalitats publicades: #10 multiclub, #11 invitacions, #22 importació del Vic i #27 contingència de plantilles. La #27 té CI del HEAD amb **123 Node i 41 Chromium** correctes, però ni la seva migració ni el frontend estan instal·lats/publicats. La #11 és una excepció important: backend instal·lat i funció Edge activa, però frontend sense publicar i correu real pendent de validar.

Els pilots continuen sense jugadors visitants incorporats, però **la situació de les fonts ha canviat des del 24/10**: Alpicat ja té una acta estructurada amb vuit visitants i dorsals, i els codis oficials de calendari ja són **152043 (Alpicat)** i **35559 (Vic)**. Per al Vic, l'acta estructurada falla per falta de privilegis del rol servidor sobre `federation_match_events`, tot i el resum general `success`. No és correcte atribuir tots els pendents només a la xarxa de Codex. El calendari té cobertura de temporada; la navegació operativa no ofereix la jerarquia completa i l'Avançat encara pot obrir un partit històric per defecte.

## 2. Fonts, mètode i límits

- Inventari GitHub inicial: **30 branques remotes**, `main` inclosa; **27 PR: 23 fusionades i 4 obertes**. S'han revisat refs, ascendència, canvis exclusius, els registres de progrés de `main`, les quatre branques amb PR oberta i els dos checkpoints documentals no integrats.
- Checkout d'auditoria separat: `/workspace/work/clubhoquei360-audit-20261026`, branca `docs/auditoria-global-2026-10-26`, creada des de `main`. Els altres set checkouts trobats estaven nets; no s'han modificat. No hi ha `AGENTS.md` trobat dins l'espai de treball inspeccionat.
- S'han contrastat totals de proves amb **logs de jobs acabats**, no només amb afirmacions dels documents. No s'han tornat a executar suites de runtime intactes ni scripts de verificació amb escriptures/ROLLBACK a producció.
- Supabase: consultes `SELECT`, llistat de migracions i funcions Edge. No s'han consultat contrasenyes, tokens, secrets SMTP/Vault ni sessions personals. Els recomptes són fotografies de les **23.16–23.18 h de Madrid**; el cron preexistent continua funcionant independentment d'aquesta auditoria.
- Entorn de treball: política observada **138**, restringida/aplicada, observacions vigents; dominis addicionals CDN i projecte Supabase. SIDGAD i Pages no figuren com a dominis de treball permesos. No s'han eludit les restriccions ni revalidat HTML federatiu actual per un intermediari.
- Les tasques d'altres converses/execucions no tenen un registre global accessible aquí. La recuperació disponible són commits, PR, documents i checkouts; no es pressuposa activitat oculta ni represa automàtica per renovació de crèdits.

### Significat dels estats

**Publicat** acredita presència a `main` i desplegament efectiu; no implica acceptació física completa. **Desenvolupat sense publicar** acredita codi en branca. **Parcial** indica abast incomplet o diferent entre capes. **Bloquejat** identifica una dependència concreta. **No iniciat** significa que no s'ha trobat implementació del requisit específic, encara que hi hagi peces relacionades.

Prioritats: **P0** evita registrar al partit incorrecte o quedar bloquejat durant un partit; **P1** completa el mòdul i els accessos; **P2** ampliació posterior. Cap prioritat constitueix autorització d'execució.

## 3. Taula funcional obligatòria

| Funcionalitat | Estat | Branca o PR | Proves realitzades / validació | Dependències | Tasques pendents | Prioritat |
|---|---|---|---|---|---|---|
| Dashboard i navegació inicial | **Parcial** | `main`, #1/#2 | Login i navegació inclosos a CI publicada; accés real del compte propi documentat | Auth i permisos existents | Connectar prioritats/calendari del dashboard; molts enllaços encara van a `en-construccio.html` | P1 |
| Selector temporada → competició → equip → partit | **Parcial** | `main`, #12; #10 només aporta context multiclub | Tests de catàleg i selector RFEP correctes; no prova d'una jerarquia única que no existeix | Catàleg autoritzat ja disponible | Unificar entrada: Historial té temporada/categoria/equip/partit; Avançat competició/equip/partit; Base llista plana | **P0** |
| Evitar obertura automàtica de partits antics | **Parcial** | `main`, `federation-client.js` | Inspecció actual del codi; no correcció nova provada | Regla explícita de selecció | Retirar preferència per UUID històric / RFEP 35529; preservar també un `?match=` autoritzat sense font associada, sense retornar a un altre partit | **P0** |
| Calendari de temporada en dades i Historial | **Publicat** | `main`, importadors i `club-catalog.js` | SQL actual: 558 fixtures; RFEP 3575: 26 partits del SIMAR/26 jornades; cache de lliga: 182 files/26 jornades | RLS, competicions configurades i cron existent | Validar cobertura de cada equip; no confondre calendari d'un club amb tots els partits de totes les lligues | P1 |
| Calendari complet com a selector operatiu | **Parcial** | `main`, #12/#13 | Tests de futurs i absència de codi oficial; alguns futurs es mostren desactivats | Context operatiu/estadístic i permisos per partit | Accés coherent als futurs sense exigir una fitxa oficial publicada; mostrar estat d'activació sense inventar IDs | **P0** |
| Mode Base | **Publicat** | `main`, #9/#13/#18 | CI publicada; el responsable confirma registre general Infantil D–Alpicat; 6 incidències persistents | Operador i context Base | Completar visitants; desplegar només després de revisió la contingència de #27 | **P0** |
| Mode Avançat: registre oficial, marcador, rellotge i cinc inicial | **Publicat** | `main`, #16/#20 | Cinc inicial/roles/recàrrega en CI i prova SQL històrica; directe Igualada–Vic fallit segons usuari | Convocats, operador i confirmació d'un porter + quatre jugadors per equip | Validació física posterior; no considerar resolt el directe només per la CI | **P0** |
| Estadístiques col·lectives sense cincs inicials | **Publicat** | `main`, #12/#23 | CI i comprovació històrica de permisos; accés visible des de Principal | Assignació estadística, activable pel gestor autoritzat | Validar el recorregut concret al partit triat; no atribuir-li una prova real al pavelló superada | P1 |
| Convocatòries i reforços | **Parcial** | `main`, #13/#18/#20; #27 amplia edició | Tests Infantil, reforços bloquejats, confirmació dels cincs i preservació de gols | Participació documentada/acta i criteris aprovats | Plantilla completa i elegibilitat no certificades per una acta antiga; alta manual Avançat actual només abans del partit | P1 |
| Importació FECAPA/RFEP | **Parcial** | `main`, `ihc-sync` v3, `federation-sync` v6 | SQL: cron actiu i darrers imports de les 22 competicions `success`; parsers provats històricament | Fonts SIDGAD, manifest IHC, caches 18 h / 6 h | Validar plantilles visitants i errors detallats; un import `success` no acredita tots els recursos ni totes les actes | P1 |
| Plantilles locals | **Parcial** | `main`, importadors/#18/#20 | Existència de catàleg i 8 convocats locals d'Infantil; tests de selecció i filtre | Dades oficials amb identitat/afiliació | Cobertura desigual; plantilla de temporada ≠ convocatòria ≠ elegibilitat; el SIMAR té catàleg però cap convocat al pilot | P1 |
| Visitants Alpicat: dades reals i accés operatiu | **Parcial** | `main`, acta 152043; #27 amplia contingència | SQL actual: 8 visitants a `federation_match_lineups`, tots amb dorsal i codi font numèric; 0 incorporats al pilot | RLS/context i via existent de lectura/materialització d'acta | Validar al compte real la lectura actual després del refresc, distingint registre original i assaig; no tornar a descarregar ni inventar aquests vuit jugadors | **P0** |
| Visitants Vic / acta RFEP estructurada | **Bloquejat** | `main`, acta 35559; #22/#27 a branca | SQL actual: 0 alineacions estructurades; detall d'import amb `permission denied for table federation_match_events` | Privilegis mínims del servidor i vinculació pilot/calendari; xarxa només per verificació directa des de Codex | Corregir ingestió amb proves; mantenir clients sense permisos nous; reconciliar font pendent del pilot i aprofitar el codi oficial ja disponible | **P0** |
| Gol sense autor | **Publicat** | `main`, Base i Avançat | Tests de marcador/equip i correccions; botó Base `unidentifiedGoal` | Permís de registre del partit | Atribució posterior millorada a #27; no exigeix inventar un jugador per sumar un gol | P1 |
| Atribuir després un gol/targeta a un provisional | **Desenvolupat sense publicar** | #27, codi `71cca04` | Chromium: gol inicial sense autor, correcció additiva, original conservat i marcador únic | Nova API/plantilla i frontend #27 | Revisió i posada en servei coordinada; no s'han retocat els gols reals desats | **P0** |
| Provisionals amb nom i dorsal, editables durant el partit | **Desenvolupat sense publicar** | #27, `match-roster.js` | CI HEAD 123 Node/41 Chromium; mòbil, permisos, revisió, persistència i resposta perduda | Migració `20261024195516`, frontend i Edge revisats | Publicar després de revisió; Avançat publicat només té entrada manual prèvia, Base encara no té l'editor comú | **P0** |
| Provisional identificat **només pel dorsal**, sense conèixer el nom | **No iniciat** | Ni `main` ni #27 ho cobreixen | Inspecció: formulari i servidor exigeixen nom no buit; no hi ha prova de dorsal sol | Definició funcional d'identitat provisional sense nom | Implementar-ho sense noms ficticis ni codis federatius inventats; afegir proves específiques | **P0** |
| Reconciliació amb identitat federativa | **Parcial** | #27 | UUID preservat, reintents i font posterior provats; conflictes rebutjats | Referència oficial de mateix equip/partit | Activar el cas simple; preparar revisió supervisada quan dues identitats existents ja tenen incidències/temps de pista | P1 |
| Targetes individuals i banquetes | **Publicat** | `main`, #9/#13/#20 | CI: grogues/blaves/vermelles, banquetes diferenciades, correccions i marcador intacte | Participant o anotació de banqueta; permisos | Reals de banqueta federativa no sempre verificables; no inferir-les de camps absents | P1 |
| Persistència i sincronització Supabase | **Publicat** | `main`, #1/#3/#6/#8 | SQL actual; prova real bàsica 20/10; Realtime ordinador→mòbil confirmat 23/10 | Auth, RLS, API, Realtime i connexió | Base comparteix dades, però recull canvis aliens amb recàrrega/refresc manual; no atribuir-li el Realtime físic d'estadístiques | P1 |
| Estadístiques d'equip i individuals | **Publicat** | `main`, `stats-*` | 55 accions/14 categories al model; tests d'agregats, dues vies d'entrada, correcció, possessió i permisos | Assignacions i observació real | Dades reals encara escasses: 3 esdeveniments/1 sessió globals; 0 als dos pilots d'incidència; no confondre capacitat amb dades recollides | P1 |
| Informes, comparatives, evolució i exportació | **Publicat** | `main`, #1 i Historial | CI: CSV/JSON, comparatives, cobertura i denominadors; sense inventar possessió/xuts | Dades observades suficients i IDs estables | Validació útil d'entrenador amb dades reals; no hi ha evidència d'un lliurament real FEM15 | P1 |
| Perfils i permisos | **Publicat** | `main`, #1/#2/#16 | RLS/RPC/rols en SQL/CI; Principal restaurat; prova real centrada en el compte propi | Membres de club/equip, `pilot_members` i `stats_assignments` | Pilot amb identitats externes reals quan es demani; selector de perfil visual no concedeix permisos | P1 |
| Invitacions temporals | **Parcial** | #11 | CI del codi 98 Node/22 Chromium; backend real comprovat amb ROLLBACK històric | Correu verificat i frontend encara a branca | Backend instal·lat, frontend no publicat, 0 invitacions persistents; revisar integració amb main actual | P1 |
| Correu/OTP per a convidats | **Bloquejat** | #11 | Darrera prova documentada: OTP deshabilitat, resposta 503; no lliurament real acreditat | SMTP/Supabase Auth i prova en bústia autoritzada | Comprovar configuració i recepció; no enviar correu durant aquesta auditoria. La configuració SMTP actual no s'ha pogut certificar en lectura | P1 |
| Configuració multiclub real | **Desenvolupat sense publicar** | #10 | CI HEAD: 75 Node/16 Chromium; tests de dos clubs i cues; sense desplegament | Migració, `club-sync`, staging, fonts verificades | Resoldre conflictes amb main; completar actes i integració operativa; Manresa sense inventari verificat. Producció té un sol club | P2 |
| Escuts i equipacions | **Parcial** | `main`; #10 configura identitat del club | CI de selecció/persistència; escuts procedents de metadades federatives | URLs oficials accessibles i dades d'equipació | Colors de samarretes declarats provisionals; triar primera/segona no acredita disseny oficial. Tema Manresa a main és configuració estàtica, no multiclub funcional | P2 |
| Vídeo en diferit / TV | **Publicat** | `main`, #25/#26 | CI de URL/mode, preservació de sessió i rellotge; no prova física de TV acreditada | Vídeo extern o fitxer accessible, observador i permisos | Cronòmetre d'anàlisi manual; cap sincronització automàtica YouTube/TV. Validar amb el responsable sense sembrar dades de demostració al partit real | P1 |
| Pilot extern FEM15 | **No iniciat** com a pilot real | Motor publicat; accessos #11 pendents | Escenaris automatitzats ficticis; no comptes personals de prova creats | Sol·licitud del responsable, compte real, partit i caducitat | Crear l'accés temporal només quan es demani; no deduir que Oriol/Ventu ja disposen de compte o permisos | P2 |

### Estadístiques que existeixen realment al codi

Passades completades/fallades/desconegudes; xuts a porteria/fora/bloquejats/desconeguts; gols i assistències; recuperacions/pèrdues; faltes comeses/rebudes; aturades i intervencions de porter; participació; construcció, atac, defensa i transicions; possessió temporal observada. Els totals deriven dels esdeveniments i la cobertura registrada. Un gol oficial no fabrica un xut i no es calcula un percentatge sense denominador coherent. Els minuts analítics requereixen entrades/sortides consistents; el rellotge oficial és una altra capa.

## 4. Estat real de Supabase i desplegament

Fotografia de lectura: **1 club, 1 temporada, 36 equips, 558 partits de calendari, 32 operatius, 190 jugadors de partit, 348 incidències, 3 esdeveniments estadístics i 1 sessió d'anàlisi**. Les plantilles federatives són un altre model; 190 no és el total de jugadors del catàleg.

| Element | Estat contrastat |
|---|---|
| Historial de migracions | 30 entrades instal·lades, des de l'estructura/RLS inicial fins a preparació dels cincs |
| Estadístiques | Instal·lada `20261017130942_match_statistics`; fitxer a main `20261017005241_match_statistics.sql` |
| Concurrència de sessions | Instal·lada `20261017133038_require_session_revision` |
| Contextos Base | Instal·lada `20261024062538_basic_catalogue_contexts`; fitxer `20261023214042_basic_catalogue_contexts.sql` |
| Preparació Avançat | Instal·lada `20261024113012_advanced_lineup_preparation`; fitxer `20261024105636_advanced_lineup_preparation.sql` |
| Invitacions | Instal·lada `20261023213604`; font a #11 `20261023204937_temporary_external_invitations.sql`, absent a main |
| Multiclub #10 | Migració `20261023210142` no instal·lada; `club_settings` i `club_sync_jobs` absents |
| Contingència #27 | Migració `20261024195516` no instal·lada; RPC `match_roster(uuid)` absent |
| Edge Functions actives | `federation-sync` v6, `ihc-sync` v3, `temporary-access` v1. No hi ha `club-sync` |
| Actualització existent | `ihc-federation-hourly`, actiu a `17 * * * *`; darrers registres de les 22 competicions marquen `success` |
| Límit del resum `success` | RFEP 3575: cinc errors detallats, tots de privilegis a `federation_match_events`, inclòs Igualada–Vic. La RPC d'acta és invoker; el rol `service_role` no té SELECT/INSERT/UPDATE/DELETE sobre aquella taula |
| Calendaris | 504 fixtures FECAPA / 19 competicions i 54 RFEP / 3 competicions. Dates publicades arriben a maig/abril de 2027 |
| RFEP 3575 | Catàleg del SIMAR: 26 partits/26 jornades, 26/09/2026–24/04/2027. Cache de la lliga completa: 182 files/26 jornades |
| Codis dels dos partits | Calendari actual: Alpicat `152043`, Vic `35559`. El pilot del Vic conserva font `pending` amb codi nul: metadades desactualitzades respecte del calendari |
| Acta Alpicat actual | Importada el 25/10 a les 06.17 h Madrid: 8 locals + 8 visitants. Els 8 visitants tenen dorsal/codi font, però `player_id` de catàleg nul i cap fila a `pilot_players`; poden identificar-se per UUID d'alineació sense inventar codis |
| Temporals reals | 0 invitacions persistents; cap pilot extern real acreditat |

**No executar tots els SQL com si reconstruïssin una base des de zero.** Part de l'esquema inicial no està reflectida com a migracions equivalents dins de main; diversos noms/versions locals difereixen de l'historial instal·lat. Cal mapar-los, no reaplicar-los. L'auditoria no altera aquesta divergència.

### Proves i desplegaments verificables

| Conjunt | Commit amb evidència | CI llegida | Resultat dels logs | Producció |
|---|---|---|---|---|
| Últim runtime de main | `81714a7` | [40126241140](https://github.com/Dudisooft/clubhoquei360/actions/runs/40126241140) | 112 Node / 37 Chromium, check/build 31, 0 fallides/omeses | Publicat amb #25 i tancament #26 |
| Contingència #27, HEAD actual | `b2753f0` | [40130079937](https://github.com/Dudisooft/clubhoquei360/actions/runs/40130079937) | 123 Node / 41 Chromium, check/build 33, 0 fallides/omeses | No instal·lat ni publicat |
| Multiclub #10, HEAD actual | `922e868` | [40024928004](https://github.com/Dudisooft/clubhoquei360/actions/runs/40024928004) | 75 Node / 16 Chromium, check/build 25, 0 fallides/omeses | No instal·lat ni publicat |
| Invitacions #11, codi verificat | `2a4b6dc` | [40026853311](https://github.com/Dudisooft/clubhoquei360/actions/runs/40026853311) | 98 Node / 22 Chromium, check/build 31, 0 fallides/omeses | Només backend instal·lat |
| Preparador Vic #22, codi verificat | `a524e2d` | [40122687503](https://github.com/Dudisooft/clubhoquei360/actions/runs/40122687503) | 117 Node / 32 Chromium, check/build 31, 0 fallides/omeses; 7 proves específiques del preparador | Cap plantilla importada |
| Pages actual | `a5e54e7` | [40126693325](https://github.com/Dudisooft/clubhoquei360/actions/runs/40126693325) | build/deploy/report correctes; log deploy amb SHA, URL i `Reported success!` | Publicació efectiva el 24/10, 21.45 h Madrid |

Les CI de #11 i #22 corresponen al codi indicat; els seus HEAD posteriors són documentals i no tenen una execució pròpia retornada per la consulta de workflows. **No sumar les proves de branques ni considerar-les una prova d'integració de totes elles.** #10 i #22 encara tenen conflictes amb main. Les proves de PostgreSQL/PGlite i transport Auth/HTTP/WebSocket local no són una prova de recepció federativa, SMTP o dues persones reals simultànies.

## 5. Branques, PR i tasques interrompudes

### Desenvolupaments encara no integrats

«Darrere/davant» són commits de diferència respecte de main actual; no mesures de qualitat ni motiu per fusionar automàticament.

| Branca / PR | HEAD | Darrere / davant | Situació exacta i recuperació |
|---|---|---:|---|
| `feat/multiclub-federation` / [#10](https://github.com/Dudisooft/clubhoquei360/pull/10) | `922e868` | 46 / 2 | Draft, GitHub `dirty`/conflictes. Configuració, cua i worker desenvolupats; migració/seed/scheduler no aplicats; actes encara als importadors antics. Registre específic al final del seu CODEX_PROGRESS, no al resum heretat del principi |
| `feat/temporary-external-invitations` / [#11](https://github.com/Dudisooft/clubhoquei360/pull/11) | `2f2b87a` | 42 / 6 | Draft, sense conflictes calculats. Backend instal·lat; frontend i prova de correu pendents. Instruccions SMTP a `docs/temporary-access-email-setup.md` de la branca |
| `feat/import-vic-roster` / [#22](https://github.com/Dudisooft/clubhoquei360/pull/22) | `3cda84d` | 10 / 8 | Draft, GitHub `dirty`/conflictes. Preparador SQL/CLI verificat; descàrrega/importació reals no efectuades. No exigeix frontend nou per importar el catàleg, però s'ha de conciliar amb #27 |
| `fix/visitor-roster-contingency` / [#27](https://github.com/Dudisooft/clubhoquei360/pull/27) | `b2753f0` | 0 / 8 | Draft, sense conflictes, CI del HEAD correcta. Editor/API i importador ampliats; publicació pendent; dorsal sol i fusió de dues identitats amb dades no resolts |
| `feat/basic-match-20261024`, sense PR oberta nova | `4867c4e` | 43 / 1 | El codi funcional es va fusionar amb #9. L'únic commit exclusiu posterior és documental: publicació/prova Salt. No és un Mode Base funcional pendent de fusionar |
| `docs/starting-five-screen-check`, sense PR | `1031b1d` | 10 / 1 | Només document: captura mòbil amb text anterior al nou bloc. No acredita si era pestanya/cache antiga. Confirmació visual del responsable no localitzada; no hi ha Service Worker que ho expliqui automàticament |

Els quatre registres de progrés de les PR obertes són accessibles a les seves branques. Els pendents d'accés federatiu, correu, desplegament i acceptació humana estan desats; no hi ha canvis locals sense commit als checkouts trobats que amaguen una funcionalitat addicional acabada.

### Resta de les 30 branques remotes inicials

`main` és la referència publicada. Les **23 branques següents tenen zero commits exclusius davant de main**; són antecedents integrats, encara que les refs no s'hagin eliminat:

- Estadístiques: `feat/match-statistics-2026-27`, `feat/statistics-admin-validation`, `feat/statistics-live-status`; `docs/statistics-deployment-record`, `docs/statistics-live-checkpoint`, `docs/statistics-live-status-release`, `docs/statistics-real-session-verification`, `docs/statistics-realtime-acceptance`, `docs/statistics-release-status`.
- Base: `feat/base-mobile-rosters`, `fix/base-team-roster-scope`, `docs/base-mobile-release-20261024`, `docs/base-roster-scope-release`.
- Partit i accés: `fix/rfep-vic-20261024`, `fix/principal-profile-access`, `fix/advanced-starting-five`, `fix/live-team-recording-entry`; `docs/rfep-vic-release`, `docs/principal-profile-release`, `docs/starting-five-release`, `docs/live-team-recording-release`.
- Vídeo: `feat/video-tv-ready`, `docs/video-tv-release`.

Amb main, les quatre branques de PR oberta i els dos checkpoints documentals exclusius, queden cobertes les 30 refs inicials. La branca documental d'aquesta auditoria s'afegeix després d'aquest inventari.

### PR fusionades rellevants

#1–#3 motor d'estadístiques, activació pròpia i concurrència; #4–#8 evidències/estat de connexió/acceptació Realtime; #9 Base inicial; #12/#15 recuperació Igualada–Vic; #13/#14 Base mòbil i registre de publicació; #16/#17 Principal; #18/#19 filtre Infantil; #20/#21 preparació dels cincs; #23/#24 entrada col·lectiva i registre del directe fallit; #25/#26 diferit/TV. No hi ha altres PR tancades sense fusió en l'inventari de 27 PR.

## 6. Incidències reals i contradiccions documentals

1. **Infantil D–Alpicat, 24/10:** l'usuari confirma registre general correcte però sense plantilla visitant ni possibilitat d'atribuir el gol al rival. SQL actual del pilot `8b5cd05a-149e-7e21-73b3-5782994e0d07`: **8 locals, 0 visitants, 6 incidències**, 0 estadístiques avançades/sessions. **Novetat del 25/10:** acta `152043` amb **8 locals i 8 visitants** a `federation_match_lineups`. Els vuit visitants tenen dorsal i codi numèric a la procedència, encara sense FK a `federation_players`. `basic-practice.js/readCatalogueFixture` ja llegeix alineacions d'acta per UUID encara que aquella FK sigui nul·la, i `materializePlayers` admet la referència verificada de l'alineació. Això ofereix una via existent de recuperació; no s'ha executat ni validat físicament amb el compte durant l'auditoria. Obrir la ruta de catàleg d'un partit finalitzat pot derivar a assaig: no confondre'l amb els sis registres originals. La plantilla de temporada del rival continua sense entrada al catàleg. #27 amplia l'editor, però no està publicada.
2. **SIMAR–Vic, 24/10:** partit accessible després de #12; pilot `18fa0a6e-e5c6-487e-8315-5bc371e22cb1`, calendari `51894d05-c323-f3e1-8534-fa79e062c448`, RFEP 3575, equips 3697/3727. SQL actual: **0 locals/visitants incorporats, 0 incidències, 0 estadístiques i 0 sessions**. La font del pilot continua `pending`/codi nul, però el calendari actual ja té el **codi 35559**, importat de nou el 26/10 a les 18.17 h Madrid. `report_status=verified` apareix amb un resum, però **no hi ha acta estructurada ni alineacions desades**. El darrer detall d'RFEP 3575 conté cinc errors `permission denied for table federation_match_events`, inclòs aquest partit. La RPC `federation_commit_official_report` és SECURITY INVOKER i el rol servidor no té privilegis sobre aquella taula: el seu BYPASSRLS no substitueix els GRANT. Cal corregir el camí d'ingesta i la vinculació pendent amb permisos mínims, no donar permisos generals als clients. No s'ha executat cap correcció ni es pot deduir que l'usuari acabés el diferit.
3. **Inici en directe fallit:** `docs/live-team-entry-acceptance.json` conserva `FAILED_TO_START`. #20 prepara cincs i #23 facilita registre col·lectiu sense cincs, però la CI i la publicació posteriors no converteixen la prova física fallida en superada. La causa exacta de la sessió del navegador no està demostrada només per les taules buides.
4. **Partits antics oberts automàticament:** en obrir Avançat sense `?match=`, [federation-client.js:129](https://github.com/Dudisooft/clubhoquei360/blob/a5e54e7fd4f1ac2e3a723ef175b34f3850c40d96/federation-client.js#L129) prioritza un UUID concret i després el codi RFEP `35529`, abans del primer accessible. El mateix fallback pot aplicar-se **amb un `?match=` existent/autoritzat però sense fila a `federation_match_sources`**: la validació inicial comprova `pilot_matches`, però la tria posterior busca la font i no conserva obligatòriament aquell ID. És una deducció directa del codi, no una nova prova controlada del navegador de producció. Base també tria per defecte un partit segons futurs/dates ([base.js:242](https://github.com/Dudisooft/clubhoquei360/blob/a5e54e7fd4f1ac2e3a723ef175b34f3850c40d96/base.js#L242)). No existeix una política única de selecció explícita.
5. **Selecció jeràrquica/calendari:** el catàleg no està limitat a les primeres jornades: RFEP 3575 conserva 26 jornades i la cache, 182 partits de lliga. La confusió prové també de tenir 558 fixtures de catàleg però 32 contexts operatius, filtres diferents per pantalla i futurs sense codi desactivats en alguns recorreguts.
6. **Captura amb interfície anterior:** la branca documental `docs/starting-five-screen-check` identifica text de la pantalla anterior a #20. No hi ha confirmació de l'origen de la captura ni d'una recàrrega posterior correcta. Cal conservar la incidència com a pendent d'evidència visual, sense culpar permisos/cache com a causa acreditada.

Contradiccions resoltes per evidència: documents antics parlen de 553 fixtures, mentre SQL actual en compta 558; una documentació inicial de federació deia que no hi havia cron, però ara n'hi ha un d'actiu; totals 59/66/98/112 dins dels CODEX_PROGRESS corresponen a checkpoints diferents, no a un únic HEAD actual. **Els documents del 24/10 deien que faltaven els codis oficials i tota la plantilla visitant d'Alpicat: ja no són fotografies vigents.** Tampoc equival `report_status=verified` amb resum a una acta estructurada desada sense errors. El nom «multiclub» del tema estàtic no acredita el backend multiclub. La taula de migracions mostra backend d'invitacions encara que la PR continuï oberta. Es mantenen les decisions funcionals aprovades i es documenten les diferències sense corregir codi durant l'auditoria.

### Validació humana acreditada i límits

- **20/10:** el responsable confirma el recorregut bàsic d'una acció/desament/recàrrega; evidència de producció històrica de lectura/desament HTTP 200.
- **23/10:** confirma acció ordinador→mòbil sense recàrrega i indicador de darrera actualització. Mateix compte propi; no dos operadors externs diferents, ni tots els dispositius.
- **24/10:** Base general funcionant a Infantil, amb fallada visitant; inici del directe Igualada–Vic fallit. Aquestes incidències continuen essent el resultat real.
- **Diferit/TV, receptor entrenador i FEM15 extern:** preparació o proves locals, sense acceptació física completa localitzada. No crear-ne un resultat favorable per absència d'errors a CI.

## 7. Pla de continuïtat proposat — no executat

### Grup A — Selecció correcta del partit, independent de fonts externes

1. **Primera tasca proposada:** completar l'entrada jeràrquica temporada → competició → equip → partit, compartint catàleg i selecció entre Base/Avançat, sense obrir un partit antic automàticament. Conservar enllaços explícits autoritzats i rebuig explícit d'un partit aliè. Separar visualment passat/futur i fixture pendent/context activat; no inventar codi federatiu ni activar permisos des del navegador.
2. Verificar navegació mòbil, canvi de filtre, recàrrega i identitat exacta del partit abans de qualsevol anotació. La primera tasca s'ha de limitar a selecció/enrutament amb dades ja existents; si falta context operatiu, indicar-lo i mantenir els mecanismes d'activació autoritzada existents.

### Grup B — Operar sense plantilla federativa

3. Revisar #27 i completar el cas **dorsal sense nom**, sense fabricar noms personals. Preservar UUID, autor, procedència provisional i permisos; provar gols, targetes i les dues vies estadístiques. La base funcional de #27 ja està provada; no reescriure-la.
4. Decidir el tractament supervisat de dues identitats ja utilitzades; no unir automàticament temps de pista o incidències. Revisar migració i compatibilitat dels clients antics; provar integració abans d'autoritzar instal·lació/publicació coordinada. Validació física posterior amb el compte existent, sense anotacions de demostració als partits reals.

### Grup C — Recuperar dades oficials i completar cobertura

5. **Vic:** corregir en entorn de prova els privilegis mínims de la ingesta RFEP i la classificació dels errors; comprovar rollback/atomicitat, clients denegats i preservació d'incidències. Després d'autorització, usar el codi ja disponible `35559` per reconciliar el mateix pilot, sense duplicar-lo. **Alpicat:** aprofitar primer les vuit alineacions visitants ja disponibles de `152043`, validar-ne la lectura/identitat i no tornar-les a inventar o importar per nom. La verificació directa/plantilla de temporada encara necessita l'accés adequat a la font. Conciliar #22 amb #27 i resoldre conflictes; comprovar integritat abans/després.
6. Contrastar les plantilles locals i els reforços amb la font adequada; no usar tota una categoria com a plantilla ni una acta antiga com a elegibilitat. Revisar la cobertura d'actes i els errors detallats, encara que el resum d'import sigui `success`.

### Grup D — Accessos i validació amb persones reals

7. Revisar l'estat SMTP/OTP segons la guia existent i completar una recepció real quan el responsable ho autoritzi en el context de represa; no cal demanar contrasenyes. Integrar #11 amb main actual i amb els permisos nous, sense reaplicar el backend ja instal·lat. Cap enviament durant aquesta auditoria.
8. Només quan es demani: compte/invitació temporal del pilot FEM15, partit i caducitat concrets; consulta de l'entrenador receptor amb el seu permís. Revocació i aïllament reals; no repetir com a pendent el Realtime bàsic ja acceptat.

### Grup E — Multiclub i acabat

9. Resoldre conflictes i actualitzar #10 després d'estabilitzar selecció i plantilles. Staging amb dos clubs, worker/cua/cron i fonts verificades; actes detallades i Centre de partit encara requereixen integració. No activar en paral·lel dos schedulers sobre les mateixes fonts.
10. Després: completar dashboard connectat i metadades oficials d'equipacions. Les pantalles genèriques d'administració/planificació encara en construcció no són prerequisit per resoldre les incidències de partit.

## 8. Instrucció de represa i primera tasca única

Aquest informe **no autoritza executar el pla**, fusionar ni desplegar. Una ordre genèrica de continuïtat s'ha d'interpretar amb la restricció d'aquesta auditoria: el responsable revisarà i aprovarà la primera tasca abans de reprendre desenvolupament. Els checkpoints anteriors no s'han d'usar per donar per aprovada una publicació nova.

**Única tasca recomanada per començar: implementar l'entrada jeràrquica explícita temporada → competició → equip → partit, eliminant l'obertura automàtica de partits antics al Centre de partit.**
