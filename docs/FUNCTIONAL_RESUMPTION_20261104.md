# Represa funcional · 04/11/2026 (Europe/Madrid)

## Estat recuperat i límits

Branca de desenvolupament `fix/real-match-workflows-20261104`, basada en el head verificat de la [PR #35](https://github.com/Dudisooft/clubhoquei360/pull/35), `3ba0775381faa1aae6b7bb43f1aacf0f778ebfb2`. `main` remot: `e009f4df40d9ed353cb7d865beafed99d736892d`. PR #35 oberta, en esborrany, sense fusionar; CI del head: [41631191336, success](https://github.com/Dudisooft/clubhoquei360/actions/runs/41631191336), 265 Node, 83 Chromium i integracions RFEP/FEM15. Metadades reconsultades en aquesta execució; no s'ha suposat que el pilot estigui publicat.

La nova PR s'apila sobre la branca de #35, no sobre `main`: només revisa les correccions d'aquesta represa. Les PR #31–#34 ja formen part de la integració #35. Les PR antigues pendents de provisionals/invitacions no s'incorporen. Ni el worktree brut de la recuperació anterior ni la branca d'operacions de backup s'han sobreescrit.

Es conserva l'aplicació original estàtica, Supabase, StatsStore/outbox/Realtime, connectors existents, permisos de servidor, autoritzacions temporals, convocatòries i elegibilitat. Cap frontend alternatiu, esquema nou, migració o servei nou.

## Incidències reproduïdes i correccions

| Incidència | Evidència i canvi | Límit |
|---|---|---|
| Mode preseleccionat | `partit.html` començava en Avançat; el JS canviava automàticament a Base. Ara hi ha opció buida, elecció explícita i neteja del mode en canviar temporada/competició/equip/partit. S'ignora la pista `?mode=base` del selector. | Els enllaços directes a un partit continuen sotmesos al servidor. No s'atorguen permisos. |
| Consulta sense mode vàlid | El preview interpretava qualsevol valor desconegut com Avançat. Ara exigeix `base` o `advanced` abans de consultar o activar. | No modifica l'autorització RPC/RLS. |
| Partit acabat s'obria com a directe | Selector i consulta comparteixen el mateix constructor d'enllaç. En Avançat, un resultat numèric publicat, data passada i acta verificada amb estat finalitzat ofereixen `analysis=video&view=stats`. | Marcador en directe, data passada sola, estat desconegut o «NO FINALIZAT» no acrediten finalització. Una sessió directa ja existent no és substituïda automàticament: es conserva la protecció anterior del cronòmetre. |
| Participant d'acta classificat com reforç sense evidència | Fixture reproduït abans de corregir: `reinforcement:!primary` era cert per manca d'habitualitat, encara que no hi hagués categoria inferior acreditada. Ara exigeix evidència positiva de categoria inferior. | Una acta actual acredita participació en aquell partit, no inscripció habitual ni elegibilitat futura. |
| Etiqueta antiga de reforç enganxada | La fusió feia OR amb l'etiqueta anterior. El scope verificat actual pot netejar-la i actualitza la procedència, preservant UUID. | Les convocatòries històriques confirmades preserven les seves captures i incidències. Les candidates no verificades continuen bloquejades. |
| Porter oficial mostrava posició de pista | Reproduït amb acta que indica is_goalkeeper=true i catàleg auxiliar sense rol. Preval la posició de l’acta; la fusió actualitza la vista amb la mateixa identitat. | No canvia jugadors, convocatòries ni incidències persistides. |
| Avís FECAPA en una consulta RFEP | L'avís identifica el catàleg federatiu accessible de la competició, sense atribuir-lo sempre a FECAPA. | No s'ha canviat cap importador. |

## Dades reals consultades, exclusivament en lectura

Consultes SQL limitades a identificadors esportius, data/resultat/estat/fetched_at i recomptes per costat; no s'han extret noms ni dades personals de jugadors ni exportat bases productives. Lectura UTC 03/11/2026 al vespre (04/11 local). No es tracta d'una validació de la UI amb el compte real de l'usuari.

| Cas | Observació productiva actual | Conclusió |
|---|---|---|
| SIMAR–Vic, RFEP 35559 | 24/10/2026 18:30 UTC, 1–1; report_status verified, resum finalitzat; alineacions **0/0**. | Continua bloquejada la prova real amb alineacions oficials. L'evidència recuperada de 10+10 consultats al portàtil no equival a persistència productiva. No s'ha executat cap importació. |
| Infantil D–Alpicat A, FECAPA 152043 | 24/10/2026 16:15 UTC, 3–1, acta finalitzada; alineacions **8/8** desades. | La manca de dades productives no és la mateixa que al Vic. El pont catàleg/context, els permisos del compte i la versió publicada s'han de validar autenticadament. Regressió local amb forma 8+8 i identitats sintètiques; no es declara resolt el cas real. |
| FEM11 | Catàleg de l'equip exacte: 158673, Voltregà–IHC, 01/11, 4–4, 6/8; fonts actualitzades 03/11. | Es verifica activitat actual del catàleg, no la resolució del llistat excessiu del compte real. El cas Barberà es valida funcionalment amb fixture explícitament fictici, sense extrapolar una acta real. |
| Júnior A | 150982, IHC A–Girona, 30/10, 11–0, 9/6; 150978, Barça–IHC A, 28/10, 8–4, 9/9; fetched_at 03/11. | Ja hi ha actualització al backend. El defecte històric d'importació no es pot donar per vigent a partir de l'informe antic; manca reproducció de la pantalla amb el compte afectat. |
| SIMAR habituals | Sense auditoria de dades personals d'inscripció en aquesta represa. | Causa de classificació corregida i provada genèricament; els habituals reals no es certifiquen per coincidència de nom, acta puntual o fixture. |

## Connectors i persistència

Es reutilitzen `federation-sync` v6, adaptador públic RFEP/FECAPA recuperat, cua i importació additiva de #33/#34. No es crea un connector paral·lel, no s'invoca la funció productiva (pot escriure memòria cau, fonts i registres) i no es reactiva cap planificador. Les limitacions CONNECT 403 documentades continuen pendents de nova evidència; aquesta execució no ha esquivat ni revalidat l'accés als portals. Una plantilla general no es presenta com alineació de partit.

No hi ha canvis de SQL, RLS, funcions Edge, estadístiques persistides o sistema de sincronització. Les proves de persistència, revocació, permisos i separació oficial/estadística de les suites existents continuen formant part de la regressió. PostgreSQL/PGlite i transport Auth fictici dels tests no són una nova validació de Supabase Auth Cloud amb comptes reals.

## Proves i evidències

**Passada final: 277 Node i 86 Chromium superades, zero fallades i zero omissions; comprovació estàtica i build GitHub Pages superats (43 fitxers).** Logs locals fora de Git: `/tmp/club-functional-node-final.log`, `/tmp/club-functional-browser-final.log`. Primera passada: 268 Node pass; Chromium 77 pass/9 fail. Vuit fallades corresponien al helper que seleccionava una opció `disabled` a través de `isEnabled()` i una a l'ampliació del contracte de finalització durant la passada. Helper corregit perquè consulti la propietat DOM disabled; fixture finalitzat completat. La passada final completa ha superat tots els casos amb aquests ajustos; no queden fallades locals obertes.

Proves dirigides addicionals: 28 Node pass al primer bloc; 13 de catàleg pass (FECAPA/RFEP, sènior/júnior/FEM11/infantil), 7 d'identitats de catàleg/navegació pass. Inclouen 8+8 sintètics, deduplicació, propietat d'equip, candidats bloquejats i dades originals immutables. La mostra de 30 equips de base i els descriptors del catàleg es mantenen; no s'han inventat equips reals. Els casos sènior/júnior, excepcions/denegació per URL, FEM15, mòbil/tauleta/sobretaula i WhatsApp es cobreixen a les suites existents.

## Validació visual sense publicar

Amb el servidor local de proves (dades fictícies), executar `npm run test:browser`; `tests/browser/navigation.spec.mjs` i `match-modes.spec.mjs` reprodueixen el selector. Dashboard → Partit → temporada → competició/categoria → equip → partit: cap enllaç d'obertura fins a escollir mode. Canviar qualsevol nivell esborra el mode i les seleccions incompatibles. Un futur autoritzat es consulta sense crear context; l'activació és una acció separada. Un finalitzat verificat ofereix l'anàlisi en diferit de la mateixa identitat. Provar 390, 820 i 1440 px. Les captures Base s'escriuen a `work/`, ignorat per Git.

Això no publica un entorn accessible des dels dispositius de l'usuari ni acredita sincronització real entre els seus dispositius. La prova real prèvia comunicada per l'usuari es conserva com a antecedent, sense presentar-la com nova validació d'aquest commit.

## Bloquejos i autoritzacions

Publicació ajornada: backup productiu recuperable no acreditat, 49 concessions TRUNCATE i dos defaults pendents de correcció autoritzada; set migracions i dependències de servidor/Edge pendents. Les classificacions administratives i els permisos productius no s'han substituït per labels del navegador. Requereixen revisió, preflight vigent i autorització separada abans d'aplicar-se.

Pendents: revisió de la nova PR sobre #35; recuperació oficial i reconciliació autoritzada Vic; validació autenticada dels comptes/plantilles reals; backup recuperable i pla d'intervenció; aprovació abans de fusionar/publicar. Zero fusions, desplegaments, exports, imports, canvis de comptes, migracions o permisos productius en aquesta fase.

## Checkpoint i CI

Codi final validat i pujat: [8d9737ab24cb9dc04c20e9e1ea65e44fec395909](https://github.com/Dudisooft/clubhoquei360/commit/8d9737ab24cb9dc04c20e9e1ea65e44fec395909). [PR #36 en esborrany](https://github.com/Dudisooft/clubhoquei360/pull/36), base #35. [CI del codi 41743324168](https://github.com/Dudisooft/clubhoquei360/actions/runs/41743324168) en curs en aquest checkpoint: consultar el resultat final a la PR; la CI anterior de #35 no es presenta com prova del codi nou. Evidència minimitzada: `docs/evidence/functional-resumption-20261104.json`; hashes dels fitxers funcionals i tests associats, sense secrets ni dades de jugadors.

Integracions conjuntes locals addicionals PASS amb les migracions versionades: RFEP futur → consulta sense escriptures → activació explícita → estadística → recàrrega, un context/un membre/un esdeveniment i zero incidències oficials; FEM15 → concessió limitada → vídeo equip/jugador → pausa/recàrrega → denegació d'altre partit i acta → revocació/caducitat, dues estadístiques conservades, zero membres externs generals, assignacions prèvies preservades. S'han executat `verify-match-mode-integration.mjs` i `verify-temporary-integration.mjs` amb PostgreSQL/PGlite i Chromium, identitats fictícies i JWT de test; no són Supabase Auth real. Logs locals `/tmp/club-functional-mode-integration.log` i `/tmp/club-functional-temporary-integration.log`. El checkpoint f96c870 només afegia documentació/evidència; el bloc posterior de porters es detalla a continuació.

## Tancament del bloc de porters

Regressió reproduïda abans de corregir: esperat goalkeeper, rebut field. Correcció de prioritat de font i fusió per identitat; 32 proves dirigides superades, seguides de **277 Node / 86 Chromium / check/build43 PASS**, zero fallades/omissions. Logs finals: `/tmp/club-functional-node-keeper-final.log` i `/tmp/club-functional-browser-keeper-final.log`. Proves de preparació dels dos cincs inicials, convocatòries històriques, persistència, permisos i diferit incloses. Els hashes de l’evidència corresponen a aquest arbre final.

Lectura agregada productiva addicional: temporada2026/27, **36equips i38inscripcions vinculades**, sense extreure jugadors. Cap mutació. Les CI dels checkpoints8d9737a ([41743324168](https://github.com/Dudisooft/clubhoquei360/actions/runs/41743324168)) i f96c870 ([41743494974](https://github.com/Dudisooft/clubhoquei360/actions/runs/41743494974)) són success. No es presenten com a CI del canvi posterior de porters: consultar els checks del nou head de [PR#36](https://github.com/Dudisooft/clubhoquei360/pull/36). No s’ha canviat el codi SQL/Auth ni els connectors.
