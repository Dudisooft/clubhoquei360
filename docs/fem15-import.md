# Igualada HC FEM15: importació federativa

Verificat el 15/10/2026. Font oficial: https://www.hoqueipatins.fecapa.cat/league/4802

## Identitat i cobertura

FECAPA, temporada 2026/27 (`41`), competició FEM 15 OR (`4802`), grup `5010`, equip IGUALADA HC (`12419`), escut de club `252`. IGUALADA FEMENÍ HCP A (`11715`) és un equip diferent. Aquesta importació no associa identitats RFEP sense verificació.

Importació real a Supabase: 7 jugadores, 5 membres del cos tècnic, 24 partits (3 disputats, 21 pendents), 3 fitxes oficials i classificació. No es publiquen noms de menors ni còpies de les fonts al repositori. Només es conserven camps esportius necessaris, amb RLS existent.

| Codi oficial | Data | Partit | Resultat |
|---|---|---|---|
|159316|26/09/2026|Club Patí Roda – Igualada HC|1–4|
|159323|04/10/2026|Igualada HC – Igualada Femení HCP A|2–0|
|159343|11/10/2026|CH Mataró – Igualada HC|3–0|

La classificació consultada situa l'equip novè, amb 6 punts. Els dorsals i la portera provenen de les fitxes de partit; la plantilla de temporada no publica dorsals. Es conserva el partit on s'ha observat cada dorsal.

## Fonts i actualització

El portal carrega HTML públic mitjançant POST a `https://www.server2.sidgad.es/fecapa/`: `fecapa_cal_idc_4802_1.php`, `fecapa_clasif_idc_4802_1.php`, `fecapa_stats_1_4802.php` (`tipo_stats=plantillas`) i `fecapa_gr_{codi}_1.php` (`tab=tab_ficha_resumen`). No s'utilitzen credencials federatives ni es passen controls d'accés.

La funció Edge existent `federation-sync`, versió 6, incorpora `sync-team` amb abast restringit a aquest equip. La selecció d'un partit FEM15 i el botó existent de sincronització reutilitzen el nou importador, amb memòria cau de sis hores. El navegador consulta Supabase, no la federació. No s'ha activat cap nou cron ni s'han canviat les opcions automàtiques dels partits previs.

`federation_commit_fem15` és una funció transaccional SECURITY INVOKER executable només per service_role, amb bloqueig assessor, validacions d'identitat i claus deterministes. Reutilitza clubs, temporades, equips, competicions, grups, inscripcions, plantilles, estadístiques, partits, alineacions, fonts, memòria cau i registre d'importacions existents. Les altes són idempotents; les baixes de plantilla es marquen inactives conservant l'històric. Els errors s'anoten a federation_import_runs.

Els 21 pendents no publiquen codi oficial: s'identifiquen amb una clau interna de temporada/competició/grup/jornada/equips, independent de canvis de data. El codi oficial s'afegeix quan es publica. Les dates oficials actualitzades queden a federation_matches i a la memòria cau; no se sobreescriuen els camps operatius de pilot_matches en una reimportació.

Els nous partits queden associats únicament a l'operador ja existent. No es creen comptes ni permisos d'analista. Es reutilitza federation_commit_snapshot per a les plantilles oficials dels partits disputats; no s'escriu a pilot_events ni pilot_operator_state. Les estadístiques manuals continuen en el seu flux separat.

## Límits de les dades

- El marcador de la fitxa 159323 és buit: el 2–0 prové explícitament del calendari. No s'infereix cap golejadora ni motiu del resultat.
- Les línies temporals d'incidències consultades són buides. Es conserven els agregats publicats de targetes, sense inventar minuts ni recalcular sancions.
- Les caselles buides són desconegudes, no zeros. L'atribució de gols individuals queda marcada sense verificar.
- Els pendents tenen alineació no publicada: la plantilla de temporada no es presenta com si fos la convocatòria d'un partit.
- No es recullen naixements, contactes, fotografies ni nacionalitat. Els càrrecs genèrics del cos tècnic no es dedueixen pels noms.

## Verificació i publicació

- Importació real del servidor: HTTP 200, `verified`, 24 partits/12 persones/3 fitxes. Segona consulta: HTTP 200, `cached`.
- Dues reimportacions dins una transacció revertida: continuen 24 partits, 12 membres de plantilla i 21 alineacions de l'IHC, sense duplicats.
- Comparació completa abans/després dels set partits preexistents: partits, fonts, hashes de jugadores, esdeveniments, estats i membres idèntics. Inclou els tres partits protegits per l'usuari.
- `npm test`: 16 proves superades, incloses cinc proves amb les fonts reals temporals. Les dades personals temporals no es versionen; sense aquests fitxers només s'executen les proves permanents.
- anon i authenticated no poden executar la funció d'importació; service_role sí. No s'han modificat polítiques RLS de client.
- No s'han modificat avancat.html, federation-client.js, disciplina, cronòmetres ni estadístiques avançades. L'únic ajust de proves de la interfície és el seu entorn simulat.
- La comprovació visual autenticada queda pendent: el navegador de verificació redirigeix a l'accés. No s'han creat sessions, comptes ni anotacions de prova en producció.

SQL desplegat: supabase/fem15-import.sql. Codi desplegat: supabase/functions/federation-sync/{index.ts,fem15.ts,parser.ts}; parser.ts es conserva intacte. Per comprovar-ho amb l'operador habitual, obrir Mode Avançat, seleccionar FECAPA:4802 i IGUALADA HC. Abans del primer partit pendent caldrà esperar la convocatòria oficial o introduir-ne una de provisional diferenciada; no es confirmen cinc titulars automàticament.
