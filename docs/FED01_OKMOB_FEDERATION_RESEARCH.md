# FED-01 · Investigació pública d’OKMob i fonts federatives

Data de consulta: **01/11/2026 UTC**. Branca independent `research/federation-data-okmob`, worktree `/workspace/clubhoquei360-fed01`, base `e009f4df40d9ed353cb7d865beafed99d736892d`. Cap dependència del worktree de 3A.13. Cap importació, RPC, consulta SQL productiva, canvi de permisos, missatge o desplegament executat.

Etiquetes: **VERIFICAT** = evidència directa d’aquesta consulta o del document indicat; **PROBABLE** = inferència; **PENDENT** = no comprovat o requereix accés/autorització. Una afirmació d’un fabricant verifica què anuncia, no que funcioni en tots els partits.

## A. OKMob: allò observable i límits

Fonts originals: [web d’OKMob](https://okmob.app/) i [fitxa Google Play del creador](https://play.google.com/store/apps/details?id=app.okmob.mobile).

| Qüestió | Resultat FED-01 |
|---|---|
| Dades anunciades | **VERIFICAT com a declaració pública:** resultats, classificacions, calendari per equip, actes, alineacions i estadístiques de jugadors; cobertura catalana, estatal i internacional |
| Actualització | **VERIFICAT com a declaració de les novetats de Google Play:** marcadors, rellotge i resultats cada 30 segons. **PENDENT** mesurar-ho en un partit; no acredita polling federatiu del backend cada 30 segons |
| Fonts | La web atribueix dades als portals públics FECAPA/RFEP/World Skate Europe i declara independència dels organitzadors |
| Identitat/contacte | Google Play identifica Pol Valls i publica `polvalls9@gmail.com` |
| Relació equip–competició | El calendari per equip és anunciat; esquema de dades, claus i procediment de descoberta **PENDENTS** |
| Identificador de partit | **PENDENT:** no s’ha observat una correspondència entre URL interna d’OKMob i ID federatiu |
| Acta/alineacions | S’anuncia la consulta. **PENDENT** cobertura dels dos equips, titulars/porters i semàntica convocat/participant/plantilla en casos concrets |
| IDs individuals visibles | **PENDENT**, no inferits dels noms, dorsals ni perfils promocionals |
| Integració documentada/API reutilitzable | No localitzada en les pàgines/cerca consultades. No es conclou que no existeixi; no s’ha descobert ni consumit cap backend privat |

La web oberta directament per l’eina de recerca retorna un document sense línies llegibles; la cerca indexada sí n’exposa descripció. Google Play és llegible, incloses les novetats. No s’ha instal·lat l’app, inspeccionat un APK, interceptat trànsit ni utilitzat comptes/cookies personals. La publicitat de funcionalitats no prova una llicència de reutilització per a ClubHoquei360.

**PROBABLE:** una capa pròpia de normalització i memòria cau és coherent amb una app de diverses federacions. **PENDENT:** transport, cadència d’ingesta, arquitectura, permisos i infraestructura reals d’OKMob. No copiar ni dependre d’aquesta infraestructura.

## B. FECAPA i RFEP: fonts i mecanismes

| Aspecte | FECAPA | RFEP |
|---|---|---|
| Portal de competicions | https://www.hoqueipatins.fecapa.cat/ | https://www.hockeypatines.fep.es/ |
| Competició de referència | `/league/4786` Infantil; `/league/4806` FEM11, segons inventari versionat | `/league/3575` OK Liga Plata Sur |
| Estructura al connector existent | Temporada → competició → grup/fase → calendari → equips/partits; roster i acta separats | Mateixa família de fragments, amb espai d’identificadors RFEP separat |
| Format conegut | HTML/fragments i formularis; no API JSON documentada acreditada | HTML/fragments i formularis; no API JSON documentada acreditada |
| Transport al repositori | POST a `https://www.server2.sidgad.es/fecapa/…` | POST a `https://www.server2.sidgad.es/rfep/…` |
| Autenticació del connector legacy | No envia cookies personals ni login federatiu; envia Origin/Referer/X-Requested-With | Igual; això no acredita contracte d’accés autoritzat per a qualsevol ús |
| Accés nou FED-01 | Portal no accessible per eina web; shell falla abans d’arribar a origen | Mateix resultat; no s’ha recuperat una acta nova |
| Històric | Només les temporades explícitament exposades/importades es poden tractar; retenció completa **PENDENT** | Igual; no assumir persistència dels IDs entre temporades |
| Límits i condicions | No acreditats per aquest estudi; demanar freqüència, llicència, atribució, rivals i menors | Igual; aturar-se davant denegació, no canviar d’origen per esquivar-la |

**VERIFICAT al codi**, no descobert de nou a la xarxa: `supabase/functions/ihc-sync/index.ts`, `parse.ts`, `report-sync.ts`, `reports.ts`, `supabase/functions/federation-sync/index.ts` i [informe històric](federation-integration.md). Utilitzen aquestes famílies de recursos:

- Calendari: `{fed}_cal_idc_{competition}_1.php`; classificació: `{fed}_clasif_idc_{competition}_1.php`.
- Plantilles: `{fed}_stats_1_{competition}.php`, amb `tipo_stats=plantillas` (contrastat també al worker de #34).
- Resum/acta: `{fed}_gr_{match}_1.php`; formulari `idm=1`, `idc`, `idp`, `tab=tab_ficha_resumen`. El significat concret d’`idc` depèn del camí existent: no substituir grup per competició a cegues.
- Selectors interpretats pel parser: classes de fase/equip, atributs de jugador, taules per costat, camps de dorsal/porter/titular i incidències. Són convencions d’HTML, no contracte públic estable.

Aquesta enumeració descriu el sistema existent; **no és una llicència ni una ordre d’extracció**. No s’han executat POST experimentals sense poder confirmar l’accés aplicable. No s’ha buscat cap credencial ni intentat fabricar una sessió.

### Disponibilitat per tipus de dada

| Dada | Evidència existent | Qualificació actual |
|---|---|---|
| Clubs/equips/categories/grups | IDs i vincles al calendari/roster del connector; inventari propi de temporada | **VERIFICAT al repositori**; catàleg exhaustiu de tots els clubs **PENDENT** |
| Calendaris/horaris/resultats | Inventaris/importacions documentades; IDs propis de cada federació | **VERIFICAT com a antecedent**, no recuperació externa nova |
| Plantilla de temporada | Taules pròpies del roster; #33 amplia rivals sense crear equips gestionats | **PENDENT** cobertura completa de cada rival |
| Alineació/acta del partit | Parser separat de plantilla, dues taules de participants esperades | Capacitat tècnica **VERIFICADA al codi**; contingut actual dels tres casos **PENDENT** |
| Gols/targetes/faltes | Parser de totals i cronologia quan hi ha estructura publicada | No garantir cronologia ni zero quan falten camps |
| Assistències | Camp opcional previst pel parser | **PENDENT** si el proveïdor el publica per competició; no derivar d’un camp buit |
| Identificadors de jugadors | IDs federatius previstos al roster/acta | No universals ni equivalència FECAPA–RFEP demostrada |
| PDF/acta signada oficial | No acreditada una URL/exportació reutilitzable | **PENDENT**; el resum HTML no prova equivalència jurídica amb acta signada |

### Diagnòstic d’accés, sense confondre capes

1. **FED-01, observat el 01/11:** `git fetch origin` i `curl -I --max-time 8 https://okmob.app/` fallen amb `Failed to connect to proxy port 8080 after 0 ms: Could not connect to server` (curl codi 7). El proxy configurat és `http://proxy:8080`; política restringida, sense VPN. No hi ha resposta federativa ni error d’autenticació d’origen observable.
2. **3A.11, antecedent documentat del 31/10:** `CONNECT tunnel failed, response 403` d’Envoy abans de TLS, amb portals absents de la política. És una denegació de ruta de Codex, no prova de 403 federatiu.
3. **Ruta web de recerca:** portals/actes no accessibles o documents sense text; el visor no executa el recorregut interactiu complet. No substituir «Tornar a competicions» per un enrere del navegador ni declarar una sessió verificada.
4. **Backend productiu, antecedent 3A.11:** va consultar calendaris i va arribar al commit d’actes, però el run RFEP 3575 del 31/10 07:17 incloïa `permission denied for table federation_match_events`. No s’ha tornat a invocar ni modificat el backend en FED-01.

No es pot resoldre el punt 4 canviant el proxy, ni demostrar que la font no publica alineacions a partir del punt 1. No s’ha intentat eludir cap bloqueig.

## C. Playoff

Font original: [guia API de Playoff](https://playoffinformatica.helpscoutdocs.com/article/304-api), datada 10/09/2026; [Swagger Federacions](https://apifederacions.playoffinformatica.com/).

**VERIFICAT:** API REST per instància de federació, permisos segons perfil, login tècnic i token Bearer. La guia enumera clubs/equips/categories, competicions/calendaris/actes/resultats i altres recursos. Recomana permisos mínims i proves abans d’integrar. **PENDENT:** endpoints/camps concrets d’alineacions d’hoquei, tenant aplicable, autorització institucional, rivals, deltes, freqüència i condicions d’ús. No s’ha autenticat ni cridat cap operació de dades.

Swagger s’obre sense text llegible; una consulta del candidat `apiFederacions.yaml` és rebutjada pel visor com a `Unsupported content-type: binary/octet-stream`, no com a manca de permisos de Playoff. No s’ha tractat el Swagger de **Clubs** (`api.playoffinformatica.com`) com si fos Federacions.

Un [reglament oficial FCP de patinatge artístic](https://www.fcpatinatge.cat/wp-content/uploads/2025/11/Reglament-de-Lliure-FCP-2025-2026-1.pdf) esmenta inscripció a Playoff. **VERIFICAT com a indici institucional en una altra disciplina**, no prova que les actes d’hoquei SIDGAD siguin consultables a aquesta API. RFEP–Playoff no confirmat. Cal consulta a cada federació i al proveïdor; esborranys preparats, no enviats.

## D. Casos comparatius

| Cas | Identitat disponible | Antecedent documentat | Resultat nou FED-01 |
|---|---|---|---|
| SIMAR Igualada–Vic, 24/10/2026 | RFEP, temporada 41, competició 3575, partit 35559, equips 3697/3727 | 3A.9/3A.11: 1–1 i resum finalitzat, alineacions desades **0/0**; error INSERT de backend. Pilot antic amb ID RFEP nul diferent del registre canònic | **PENDENT** acta completa: ni jugadors del Vic, ni IDs individuals, ni alineacions, ni gols/targetes del partit recuperats ara |
| Infantil D Igualada–Alpicat A | FECAPA 4786, codi 152043 segons #33 | #33 documenta 8/8 alineacions emmagatzemades; no és una lectura nova ni un certificat general de disponibilitat | **PENDENT** contrast extern nou. L’URL candidata de fitxa i el portal no han estat accessibles |
| FEM11 Igualada–Barberà | Inventari versionat: FECAPA 4806, grup 5002, Igualada 12422 | Inventari confirma equip/competició, no determina unívocament l’acta d’aquest emparellament | **PENDENT** data, rival ID i partit ID. No s’ha triat una jornada arbitrària ni substituït per FEM15/temporada anterior |

En els tres casos cal distingir roster, convocatòria interna, llista oficial de l’acta, cinc inicial i participació efectiva. Aparèixer a l’acta no demostra minuts jugats. Diferències de durada/reglament base/femení no autoritzen a deduir camps no publicats. No es comparen cardinalitats assumides ni es fabriquen jugadors.

**Conclusió SIMAR–Vic:** la hipòtesi «no hi ha alineacions perquè el partit és futur» és incompatible amb l’antecedent finalitzat. La fallada de persistència està documentada; la disponibilitat i completitud actual de la font encara requereixen una recuperació autoritzada i accessible. #33/#34 són correccions necessàries del camí existent, no prova que l’acta completa ja s’hagi recuperat.

## E. Altres referències públiques

- [App oficial RFEP/SIDGAD](https://play.google.com/store/apps/details?hl=pt&id=com.sidgad.es.RFEP): el proveïdor anuncia calendari i resultats oficials; prova un canal institucional, no API externa per a clubs. [SIDGAD](https://www.sidgad.es/) retorna 502 al visor en aquesta consulta.
- [JOK.cat](https://jok.cat/): vista pública de competicions, marcadors i cerca equip/jugador. [hoquei.info](https://hoquei.info/): separació RFEP/FECAPA/Europa i partits. **VERIFICAT només el producte públic**, sense documentació d’integració reutilitzable localitzada. No se’n consumeix cap API ni es fa servir com a prova d’autorització.
- No s’han utilitzat agregadors de botigues com a evidència tècnica ni s’han copiat dades personals de menors a fixtures.

## F. Registre de fonts i procedència

Totes les URLs següents consultades o intentades el **01/11/2026 UTC**; la data del document original pot ser anterior. «No accessible» descriu aquesta eina, no estat universal del lloc.

| URL | Via / resultat |
|---|---|
| https://okmob.app/ | Web directa sense línies, cerca indexada llegible; shell proxy codi 7 |
| https://play.google.com/store/apps/details?id=app.okmob.mobile | Lectura directa: descripció/novetats/contacte |
| https://okmob.app/legal/privacitat | Enllaç de Play; document sense línies; no condicions d’extracció verificades |
| https://www.hoqueipatins.fecapa.cat/ i /league/4786 | Eina web no accessible |
| https://hockeypatines.fep.es/ i /league/3575 | Eina web no accessible |
| https://www.hockeypatines.fep.es/game/35559 | URL candidata intentada, no accessible; NO ruta de fitxa confirmada |
| https://www.hoqueipatins.fecapa.cat/game/152043 | URL candidata intentada, no accessible; NO ruta de fitxa confirmada |
| https://www.server2.sidgad.es/rfep/rfep_gr_35559_1.php | GET del visor no accessible; NO equivalent al POST existent |
| https://apifederacions.playoffinformatica.com/ | Swagger sense línies |
| https://apifederacions.playoffinformatica.com/apiFederacions.yaml | Visor rebutja tipus binari; esquema no validat |
| https://playoffinformatica.helpscoutdocs.com/article/304-api | Guia llegida, actualització 10/09/2026 |
| https://www.fcpatinatge.cat/wp-content/uploads/2025/11/Reglament-de-Lliure-FCP-2025-2026-1.pdf | Fragment indexat oficial; indici Playoff en patinatge artístic |
| https://www.sidgad.es/ | 502 al visor |
| https://play.google.com/store/apps/details?hl=pt&id=com.sidgad.es.RFEP | Fitxa indexada llegible del proveïdor |
| https://jok.cat/ i https://hoquei.info/ | Lectura pública, sense contracte d’API |
| https://fep.es/federacion/contacto | 502 al visor; contacte institucional reutilitzat amb data de 3A.11 |

Antecedents consultats per connector GitHub, sense barrejar-los amb noves proves externes:

- [PR #33](https://github.com/Dudisooft/clubhoquei360/pull/33), head `1b839218704bf791313bdd3f78fd5b0b8865ab0b`.
- [PR #34](https://github.com/Dudisooft/clubhoquei360/pull/34), head `c7e987946a693dfd58f86650978f3cc4e9d7d9bf`, apilada sobre auditoria 3A.9.
- [3A.9](https://github.com/Dudisooft/clubhoquei360/blob/audit/production-preflight-vic-3a9/docs/PHASE_3A9_PRODUCTION_PREFLIGHT_AND_VIC_TEST.md), [3A.10](https://github.com/Dudisooft/clubhoquei360/blob/c7e987946a693dfd58f86650978f3cc4e9d7d9bf/docs/PHASE_3A10_FEDERATION_AUTOMATION_AND_WHATSAPP.md), [3A.11](https://github.com/Dudisooft/clubhoquei360/blob/audit/integration-release-3a11/docs/PHASE_3A11_FEDERATION_ACCESS_RESEARCH.md) i registres CODEX_PROGRESS de main i d’aquestes branques. 3A.13 no modificada.

## Conclusions i següent pas

**VERIFICAT:** oferta pública d’OKMob, API de proveïdor Playoff, mecanisme HTML dels connectors existents, antecedent d’error INSERT i restriccions diferents entre executor i backend. **PROBABLE:** normalització/caché per suportar múltiples federacions. **PENDENT:** via institucional d’accés sostingut i les dues alineacions 35559.

La millor opció és conservar la cua i la persistència segura de #33/#34 i substituir el transport per un adaptador suportat quan es confirmi. Mentrestant, només contracte experimental amb dades sintètiques: no hi ha importació real validada FED-01. Ser públic no equival a llicència de reutilització automatitzada, especialment de menors; obtenir condicions abans d’activar un nou connector.
