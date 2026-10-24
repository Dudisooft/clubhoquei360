# Plantilles visitants · lliurament per a revisió

24/10/2026. **Canvis preparats en branca; no instal·lats ni publicats.** La contingència funciona a les proves locals dels dos modes. La recuperació real de Vic i Alpicat continua bloquejada per la xarxa de la font federativa.

## A. Auditoria inicial

[Auditoria, identificadors i empremtes](visitor-roster-audit.md). Importador general limitat als equips de l'Igualada; selector Base dependent d'enllaços de club inexistents per als visitants; preparació manual de l'Avançat tancada després d'iniciar el partit. No s'ha trobat plantilla oficial dels rivals al catàleg.

- Alpicat A: FECAPA 4786, temporada 41, equip 12050, pilot `8b5cd05a-149e-7e21-73b3-5782994e0d07`.
- Vic: RFEP 3575, temporada 41, equip 3727, pilot `18fa0a6e-e5c6-487e-8315-5bc371e22cb1`.
- SQL real, només lectura: permisos de catàleg lligats a la competició/club. Els operadors estadístics reben el catàleg del seu partit mitjançant RPC acotada, sense ampliar accés general.
- Política de xarxa final observada: revisió **129**, restringida/aplicada, observacions vigents. `www.server2.sidgad.es` absent. La revisió inicial 126 tenia el mateix bloqueig. No s'ha eludit amb intermediaris ni desplegat un extractor alternatiu.

## B. Desenvolupament

Editor comú **«Completa plantilla manualment»** als modes Base i Avançat: equip, nom, dorsal i posició; nou jugador marcat **«Provisional · no verificat»**. Alta i correcció durant el partit. Desament compartit, UUID estable, petició local recuperable i reintent idempotent. Un canvi simultani exigeix actualitzar/revisar la fitxa abans de sobreescriure.

El Base afegeix el jugador a la convocatòria confirmada amb una nova anotació: pot rebre immediatament gols i targetes. Els originals i les instantànies històriques es conserven. L'Avançat l'incorpora a les opcions d'estadística individual, en els dos ordres d'entrada; no reinicia la sessió ni el rellotge d'anàlisi. La preparació dels cincs inicials conserva els controls aprovats.

La nova migració `20261024195516_match_roster_contingency.sql` incorpora revisió de plantilla, procedència de l'operador, estat d'identitat calculat i auditoria immutable. RPC públiques invoker amb helpers privats autoritzats. Les escriptures directes dels clients a `pilot_players` es tanquen; el Base ja utilitza l'API acotada. Un operador estadístic necessita una assignació vigent del mateix partit/costat; les assignacions restringides a jugadors no poden crear identitats fora d'aquell abast. No guanya permisos oficials. La modificació de persones oficials existents requereix l'operador del partit; un estadístic pot corregir els seus provisionals autoritzats.

Vinculació posterior: seleccionar el provisional i una referència oficial del catàleg/acta del mateix partit/equip. El servidor recupera el codi federatiu; el client no el pot inventar. Es conserva l'UUID i no es modifiquen `pilot_events`, `stats_events` ni rellotges. Una identitat oficial ja vinculada no es pot substituir inadvertidament.

Importació: `ihc-sync` extreu rivals dels partits verificats del club, comprova IDs d'equip/jugador i els desa com a entrades federatives amb `club_team_id=null`. No crea equips rivals dins del club. No dedueix dorsals/porters a partir d'agregats de temporada. El catàleg parcial o buit preserva files anteriors. La versió de memòria cau força el primer import amb el parser nou. El Base resol els dos equips per IDs exactes dins la mateixa competició, mantenint el filtre Infantil aprovat.

En arribar una acta amb provisionals, les identitats noves queden disponibles per vincular; no s'identifiquen per nom/dorsal i no s'insereix una segona plantilla automàtica. Les actualitzacions de fitxa no alteren els dorsals/posicions del registre en joc ni desactiven persones absents d'una resposta parcial.

Fitxers de runtime: `base.html/js`, `basic-roster.js`, `avancat.html`, `federation-client.js`, `stats-ui.js`, nous `match-roster.js/.css`, `supabase/functions/ihc-sync/index.ts/parse.ts` i la migració. Entrades HTML/ES Modules amb versió nova per evitar recuperar el client anterior de la memòria cau. Models d'incidències i estadístiques preservats. Tests/helpers i documents específics a la mateixa branca.

## C. Proves executades

- Suite local completa al codi `12b5c26`: **122/122 Node, 40/40 Chromium**, zero fallides/omeses.
- Reforços posteriors: **6/6 Node de plantilla/permisos**, amb club aliè real dins de la base de proves, caducitat/revocació i rebuig de codi federatiu inventat; **4/4 Chromium de contingència**, amb editor a 390×844, 820×1180 i 1440×1000, tema fosc i objectius tàctils ≥44 px.
- Casos nous: plantilla absent/parcial, gol/blava/vermella provisionals, correcció durant el partit, UUID/agregats preservats, font oficial posterior, dos ordres d'entrada individual, recàrrega, resposta perduda/reintent únic i separació de l'acta/rellotges.
- Parser/importador: duplicació de files, IDs d'equip incorrectes, rival aliè al calendari, font falsa, imports repetits/parcials/buits sense esborrar dades. Les suites anteriors d'estadístiques, participants, permisos, concurrència i recuperació continuen correctes.
- `npm run check` i `npm run build`: 33 fitxers, artefacte estàtic compatible amb subdirectori Pages, sense SQL/tests/secrets. `git diff --check` correcte.
- Errors de les primeres execucions: helper SQL amb diverses ordres preparades, selectors de tests compartits i transport fictici antic d'INSERT. Corregits i reexecutats. Cap fallada final coneguda de les comprovacions locals.

Els tests utilitzen dades explícitament fictícies i PostgreSQL/PGlite real amb les funcions/RLS. El transport Auth/HTTP/WebSocket és local: **no acredita recepció de font federativa real, login de producció ni una prova física al pavelló**. La captura de l'editor fosc s'ha inspeccionat visualment. CI del conjunt final: consultar les comprovacions de la Pull Request.

Integritat real: les cinc empremtes/recomptes de l'auditoria són **idèntics entre 19:54:08 UTC i 20:15:31 UTC**. Infantil conserva 8 jugadors i 6 incidències. Cap compte, rol, partit, plantilla, incidència, sessió ni migració de producció creat/modificat per aquesta execució. [Evidència](visitor-roster-verification.json).

## D. Estat funcional

| Funcionalitat | Estat |
|---|---|
| Contingència i correcció de plantilla dels dos modes | OPERATIVA I VERIFICADA a l'entorn local; pendent de posada en servei |
| Gols, targetes i estadístiques provisionals persistents | OPERATIVA I VERIFICADA a l'entorn local |
| Reconciliació provisional → identitat oficial encara no materialitzada | OPERATIVA I VERIFICADA a l'entorn local; UUID preservat |
| Dues identitats ja materialitzades per a la mateixa persona | PARCIALMENT IMPLEMENTADA: conflicte detectat i conservat; fusió supervisada pendent |
| Parser/importació automàtica de rivals | IMPLEMENTADA; proves locals correctes, validació amb resposta oficial actual pendent |
| Recuperació real Vic/Alpicat | BLOQUEJADA PER DEPENDÈNCIA EXTERNA: accés SIDGAD |
| Instal·lació Supabase/Edge i frontend a Pages | PENDENT de revisió i autorització d'aquest bloc |

## E. GitHub i recuperació

Branca `fix/visitor-roster-contingency`, base `a5e54e7`. Checkpoints: `887aa7d` auditoria, `437cd37` backend, `12b5c26` integració/importador, `78c5da0` reforç d'editor/cau, `269096c` informe/permisos finals. [PR #27 draft per a revisió](https://github.com/Dudisooft/clubhoquei360/pull/27), sense fusió ni publicació. [CI del codi 269096c](https://github.com/Dudisooft/clubhoquei360/actions/runs/40129259665); consultar-ne el resultat verificable i les comprovacions del HEAD a la PR. `main` i Pages no s'han modificat. Llista exacta dels fitxers/commits: diff de la PR. [Continuïtat](CODEX_PROGRESS.md).

## F. Pendents necessaris

1. Revisar la migració i el canvi d'Edge Function. **No reaplicar migracions històriques.** Quan s'autoritzi: instal·lació i publicació coordinades; la incorporació de jugadors requereix el frontend nou. Recarregar els clients antics. Comprovar permisos RPC anònims/autoritzats i empremtes actuals abans d'acceptar el nou registre real.
2. Habilitar l'accés directe a la font oficial en un entorn de treball amb la política adequada; recuperar Vic/Alpicat, validar IDs/procedència/temporada i revisar només les entrades dels rivals. No cal demanar contrasenyes ni crear jugadors ficticis. El cron nou importarà amb la versió de memòria cau nova quan s'instal·li l'Edge Function revisada.
3. Si apareixen dues identitats amb incidències per a la mateixa persona, conservar-les i preparar una reconciliació supervisada amb tractament de les referències/temps de pista; aquesta entrega rebutja la fusió automàtica. No corregir per coincidència de noms.
4. Després de publicar amb autorització, verificar el flux amb el compte existent al mòbil. No afegir observacions de demostració als partits reals. La manca de xarxa completa continua exigint connexió per confirmar una alta nova; els reintents conserven la petició local.
