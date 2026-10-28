> Continuïtat 3A.4: [contrast federatiu sènior](SENIOR_FEDERATION_REVIEW_FRONTEND_3A4_2026-10-28.md). Sis franges independents pendents, inclosa Rigat; cap canvi funcional o de permisos.

# ClubHoquei360 · Auditoria frontend 3A.2


Actualització: [3A.3 · Auth real local](STAGING_AUTH_FRONTEND_3A3_2026-10-28.md) completada. Els pendents Auth d’aquest informe són l’estat anterior de 3A.2; les condicions de classificació i desplegament continuen vigents.
28/10/2026. PR [#32](https://github.com/Dudisooft/clubhoquei360/pull/32) en esborrany, separada del servidor [#31](https://github.com/Dudisooft/clubhoquei360/pull/31), sense fusió o publicació. Cap dada, compte o permís de producció modificat.

## VERD — verificat

- Codi d’aplicació intacte des de `762797a`. No s’han introduït funcionalitats noves durant aquesta auditoria; només s’ha reforçat la prova d’integració i fixat la dependència de CI al servidor corregit.
- Servidor auditat `07504fd6d0f216464115bd026d68ab5467187ea7`. Correcció de notes statistician amb payloads oficials camuflats a #31; no s’ha copiat SQL al frontend ni fusionat branques.
- Checkpoint frontend `9c61ca0e6dbe26c6d9e9e513763005c21cbeeb56`: CI [40643528800](https://github.com/Dudisooft/clubhoquei360/actions/runs/40643528800) **success**, logs comprovats: **158 Node / 67 Chromium**, check/build 38, zero fallades/omissions. Inclou regressions de selecció, Base, plantilles/elegibilitat i desplegable de reforços de #28/#29/#30.
- Ambdues proves natives UI+PostgreSQL/PGlite passen en local a la represa i a CI: futur RFEP → consulta sense escriptures → activació explícita → una passada → recàrrega sense duplicats; FEM15 → concessió temporal → equip/jugador/vídeo/pausa/reprèn/recarrega → revocació i caducitat → denegació també després de recarregar. Dues observacions preservades, zero membres externs/contextos nous i dades oficials intactes.
- CI servidor [40643271480](https://github.com/Dudisooft/clubhoquei360/actions/runs/40643271480) **success**, **188 Node / 47 Chromium**, amb proves reals locals de funcions/RLS i fault injection de migracions.

Les sessions Auth de les proves són fictícies. Els JWT del harness només són identitats del servidor local, no credencials vàlides de producció. El navegador redirigeix les crides al fixture; zero escriptures a Supabase real. Els resultats JSON Chromium conservats permeten reutilitzar les suites anteriors; la CI final sí executa totes les proves sobre els checkpoints indicats. Els commits documentals posteriors no canvien runtime.

## TARONJA — condicions

La [matriu dels 36 equips](https://github.com/Dudisooft/clubhoquei360/blob/feat/match-mode-access-server/docs/match-security-matrix-20261027.md) és del catàleg real, no una validació Auth. Hi ha 6/4/26 propostes de franja; cinc candidats senior només acreditats per divisió queden pendents, amb UPDATE desactivat: SIMAR, Nacional, Segona i Tercera Catalana A/B. Sense una franja verificada, Avançat ordinari falla conservadorament. El catàleg situa SIMAR a OK LIGA PLATA SUR 3575 i Rigat a OK LIGA MASCULINA 3568; no s’inventen o canvien inscripcions.

No hi ha staging accessible: un projecte productiu i zero branques. Auth real i concurrència amb sessions/connexions reals encara pendents. No es creen comptes ni es fan escriptures sobre partits reals per completar aquestes proves.

## NEUTRE — següents passos autoritzables

Revisar evidència d’edat/metadades, disposar d’un entorn aïllat amb comptes legítims de prova, completar la matriu Auth real i revisar el procediment abans de decidir la publicació. L’artefacte de staging ha d’apuntar exclusivament al seu ref/clau pública, sense sessions ni trànsit al projecte productiu; no s’ha canviat app-client publicat.

Informe complet, política de cessament d’autoritzadors, empremtes de dades i plans de desplegament/recuperació: [auditoria servidor 3A.2](https://github.com/Dudisooft/clubhoquei360/blob/feat/match-mode-access-server/docs/AUDITORIA_SEGURETAT_3A2_2026-10-28.md). Durant la represa, 23 conjunts de dades/permisos abans/després són iguals. Hi ha quatre empremtes federatives diferents entre el 27 i el 28, amb recomptes iguals i causa no establerta; no es declara una absència total de canvis entre dies.

Guia visual de revisió: [operadors temporals](temporary-match-operators.md) i [modes/futurs](match-mode-access.md). Repetir en staging amb permisos reals; no fer servir partits reals per generar dades de demostració. Recuperació: mantenir les guardes de servidor, restaurar artefacte frontend verificat si cal, congelar els RPC afectats només amb autorització i reparar cap endavant. No DROP/DELETE ni restauració global que perdi observacions legítimes.

**APTE AMB CONDICIONS.** Compatibilitat i proves automàtiques superades; pendent d’evidència/revisió de classificacions, Auth real a staging, revisió humana i autorització expressa. PR #31/#32 en esborrany; no fusionar ni desplegar automàticament.
