# SIMAR–Vic: registre en diferit local

- Demostració: http://127.0.0.1:4187/vic (Mode Base real; enllaç al Mode Avançat amb el mateix partit).
- Font: portal oficial RFEP, competició 3575, temporada 41, acta 35559. Consulta legítima del recurs públic `/rfep/v1/hp/report/`, amb configuració pública descoberta al portal. No es desen tokens del portal.
- Causa: el laboratori anterior descartava els noms i no connectava l’acta amb pilot_players; el lector de catàleg del Mode Base i part de la presentació només reconeixien FECAPA.
- Correcció compartida: normalització d’identitats, noms, dorsals, porters i costat; adaptador RFEP/FECAPA; memòria de l’última acta vàlida davant errors o documents incomplets; reconeixement RFEP al catàleg i contrast; enllaç Base–Avançat amb identitat de partit preservada. Cap unió per nom ni plantilla inventada.
- Navegador integrat: 10 jugadors oficials per costat; convocats confirmats; gol i targeta blava en Base; cincs inicials i targeta groga en Avançat; passada observada en vídeo a 02:05. Recàrrega recupera incidències, estadístiques i rellotge. Perfil de consulta amb controls d’escriptura deshabilitats.
- SQL local: operador autoritzat; consulta sense escriptura; persistència després de tancar i reobrir la base; reimportació idempotent sense duplicats; document oficial intacte. Bateria 283/283 PASS, més reexecució de regressions després dels darrers ajustos.
- SIMAR–Noia: calendari oficial verificat, acta futura 35574, 14/11/2026 20:30, Les Comes. Deu candidats per equip procedents de participacions oficials anteriors, etiquetats sense acreditar convocatòria ni elegibilitat futura. http://127.0.0.1:4187/noia.
- Les incidències de la demostració són anotacions de prova, no una transcripció esportiva completa del vídeo. Resultat federatiu 1–1 separat del marcador anotat. No s’ha simulat haver revisat el partit sencer.
- Servidor només a 127.0.0.1; sessions i rols exclusivament locals de demostració. Base PGlite persistent i polítiques SQL del banc de proves; no acredita autenticació o desplegament productius. El client local substitueix app-client.js només en aquest servidor i bloqueja connexions externes de dades. No s’ha modificat el client productiu.
- Evidència local no versionada: work/official-replay-tests.txt, work/replay-source/verification.json, work/SIMAR-Vic-base.png i work/SIMAR-Vic-avancat.png. Cap credencial dins les evidències.
- Represa: `node scripts/official-replay-server.mjs`; `REPLAY_DATA_DIR` identifica la base local existent. La preparació reutilitza work/replay-source/rfep-35559.json i el calendari conservat. FECAPA 403 no eludit; no bloqueja aquesta prova RFEP.
- Cap canvi de producció, desplegament, fusió, push ni exportació de base productiva. Sense bloquejos per al registre local SIMAR–Vic.
