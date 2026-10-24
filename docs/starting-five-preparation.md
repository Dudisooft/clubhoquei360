# Preparació real del cinc inicial · 24/10/2026

## Auditoria i objectiu

El responsable no pot escollir el cinc inicial de l’Igualada–Vic. No és només el selector de perfil: `pilot_players` del partit és buit. La font és un calendari verificat amb fitxa pendent. La preparació avançada només carregava alineacions d’una fitxa `verified` i, per tant, no oferia cap jugador.

Diagnòstic de Supabase real: el responsable conserva `operator`; SIMAR RFEP `3697`, competició `3575`, temporada `41`, disposa de **19 jugadors** al catàleg (29 registres amb tècnics), 11 dorsals i 3 indicis de porter de fonts anteriors. No consta cap entrada de plantilla del Vic `3727`. Les dades de temporada no s’han de presentar com a convocatòria ni elegibilitat del partit. No s’han llegit credencials ni modificat dades reals en aquesta auditoria.

La preparació ha de permetre a l’operador incorporar jugadors reals del catàleg o introduïts explícitament, escollir un porter i quatre jugadors de pista per equip, confirmar-ho al servidor i continuar el registre habitual. Cap nom, dorsal o ID federatiu inventat. Les dades introduïdes per l’operador queden identificades amb aquesta procedència; la fitxa RFEP continuarà pendent fins a importar-la.

## Blocs de desenvolupament

1. Comandos de preparació comprovats al servidor: catàleg acotat al partit, incorporació/identitat de jugadors, confirmació atòmica del cinc inicial amb revisió i auditoria. Manté els permisos de l’operador del partit i bloqueja tercers/operadors només estadístics.
2. Integració dins de la preparació existent del Mode Avançat, sense app paral·lela: catàleg sense reescriure noms, entrada manual quan la font no existeix, desament de la preparació i selecció del cinc inicial.
3. Registre manual de l’operador després de confirmar la preparació, independent de l’acta RFEP. Cap canvi de marcador/cronòmetre causat per accions estadístiques ni importació federativa.
4. Proves locals de PostgreSQL/RLS, regressió de navegador completa (confirmar, iniciar, pausa, gol, recàrrega, separar anàlisi/oficial) i publicació verificada. No executar automàticament una convocatòria o un partit de prova de producció.

Branca `fix/advanced-starting-five`, base `113b517031b5616d2606337577c959b0022718c5`, checkout `/workspace/work/clubhoquei360-starters`. Migració creada amb la CLI fixada: `20261024105636_advanced_lineup_preparation.sql`, implementada i instal·lada a producció com a `20261024113012` després de verificar-la. El nou bloc substituirà el bloqueig transitori del registre oficial només quan hi hagi preparació explícita i validada; no marcarà una acta pendent com a RFEP verificada.

Represa: llegir `docs/CODEX_PROGRESS.md`, revisar Git i continuar el primer bloc pendent. No repetir la vinculació RFEP publicada, les migracions d’estadístiques, bàsic o invitacions, ni les proves antigues de codi intacte.

## Verificació del bloc servidor

12/12 proves PostgreSQL/PGlite correctes: 8 de preparació i 4 de regressió RFEP. Catàleg restringit, UUID estables, entrada manual explícita, unicitat federativa/dorsals, reintents idempotents, 5 + 1 porter, revisions, confirmació atòmica, registre posterior i bloqueig de tercers. Cap dada de prova personal real; cap DML de producció. La UI es completa al checkpoint següent.

## Integració i proves de pantalla

`advanced-roster.js` i CSS dins de la preparació existent; `federation-client.js` carrega els convocats reals i separa preparar/registrar. Es poden corregir dorsals i posicions conservant identitat/procedència. Seleccions provisionals i mutacions pendents s’aïllen per usuari/partit; no hi ha escriptura oficial en només obrir la pantalla.

Suite local del bloc: **108/108 Node i 31/31 Chromium**, check/build 31 fitxers i diff correctes. Prova completa: catàleg + rivals ficticis manuals → cincs → confirmació → inici/pausa → gol → recàrrega. També ACK perdut després d’escriure al servidor, recàrrega i reintent del mateix UUID. Mòbil 390, tauleta 820 i ordinador 1440 sense overflow; captura revisada. Transport Auth/PostgREST local sobre PostgreSQL real de proves, sense sessió Auth de producció. Errors inicials de fixtures (columna ja present, metadades de calendari i clics sobre nodes regenerats) corregits, suites finals sense fallades.

La preparació real encara no s’ha executat en producció: el responsable ha de seleccionar els convocats reals. No hi ha font del Vic importada; s’ofereix entrada manual explícita.

## A. Auditoria inicial

Arquitectura estàtica HTML/JS amb Supabase i RLS, preparació dins d’`avancat.html`. El perfil de l’operador era correcte; `pilot_players` del partit era buit i el client retornava abans de carregar-lo quan només hi havia calendari. SIMAR: 19 candidats de temporada; Vic: cap plantilla importada. No confondre aquesta font amb la convocatòria/acta del partit.

## B. Desenvolupament

Components nous `advanced-roster.js`/CSS, integració a `federation-client.js` i `avancat.html`. Dos registres nous: confirmació actual `pilot_prepared_lineups` i auditoria append-only `pilot_preparation_audit`. RPC públiques invoker: `pilot_roster_catalogue`, `pilot_prepare_players`, `pilot_confirm_lineup`; implementació privada amb verificació d’operador, club/temporada/calendari, identitat i revisions. Les dades oficials importades no es modifiquen. El registre manual posterior utilitza el flux oficial existent amb procedència d’operador.

El catàleg no materialitza jugadors en obrir la pantalla. La selecció explícita crea/reutilitza UUID de jugador de partit; les entrades manuals no reben ID federatiu inventat. Correccions de dorsal/posició mantenen UUID i procedència. Les mutacions tenen identitat estable, límits i auditoria; un canvi de convocatòria exigeix reconfirmar i no es permet canviar el cinc després de començar. Draft i reintents s’aïllen per usuari/partit.

Fitxers de proves: `tests/starting-five.test.mjs`, `tests/helpers/preparation-db.mjs`, proves RFEP de navegador i helpers/fixtures compartits adaptats a l’esquema real. No s’ha desplegat cap servei addicional ni creat cap compte.

## C. Proves i resultats

[CI 40089984343](https://github.com/Dudisooft/clubhoquei360/actions/runs/40089984343) del conjunt integrat: **110/110 Node, 32/32 Chromium, check/build 31 fitxers**, zero fallades. Inclou catàleg/entrada manual, permisos, identitats, revisions, duplicats, validació real de porter/cinc, confirmació atòmica, selecció provisional recuperable, ACK perdut amb reintent original, iniciar/pausar, gol i recuperació, separació d’estadístiques i resolucions 390/820/1440.

Migració de producció `20261024113012` instal·lada a partir de la font local indicada al registre de progrés. Prova SQL real amb claims de l’operador existent: catàleg **19/0**, 10 jugadors i 2 anotacions temporals, reintents sense duplicats, bloqueig previ a confirmar, registre posterior i revisió del rellotge. **ROLLBACK complet, 13 empremtes iguals abans/després.** Tres ordres denegades a identitat aliena; HTTP anònim real denegat a les tres RPC amb 401/42501. Cap nou avís de seguretat respecte de la base auditada.

La consulta HTTP inicial sense proxy va fallar per DNS; amb el proxy configurat les proves Supabase van passar. L’obertura HTTP de Pages des d’aquesta execució no és accessible: la publicació s’acredita amb els logs de GitHub. SQL amb claims no equival a login Auth real; Chromium fa servir transport local explícit i identitats fictícies. El responsable encara ha de fer la convocatòria real.

## D. Estat funcional

| Funcionalitat | Estat |
| --- | --- |
| Preparar convocats de catàleg o reals manuals, revisar dorsals/posicions | OPERATIVA I VERIFICADA en PostgreSQL real i navegador local |
| Seleccionar i confirmar cincs, un porter per equip, conservar UUID | OPERATIVA I VERIFICADA |
| Inici/pausa, anotació manual i recàrrega amb preparació confirmada | OPERATIVA I VERIFICADA |
| Permisos de dades, revisions, auditoria, recuperació sense duplicats | OPERATIVA I VERIFICADA |
| Instal·lació Supabase i publicació Pages | OPERATIVA I VERIFICADA amb migració i logs |
| Selecció dels convocats reals pel responsable al dispositiu de producció | PENDENT de l’ús real del responsable |
| Plantilla del Vic i ID/acta RFEP del partit | BLOQUEJADA PER DEPENDÈNCIA EXTERNA; no s’han inventat |

## E. GitHub i posada en servei

Branca `fix/advanced-starting-five`, checkpoints `2df8b67`, `3331e0f`, `e56aa7c`, integració verificada `ffef2ff317c491645e26919cfd2934cadc487fbf`. [PR #20](https://github.com/Dudisooft/clubhoquei360/pull/20) fusionada a `de35b538bc9207a5a388cd1fd080dd655f0a07e9`; [Pages 40090318388](https://github.com/Dudisooft/clubhoquei360/actions/runs/40090318388) success, logs amb SHA, URL i «Reported success!» 24/10/2026 11:33:11 UTC. Esmena publicada amb l’autorització prèvia del responsable, preservant els canvis del Mode Base de main. Tancament documental a `docs/starting-five-release`.

## F. Únic pendent necessari i ús

Obrir [el partit al perfil Principal](https://dudisooft.github.io/clubhoquei360/avancat.html?match=18fa0a6e-e5c6-487e-8315-5bc371e22cb1&v=starting-five1), recarregar i preparar els convocats. Al SIMAR, «Tria del catàleg de temporada» → seleccionar → «Afegeix els seleccionats a la convocatòria». Al Vic, introduir només jugadors reals mentre no hi hagi font disponible. Revisar dorsals/porter si cal, marcar un porter i quatre de pista per equip, «Confirma els dos cincs inicials» → «Inicia».

Caldrà reconciliar la mateixa font quan la RFEP publiqui la fitxa, sense inventar un altre partit. Cap activació de compte extern o SMTP és necessària per a aquesta preparació amb el compte existent. Evidència completa: [JSON sanejat](starting-five-verification.json).
