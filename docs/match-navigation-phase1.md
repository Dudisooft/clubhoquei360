# Fase 1 · Selecció explícita de partit

Referència obligatòria: [auditoria c03f039](https://github.com/Dudisooft/clubhoquei360/blob/c03f039/docs/AUDITORIA_GLOBAL_2026-10-26.md). Base `a5e54e7`, branca `feat/explicit-match-navigation`. No hi ha migracions, imports nous, jugadors provisionals, canvis de permisos o desplegament.

## Comportament

- `index.html` continua obrint el Dashboard. Els accessos «Partit» del Dashboard obren `partit.html`.
- Base i Avançat sense partit explícit deriven a la mateixa pantalla, amb mode indicat. No hi ha partit, temporada, competició o equip preseleccionats.
- Temporada → competició/categoria → equip → partit. Canviar un nivell esborra els inferiors; cal prémer «Obre el partit seleccionat». Recarregar el selector sense obrir neteja la selecció; recarregar un partit explícit conserva l'ID a la URL.
- Es llegeix tot el catàleg accessible, paginat i ordenat; es relacionen equips/competicions/grups/fixtures per IDs. No es dedueixen afiliacions pel nom ni s'exigeix un codi oficial per mostrar una fila. No es filtren els partits per passat/futur/resultat.
- Es mostren contextos operatius i fixtures només federatius. Un context conegut s'obre pel mateix UUID. FECAPA sense context usa la ruta Base de catàleg ja existent (activació amb els permisos vigents; els finalitzats poden passar a assaig). RFEP sense context operatiu no es pot activar amb aquesta pantalla; s'indica el pendent. No s'ha creat una nova via d'activació.
- Els controls de selecció antics queden amagats; el botó manual de refresc oficial de l'Avançat es conserva. «Canvia de partit» torna al selector comú. Les cues i sessions dels motors existents conserven els seus mecanismes de desament/recuperació.
- `?match=` autoritzat conserva exactament aquell ID, encara que no hi hagi font associada. No es recorre a Cerdanyola, Alcobendas, RFEP 35529 ni al primer partit. Sense font no es desa automàticament un rellotge oficial buit. Un ID no autoritzat es rebutja; no obre un substitut.

## Fitxers i separació de dades

Nous `partit.html`, `match-navigation.js` (model sobre el catàleg i `calendarIdentity` existent), `match-navigation-ui.js` (lectura i selector). Adaptacions mínimes a Dashboard, Base i Avançat i als seus controladors. No es carrega el catàleg complet de persones/actes d'Historial per seleccionar un partit: s'utilitzen les mateixes relacions canòniques amb les taules mínimes de navegació. El model només projecta dades, no les modifica.

La visibilitat continua depenent de les polítiques de lectura existents. Si un usuari no pot llegir el catàleg d'una temporada, no s'amplien permisos per mostrar-lo; els enllaços directes autoritzats continuen utilitzant els controls del motor corresponent. No s'ha certificat una sessió física de producció.

## Proves i regressions

Node: suite completa 115/115 PASS, inclosos tres casos nous de model (26 jornades, context existent sense duplicar, absència de correspondències per identitat buida i activació Base existent). Check/build: 34 fitxers correctes. Reforç de sintaxi/model/interfície executat després dels últims ajustos.

Chromium: cinc casos nous de selector (Dashboard/dues entrades buides sense peticions d'escriptura/import, quatre nivells/calendari/canvis/recàrrega, 390/820/1440 px). Cas nou amb PostgreSQL/PGlite d'enllaç autoritzat sense font, identitat preservada i absència de rellotge/incidències/estadístiques noves. La suite completa final ha passat: **43/43 Chromium**, zero fallides/omeses, al codi `295ae29`.

Regressions detectades i corregides: ocultar el contenidor Base amagava l'activació existent; ara només s'amaga el selector antic. CSS `.flex` feia visible l'antic selector Avançat malgrat `hidden`; ocultació reforçada. Les proves que navegaven per controls antics s'han adaptat a URL explícita. S'ha repetit la suite en sèrie després de col·lisions d'artefactes de dos llançaments Playwright. Les dades de navegador són fictícies; el transport local usa la base PostgreSQL de proves. No són dades federatives reals ni proves al pavelló.

## Validació visual abans de publicar

En una còpia local o entorn de revisió autoritzat del frontend:

1. Obrir `index.html`: apareix el Dashboard. Prémer «Partit»: apareixen els quatre camps buits i «Obre» desactivat.
2. Escollir temporada, competició i equip. Comprovar que el calendari inclou totes les dates disponibles, també futurs sense codi, i que cada fila indica si té context operatiu.
3. Escollir partit i mode, prémer «Obre» i comprovar el títol/URL exactes. Recarregar: es manté el mateix partit.
4. Tornar amb «Canvia de partit». Canviar equip/competició/temporada: els nivells incompatibles es buiden. Cap partit s'obre sense prémer «Obre».
5. Provar enllaç directe autoritzat i ID no accessible. El segon no ha de substituir-se per un altre partit. A Base, conservar també les rutes de catàleg/assaig existents.
6. Repetir a mòbil/tauleta/escriptori. Per verificar dades o cues de registre, usar només fixtures o un partit de prova autoritzat, no anotacions de demostració als partits reals.

No desplegar ni fusionar sense autorització. Els futurs sense context RFEP i la lectura restringida del catàleg són límits explícits d'aquesta fase, no permisos nous pendents d'activar silenciosament.
