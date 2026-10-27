# Fase 3A · Servidor i RLS (PR separada)

27/10/2026, Europe/Madrid. Branca `feat/match-mode-access-server`, base `main` `e009f4d` després de PR #30. **Preparat, no instal·lat ni executat en producció.** El frontend es prepara independentment a `fix/match-mode-access`; aquesta branca no l'incorpora.

## Política i causes

El servidor existent no separa franja esportiva i divisió; l'activació Base només admet FECAPA, sense completar el context estadístic. Una pertinença a `pilot_members` no especifica disponibilitat esportiva. `stats_club_manager` admet administradors i coordinadors de secció, de manera que no identifica exclusivament el coordinador principal.

La migració afegeix `teams.age_group` (`senior`, `junior`, `youth`, o nul/desconegut) i `age_group_source`. Cap llista de divisions ni excepció per identificador d'equip decideix els permisos. Franja desconeguda: Base disponible amb accés de dades, Avançat ordinari denegat. Les franges s'han de preparar com a **metadades revisades**, no deduir-les d'una divisió desconeguda.

Sènior/júnior: Base i Avançat, amb els permisos operatius existents. Base inferior: Base; Avançat només si el compte és `platform_superadmin` habilitat o té `club_memberships.role='general_coordinator'`, del club corresponent i sense equip assignat. Admin, section_coordinator, coach, delegate, etiquetes visuals i user_metadata no donen aquesta excepció. La disponibilitat del mode no concedeix una assignació de registre estadístic ni modifica rols existents.

La nova regla també afecta operadors temporals en categories inferiors: una assignació estadística no substitueix l'excepció de rol. Per tant, l'antic pilot extern FEM15 no queda habilitat automàticament per aquesta fase. Cap compte o assignació existent s'ha modificat.

## Contracte

- `match_mode_access(p_catalogue?, p_match?)`: exactament un identificador, només lectura. Retorna disponibilitat esportiva, context operatiu exacte, accés de consulta, preparació estadística disponible i possibilitat d'activació explícita. No crea membres, sessions o partits.
- `match_activate_catalogue(p_catalogue,p_mode,p_practice=false)`: acció explícita, autenticada, autoritzada i atòmica. Admet FECAPA/RFEP, sense dependre de si la data és futura. Comparteix bloqueig de catàleg amb l'activació Base anterior i reutilitza identitats/contextos. Crea només les metadades operatives necessàries i la pertinença d'operador justificada; no jugadors, convocatòries, incidències, sessions ni assignacions estadístiques.
- Pot completar explícitament un context Base ja autoritzat afegint font de calendari i context estadístic sense canviar el seu ID ni les incidències. Un altre usuari sense permís no pot fer-ho. No sobreescriu fonts o contextos contradictoris; falla i exigeix revisió.
- Una acta oficial finalitzada exigeix anàlisi separada explícita; no es reobre ni substitueix l'històric. La consulta existent continua separada de la nova activació. Els rellotges i resultats no es modifiquen.

Els checks de lectura/gestió/registre estadístic i preparació avançada afegeixen la nova guarda de mode mantenint totes les restriccions prèvies. Les polítiques existents es tornen a vincular a les noves funcions: renombrar-les sense rebind deixaria referències OID antigues. Les implementacions anteriors no són executables pels clients. L'estat oficial avançat té polítiques restrictives d'escriptura; el Base conserva les formes d'esdeveniment permeses. El calendari Base verificat no exigeix un cinc inicial avançat per registrar un gol Base. El SELECT d'estat oficial compartit es conserva perquè Base consulta el tancament; no autoritza escriptures avançades.

## Metadades i desplegament pendent

[Proposta de classificació](match-age-group-review-20261027.json): 36 equips reals del catàleg IHC 2026/27, sis sèniors, quatre júniors i 26 inferiors. Aquests registres de configuració **no són excepcions de permisos** i l'aplicació no els importa per autoritzar. Els equips nous, clubs o divisions noves utilitzen el mateix camp, amb verificació explícita; no s'assumeix sènior per absència d'una categoria coneguda.

`scripts/prepare-reviewed-age-groups.sql` és una proposta de dades delimitada per ID/club/temporada/categoria actual i només omple valors nuls. Acaba en **ROLLBACK**. No forma part de la migració ni s'ha executat. Cal revisió humana i autorització expressa de migració i metadades abans d'una posada en servei. No publicar el frontend dependent abans de verificar el contracte i les classificacions.

Lectures de producció: 36 equips, cap club_membership i un superadministrador habilitat. No hi ha coordinador principal real per fer una prova amb aquest rol. No s'ha fet login Auth ni validat cap compte real de producció en navegador. No es creen comptes ficticis fora de les proves locals.

## Verificació local

Suite Node final **167/167 PASS**, sense fallades ni omissions; suite Chromium completa **47/47 PASS**; suite focalitzada ampliada **14/14 PASS**. Comprovats explícitament superadministrador deshabilitat/rol de suport, correcció/anul·lació Base i rebuig de correccions avançades disfressades. La prova inicial del destí de correcció amb subconsulta a la mateixa taula provocava recursió RLS: substituïda per helper definer delimitat per partit/operador i comprovada correctament. Un error del harness en executar diverses ordres preparades s’ha corregit amb execució de fixture adequada, sense relaxar la política. Check/build de 35 fitxers correctes. Les fixtures PostgreSQL antigues s'han completat amb vincles d'equip que faltaven: la guarda nova fallava correctament si només hi havia noms. La fixture estadística general rep metadada júnior explícitament fictícia; els seus noms antics no s'usen per autoritzar.

Les 14 proves noves cobreixen divisions sèniors obertes i femenines fictícies, Júnior Or i altres divisions, categoria inferior, admin/secció, superadministrador/coordinador principal, JSON falsificat, desconeguts, absència d'escriptura en consultar, Base sense cinc inicial avançat, activació RFEP idempotent, històric separat, denegació anònima i finalització d'un context Base conservant incidències. Són comprovacions reals de PostgreSQL/PGlite amb usuaris **ficticis**, no validació Auth de producció.

Escenari de revisió: instal·lar només en entorn aïllat, revisar metadades, consultar capacitats amb cada rol i executar les suites. No aplicar a producció ni fusionar sense autorització. Comprovar avisos, permisos i empremtes abans/després en el futur desplegament autoritzat.

## Checkpoint remot

[PR #31](https://github.com/Dudisooft/clubhoquei360/pull/31) en esborrany, codi `74a88e5550f906f737347a8f50fc55762142b452`. [CI 40552219184](https://github.com/Dudisooft/clubhoquei360/actions/runs/40552219184) **success**: 167 Node, 47 Chromium i check/build 35, comprovats als logs. Frontend independent [PR #32](https://github.com/Dudisooft/clubhoquei360/pull/32). Prova conjunta local amb aquest codi de servidor i Chromium també PASS: futur RFEP consultat/activat explícitament i una passada conservada després de recarregar, 1 context/1 membre/1 estadística/0 incidències oficials. Sense Auth ni escriptures de producció.
