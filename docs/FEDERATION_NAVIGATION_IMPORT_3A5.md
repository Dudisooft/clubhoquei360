# Informe B · Navegació federativa i importació segura · 3A.5

28/10/2026. Branca independent `fix/federation-roster-import-safety`, base main `e009f4d`, sense incorporar #31/#32 o altres PR pendents. Classificacions a #31 i documentació de modes a #32; no es fusionen. Cap operació mutativa a producció.

## 1. Evidència de navegació i límits

| Aspecte | RFEP | FECAPA | Tipus d’evidència |
|---|---|---|---|
| Pàgina inicial | www.hockeypatines.fep.es | www.hoqueipatins.fecapa.cat | Eina web: carcassa/menu, no navegador interactiu complet |
| Temporada | menú 2026/27 disponible | menú 2026/27 disponible | Control visible; selecció dinàmica no reproduïda |
| Competicions / grups | usuari ha seleccionat OK Lliga i Plata Sud | usuari ha seleccionat Nacional, Segona i Tercera A/B | Comunicació d’usuari; no captures examinades |
| Equip / pestanyes | escut, calendari i plantilla comunicats | escut, calendari i plantilla comunicats | Contingut de les pestanyes no inspeccionat en directe |
| Retorn propi | «VOLVER A COMPETICIONES» visible | «TORNAR A COMPETICIONS» visible | L’etiqueta existeix; JS, invalidació d’estat i cookies no determinats |

No s’ha utilitzat `page.goBack()` ni declarat equivalent al retorn propi. No s’ha afirmat haver completat la seqüència real, comprovat cookies, tokens o estat de sessió. La carcassa RFEP inclou un peu 2016/17 malgrat el menú de temporades: no serveix com a prova de la temporada seleccionada.

L’executor obté **CONNECT 403 durant el túnel del proxy** per als dos portals i SIDGAD. Política 140 vigent restringida, aquests dominis fora de la llista efectiva. No s’ha rebut una resposta útil de l’origen federatiu: no s’atribueix el resultat a un CAPTCHA, autenticació federativa, cookies o capçaleres. L’eina web separada només recupera la carcassa. Cap bypass, canvi de proxy, intent de login o augment de freqüència de consultes.

## 2. Accés utilitzat pels importadors

El codi existent usa POST de fragments HTML de SIDGAD, no un SDK/API JSON oficial documentat. Documentació històrica del repositori descriu calendaris/actes recuperats en fases prèvies, però no prova una sessió actual. Contractes implementats:

- llistat `{fed}_ls_1.php`, `temp=41`;
- calendari `{fed}_cal_idc_{competicio}_1.php`, `idc`;
- plantilla/estadístiques `{fed}_stats_1_{competicio}.php`, `idc`, `tipo_stats=plantillas`;
- acta `{fed}_gr_{partit}_1.php`, `idm=1`, `idc` (grup en l’importador general), `idp`, `tab=tab_ficha_resumen`.

Els importadors no mantenen una sessió de navegador ni fan clic a escuts. No se n’ha trobat una especificació pública que acrediti estabilitat o si una sessió és imprescindible avui. Les rutes directes funcionaven segons evidència històrica; la seva accessibilitat actual des d’aquest entorn és pendent. No s’imposa la navegació seqüencial a l’API sense prova.

`fetchOfficialHtml` centralitza només el transport existent de `ihc-sync`, conserva origen/referer normals, timeout 25 s, mida màxima i absència de cookies privades; no repeteix automàticament POST. Valida federació, recurs i coherència d’ID de competició de la petició de plantilla. Proves amb fetch fictici demostren canvis d’àmbit de petició, no el comportament intern dels portals.

## 3. Defectes demostrats i correccions

### Respostes errònies, incompletes i identitats

Reproducció RED sobre main: HTML de manteniment es convertia en `not_published`; un cos d’un altre equip deixava també aquest estat; files amb dos teamid no eren rebutjades; una acta amb participants d’un sol costat es podia donar per verificada. Correccions: rebutjar resposta sense estructura de plantilla, identitat ambigua i acta unilateral; validar l’ID de cada jugador contra la classe de l’equip. Si falta un equip dins d’una resposta de competició, és `response_incomplete`, no buit oficial.

| Estat | Tractament actual |
|---|---|
| Plantilla recuperada | `published`, només identitats explícites; completesa no certificada |
| Oficialment buida | No inferida d’una llista buida. Falta evidència d’un marcador oficial del portal |
| Encara no publicada | No inferida d’HTML buit/erroni. Falta un senyal oficial inequívoc |
| Error de navegació / carcassa | Rebuig del parser, sense escriptura de la resposta |
| Connexió / timeout / cos interromput | `connection_error`, sense substitució de plantilla |
| HTTP 401/403 | `permission_error` amb codi, sense atribuir-ne l’origen/causa |
| Resposta incompleta | `response_incomplete`, preservació de dades anteriors |
| Equip no identificat | Rebuig abans de guardar si no hi ha IDs/font suficients |
| Identitat ambigua | Rebuig; no conciliació per coincidència de nom |

Els marcadors oficials de buit/no publicat no s’han inventat. Aquest reconeixement exacte continua pendent d’una resposta real accessible. Una absència continua sent dada desconeguda, no zero jugadors.

### Persistència parcial

`federation_commit_ihc` desactivava tota la plantilla anterior abans de reintroduir el subconjunt rebut. Ara la refrescada és **additiva**: no desactiva ni elimina absents, no esborra incidències o estadístiques i conserva IDs/dorsals coneguts quan no n’hi ha de nous. Un únic jugador observat no demostra la baixa dels altres. Identitats deterministes, ON CONFLICT i bloqueig de transacció existent prevenen duplicats.

### Resum diferent d’alineació persistida

`enrichFromReport` marcava `report_status=verified` abans de la transacció completa de participants/incidències. Ara només escriu `report_summary_status`. El resum no certifica ni degrada una alineació prèviament desada. Només la transacció oficial completa confirma `report_status`. Errors de resum, plantilla incompleta o actes fallides donen importació `partial`, no `success`, i no alimenten la memòria cau d’èxits de 18 hores.

### Permís tècnic d’importació d’incidències

Consulta de només lectura: service_role té INSERT a alineacions però **no** a `federation_match_events`; authenticated tampoc té INSERT a incidències federatives. Reproducció local amb `federation_commit_official_report` real: falta d’INSERT a incidències desfà també les dues alineacions per atomicitat. Proposta de reparació: SELECT/INSERT **només al backend service_role**, sense UPDATE/DELETE nous ni permís client/RLS més ampli. No aplicada a producció. Després de la concessió local, repetir importa dues alineacions i una incidència una sola vegada.

### Rivals sense convertir-los en equips del club

L’importador general només preparava les plantilles dels equips propis; el rival depenia d’una acta de partit. Ara prepara també rivals que comparteixen un partit directe verificat amb el club al calendari recuperat. Identitat per federació/temporada/competició/grup/club extern/equip extern, no per costat ni nom. Les files s’extreuen només pel seu `teamid`, amb coherència de nom/club entre partits. El dorsal i la posició desconeguts continuen desconeguts.

El rival és una `federation_team_entries` de la competició amb `club_team_id=null`, **no** un nou equip gestionat, club, compte o membre. Es vincula al costat del partit segons els IDs del calendari. No es creen convocatòries ni titulars. Es conserva la separació de plantilla, acta d’un partit, habitualitat i reforços de #29/#30. No hi ha peticions addicionals per rival: s’aprofita el fragment de plantilla de competició ja descarregat. Si el fragment no conté el rival, no se n’inventa cap jugador.

`basic-roster.js` filtrava identitats per FECAPA fins i tot en competicions RFEP. Reproduït sobre la versió de main amb rival fictici RFEP: ID nul i selecció bloquejada; després, ID correcte i seleccionable. Ara fa servir la federació de la competició verificada, també en el lookup de font i persones. Les regles d’elegibilitat/habitualitat no canvien.

## 4. Incidències històriques: causes diferenciades

Consulta agregada sense dades personals a [evidència de només lectura](evidence/federation-3a5-readonly.json).

| Cas | Observació actual | Diagnòstic / pendent |
|---|---|---|
| Infantil D – Alpicat A | FECAPA 152043; 8 locals/8 visitants a alineacions | No és avui manca de dades al catàleg. No s’ha reproduït la sessió real que els ocultava; correcció històrica PR #18 documentada. Cal validació visual autenticada si persisteix |
| SIMAR – Vic | RFEP 35559, 3697–3727; resum verified però 0/0 alineacions | Contradicció reproduïble pel resum prematur i transacció amb permís d’incidències absent. Proposta local resolta; falta reimportació real autoritzada i accessible |
| Igualada B – Valls | Tercera 4781 en ambdós sentits, sense codi/alineació; Juvenil 4784 té un altre partit 151311 amb 8/8 | Cas ambigu si només s’indica nom. No s’assumeix quin és; rival sense acta ara pot usar plantilla publicada de competició, pendent de dades accessibles |
| Infantil D – Oxford Salt A | FECAPA 152035, 8 locals/7 visitants importats | No és avui absència d’alineació. Sessió/permís/visualització del dispositiu no reproduïts en producció |
| Júnior Or – «Shum Alella» | Catàleg: **SHUM ALEA**, rival de Júnior B a 4782; tornada 151026 | No es corregeix el nom per intuïció. Habitualitat/reforços és una qüestió diferent; es mantenen #29/#30 i les regressions de tots els equips, sense convertir participants ocasionals en habituals |

Les consultes no han llegit noms de jugadors, dates de naixement o credencials. Les proves locals usen només jugadors ficticis, no actes reals copiades.

Comparació productiva READ ONLY: **20/23 empremtes iguals**. Tres conjunts de catàleg (federation_matches, federation_team_entries, federation_team_roster) han canviat durant la fase, amb recomptes iguals 558/38/939. No s’atribueix la causa sense evidència ni s’afirma que tot producció s’hagi mantingut immutable; actes operatives, estadístiques, sessions, permisos, equips i comptes entre els conjunts auditats són iguals. Cap ordre mutativa productiva executada. L’inventari propi continua 36 equips/38 inscripcions. Evidència federation-3a5-preservation.json.

## 5. Migració i revisió segura

`20261028191801_preserve_partial_federation_rosters.sql`, creada amb CLI, substitueix la funció existent, comprova taules predecessores i prepara el permís tècnic mínim d’incidències. No canvia RLS, classificacions o comptes. Les fonts d’instal·lació `ihc-import.sql`/`official-reports.sql` queden coherents amb la proposta. No executar encara a producció.

Ordre futur, només autoritzat: revisar dependències/backup i ACL actual → provar migració en staging amb esquema d’importació complet → Edge Function ihc-sync compatible → reimportació acotada del recurs afectat → comprovar IDs, recomptes, incidències i logs parcials. No fer un reset, DROP, eliminació de plantilla ni rerun de tots els recursos esportius. Recuperació: preservar files i IDs, aturar el scheduler afectat si és necessari i reparar endavant. Tornar al desactivador antic de plantilles no és una recuperació segura.

La prova `ihc-persistence.test.mjs` usa el predecessor específic de l’importador; el fixture operatiu estadístic no té aquestes taules i exclou només aquesta migració del seu carregador. La migració sí que s’executa i prova en el fixture d’importació. La integració amb #31/#32 no s’ha simulat fusionant branques: no canvien aquells contractes; els seus canvis no toquen els fitxers d’importació/basic-roster, però el carregador de tests compartit requerirà conciliació del filtre quan es revisi conjuntament.

## 6. Verificacions i límits

Proves locals: transport sense xarxa real, canvis seqüencials d’àmbit de petició (RFEP OK/Plata, FECAPA Nacional/Segona/Tercera, grup A/B i temporada), errors 403/timeout, recuperació, HTML no reconegut, identitats ambigües, equip propi/rival, repetició additiva, errors de club/temporada, preservació i denegació a authenticated. Es prova la funció SQL i el permís concret sense service_role per simular un usuari ordinari: aquest rol només representa el backend real; la prova negativa usa authenticated.

Navegador: suites Base/Avançat amb fixtures i PostgreSQL/PGlite; nova regressió mòbil de rival RFEP sense equip gestionat, selecció explícita sense convocatòria automàtica, gol i recàrrega. No equival a Auth real o a navegar els portals federatius. La prova Auth real 3A.3 continua vàlida per al seu codi; no s’ha repetit ni s’estén aquesta certificació a la migració nova.

Suites finals locals: **169/169 Node, 48/48 Chromium**, zero fallades/omissions, check/build 35. Després d’endurir la conciliació amb IDs de roster previs d’un altre importador, 25/25 proves afectades PASS; CI completa del checkpoint pendent. Resultats i SHA256 dels fitxers de codi a `docs/evidence/federation-3a5-validation.json` i CODEX_PROGRESS. Les proves de navegació real «Tornar a competicions», cookies, tokens i pestanyes romanen bloquejades; no es declaren superades amb mocks. Cal una font/entorn federatiu accessible i autoritzat. No es presenta la plantilla del Vic recuperada realment ni s’aplica cap reparació productiva.

**Estat: correccions implementades i verificables localment; importació real i navegació interactiva federativa pendents. Cap fusió, desplegament o canvi productiu.**
