> Actualització documental 3A.4: [sis franges amb contrast independent pendent](SENIOR_FEDERATION_REVIEW_3A4_2026-10-28.md). Rigat se suma als cinc pendents independents; les proves Auth locals i el codi de seguretat no canvien.

# ClubHoquei360 · Fase 3A.3 · Staging i Auth real

28/10/2026. Continuació de 3A.2. PR #31 i #32 separades, en esborrany; cap fusió, desplegament o modificació de producció.

**VALIDACIÓ AUTH REAL: COMPLETADA EN L’ENTORN LOCAL AÏLLAT**, per als casos d’aquesta fase: 8 comptes, 9 blocs API/Auth/RLS, 6 blocs de navegador i recuperació per reinici. Són sessions de Supabase GoTrue i consultes a PostgreSQL/PostgREST reals, **no PGlite ni JWT d’usuari fabricats**. Això no autoritza la publicació ni homologa tot l’esquema productiu.

## Entorn i aïllament verificats

| Component | Versió / configuració observada |
|---|---|
| Docker | 28.4.0, motor local unix, controlador vfs |
| PostgreSQL | 17.11, imatge oficial Alpine fixada per digest |
| Supabase Auth | Imatge oficial GoTrue v2.197.0 |
| PostgREST | Imatge oficial 16.4, només esquema public exposat |
| Correu | Mailpit v1.31.3 local; cap enviament a persones reals |
| Node / navegador | Node 24.19.0, Chromium 154.0.8037.57 |
| CLI Supabase disponible | 2.121.0; la pila completa no s’ha pogut arrencar per espai |
| API / web | http://127.0.0.1:56321 / http://127.0.0.1:56380 |
| Projecte / xarxa | clubhoquei360-3a3-local / ch360_3a3_isolated, **Internal=true** |

Inventari remot: només el projecte productiu accessible i zero branques. No s’ha creat cap projecte extern, contractat servei o utilitzat clau productiva. Cap SQL remot durant 3A.3. El trànsit d’Auth i dades va exclusivament al gateway local i als contenidors marcats d’aquesta xarxa; l’administració SQL de preparació usa Docker exec local, no una connexió a Supabase remot.

La imatge completa Supabase PostgreSQL 17.11.0.004 va esgotar espai durant l’extracció vfs. S’han aturat els reintents, sense canviar controlador ni reiniciar el daemon. La solució provada és una **pila mínima real** amb PostgreSQL, GoTrue i PostgREST; no és `supabase start` complet ni una simulació del servidor. No inclou Studio, Realtime, Storage o Edge Functions.

`staging-safety.mjs` exigeix projecte i endpoints loopback exactes, rebutja el ref productiu, destinacions remotes i configuracions vinculades. Els executors verifiquen també etiquetes del contenidor i identitat de la base de dades. **3/3 proves de la guarda PASS**. La infraestructura genera secrets locals aleatoris; les connexions ordinàries no usen service_role. La clau anon local és una credencial d’infraestructura, no un JWT d’usuari simulat.

L’artefacte de revisió es crea només a work: substitueix els dos clients —app-client i el client propi d’historial— i serveix l’SDK localment. El generador rebutja qualsevol ref productiu restant abans de servir. No s’han modificat aquests fitxers de configuració a les fonts publicades. Chromium bloqueja qualsevol referència externa: les imatges sidgad.cloud es van avortar abans de sortir. Zero peticions al projecte productiu i zero pageerror.

## Comptes, esquema i dades

Vuit comptes ficticis reservats al domini .invalid: superadmin habilitat, coordinador principal, coordinador de secció, entrenador, delegat, operador temporal, ordinari sense autorització i usuari d’un segon club. Contrasenyes aleatòries úniques només a work privat, sense valors als informes. No invitacions ni credencials personals.

Els comptes s’han creat per signup de GoTrue i han obtingut sessions per password grant real. S’han comprovat `/auth/v1/user` i files persistides a `auth.sessions`. El navegador entra mitjançant el formulari Dashboard real; no s’injecten tokens a localStorage. PostgREST verifica la signatura i proporciona els claims a les funcions Auth estàndard; les proves no fan SET de claims per emular usuaris. La falsificació negativa d’un JWT és rebutjada i no equival a la identitat usada a la resta de proves.

L’esquema predecessor és **mínim, sintètic i explícitament de proves**, no un dump de producció. `auth.users`, sessions i les altres taules Auth són creades per les migracions natives de GoTrue. Les funcions de negoci i RLS de les sis migracions reals del repositori s’apliquen al PostgreSQL local; la política antiga rellevant de statistician reprodueix la branca auditada a 3A.2. Els rols de club s’assignen a UUID retornats per Auth, amb SQL administratiu de preparació local, no amb etiquetes JavaScript.

[Manifest de migracions i SHA256](evidence/staging-3a3-migrations.json): estadístiques, revisions de sessió, contextos Base, preparació d’alineacions, accés als modes i operadors temporals. No s’ha instal·lat la proposta de classificacions reals.

Dades esportives fictícies: dos clubs, temporada 2026/27 i set equips equivalents a Sènior OK Lliga, Sènior Tercera Catalana, Júnior Or, Juvenil, Infantil, FEM15 i un altre club. Contextos amb dates passades, resultat sintètic i FEM15 finalitzat localment; calendari RFEP futur sense context. Jugadors inventats identificats com a FICTICI. Les observacions de prova es registren per RPC d’usuari autenticat. No s’ha copiat cap acta, jugador o dada personal real. Els marcadors de procedència del contracte són sintètics, no dades federatives autèntiques.

## VERD — validació real superada

### Permisos amb sessions Auth reals

| Identitat / cas | Resultat observat |
|---|---|
| Delegat amb permís operatiu, sènior OK/Tercera i Júnior | Base i Avançat, també en navegador |
| Juvenil/Infantil ordinari | Base visible, Avançat denegat |
| Superadmin habilitat | Excepció Avançat inferior; deshabilitat no pot concedir |
| Coordinador principal | Excepció inferior i concessió del seu club; altre club denegat |
| Secció, entrenador, delegat | Sense excepció general inferior ni potestat de concessió |
| Operador temporal | Només partit i accions concedides; sense Base nou ni actes oficials |
| Ordinari i usuari d’un altre club | Partit del club A denegat; taules protegides sense files accessibles |
| Anònim / JWT amb signatura manipulada | Denegats per API real |
| user_metadata amb rol fals, signat de nou legítimament per Auth | No concedeix accés ni eleva privilegis |

### Nou blocs API/Auth/RLS

[Resultats sanejats](evidence/staging-3a3-api.json), executats per `staging-verify.mjs`:

1. Vuit identitats autenticades per GoTrue i `/user`, sessions reals persistides.
2. Modes per categoria i excepcions, amb consulta directa de RPC i taules.
3. Anònim, JWT manipulat i metadata editable no eleven privilegis.
4. Concessió restringida, club/equip erronis, camps de permisos manipulats, 24 h per defecte, 168 h exactes acceptades i 169 h denegades. Reutilitzar la mateixa petició no duplica i canviar-ne el contingut és denegat.
5. FEM15: equip i jugador, altres partits/accions denegats; inserció d’acta, jugadors i cronòmetre oficial denegada a l’extern.
6. Dues peticions HTTP paral·leles contra PostgreSQL real: mateixa mutació → una observació; correccions i sessions amb mateixa revisió → només una acceptada, l’altra 40001. No és una concurrència simulada de PGlite.
7. Revocació mentre el JWT d’Auth continua vàlid: noves operacions denegades; observacions i auditoria preservades.
8. Caducitat curta real amb el temps del servidor, sense canviar cap rellotge; Auth continua vàlid però RLS/RPC deneguen.
9. Regressió 3A.2 sota membre legacy statistician i JWT real: notes amb marca Base o gol camuflat denegades.

Les comparacions de l’acta i estat oficial abans/després són iguals. No s’ha emprat service_role per executar cap d’aquestes operacions ordinàries.

### Sis blocs Chromium amb Auth real

Frontend verificat a #32, [evidència de navegador](https://github.com/Dudisooft/clubhoquei360/blob/fix/match-mode-access/docs/evidence/staging-3a3-browser.json):

1. Login dels vuit comptes pel formulari Dashboard i verificació de la identitat real retornada per Auth.
2. Base/Avançat en sènior i Júnior; Base de Juvenil/Infantil; excepcions root/principal i URL manipulada denegada. S’espera la pantalla carregada, no només el text inicial.
3. Coordinador concedeix 24 h a FEM15 des del panell; extern selecciona el partit temporal, registra equip/jugador en vídeo, pausa/reprèn/recarrega i recupera dades; altre partit i acta denegats.
4. Revocació amb pàgina oberta: RPC denegat, UI bloquejada i nova recàrrega denegada; registres legítims conservats.
5. Caducitat curta via RPC del coordinador real, mentre la pàgina és oberta; servidor denega i la recàrrega no reobre el permís. No s’altera el rellotge.
6. RFEP futur: consulta amb zero contextos, activació explícita, una passada, recàrrega sobre el mateix context i activació repetida idempotent; zero incidències oficials creades.

Si es repeteix el recorregut futur, es prepara una altra fixture de calendari fictícia per no eliminar els resultats previs. Dins de cada escenari s’exigeix exactament un context per aquell UUID; repetir la comanda no el duplica.

### Recuperació i defecte corregit

El reinici va mostrar que el gateway conservava IP internes antigues. Corregit: resol cada destí a partir del contenidor local marcat a cada petició, sense repetir automàticament un POST.

[Prova de reinici](evidence/staging-3a3-restart.json): stop/start dels quatre contenidors, sense eliminar volums; vuit identitats i empremtes d’estadístiques, sessions i actes iguals. El JWT d’Auth anterior encara funciona i PostgREST continua denegant l’accés expirat després del canvi d’adreces. La incidència era de la infraestructura de proves, no una correcció funcional de producció.

### Regressions i commits verificats

- Servidor de staging: **4c5fa26c2451bc5d3f2b2beba1534a147191585a**. [CI 40657729410](https://github.com/Dudisooft/clubhoquei360/actions/runs/40657729410) success, logs comprovats: **191 Node / 47 Chromium**, inclosos els tres tests de guarda; check/build 35.
- Frontend de staging: **4b869114b76f85399d117c7192b4b429e296246c**. [CI 40657730299](https://github.com/Dudisooft/clubhoquei360/actions/runs/40657730299) success, logs comprovats: **158 Node / 67 Chromium**, check/build 38 i integració PGlite habitual.
- Les proves **reals** GoTrue/PostgreSQL/Chromium s’han executat **localment**, no dins d’aquests jobs CI. No es presenten els tests PGlite de CI com a Auth real.
- Cap canvi als fitxers JS/HTML/CSS de l’aplicació ni a les migracions de negoci en aquesta fase; les suites locals anteriors continuen vigents. Els canvis són eines de staging, fixtures i documentació. Les dues branques no s’han fusionat; la dependència funcional SQL continua sent 07504fd, i les eines reals de staging requereixen el checkpoint nou de #31.

## Reproducció segura

Requisits: dos checkouts de les PR exactes, Node, Docker local i Chromium; dependències amb lockfile. No configurar cap secret o URL productiu. Si work no existeix, els executors creen secrets locals nous; si existeix, no esborren dades per recrear-lo. Els fitxers privats de work no s’han de compartir ni versionar.

Al checkout servidor:

```sh
npm ci
node --test tests/staging-safety.test.mjs
node scripts/staging-runtime.mjs start
```

En un terminal separat, deixar el gateway executant-se:

```sh
node scripts/staging-api.mjs
```

Al primer terminal, preparar dades i executar les proves API:

```sh
node scripts/staging-provision.mjs
node scripts/staging-verify.mjs
```

Al checkout frontend, amb les dependències instal·lades i una ruta al checkout servidor, deixar el servidor web en un altre terminal:

```sh
npm ci
node scripts/staging-site.mjs ../clubhoquei360-mode-server
```

Executar les proves de navegador i després la recuperació (no simultàniament):

```sh
node scripts/verify-staging-auth.mjs ../clubhoquei360-mode-server
```

Des del checkout servidor:

```sh
node scripts/staging-restart-check.mjs
```

Aturar només el staging, preservant volums i observacions:

```sh
node scripts/staging-runtime.mjs stop
```

Aturar els processos gateway/web amb Ctrl+C als seus terminals. No usar docker system prune, eliminar volums o netejar el checkout per repetir proves. Una execució interrompuda s’investiga amb CODEX_PROGRESS i els logs privats; no copiar-ne claus als informes. La CLI completa `staging-local.mjs` queda com a intent alternatiu protegit, però **no** és el camí validat en aquest entorn vfs.

## TARONJA — límits i incidències

- Pila completa CLI bloquejada per espai; resolt l’objectiu Auth/RLS amb pila mínima oficial. No s’ha validat Studio, Storage, Edge Functions o Realtime. La UI mostra el seu estat de connexió i usa HTTP; no es simula una connexió en directe.
- Esquema predecessor de prova mínim, no una còpia completa 1:1 del projecte productiu. La instal·lació sobre el baseline productiu exacte i les funcionalitats fora de Partit mantenen la revisió de desplegament de 3A.2. No s’importen usuaris o dades personals per fer-ho.
- Correu local amb autoconfirm de prova: sessions Auth reals sí; verificació de possessió de bústia, lliurament SMTP extern, MFA/OAuth i recuperació de contrasenya productius **no provats**. No publicar aquesta configuració Auth de desenvolupament.
- Els cinc candidats sènior de classificació real pendents a 3A.2 continuen pendents. Les edats explícites de les fixtures només validen les regles, no certifiquen equips reals.
- No s’ha trobat cap defecte nou de les funcions/RLS de negoci als casos executats. Això no prova absència universal de vulnerabilitats ni autoritza producció.

## NEUTRE — pendent d’autorització o revisió

Revisar els resultats, el baseline i el procediment, completar l’evidència de classificacions reals i decidir la següent validació/desplegament controlat. No s’ha creat staging remot ni s’ha modificat configuració productiva. Els comptes ficticis només existeixen al PostgreSQL/Auth locals.

**VALIDACIÓ AUTH REAL: COMPLETADA EN STAGING LOCAL AÏLLAT.** Les PR continuen en esborrany, sense fusió ni desplegament; la publicació encara requereix revisió i autorització expressa.
