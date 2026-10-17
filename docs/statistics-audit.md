# Auditoria inicial del mòdul d’estadístiques

17/10/2026, Europe/Madrid. Base auditada: `84e9872a8bce951f5bb56b8957ce64c11d570bcd`.

## Arquitectura i decisions conservades

Aplicació estàtica multipàgina en català: HTML/CSS i JavaScript sense framework ni compilació de producció. `dashboard.html` és l’entrada, `index.html` hi redirigeix. `avancat.html` conté el Centre de partit aprovat (marcador fix, equipacions, controls tàctils, banquetes, disciplina, titulars). `base.html` registra les mateixes incidències via `pilot_events`. `historial.html` combina consulta privada i catàleg federatiu. La navegació és amb URL relatives, compatible amb el subdirectori de GitHub Pages. No consta cap AGENTS.md ni workflow al repositori.

Dependències inicials de proves: linkedom 0.18.12 i TypeScript 5.9.3. El client Supabase es carrega des de jsDelivr, amb versió major sense fixar. Les Edge Functions Deno fixen supabase-js 2.95.3. Les proves Node existents passen: 27/27, sense fitxers temporals de fonts reals; aquestes proves condicionals no s’han executat en aquesta auditoria.

Supabase és infraestructura real i compartida, no una simulació: Auth, PostgreSQL amb RLS, Realtime, dues Edge Functions i catàleg federatiu. Consulta de metadades executada al projecte vinculat, sense consultar contrasenyes, tokens ni publicar dades personals. Hi ha 31 partits, 153 participants de partit, 342 incidències i sis estats de cronòmetre en el moment de la consulta. Cap dada esportiva s’ha modificat durant l’auditoria.

## Funcionalitats reals, parcials i locals

| Àmbit | Implementació inicial | Límit verificat |
| --- | --- | --- |
| Partit oficial operatiu | `pilot_events`, `pilot_operator_state`, `pilot_save_operator_state`, correccions persistents i Realtime | Es comparteix estat i registre; no equival a una acta federativa |
| Identitats | UUID de jugadors i codis federatius a `pilot_players`; equips/temporades normalitzats | No unir per nom, dorsal ni coincidència entre federacions |
| Estadística avançada | `estadistiques.html` en iframe dins del partit | Exclusivament localStorage; partit/operador/dorsal lliures; sense permisos de dades |
| Assignacions | Configuració i avisos locals | L’usuari pot autoseleccionar principal; fora d’abast només genera confirmació |
| Entrenador | Consulta de `pilot_events` i notes locals | Les notes no es comparteixen; no existeix control de notes al servidor |
| Registre individual | Antic `renderStats` ocult i prototip del iframe | Dues implementacions, estadística separada d’equip/jugador i sense via acció→jugador |
| Vídeo | Cronòmetre manual local | Sense reproductor, sessió autenticada ni continuïtat compartida |
| Federació | `federation-sync` i `ihc-sync`; fonts, calendaris, actes, plantilles i procedència | No tots els partits tenen codi, convocatòria o cronologia publicats |
| Autenticació | Supabase Auth consumit pel client | La pantalla antiga d’accés ja no existeix; la redirecció a l’inici no ofereix un formulari |
| Rols | `club_memberships` (club/equip), `pilot_members` (partit), superadministració | Operador oficial no implica autorització d’anàlisi. No hi ha accés extern amb caducitat |
| Publicació | Fitxers estàtics a main, lloc Pages indicat per l’usuari | No hi ha workflow de build/tests. La configuració Pages no està versionada |

## Conflictes i riscos concrets

- La documentació antiga de federació afirma que no hi ha cron actiu; la documentació més recent d’importació descriu una tasca existent. No s’ha creat, eliminat ni modificat cap programació.
- La documentació històrica acredita sessions visuals de treballs anteriors. No es compten com a proves executades en aquest encàrrec.
- El dashboard ja no és una pantalla d’autenticació, però els clients encara hi envien usuaris sense sessió. Cal restaurar un accés explícit.
- Falta l’esquema inicial complet de Supabase al repositori. S’han contrastat columnes, restriccions, polítiques i funcions reals abans de preparar una migració additiva.
- El repositori conté codi estadístic ocult que encara és invocat per `render()`. No es pot eliminar sense adaptar les crides. Els enllaços al prototip són només de Base i Avançat; cal preservar-ne la ruta amb redirecció al partit.
- L’historial antic té una agregació de persones manuals per nom/equip. El nou informe analític utilitza UUID i correspondència federativa explícita, sense estendre aquesta conducta.
- Els controls locals no són una barrera de permisos. La nova capa requereix RLS i comprovacions de cada escriptura, més enllà de la selecció visual de perfil.

## Decisions d’implementació

1. Integrar un panell modular dins del Centre de partit, sense iframe ni aplicació paral·lela. Conservar marcador, controls, estructura i estils aprovats.
2. Separar la capa analítica de `pilot_events`, `pilot_operator_state` i les taules federatives. Reutilitzar identificadors i referenciar incidències existents, amb correccions exclusivament analítiques.
3. Assignacions per partit/categoria/equip/jugador, temporals i revocables; entrenador/coordinador amb consulta segons equip autoritzat; delegat sense accés automàtic avançat. No crear comptes ni permisos per a persones reals sense identitats confirmades.
4. Persistència compartida, revisions optimistes, UUID idempotents, cua local identificada per usuari i partit, recuperació pausada i historial de revisions immutable.
5. Possessió com a intervals mesurats del cronòmetre manual, amb pauses/ajustos sense segons afegits i solapaments rebutjats. Dades no observades diferents de zero i denominadors explícits.
6. Proves locals amb dades FEM15 marcades com a fictícies i PostgreSQL real via PGlite. Preparar PR; no fusionar ni desplegar a producció sense autorització de publicació.

## Accés extern a fonts durant l’auditoria

Git i el connector GitHub han verificat el HEAD i els permisos del repositori. Les obertures web dels portals federatius i de Pages han fallat a l’eina de consulta; no es presenten com a fonts tornades a descarregar. La guia Supabase s’ha consultat; el lector web rebutja el tipus markdown del changelog. Les API utilitzades s’han contrastat amb la documentació oficial accessible del connector.
