# Recuperació multiequip local · 02/11/2026

## Causa i comparació

El servidor `official-replay-server.mjs` substituïa el catàleg amb un únic equip SIMAR i dos partits, i `/` redirigia al Vic. No és evidència d'esborrat productiu, migració o pèrdua de dades. El selector compartit, present també a `origin/main`, continuava existint. Addicionalment, filtrava els equips segons els partits disponibles en lloc de les inscripcions: un calendari absent amagava l'equip. Comparats els fitxers amb `origin/main`, la branca actual 7baf003 i l'evidència local de PR #31–#34; no s'ha consultat l'estat actual remot de les PR ni fusionat res.

## Correcció

- Catàleg local derivat de l'inventari conservat del 28/10: 36 equips, 38 inscripcions i 22 competicions 2026/27, identificats per IDs, federació i competició.
- Selector compartit per inscripcions, amb equips visibles encara que falti calendari. Temporada, competició, equip, partit i mode sense preselecció.
- Entrada principal al selector i pàgina de tots els equips, amb fonts per competició. Dashboard local redirigit al catàleg.
- Vic i Noia mantenen els IDs i les pantalles Base/Avançat; catàleg de només lectura sense crear contextos operatius per obrir calendaris. Els permisos SQL de registre Vic/Noia continuen vigents.
- Reutilitzat `PublicFederation`: memòria cau per competició, ETag/Last-Modified, deduplicació i conservació de l'últim calendari vàlid si falla la font. Actualització explícita amb `scripts/refresh-club-calendars.mjs`, sense cron ni producció.
- Les pàgines exclusives del laboratori s'exclouen del paquet de publicació.

## Fonts i cobertura real

Consulta pública nova RFEP: 3568 i 3575, 182 partits cadascuna; 3592, 3 partits. S'emmagatzema el calendari públic i només es vinculen al catàleg els partits dels equips propis. Amb la còpia FEM15 prèvia, 55 partits del club disponibles. La recuperació RFEP no importa automàticament actes, jugadors o convocatòries noves.

FECAPA: portada pública accessible; `/league/4787` respon 404 i el servei SIDGAD de calendari 403 des d'aquesta ruta. El JavaScript públic compartit també respon 403. No s'ha atribuït el bloqueig a la federació ni eludit controls. No s'han substituït dades oficials per agregadors ni inventat partits. Fonts originals i IDs preservats per a totes les competicions. La còpia FEM15 conté un partit; FEM11, Infantil D i Júnior A tenen equip i inscripció disponibles però calendari local pendent. No s'ha llegit ni exportat la base productiva per omplir aquest buit.

Vic: 10 jugadors oficials per costat, acta intacta. Noia: candidats històrics, no alineació ni elegibilitat oficial confirmada. Les plantilles no recuperades de la resta del club continuen pendents. No es declara l'aplicació completa quant a dades federatives o registre de tots els equips.

## Validació executada

- `node --test --test-concurrency=1 tests/*.test.mjs`: **288/288 PASS**, inclou tres proves noves de catàleg, identitats de diversos equips, absència de calendaris i filtres/paginació.
- `node scripts/verify.mjs`: 48 fitxers verificats.
- `scripts/verify-club-browser.mjs`: navegador Chrome, 36 targetes; selectors FEM11, FEM15, Infantil D (Infantil Or), Júnior A i SIMAR; tots buits en entrar; Vic accessible en Base; 10+10; escriptura al catàleg denegada; ID fora de catàleg sense accés; acta immutable; cap error JavaScript.
- Primera suite simultània: 279/288, nou errors d'arrencada de servidors de prova. Resolts executant en sèrie; no s'han ocultat ni comptat com a PASS.

Evidències no versionades: `work/club-browser-evidence.json`, `work/club-regression-sequential.txt`, `work/club-selector.png`, `work/club-catalogue.png`, `work/club-vic.png`, `work/club-calendars/status.json`.

## Execució local

URL: http://127.0.0.1:4191/ · catàleg: http://127.0.0.1:4191/club.html.
Servidor només loopback amb base pròpia `work/club-replay-db`. Les anotacions de la demo anterior no s'han sobreescrit ni copiat en calent: continuen a la base anterior. Les proves noves no representen sincronització entre dispositius ni accés productiu.

Sense desplegament, fusió, push, migració, exportació o canvi productiu. Pendent per completar l'objectiu de totes les consultes: recuperar calendaris i documents FECAPA per una via oficial accessible, i després verificar-ne les plantilles i actes equip per equip.
