# Fase 3A · Auditoria i correcció d'accés als modes

27/10/2026, Europe/Madrid. Base `main` `e009f4d`, després de PR #30. Branca frontend `fix/match-mode-access`; servidor preparat separadament a `feat/match-mode-access-server`. Cap canvi de producció autoritzat ni executat.

## Causes comprovades

- `matchHref` només admet Avançat amb context operatiu preexistent; no diferencia consulta de calendari i activació. No filtra per categoria ni rol.
- L'Avançat només entén `?match=` operatiu i no consulta disponibilitat esportiva al servidor.
- `basic_open_catalogue_match` només activa FECAPA i no prepara `stats_matches` ni una font de calendari per a Avançat; RFEP necessita una via explícita compatible.
- El servidor actual no restringeix dades/ordres avançades per categoria. `stats_club_manager` també admet admin/section_coordinator: no serveix per identificar exclusivament el coordinador principal.
- `render()` de l'Avançat marca l'estat com a modificat i pot desar sense una acció de registre; cal separar recuperació de consulta i edició.
- `teams.category` barreja edat i divisió. No hi ha cap camp estructurat de franja esportiva. Cal preparar metadades verificades i no una llista de divisions sènior dins de la política.

## Evidència actual

Lectures SQL delimitades amb `BEGIN READ ONLY`/`ROLLBACK`: 36 equips IHC 2026/27, cap fila a club_memberships, 1 superadministrador habilitat. No existeix cap compte amb rol de coordinador principal que permeti una validació real d'aquest rol. No equival a un login Auth real de l'usuari. Fonts: definicions reals de funcions, polítiques i columnes consultades; avisos de seguretat/rendiment i fonts de logs revisats sense mutations. Xarxa vigent 139; changelog Supabase inaccessible (CONNECT 403), documentació RLS consultada via MCP.

## Política funcional

Política del servidor basada en franja d'edat estructurada: sènior/júnior Base+Avançat; juvenil i inferiors Base; excepció només platform_superadmin habilitat o general_coordinator del club sense team_id. La disponibilitat no atorga permisos operatius. Consulta de calendari sense escriptures i activació explícita/idempotent amb permisos verificats. Metadades desconegudes: no deduir sènior pel nom d'una divisió.

Canvis de servidor/RLS aniran en PR separada i no s'aplicaran a producció. No modificar plantilles, desplegable, elegibilitat, convocatòries, imports ni registres existents. El detall de la implementació, les proves i la matriu consta a continuació.

## Correcció implementada i separació de dependències

El frontend consulta `match_mode_access` abans d'habilitar modes o obrir Avançat. Cap paràmetre `role`, `profile` o etiqueta de la pantalla concedeix excepcions. La pantalla avançada està inert fins a verificar accés i carregar el context autoritzat. Un enllaç denegat no obre un altre partit. Si falta el contracte del servidor, es mostra l'error i no s'intenta activar ni deduir permisos al navegador.

El selector conserva els quatre nivells de PR #28 i no preselecciona partit. Un futur sense context pot obrir `partit-consulta.html` en el mode autoritzat, tant FECAPA com RFEP. La consulta només llegeix calendari/capacitats. El botó d'activació és explícit i torna a verificar permisos; comprova l'ID operatiu i el catàleg retornats abans de navegar. Si ja hi ha un context Base però falta el context estadístic, ofereix completar explícitament el mateix context per Avançat. No es reinterpreta una data futura com una denegació.

En obrir un context RFEP al Base s'utilitza la font operativa existent, en lloc de passar per l'adaptador de plantilles de catàleg exclusiu de FECAPA. No es modifiquen el filtratge, el desplegable o les regles de reforços, ni es recuperen rivals.

En Avançat, renderitzar o recuperar un estat no el marca com a modificat. S'elimina el desencadenant d'importació automàtica en obrir; es manté el botó manual i els sistemes d'importació sense canvis. Les anotacions oficials pendents es conserven i es desen només amb una acció explícita. Un tram estadístic interromput també exigeix recuperació explícita, amb els seus IDs de mutació originals: no crea un esdeveniment pel simple fet d'obrir la sessió. Una sessió que l'operador ja ha iniciat continua desant el seu treball durant el registre; consultar un rellotge pausat no genera escriptures.

**Dependència obligatòria de publicació:** [PR de servidor #31](https://github.com/Dudisooft/clubhoquei360/pull/31), `feat/match-mode-access-server`, migració `20261027170248_match_mode_access.sql` i classificacions revisades. No estan incloses en aquesta branca ni instal·lades a producció. El frontend no s'ha de publicar abans de verificar-les. Les 36 metadades es preparen en un script separat amb ROLLBACK; no són una llista d'excepcions de permisos dins del codi. Equips nous i divisions noves utilitzen el mateix contracte, amb desconeguts bloquejats conservadorament per a Avançat ordinari.

## Matriu i validació real

[Matriu dels 36 equips](match-mode-matrix-20261027.md) i [JSON d'evidència](match-mode-matrix-20261027.json). Catàleg real consultat en només lectura: sis sèniors, quatre júniors i 26 inferiors en la classificació proposada. Cap camp `age_group` real encara instal·lat; cap club_membership existent, un superadministrador habilitat. Coordinador principal i permisos Auth de comptes ordinaris queden pendents de validació real.

Les lectures anterior/posterior de **12 conjunts** retornen els mateixos recomptes/empremtes: 348 incidències, sis estats oficials, tres estadístiques, una sessió, tres assignacions, membres, jugadors, contextos, calendari, plantilles i equips. No s'ha modificat producció, ni aplicat SQL, migracions, comptes o permisos. Els SELECT de reproducció estan versionats, sense exportar identitats personals.

FEM9/FEM17, Primera Catalana sènior i equips sèniors femenins no apareixen com a equips diferenciats en aquest catàleg. No es conclou que no existeixin a la federació. Els casos sènior femení/divisió desconeguda es proven amb dades explícitament fictícies. La proposta de metadades s'ha de revisar; les franges no certifiquen elegibilitat federativa de reforços.

## Proves executades

- Frontend: **156 Node / 67 Chromium**, zero fallades/omissions en l'execució completa. Check/build 38 fitxers i diff correctes. Després dels canvis de versions de memòria cau i validació estricta d'IDs, les sis proves Node de contracte/navegació es tornen a executar correctament. Logs locals `/tmp/mode-front-final-node.log` i `/tmp/mode-front-final-browser.log`.
- Servidor separat: final local **167 Node / 47 Chromium**, incloses 14 proves PostgreSQL de política/activació/correcció Base. CI pendent de comprovar a la seva branca, sense confondre'ls amb un desplegament efectiu.
- Els contractes del frontend se simulen amb fixtures. Les proves del servidor executen la migració i RLS en PostgreSQL/PGlite local amb usuaris ficticis. **Cap d'aquestes dues categories acredita Auth de producció.**
- Errors detectats/corregits: expectatives antigues de denegació actualitzades al bloqueig previ d'URL; les opcions HTML es comproven pel seu atribut disabled; snapshots interromputs poden recuperar-se des de cua o tram local; les correccions Base necessiten un helper de comprovació del destí per evitar recursió RLS. Fixtures antigues completades amb vincles federatius que faltaven, sense relaxar permisos.

## Guia visual de revisió

Fer les comprovacions en un entorn de revisió amb el servidor preparat i dades fictícies o en només lectura. No usar partits reals per crear registres de demostració.

1. Dashboard → Partit: seleccionar explícitament 2026/27, competició, equip i partit. Recarregar ha de deixar el selector sense partit preseleccionat.
2. SIMAR / RFEP OK Lliga: seleccionar un futur sense context, escollir Avançat i obrir consulta. Mostrar el partit i la data correcta; zero registres creats. Amb permís operatiu, activar explícitament i comprovar la mateixa identitat/context. Base també disponible.
3. IHC B / Tercera Catalana: Base i Avançat disponibles per la franja sènior, sense dependre del nom de la divisió. Si només té context Base, mostrar «Prepara el context del Mode Avançat»; completar-lo ha de preservar l'ID i les incidències.
4. Júnior Or i un altre equip/divisió Júnior: comprovar els dos modes. No dependre de lletres A/B/C/D ni del nom de la competició.
5. Juvenil/Infantil o FEM de base inferior: un usuari ordinari només té Base; manipular l'URL d'Avançat ha de denegar-lo i mantenir els controls inerts. Repetir amb superadministrador habilitat i coordinador principal autenticat: Avançat disponible. Admin/secció/entrenador/delegat no reben l'excepció.
6. Partit disputat/finalitzat: consultar l'existent sense escriptures ni canvi de marcador. El tancament es conserva; una anàlisi separada necessita confirmació explícita del botó corresponent. Recarregar estadístiques pendents no les envia fins a recuperar-les explícitament.
7. Repetir a 390, 820 i 1440 px. Les 19 proves de `tests/browser/match-modes.spec.mjs` cobreixen aquests fluxos amb fixtures; `npx playwright test tests/browser/match-modes.spec.mjs --headed` permet revisar-los visualment en un entorn amb pantalla.

## Estat i pendents

Codi frontend implementat i verificat localment; servidor preparat en branca independent. **Producció pendent** de revisió/autorització i instal·lació del servidor/metadades, seguida de prova autenticada real. No fusionar ni publicar aquesta branca sola. Les funcionalitats de jugadors, imports, reforços i coordinació continuen fora d'abast.
