# ClubHoquei360 · Convocatòries del coordinador

## Punt de partida

La branca `feat/convocatories-mvp-20261116` parteix del `main` de GitHub a `322586819224729b67c559531d05cbe96f9336e9`, comprovat amb una consulta de lectura. La còpia inicial `ClubHoquei360` apuntava a un remot local i tenia canvis en curs sobre `7baf003`. La còpia `ClubHoquei360-federacio` també tenia treball en curs sobre `e009f4d`. El candidat es va preparar en una còpia de treball separada.

El punt de partida va superar 154 proves automatitzades. Ja existien la preparació de participants al Mode Base, l’alta de rivals per dorsal i el cronòmetre del Mode Avançat. La navegació de convocatòries encara apuntava a una pantalla en construcció.

## Circuit implementat

- **Coordinació.** Pot gestionar convocatòries el coordinador general del club o el coordinador de secció assignat a l’equip. El servidor comprova l’assignació i valida cada jugador. La plantilla pròpia i els reforços autoritzats es mostren per separat. La publicació demana revisar el resum. Una revisió evita sobreescriptures simultànies i cada canvi publicat conserva la versió anterior.
- **Entrenador i delegat.** Consulten la publicació i l’historial dels equips assignats. La lectura i el llistat amaguen l’esborrany. El tauler mostra les accions disponibles i permet recuperar convocatòries anteriors.
- **Mode Base.** Mostra la publicació com a referència. Si manca l’alineació federativa verificada, l’operador pot seleccionar els convocats amb un botó, ajustar la selecció amb tota la plantilla interna i donar d’alta rivals només amb el dorsal. La selecció operativa es desa al registre de participants existent. Un enllaç federatiu posterior identificat de manera inequívoca permet recuperar una convocatòria que ja s’havia desat al partit operatiu.
- **Interfície.** Tauler i convocatòries comparteixen capçalera de club, selector d’equip i menú plegable. Les targetes mostren els escuts disponibles, els equips i l’horari. El mode guiat indica el pas següent i es manté durant la sessió de navegació.

## Decisions d’implementació

- El calendari disponible conté hores d’inici. El detector usa una finestra de **90 minuts** per partit i compara només convocatòries publicades del mateix club. Horaris desconeguts i franges que es toquen pel límit queden fora de l’avís. El coordinador pot publicar un solapament després de revisar-lo.
- Cada jugador té un identificador intern estable i un equip d’origen. La pertinença a la plantilla i les autoritzacions de reforç es preparen amb dades validades pel club. Les actes anteriors continuen servint de referència al Mode Base i cap historial d’actes habilita automàticament un reforç.
- Per validar un pilot real en un entorn autoritzat caldrà carregar plantilles a `app_private.callup_roster`, autoritzacions a `app_private.callup_eligibility` i comprovar els rols a les afiliacions existents. El camp `catalogue_player_id` permet vincular la mateixa persona quan la identitat federativa s’ha pogut confirmar. `app_private.callup_club_branding` permet configurar colors i escut per club. La branca inclou dades fictícies per exercitar el circuit a les proves.
- El Mode Base conserva els permisos existents de registre. Un partit del catàleg FECAPA pot usar l’activació existent. Un partit RFEP només de calendari té disponible la convocatòria al tauler i requereix un context operatiu per obrir el Mode Base.

## Verificació i abast

- **160 proves superades** amb `node --test "tests/*.test.mjs"`. Inclou PostgreSQL local amb PGlite i regressions de rols, accés anònim, seleccions inelegibles o duplicades, esborranys, historial, conflictes de revisió, horaris i vinculació tardana del calendari.
- **59 proves de navegador superades** a la bateria completa. Després de l’ajust final al mode guiat i a la consulta de convocatòries anteriors s’han tornat a executar les dues proves noves de navegador. Totes dues han passat.
- **Verificació estàtica i compilació correctes** amb `node scripts/verify.mjs` i `node scripts/build.mjs`.

Les verificacions de convocatòries utilitzen comptes i dades fictícies. El pilot amb plantilles, afiliacions i contextos operatius reals queda pendent. La migració s’ha provat a PostgreSQL local i continua pendent de validació amb la configuració i les dades d’un entorn Supabase autoritzat. Les proves del circuit no depenen de consultes externes.

## Revisió abans de publicar

- El candidat és al PR [#46](https://github.com/Dudisooft/clubhoquei360/pull/46). S’han reproduït les 160 proves automatitzades, les 59 de navegador, la comprovació estàtica i la compilació.
- La consulta de lectura a producció va detectar 18 parelles partit-equip duplicades quan calendari i registre operatiu compartien identificador. La migració revisada retorna 566 parelles, cap duplicat i cap enllaç operatiu ambigu. La nova regressió comprova també que es conserva l’alineació verificada, amb 161 proves automatitzades superades.
- La migració i les plantilles internes encara no existeixen a producció. La taula d’afiliacions és buida. El pilot requereix validar les assignacions i les plantilles abans de carregar-les. Les comprovacions de producció han estat de lectura.
