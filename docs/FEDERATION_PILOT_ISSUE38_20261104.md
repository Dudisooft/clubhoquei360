# Pilot federatiu · issue #38 · 4 de novembre de 2026

Base: PR #37 `aafce19b92f7eedca71a0ba1c5c1401b6b33695d`. Branca independent `fix/federation-readonly-pilot-20261104`. Una sola aplicació, sense migracions noves, imports productius o desplegaments.

## Resultat funcional implementat

La fitxa de consulta del calendari i el Mode Avançat incorporen **«Consulta l’acta oficial (sense desar)»**. L’acció fa GET al connector `federation-sync` existent. No es criden `federation_claim_sync`, les RPC de commit, les taules d’auditoria o cap activació. El frontend no reintenta amb POST si el backend antic retorna405. La consulta no es dispara automàticament en obrir o recarregar.

El servidor comprova Auth amb `getUser` i crea un client amb clau anon i el JWT de la petició. Les consultes SQL passen per RLS, sense `service_role`. Un `match_id` consulta la font operativa accessible; un `catalogue` consulta les capacitats amb `match_mode_access` i el registre federatiu accessible, sense crear un pilot. No s’accepten tots dos, un codi federatiu en lloc d’UUID ni identitats d’equip enviades pel navegador. El fingerprint, les capacitats i els IDs del calendari han de concordar. Un registre inaccessible no desencadena peticions federatives.

La consulta del catàleg és necessària perquè **no hi ha cap font operativa productiva vinculada a35559**. La preparació/reconciliació d’un context existent continua sent una acció explícita i autoritzada; no es vinculen pilots per coincidència de noms.

## Fonts: què s’ha pogut observar

| Font / recorregut | Evidència actual | Límit |
|---|---|---|
| [RFEP inici](https://www.hockeypatines.fep.es/) i [competició3575](https://www.hockeypatines.fep.es/league/3575) | Lectura web pública: selector, competicions, directe i control de retorn; shell dinàmica SIDGAD | No s’ha executat la seqüència JS ni capturat un HAR nou; no hi ha acta35559 llegida aquí |
| [FECAPA inici](https://www.hoqueipatins.fecapa.cat/) | Lectura web pública: temporades, categories i «Tornar a competicions» | El fragment d’acta152043 i les pàgines internes consultades no s’han recuperat amb aquesta ferramenta |
| Executor/Chromium | Política147 restringida, sense hosts federatius; `curl` RFEP retorna CONNECT403/envoy abansTLS | No és prova d’un rebuig HTTP del servidor federatiu. No s’han fet connexions directes o alterat proxies |
| Adaptador RFEP recuperat | Contracte anterior: configuració pública del portal → leagues → calendar → report, amb IDs de temporada/competició/equips/partit | Evidència recuperada de la consulta del portàtil; no una API documentada o un nou accés en viu garantit |
| Fragments FECAPA existents | Es reutilitzen `parseCalendar`, `parseMatch` i `fetchOfficialHtml`; comprovació de calendari/equips abans de publicar resposta | Proves amb HTML sintètic; identitat del fragment lligada a URL/IDs de consulta i equips. No és una nova verificació federativa real |

La seqüència comunicada pel responsable —portal → temporada → competició → grup → escut → partit/pestanya → «Tornar a competicions»— es conserva. La presència del control de retorn s’ha observat; el seu efecte sobre estat/cookies no s’ha reproduït interactuant. No s’utilitza `goBack()` com a substitut. Els adaptadors no depenen de cookies personals ni de l’historial. Això no acredita que qualsevol endpoint desconegut admeti accés directe.

No hi ha mesura nova de latència, paginació o freqüència real d’actualització de les actes. No s’han inventat aquests valors ni s’han deduït esdeveniments cronològics dels totals de jugadors. Els gols/targetes de la resposta són totals atribuïts quan hi ha valor explícit; l’absència queda `null`. El resultat mostrat prové del calendari, i no substitueix el marcador propi. No es dedueix que un convocat sigui habitual, reforç o elegible només perquè consta a l’acta.

### Serveis comparables: dades públiques, sense reutilització no autoritzada

- [OKMob](https://okmob.app/) declara dades dels portals públics federatius i seguiment de l’acta. No s’ha verificat si internament fa extracció HTML, API o una combinació, ni una API pública reutilitzable. No s’ha copiat codi ni consumit un endpoint privat.
- [Hoquei Patins Catalunya, preguntes freqüents](https://hoqueicat.cat/preguntes-frequents) descriu sincronització automàtica periòdica amb FECAPA i adverteix del desfasament possible. Això acredita la seva declaració de funcionament, no el protocol concret o un permís d’integració per a ClubHoquei360.
- [Hoquei patins a Google Play](https://play.google.com/store/apps/details?hl=ca&id=com.hoquei.patins) declara consulta de FECAPA i visualització d’actes. No publica aquí un contracte d’API. No es pressuposa IA en cap servei.

La recuperació legítima pendent és l’accés al portal/API públic des d’una connexió autoritzada o l’acord d’integració federativa ja preparat. No s’ha enviat cap contacte institucional.

## Arquitectura B i límits de cache

1. **Font oficial:** lectura RFEP/FECAPA amb identitats verificades. Tokens públics temporals del portal només dins del worker; mai a snapshots, informes o navegador.
2. **Cache temporal:** memòria del mateix connector, per àmbit federació/temporada/competició/partit/equips. Acta30s, calendari10min,100entrades per col·lecció (límit configurable200),24h màxim de còpia anterior. Peticions simultànies d’una acta s’agrupen; fallades tenen pausa mínima60s i `Retry-After` limitat a1h. No hi ha bucles de reintents. Els límits són per worker, no un rate limiter global distribuït.
3. **Persistència existent:** alineacions federatives ja importades continuen de només lectura al client. Les estadístiques, sessions i outbox propis es desen al sistema existent de Supabase amb els seus permisos. Una consulta no escriu en cap capa persistent ni afegeix participants al registre.

Una cache expirada o d’un altre àmbit no pot certificar una alineació. Una fallada no es converteix en plantilla oficialment buida. L’estat `stale` conserva la data original i es mostra explícitament. La resposta HTTP és `private, no-store`; no s’afegeixen noms de jugadors al localStorage. La cache no substitueix una còpia de seguretat ni està sincronitzada entre workers o dispositius.

## SIMAR–Vic i Alpicat: estat real

Lectura SQL productiva estrictament de lectura del04/11:

- RFEP35559: SIMAR–Auto Vigatana Patí Vic,1–1, estat de resum `verified`, **0/0alineacions i0porters desats**. El resum verificat no acredita participants. Zero `federation_match_sources` vinculades al codi35559.
- FECAPA152043: Infantil D–Alpicat A,3–1, **8/8alineacions**, tres registres de porter totals. No s’ha reconstruït ni modificat cap jugador.
- `service_role` encara sense SELECT/INSERT a `federation_match_events`. És un bloqueig de persistència separat del CONNECT403. La reparació revisada aPR37 es manté sense aplicar.
- Els10+10 del Vic continuen com a evidència anterior de consulta oficial al portàtil, sense resposta original disponible per revalidar aquí. Cap fixture sintètic s’ha convertit en dada federativa.

**No es declara operable el Vic amb alineacions oficials en l’aplicació publicada.** El diferit i la consulta es poden assajar a l’entorn aïllat de proves, amb jugadors ficticis explícits. Falta lectura efectiva de l’acta, reconciliació amb context/IDs existents i persistència autoritzada abans de certificar la prova real.

## Assaig del pròxim directe i diferit

1. Obrir Dashboard → Partit → seleccionar els quatre nivells explícits. Cap preselecció ni activació automàtica.
2. Obrir consulta i prémer el botó de lectura. Revisar data, resultat de calendari, convocats i porters. Amb backend antic405 o font inaccessible, les dades desades romanen disponibles.
3. Si falten alineacions verificades, no convertir candidats en convocats. El registre col·lectiu autoritzat pot continuar independentment de la font; les accions individuals requereixen jugadors vinculats al context segons les regles existents.
4. Activar/preparar el registre només amb l’acció i els permisos existents. La consulta no ho fa. Per vídeo, obrir diferit amb el cronòmetre manual pausat i conservar l’acta.
5. Registrar accions pròpies; davant una interrupció, recuperar outbox i sessió i comprovar que només es confirma un esdeveniment. En una segona pantalla autoritzada, comprovar sincronització; distingir HTTP periòdic de Realtime.
6. Qualsevol relectura d’acta conserva la separació: els gols/targetes consultats no generen anotacions pròpies ni corregeixen el marcador de l’operador.

Aquest assaig és tècnic i amb identitats fictícies. No s’ha creat una URL pública alternativa ni s’ha validat el compte personal de l’usuari contra el backend nou.

## Proves i entrega

**300 proves Node i 93 Chromium superades, zero fallades i zero omissions**, més comprovació estàtica i build de44fitxers.7proves Chromium noves inclouen els dos contextos i les tres mides390/820/1440.18proves Node noves inclouen PostgreSQL/PGlite amb identitats fictícies assignada/aliè, GET amb client anon+JWT i rebuig d’identitats ambigües. L’error inicial de sintaxi del test RLS s’ha corregit i la suite completa s’ha tornat a executar.

Recorreguts conjunts RFEP futur i FEM15 PASS: una activació explícita conserva1context/1membre/1observació/0incidències oficials; l’operador temporal conserva2observacions, sense membres externs generals i amb revocació/caducitat. Són comptes/Auth ficticis i PostgreSQL/PGlite; no s’ha repetit una validació GoTrue real ni s’ha validat Auth productiu.

La [PR #39](https://github.com/Dudisooft/clubhoquei360/pull/39) es manté en esborrany sobre la #37. La CI del codi inicial8a3c8e7 [41892511327](https://github.com/Dudisooft/clubhoquei360/actions/runs/41892511327) és satisfactòria, inclòs PostgreSQL17natiu. La CI del checkpoint final amb les dues regressions addicionals s’indica als checks i al cos de la PR quan es completa, sense commits documentals recursius.

L’evidència minimitzada és [federation-pilot-issue38-20261104.json](evidence/federation-pilot-issue38-20261104.json). Les policies productives consultades en lectura restringeixen `federation_match_sources` a membres del partit, `stats_can_read(match_id)` o superadministrador; no s’ha creat cap policy ni ampliat cap rol. Les noves regressions cobreixen35559 amb10+10FICTICIS, Alpicat i FEM11–Barberà amb HTMLFICTICI, Auth/RLS/UUID/identitats, cache/actualitzacions/backoff, consultes explícites sense escriptura, versions antigues i tres resolucions. El codi de prova FEM11 amb IDs199999/4999 no representa una identitat federativa descoberta.

Per publicar continuen sent necessaris: backup productiu recuperable; autorització de49+2, set migracions i backend; classificacions aprovades; accés federatiu verificat i reconciliació/importació autoritzada del Vic; validació autenticada; i autorització final de fusió/Pages. No s’han executat aquestes operacions. La consulta de només lectura no elimina aquests bloquejos.

### Connexió oficial pendent, sense esquivar la xarxa

L’executor actual no disposa d’accés autoritzat als hosts necessaris dels connectors: `www.hockeypatines.fep.es`, `hockeypatines.fep.es`, `api.sidgad.com`, `www.hoqueipatins.fecapa.cat`, `hoqueipatins.fecapa.cat` i `www.server2.sidgad.es`. Preparar-ne l’accés amb el mecanisme suportat de configuració de l’entorn i revisar les condicions federatives; no editar el fitxer local de política, ni desactivar proxies/TLS, ni copiar cookies. Un cop disponible, fer una sola consulta de calendari/acta amb els identificadors verificats, comparar identitats i procedència i només després valorar una importació expressament autoritzada. La lectura web parcial disponible ara no és un substitut del recorregut interactiu o de l’acta.
