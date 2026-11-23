# Consolidació definitiva · recuperació verificable

02/11/2026. Branca release/official-integration-20261102; punt de partida dcb2d67, PR #35 en esborrany. No hi ha fusions, desplegaments, migracions ni escriptures productives en aquesta execució.

## Pilot local

El repositori Windows C:\Projects\ClubHoquei360 no és accessible des d'aquest executor Linux. /mnt i /media no contenen el portàtil; l'entorn no té VPN ni connexió TCP privada configurades. La cerca als objectes Git dels checkouts accessibles no troba 7baf003b7e44144e8097f81c563fc82f29d3d780; la branca feat/functional-pilots-20261102 continua absent de les referències remotes. No s'ha recuperat cap codi posterior del pilot. Això és un bloqueig d'accés a la font, no una prova que el codi no existeixi al portàtil.

Els adjunts anteriors ja examinats no són un bundle Git ni un patch de codi. Descriuen un laboratori exclòs del build de l'aplicació, amb consulta RFEP, importació de document FECAPA, IndexedDB/PGlite i dades fictícies per al registre tècnic. Les 10+10 de Vic es comuniquen com a dades d'acta consultades; no s'ha rebut la resposta original ni el connector per verificar-les. No s'afirma que siguin fixtures ni es certifica que siguin dades oficials persistides.

| Capa | Estat verificable |
| --- | --- |
| Consulta RFEP del laboratori | 10+10 comunicats; resposta i codi no accessibles |
| Memòria cau del portàtil | Contingut/actualitat no inspeccionables |
| Registre tècnic del laboratori | Informe declara dades fictícies i persistència local, no Auth productiu |
| Supabase productiu 35559 | Resum 1–1 verificat, 0 alineacions locals, 0 visitants |
| Font de pilot RFEP 35559 | Cap vinculació a federation_match_sources |
| Fixture de regressió Vic | 20 files FICTÍCIES, només valida la interfície; no són una acta recuperada |
| Noia futur | Candidates comunicades, no alineació oficial; registre canònic encara absent a la lectura anterior |

La diferència demostrada és de persistència i vinculació: el laboratori no va publicar/escriure a Supabase, i la font antiga no selecciona un partit sense font vinculada. No es pot atribuir l'origen exacte de les 10+10 a consulta en viu o cache sense la font original. El defecte de permisos de federation_match_events documentat a #33 continua sent una dependència separada; no demostra per si sol per què el pilot local tenia participants.

## Connector de Work recuperat i contrastat

Supabase retorna federation-sync **ACTIVE, versió 6**. S'ha descarregat el codi mitjançant una operació de lectura i comparat byte a byte: index.ts, parser.ts i fem15.ts són idèntics tant a main com a la PR #35. SHA i resultat a evidence/consolidation-20261102-deployed-source.json. No s'ha creat un nou connector ni desplegat el recuperat.

Historial Git disponible: 43d8f44, 14/10, importadors RFEP/FECAPA; 02c32cd, 15/10, ampliació FEM15. La consulta de plataforma proporciona el bundle vigent, no s'han recuperat tots els bundles de versions anteriors. verify_jwt=false al gateway no implica accés anònim: el codi fa db.auth.getUser i verifica operador o token de planificador al servidor. No s'han llegit valors de secrets ni invocat l'endpoint de sincronització, perquè pot escriure.

| Partit | Jugadors pilot persistits | Snapshot oficial persistit | Alineació canònica | Importacions reeixides |
| --- | --- | --- | --- | --- |
| RFEP 35529 | 20 | 20 | 20 | 11, última 27/10/2026 |
| RFEP 35537 | 19 | 19 | 19 | 17, última 26/10/2026 |
| FECAPA 152027 | 16 | 16 | 16 | 6, última 23/10/2026 |

Això acredita importació real anterior i dades encara persistides. No és una nova verificació del portal avui ni una execució actual del connector. Només s'han consultat recomptes, estats, dates i codis; no s'han exportat noms de jugadors, inclosos menors. Els dos errors inicials RFEP de 13/10 consten abans dels èxits; no s'han atribuït a un 403 ni a permisos sense evidència.

Els registres de plataforma de les darreres 24 hores mostren una entrada que esmenta federation-sync; no es dedueix èxit esportiu només d'aquesta entrada. federation_sync_runs conserva l'historial anterior. Es manté un cron preexistent ihc-sync actiu a minut17 de cada hora; automatic_enabled=false en les tres fonts de pilot consultades. No s'ha activat/desactivat cap tasca i no cal crear-ne una de duplicada.

## Reutilització i límits

- federation-sync existent: transport HTML públic SIDGAD amb Origin/Referer de portal, parseig d'acta/calendari/classificació i validació d'identitat; fonts operatives verificades i cache de sis hores. No és una API pública documentada ni una llicència oberta de reutilització. La branca conserva el connector, no el reemplaça.
- sync-team de la versió6 té abast FEM15 4802/12419 configurat. No s'ha presentat aquesta via específica com un connector multiclub general. La cua per abast de #34 i ihc-sync cobreixen altres funcions; cal adaptar el transport legítim recuperat quan sigui disponible, sense duplicar motors.
- La consulta de només lectura de l'aplicació és diferent d'invocar federation-sync: aquesta última pot escriure cache, snapshots i registres de sincronització a la base pròpia. No s'ha invocat sota l'autorització actual de només lectura productiva. Cap via escriu a bases federatives.
- Els bloquejos CONNECT403 de l'executor no acrediten un rebuig de l'origen federatiu. La investigació prèvia d'OKMob, Hoqueicat i hockeyapp es conserva: hi ha contingut públic complementari, no API/llicència de reutilització acreditades. No s'han repetit cerques ni eludit restriccions.
- Estadístiques pròpies i correccions d'operador continuen separades de snapshots federatius, alineacions canòniques, cache i candidats futurs. No s'han fusionat identitats o activat partits obrint una pantalla.

## Regressions i publicació

S'han afegit dues proves a tests/match-provenance.test.mjs: canvi successiu entre sis equips de dos clubs amb lectures pendents/denegades, i snapshots/cache/candidats amb20 jugadors que no certifiquen una alineació no desada. Tot és fictici, sense copiar les alineacions productives.

Les 17 proves afectades de procedència/parser/selecció han passat. La bateria completa Node ha passat amb **235 proves,0fallades/omissions**. La suite Chromium 78 PASS, els nou blocs Auth/API i els sis de navegador del codi dcb2d67 continuen vàlids: aquest bloc no canvia codi executable, esquema o permisos. GitHub executa de nou les suites de la PR. No es declara una nova prova física entre dispositius.

Es conserven 36 equips/38 inscripcions, selecció jeràrquica, Base/Avançat, convocatòries, estadístiques, permisos i mecanismes existents de sincronització. SIMAR–Vic/Noia continuen casos de regressió ficticis on falten dades reals. No es declara completada la preparació esportiva real dels dos partits.

Bloquejos de publicació vigents: font local no accessible; alineació Vic no verificada ni persistida; backup productiu recuperable no acreditat; 49 concessions TRUNCATE, dos defaults postgres i set migracions pendents. Cap d'aquests s'ha resolt amb una escriptura productiva. Pròxima acció: recuperar l'objecte Git i el codi posterior del portàtil quan hi hagi accés efectiu o referència remota; comparar-lo amb el connector v6 ja conservat i integrar només les parts verificades en aquesta mateixa aplicació.
