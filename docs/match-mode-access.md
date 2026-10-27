# Fase 3A · Auditoria i correcció d'accés als modes

27/10/2026, Europe/Madrid. Base `main` `e009f4d`, després de PR #30. Branca frontend `fix/match-mode-access`; servidor preparat separadament a `feat/match-mode-access-server`. Cap canvi de producció autoritzat ni executat.

## Causes comprovades

- `matchHref` només admet Avançat amb context operatiu preexistent; no diferencia consulta de calendari i activació. No filtra per categoria ni rol.
- L'Avançat només entén `?match=` operatiu i no consulta disponibilitat esportiva al servidor.
- `basic_open_catalogue_match` només activa FECAPA i no prepara `stats_matches` ni una font de calendari per a Avançat; RFEP necessita una via explícita compatible.
- El servidor actual no restringeix dades/ordres avançades per categoria. `stats_club_manager` també admet admin/section_coordinator: no serveix per identificar exclusivament el coordinador principal.
- `render()` de l'Avançat marca l'estat com a modificat i pot desar sense una acció de registre; cal separar recuperació de consulta i edició.
- `teams.category` barreja edat i divisió. No hi ha cap camp estructurat de franja esportiva. Cal preparar metadades verificades i no una llista de divisions sènior dins de la política.

## Evidència actual

Lectures SQL delimitades amb `BEGIN READ ONLY`/`ROLLBACK`: 36 equips IHC 2026/27, cap fila a club_memberships, 1 superadministrador habilitat. No existeix cap compte amb rol de coordinador principal que permeti una validació real d'aquest rol. No equival a un login Auth real de l'usuari. Fonts: definicions reals de funcions, polítiques i columnes consultades; avisos de seguretat/rendiment i fonts de logs revisats sense mutations. Xarxa vigent 139; changelog Supabase inaccessible (CONNECT 403), documentació RLS consultada via MCP.

## Disseny de correcció en curs

Política del servidor basada en franja d'edat estructurada: sènior/júnior Base+Avançat; juvenil i inferiors Base; excepció només platform_superadmin habilitat o general_coordinator del club sense team_id. La disponibilitat no atorga permisos operatius. Consulta de calendari sense escriptures i activació explícita/idempotent amb permisos verificats. Metadades desconegudes: no deduir sènior pel nom d'una divisió.

Canvis de servidor/RLS aniran en PR separada i no s'aplicaran a producció. No modificar plantilles, desplegable, elegibilitat, convocatòries, imports ni registres existents. Aquest checkpoint és d'auditoria; proves i matriu finals pendents.
