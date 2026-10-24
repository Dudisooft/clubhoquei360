# Importació sol·licitada de la plantilla del Vic · 24/10/2026

Estat: **PREPARADOR VERIFICAT; IMPORTACIÓ REAL BLOQUEJADA PER ACCÉS A LA FONT**.

El responsable demana importar les dades del Vic. Abast verificat: RFEP 3575, temporada SIDGAD 41 / 2026–27, equip 3727, rival del pilot `18fa0a6e-e5c6-487e-8315-5bc371e22cb1`, calendari canònic `51894d05-c323-f3e1-8534-fa79e062c448`. A Supabase no hi ha entrada de plantilla del Vic ni jugadors del Vic en actes verificades o pilots importats. L’importador general filtra plantilles pròpies IHC; no es pot obtenir la del Vic repetint-lo.

## Bloqueig real

La política de l’entorn de Codex està aplicada (`enforced`, revisió observada 113). Els dominis afegits són jsDelivr i el projecte Supabase; `www.server2.sidgad.es` no hi és. El responsable ha autoritzat afegir-lo amb «sí», però les comprovacions posteriors mostren que el canvi encara no està aplicat. Cal editar i desar els dominis permesos a la configuració de xarxa de l’entorn. Les eines disponibles només permeten consultar-ne l’estat.

El portal RFEP obert amb web mostra la carcassa i el selector de temporades; el fragment dinàmic de plantilla no és accessible amb aquella eina. No hi ha cap llista de noms/IDs verificable per importar. No s’ha utilitzat un servei de tercers per esquivar la política ni s’han inventat noms, dorsals o identificadors. Encara no hi ha cap canvi de dades de producció.

## Preparador concret

- `scripts/import-vic-roster.mjs --fetch`: POST a l’endpoint fix oficial amb els paràmetres de competició i plantilles. Respecta el proxy i la política de l’entorn, no accepta URLs arbitràries ni redireccions. Rebutja HTML buit o sense jugadors del Vic.
- `scripts/vic-roster.mjs`: selecciona només `teamid_3727` amb `team_id=3727` i ID federatiu numèric. Exclou tècnics i altres equips; col·lapsa duplicats idèntics i rebutja conflictes. Conserva l’hora i SHA256 de la font. Els dorsals i les posicions absents continuen desconeguts.
- `scripts/vic-roster-template.sql`: transacció de dades revisable, sense canvis d’esquema/permisos. Revalida el calendari/temporada al servidor, crea/reutilitza una entrada de rival amb `club_team_id=null` i els IDs de jugador/plantilla. No converteix el Vic en equip propi. Conserva identitats globals, dades conegudes prèvies i rebutja fonts anteriors a l’última importació. Registra auditoria com a `resource_type=roster`.
- No crea `pilot_players`, convocatòria, alineació, marcador, cronòmetre o estadístiques. La consulta avançada existent ofereix els candidats importats perquè l’operador faci la convocatòria real. No cal publicar una altra pantalla.

Els fitxers HTML, JSON i SQL amb dades reals es generen exclusivament a `work/` (ignorat per Git), amb permisos locals 0600. Cap plantilla personal al repositori públic.

## Proves executades

`node --test tests/vic-roster-import.test.mjs`: **7/7 correctes** amb noms/identitats ficticis en PostgreSQL/PGlite. Abast: selecció i procedència, exclusió d’altres equips, font buida/malformada, conflictes, idempotència i UUID, consulta del catàleg per l’operador, denegació d’un tercer, cap convocatòria automàtica, conservació de posició/dorsal coneguts i rebuig de snapshots antics, verificació nul·la i textos amb cometes/injecció tractats com a dades. Error inicial del muntatge multicomanda de la fixture corregit abans de l’execució final.

`node --check` dels dos mòduls i `git diff --check`: correctes. No s’han repetit suites de la pantalla intacta. No s’ha executat una importació federativa real ni una prova al navegador de producció d’aquest nou conjunt; no presentar les fixtures com a dades federatives.

## Represa exacta quan hi hagi xarxa

1. Llegir `docs/CODEX_PROGRESS.md`, comprovar Git i que l’observació actual inclogui `www.server2.sidgad.es` amb política aplicada.
2. Amb les dependències fixades disponibles: `node --use-env-proxy scripts/import-vic-roster.mjs --fetch`.
3. Revisar resum i SQL generat. Si la font no publica jugadors o canvia el format, aturar aquest bloc sense dades parcials.
4. Fer comprovació de dades existents i provar el SQL canviant únicament el COMMIT final per ROLLBACK. No crear comptes, concedir rols o materialitzar una convocatòria de prova.
5. Aplicar el mateix SQL amb COMMIT quan superi la prova. La instrucció explícita d’importar dades ja autoritza aquesta operació acotada; no demanar novament autorització rutinària.
6. Comprovar candidats `away` de `pilot_roster_catalogue` amb l’operador existent, UUID i absència de duplicats; comparar marcadors, registres manuals/estadístics i altres equips abans/després. Actualitzar informe/progrés amb recomptes i empremtes reals.

Branca `feat/import-vic-roster`, checkout `/workspace/work/clubhoquei360-starters`, base publicada `02ca084`. Cap migració nova ni desplegament de frontend/Edge Function necessari per completar aquesta importació de dades.
