# ClubHoquei360 · Staging frontend 3A.3

28/10/2026. **Auth real COMPLETADA EN L’ENTORN LOCAL AÏLLAT** per als casos del Centre de partit. Cap canvi als fitxers d’aplicació publicats; no fusió, publicació, migració o compte productiu modificat.

[Informe complet, versions, aïllament i reproducció a #31](https://github.com/Dudisooft/clubhoquei360/blob/feat/match-mode-access-server/docs/STAGING_AUTH_3A3_2026-10-28.md).

## VERD — sis blocs de navegador real PASS

[Evidència sanejada](evidence/staging-3a3-browser.json). Codi provat `4b869114b76f85399d117c7192b4b429e296246c`, eines servidor `4c5fa26c2451bc5d3f2b2beba1534a147191585a`. Comprovacions executades amb GoTrue v2.197.0, PostgreSQL 17.11 i PostgREST 16.4 reals; no s’injecten JWT ni respostes falses.

- Vuit comptes ficticis entren pel formulari Dashboard i `/auth/v1/user` confirma la identitat.
- Base i Avançat en sèniors/Júnior; Base de Juvenil/Infantil carregat; restriccions i excepcions de root/principal verificades, també per URL directa manipulada.
- FEM15: concessió de 24 h pel coordinador en UI, operador extern, accions d’equip i jugador, vídeo/pausa/reprèn/recàrrega, altre partit i acta denegats.
- Revocació amb sessió oberta: API denega noves operacions i la recàrrega continua denegada; estadístiques preservades.
- Caducitat curta real durant la sessió, sense canviar el rellotge; servidor i recàrrega deneguen.
- Futur RFEP: consulta sense contextos nous, activació explícita, una passada, recàrrega/idempotència i zero incidències oficials creades.

Zero pageerror i zero peticions productives. Les imatges externes de sidgad.cloud s’avorten abans de sortir. L’artefacte de staging només existeix a work: reconfigura app-client i el client propi d’historial, serveix l’SDK local i rebutja un ref productiu restant. No es publiquen tokens, claus o contrasenyes; les credencials fictícies aleatòries són només a work privat del servidor.

Servidor: nou blocs API/Auth/RLS reals PASS, inclosa concurrència de PostgreSQL, manipulació de JWT/metadata, clubs/equips, 168 h i regressió de notes camuflades. Reinici de contenidors preserva dades i JWT real anterior; gateway corregit per canvis d’IP.

CI de regressió [40657730299](https://github.com/Dudisooft/clubhoquei360/actions/runs/40657730299): **158 Node / 67 Chromium**, check/build 38, success. Servidor [40657729410](https://github.com/Dudisooft/clubhoquei360/actions/runs/40657729410): **191 Node / 47 Chromium**, success. Els fluxos Auth reals són locals; aquests jobs continuen sent les regressions habituals/PGlite i no es presenten com a Auth real.

## Reproducció

Primer preparar el servidor local seguint l’informe #31 (runtime, gateway, provision i verificació). Amb el checkout servidor corresponent en una ruta local:

```sh
npm ci
node scripts/staging-site.mjs ../clubhoquei360-mode-server
```

Deixar aquest procés executant-se i, en un altre terminal del frontend:

```sh
node scripts/verify-staging-auth.mjs ../clubhoquei360-mode-server
```

La web escolta només a http://127.0.0.1:56380. No substituir la ruta per configuració productiva ni copiar credencials al repositori. Repetir la prova futura crea una fixture de calendari nova si l’anterior ja té context; preserva el treball de prova anterior i verifica idempotència dins del mateix escenari.

## TARONJA / NEUTRE — límits i pendents

La pila completa CLI va fallar per espai; s’ha usat la pila mínima oficial real. Sense Realtime/Storage/Studio/Edge Functions, SMTP extern, MFA/OAuth o comprovació de possessió de bústia. Correu autoconfirm només de desenvolupament. El predecessor és sintètic mínim, no una homologació completa 1:1 de producció.

Les cinc classificacions sènior reals pendents de 3A.2 no es validen amb aquestes fixtures. Cal revisió humana, evidència de dades i autorització expressa abans de publicar. No hi ha dades personals copiades ni projectes externs creats.

**VALIDACIÓ AUTH REAL: COMPLETADA EN STAGING LOCAL AÏLLAT.** PR #31/#32 en esborrany, sense fusió ni desplegament productiu.
