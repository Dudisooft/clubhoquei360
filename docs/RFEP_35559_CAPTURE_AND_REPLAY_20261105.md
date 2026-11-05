# Acta RFEP35559 · normalització i assaig · 05/11/2026

Continuació de [PR #39](https://github.com/Dudisooft/clubhoquei360/pull/39), sobre4072585. Fonts de represa: [evidència visual Work a issue #38](https://github.com/Dudisooft/clubhoquei360/issues/38#issuecomment-6645582404) i [revisió focalitzada de la PR](https://github.com/Dudisooft/clubhoquei360/pull/39#issuecomment-6645592672). No s’ha repetit l’auditoria general.

## Què s’ha verificat i amb quina procedència

| Element | Estat real |
|---|---|
| Acta visible a Work | Comunicada:35559,3575,temporada41,equips3697/3727,1–1,10+10,2+2porters i5+5inicials. No és una resposta HTTP disponible aquí |
| Transport del connector | Intent puntual bloquejat en obtenir configuració del portal. CONNECT403/envoy abansTLS, política147 restringida sense hosts federatius; no s’arriba al payload report |
| Consulta web del detall/report | No recuperable amb la ferramenta disponible; no s’ha obtingut un nou HAR ni s’ha observat Network/XHR |
| Normalització de la referència | PASS amb transcripció manual explícita de les dades de Work; IDs/dorsals/posicions/cincs comparats per hashes, sense publicar noms o alineacions al codi |
| Diferit a la mateixa aplicació | PASS en PGlite aïllat i Auth fictici, amb20participants de la transcripció,2porters per costat, registre individual i recuperació de rellotge/observació sense tocar l’acta local |
| Normalització d’una captura HTTP real | Preparada, però pendent del fitxer original; les proves HAR automàtiques actuals són sintètiques |
| Aplicació publicada | Sense canvis; no s’ha vinculat, importat ni activat cap registre productiu |

La font pública comunicada és [el detall del partit](https://www.hockeypatines.fep.es/?liga=3575&partido=35559), seguit de «Acta partido» i «Imprimir acta». La nostra consulta fallida no contradiu l’accés visual de Work: són vies de connexió diferents. No s’ha qualificat el CONNECT403 com una denegació federativa.

## Correcció concreta de procedència

- `normalizeCalendar` conserva la URL del calendari original.
- `normalizeReport.source_url` ara apunta a `https://www.hockeypatines.fep.es/?liga=3575&partido=35559`; `calendar_source_url` conserva `https://www.hockeypatines.fep.es/league/3575`.
- `readRfepSnapshot`, `canonicalRfepReport` i `officialPlayers` propaguen totes dues procedències. Cap canvi de SQL, identitat interna o persistència productiva.
- La vista mostra enllaços diferenciats d’acta/calendari, valida HTTPS i el domini i rebutja URL no segures. Mostra el cinc inicial només amb flag positiu; un flag absent o desconegut queda null.
- `player_id` es manté com ID públic (`public_player_id`/`federation_player_id`), mai com llicència. `license_number` queda null perquè el connector no ha recuperat una llicència verificada. Els dorsals es conserven com a text sense omplir zeros inventats.

L’enllaç directe és procedència del document; **no soluciona per si sol el bloqueig del transport**. No s’ha canviat report/report/ ni el token públic amb una hipòtesi no contrastada.

## Incidències: representació sense cronologia inventada

Work comunica aquests cinc rètols: P1 19:13 gol local amb assistència, P1 10:54 gol visitant, P1 08:36 groga local, P2 15:24 blava visitant i P2 07:34 blava visitant. Es conserven com a evidència visual reportada a la issue, sense calcular minuts transcorreguts, ordenar segons un rellotge suposat, atribuir durades o generar esdeveniments propis.

No s’ha verificat la forma del payload que les conté. L’inspector HAR identifica les seccions de tipus events/incidents presents sense interpretar-ne camps desconeguts. `event_timeline_status` continua `not_retrieved`; els totals de jugadors no reconstrueixen una cronologia. La vista ho indica explícitament i el contracte canònic no esborra una cronologia vàlida ja desada quan aquesta secció no s’ha recuperat, segons la protecció dePR37.

## Captura verificable: preparada, no fabricada

[`scripts/verify-rfep-report-capture.mjs`](../scripts/verify-rfep-report-capture.mjs) accepta un HAR privat fora de Git, comprova origen/api/GET/id/HTTP200/cos/identitats i calcula SHA256 del HAR i del payload. Contrasta20IDs/dorsals/rols/cincs contra [la referència visual agregada](evidence/rfep-35559-visual-reference-20261105.json). El resultat només inclou hashes, recomptes i URLs sense tokens. El HAR complet, noms, JWT del portal i capçalera Authorization no es versionen.

Una transcripció JSON es rebutja com a captura. Una resposta sense cos, un altre host/partit, versions contradictòries o alineacions divergents no donen un resultat verd. La variant amb o sense slash es pot observar al HAR i es marca si difereix del connector, sense canviar-ne la ruta ni fer un reintent automàtic.

El verificador d’un fitxer aportat **no reexecuta la xarxa**: verifica integritat i correspondència de la captura subministrada, no demostra accés actual del backend. No hi ha fitxer HAR real en aquesta execució i no s’ha inventat un hash de captura.

## Assaig aïllat en diferit

[`scripts/verify-rfep-replay-capture.mjs`](../scripts/verify-rfep-replay-capture.mjs) reutilitza la mateixa `avancat.html`, SDK i servidor de proves existent. Només s’executa en un PGlite nou, amb comptes ficticis, connexions de navegador desviades al127.0.0.1 i la resta de destinacions bloquejades. El servidor acaba en finalitzar; no s’ha creat una altra aplicació o servei permanent.

Dos modes explícits i exclusius:

- `--har /ruta/privada/acta.har`: comprova una captura real aportada abans de preparar el fixture local. Preparat, però no executat amb captura oficial en aquesta fase.
- `--manual-work-reference /ruta/privada/work-transcription.json`: assaig de referència visual, amb banner permanent **«Transcripció manual de Work, NO és una captura HTTP ni una importació automàtica»**. És el mode executat. El fixture queda pendent d’importació, amb origen manual explícit; mai s’injecta com a fallback del connector.

L’assaig ha carregat10participants per costat i2porters per costat, ha seleccionat un participant amb UUID local vinculat al seu ID públic, ha registrat1passada pròpia en vídeo i ha recuperat01:23 i l’observació després de recarregar. L’acta i el rellotge oficial locals s’han comparat abans/després i es mantenen iguals. `automatic_transport_verified:false` consta al resultat.

No s’han publicat els noms o els fitxers d’aquest assaig. Els fitxers privats són a `/workspace/private/ch360-vic-20261105`, amb carpeta700/fitxers600. No són un backup, un dump de Supabase o una resposta del connector. La reference versionada conté només procedència, recomptes i hashes agregats.

## Proves i publicació

Resultats finals de suites i CI: consultar el checkpoint actual i el cos/checks dePR39 després de la passada final. Les proves dirigides del nou contracte i l’assaig manual han passat; no es declara validada cap captura oficial absent. El harness inicial comptava20botons en una llista que mostra un únic equip i usava un selector de costat incorrecte; corregits i assaig repetit PASS.

**Encara no podem certificar el diferit automàtic amb l’acta recuperada pel connector.** Sí que s’ha obert l’assaig local amb els participants comunicats per Work, amb procedència explícita. Falta la resposta/HAR original o una connexió autoritzada que permeti obtenir-la; després, contrastar el contracte real, incidències i possibles diferències de format i executar `--har`.

Per provar-ho a l’aplicació de l’usuari també cal la reconciliació autoritzada del pilot/catàleg i les dependències de servidor/publicació ja preparades aPR37: backup recuperable, permisos/migracions i backend, validació Auth real i autorització de publicació. Aquesta fase no n’executa cap. No hi ha canvis Supabase productius, merge ni desplegament.
