# Mode Bàsic · lliurament 23/10/2026

## Auditoria prèvia i aïllament

Repositori real: Dudisooft/clubhoquei360 (el text de l’encàrrec indicava Dudisoft). Base actualitzada `4950940`, branca pròpia `feat/basic-match-20261024`, worktree `/workspace/work/clubhoquei360-basic`. El checkout inicial queda intacte. `git worktree list`, branques remotes i consulta GitHub de PR obertes revisats: cap PR oberta en començar. No hi ha un servei disponible que permeti enumerar totes les altres tasques Codex; no es pot afirmar que no existeixin tasques remotes. No s’han modificat els fitxers d’estadístiques ni el Centre Avançat.

Frontend estàtic sense framework. `base.html/base.js` era una pantalla de gols i faltes sense jugadors, targetes ni finalització. `avancat.html` i `federation-client.js` gestionen l’operació avançada; `stats-*` és la capa analítica independent. Es reutilitzen `app-client.js`, `federation-model.js`, `pilot_matches`, `pilot_players`, `pilot_members`, `pilot_events` i l’Edge Function existent. `pilot_operator_state` només es llegeix, per respectar una finalització prèvia; no es reescriu el seu cronòmetre o estat.

Supabase auditat també en lectura real: columnes, CHECK/FK i polítiques de `pilot_events`, `pilot_players` i `pilot_members`. Els tipus `goal`, `note`, `card_blue`, `card_red`, `correction` existeixen. INSERT requereix identitat pròpia i membre habilitat; gols/targetes blaves/vermelles/correccions requereixen operador. La política de font de club és RESTRICTIVE, no amplia permisos. La nova UI només habilita escriptura a `pilot_members.role=operator`. No s’han canviat esquema, permisos ni dades de producció. Les proves PostgreSQL locals modelen aquests permisos; no acrediten una escriptura Auth real de producció. Les notes existents són accessibles també als estadístics segons la política vigent; no s’ha ampliat aquest accés.

## Implementat

- Selecció de partits reals accessibles; priorització del partit de prova només si el calendari en verifica títol i data. Una URL no autoritzada no selecciona un partit alternatiu silenciosament.
- Plantilla existent amb nom/dorsal, selecció editable de participants i golejador opcional; sense titulars, suplents ni minuts. Equip gestionat seleccionable i recordat per usuari/partit.
- Gol de l’equip i del rival; marcador fix a la vista. Targetes groga, blava i vermella com al lector federatiu ja versionat, sense equivalències, acumulacions o sancions automàtiques. Banqueta identificada amb `bench:true`, sense exigir persona.
- Anul·lació append-only i nova anotació per corregir. Els originals queden conservats. Les correccions inclouen el registre anterior per compatibilitat amb la recuperació avançada.
- Convocats i finalització local com a notes del flux existent; no es modifica l’acta oficial ni s’escriu `pilot_operator_state.finished`.
- Cua persistent per usuari/partit amb UUID, desament local abans d’enviar, reintent manual/en reconnexió i recuperació després de recàrrega. Un pendent no es presenta com a confirmació del servidor. La finalització comprova que no hi hagi pendents previs.
- Botons de 48 px com a mínim, feedback visual, taula local/oficial amb discrepàncies; absència de dades = «No verificable».

## Integració FECAPA i límits reals

S’utilitza exclusivament `federation-sync` existent, activada amb «Actualitza amb FECAPA» i en finalitzar. Cap consulta automàtica contínua. En entrar es llegeix la darrera font desada. L’Edge Function actual conserva una memòria cau de sis hores: el botó pot recuperar-la i la UI ho diu explícitament; no força una consulta externa nova. No es desplega una variant de servidor sense autorització.

El lector actual recupera marcador, jugadors i targetes individuals quan la font els publica. Les targetes de banqueta no estan estructurades i no es comparen com a zero. `official_status` és text cru; sense un contracte verificat d’estats, es mostra literalment i el tancament resta «No verificable». No es dedueix que l’acta sigui tancada a partir del marcador o de la finalització local. Errors preserven les dades locals i el darrer snapshot oficial, amb la seva data original. La pantalla inclou l’accés directe al portal per revisar l’acta manualment.

L’accés HTTP directe a hoqueipatins.fecapa.cat i al changelog Supabase ha retornat 403 de la política de xarxa. Documentació d’accés/RLS consultada via MCP. No s’ha eludit la restricció ni s’ha revalidat el portal. No hi ha API JSON pública documentada segons l’auditoria existent; es reutilitza el mecanisme ja desplegat sense ampliar extraccions.

La lectura real de `pilot_matches` no troba **Infantil D – Aplicat A, 24/10/2026**. Hi consten un altre pilot contra Patí Vic i FEM15 contra **Alpicat**, que no s’han equiparat amb el partit demanat. L’únic Infantil D trobat és l’històric contra Malgrat. Cal verificar/importar el partit correcte i la seva plantilla amb el mecanisme autoritzat abans de la prova. No s’han inventat identificadors ni creat registres.

L’arrencada en fred necessita Auth i lectures de xarxa; no és una PWA completament offline. La cua recupera les anotacions després de carregar el partit. No es declara sincronització en directe de dos operadors del Mode Bàsic: el botó «Desa pendents i actualitza» torna a llegir les dades. Eviteu dos operadors oficials simultanis entre modes durant la prova. La finalització local bàsica no bloqueja el Mode Avançat, deliberadament per preservar-ne el funcionament aprovat.

## Accés i ús de la versió de prova

No publicada ni fusionada a main. Per provar amb dades reals, servir l’artefacte en un origen de proves autoritzat per Auth i per CORS de l’Edge Function. Un servidor localhost arbitrari no acredita la integració federativa real. La configuració CORS existent de federation-sync admet l’origen de GitHub Pages i pot bloquejar altres orígens.

Per reproduir localment sense tocar producció:

```
npm ci
npm run check
npm test
npm run build
npm run test:browser
```

Les proves de navegador serveixen l’aplicació sota `/clubhoquei360/base.html`. Els tres casos bàsics usen un transport sintètic i dades fictícies; la resta de casos existents utilitza PostgreSQL local. No confondre aquestes proves amb una sessió esportiva real.

Després d’una publicació expressament autoritzada: Dashboard → Mode Base → seleccionar partit i costat → marcar convocats i desar → seleccionar jugador quan calgui → gols/targetes → anul·lar errors → «Actualitza amb FECAPA» → «Finalitza i desa el partit» → revisar discrepàncies i dades no verificables. Comprovar «Dades desades al servidor» abans de tancar el navegador; mantenir el dispositiu i la cua si hi ha pendents.

## Fitxers

`base.html`, `base.js`, `basic-model.js`, `basic-store.js`, `tests/basic.test.mjs`, `tests/browser/basic.spec.mjs`, `tests/helpers/basic-browser-client.js`, aquest informe i `docs/CODEX_PROGRESS.md`.

## Prova mòbil autoritzada · Igualada HC D – Salt

El responsable ha autoritzat expressament la publicació de la versió nova i ha triat el partit anterior contra Salt. La lectura de les taules federatives generals (no només del pilot) identifica:

- Igualada HC D – Oxford HC Salt A, Infantil OR 4, jornada 3.
- 10/10/2026, 16.45 Europe/Madrid, Pista Polivalent Igualada.
- Codi FECAPA `152035`, competició `4786`, grup `4920`.
- Resultat **8–0**, coincident entre calendari i acta segons la importació del 23/10/2026 a les 11.17 Europe/Madrid.
- Estat publicat `FINALIZAT`; vuit jugadors locals i set visitants a l’acta. La suma dels gols individuals locals publicats és vuit. Els camps individuals absents resten nuls, no zero.

Font: https://www.hoqueipatins.fecapa.cat/league/4786 ; acta registrada a `https://www.server2.sidgad.es/fecapa/fecapa_gr_152035_1.php`. La nova comprovació és sobre la importació federativa desada; el portal directe continua inaccessible des de l’entorn, també via eina web. No s’afirma una extracció nova en directe.

La ruta `base.html?practice=b89dd91d-933f-841a-ad43-f03553ca14a5` carrega aquesta acta i les seves plantilles amb Auth/RLS vigents. Les anotacions de prova es desen exclusivament al dispositiu, sota una clau separada per usuari/partit; cap escriptura a `pilot_events`, cap compte o permís nou i cap canvi a l’històric. «Actualitza amb FECAPA» en aquesta prova torna a llegir la importació federativa i explica que no fa una consulta nova al portal. El registre operatiu normal continua emprant la persistència de servidor existent.

Proves addicionals: persistència local de la prova, recuperació, quota de desament, acta/plantilla verificades i dades absents; cas de navegador que comprova zero escriptures remotes i zero crides de sincronització mentre es registren convocats, gols, targetes, recàrrega, contrast i finalització.
