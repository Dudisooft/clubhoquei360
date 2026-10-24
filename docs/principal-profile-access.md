# Accés al perfil Principal · correcció del 24/10/2026

El responsable comunica «No puc accedir al perfil principal» després de publicar la reparació de l’Igualada–Vic. La consulta real de Supabase confirma que el compte existent continua verificat, amb rol global habilitat i `pilot_members.role = operator` al partit. La font segueix com a calendari verificat amb fitxa pendent i zero jugadors importats. No és una pèrdua de permisos.

## Causa i canvi

La PR #12 havia afegit una reconducció de Principal a Estadístic quan la font era només de calendari. També forçava Estadístic en obrir aquell partit sense una vista explícita. La prova nova reprodueix exactament la incidència: després de seleccionar `main`, el valor tornava a `stats`.

`federation-client.js` torna a permetre Principal per a l’operador existent. L’enllaç amb `view=stats` continua obrint Estadístic; l’operador pot canviar a Principal, i la URL resultant conserva aquesta elecció en recarregar. Els operadors exclusivament estadístics conserven la seva restricció de perfil; no hi ha canvis de rol ni RLS.

Obrir Principal no habilita l’escriptura oficial d’una font pendent. L’avís explica aquesta situació. El rellotge oficial, la confirmació de titulars i les equipacions es mantenen desactivats mentre falta la preparació verificada. Es bloqueja també l’autodesament oficial en aquesta font: veure el perfil no ha de crear un snapshot buit ni enviar una RPC d’escriptura. Les estadístiques d’equip continuen disponibles a Estadístic.

## Verificació

- Regressió Chromium executada abans del canvi: FAIL, esperat `main`, rebut `stats` després de canviar el selector.
- Després del canvi: **3/3 Chromium específics PASS**. Cobertura: registre d’equip en directe i persistència, canvi de perfil en mòbil, obertura de Principal des de l’enllaç estadístic i conservació després de recarregar; zero peticions `pilot_save_operator_state` i dades oficials/estadístiques intactes en consultar la vista.
- **2/2 proves Node d’interfície PASS**; check dels 29 fitxers, build Pages i diff correctes.
- Transport de navegador Auth/Realtime local fictici sobre PostgreSQL/PGlite. La consulta real de Supabase és de diagnòstic de permisos, sense accedir a contrasenyes/JWT i sense escriptures. No és una inspecció de la sessió real del responsable.
- [CI de la PR #16](https://github.com/Dudisooft/clubhoquei360/actions/runs/40072904236) success al codi `3e5bb69d1a6922d8f395d11ab039f2c8f7b64ca7`: **99 Node, 29 Chromium**, check 29 i build correctes, confirmats als logs. No repetir la reparació de dades RFEP ni migracions.

## Publicació i represa

Branca `fix/principal-profile-access`, base `d9b803ff8dff55ae3d79f2dc3f04a75e408dab5f`. Esmena de la publicació RFEP ja autoritzada, motivada per la incidència del responsable. Només frontend, prova i documents; cap compte, dada esportiva, assignació, política o funció modificats.

**Publicació completada:** PR #16 fusionada a `ffbdf78f82ec733c0090131b6d7443e835fdca43`; [Pages 40073230378](https://github.com/Dudisooft/clubhoquei360/actions/runs/40073230378) success, logs del SHA, «Reported success!» a les 07.13.18 UTC (09.13.18 Madrid) i URL d’entorn. CI 99 Node/29 Chromium correcta. No repetir publicació ni proves vàlides.

Ara, l’operador pot obrir `avancat.html?match=18fa0a6e-e5c6-487e-8315-5bc371e22cb1` i seleccionar Principal. Mentre la fitxa sigui pendent, aquesta vista permet consultar la preparació, amb registre oficial pendent. No declarar resoltes les alineacions ni habilitat el registre oficial.
