# Connexió federativa · 14/10/2026

Implementació: Edge Function `federation-sync`, fonts privades a Supabase i Mode Avançat amb el disseny existent. No s'inclouen plantilles ni informació de menors al repositori públic.

## Fonts verificades

Els dos portals comparteixen SIDGAD. Les fitxes i calendaris són fragments HTML, no una API JSON documentada.

- RFEP competició 3575, temporada 41 (2026/27): https://www.hockeypatines.fep.es/league/3575
- Partit 35529: Simar Igualada HC – Feníe Energia Cerdanyola CCH, 26/09/2026 20:30, 3–2. 20 jugadors, quatre porters, sis tècnics.
- Partit 35537: Alcobendas – Simar Igualada HC, 12/10/2026, 4–3. 19 jugadors.
- FECAPA competició 4786: https://www.hoqueipatins.fecapa.cat/league/4786
- Partit 152027: Igualada HC D – Malgrat, 26/09/2026, 6–2. 16 jugadors.

POST `https://www.server2.sidgad.es/{federacio}/{federacio}_gr_{partit}_1.php`, camps `idm=1`, `idc`, `idp`, `tab=tab_ficha_resumen`. Necessita `Origin`, `Referer` del portal i `X-Requested-With: XMLHttpRequest`; sense aquestes capçaleres retorna HTTP 200 buit. S'utilitzen les capçaleres normals del portal, sense cookies privades, autenticació federativa o elusió de controls.

Calendari: `{federacio}_cal_idc_{competicio}_1.php`. Classificació: `{federacio}_clasif_idc_{competicio}_1.php`. Fitxes: modal; l'acta oficial és una altra vista del mateix fragment HTML. No es pressuposa una exportació PDF separada.

Escuts RFEP del pilot: `https://www.sidgad.cloud/rfep/images//logos_clubes/69_1.png` i `98_1.png`, verificats a la fitxa oficial. Identificadors de clubs/escuts i equips són diferents. `team_3697` correspon a l'equip RFEP d'Igualada; no s'uneix amb FECAPA pel nom. Jugadors identificats pel codi de la federació; cap unió de persones només pel nom. Estabilitat entre temporades no garantida.

## Funcionament i protecció

- `federation_match_sources`: identificador de federació, competició i temporada, instant de consulta, resultat/plantilles/incidències oficials. Font separada de `pilot_events`.
- `pilot_players`: UUID local estable i identificador federatiu; mai s'esborren jugadors amb esdeveniments manuals. Canvis conflictius de dorsal fallen atòmicament.
- `federation_calendar_cache`: calendaris i classificacions per federació, competició i temporada.
- `federation_sync_runs`: èxits, errors i consultes parcials. HTML buit o format inesperat no es dona per verificat.
- `pilot_operator_state`: cronòmetre, titulars, equipacions i estat amb revisions optimistes. Conflictes recuperen l'estat desat i preserven les anotacions.
- Realtime: insercions d'esdeveniments i canvis d'estat. Correccions persistents com a nous esdeveniments; no s'esborren els originals.
- Cua local d'anotacions amb UUID evita duplicació després d'una resposta o d'una reconnexió.
- Servei: autentica l'usuari i verifica que sigui operador del partit. El programador utilitza un token aleatori a Vault, sense publicar-lo. RLS restringeix les lectures als membres; les funcions d'importació només són executables per `service_role`. Cap clau privada al client.
- Selecció: competició accessible → partit ja registrat o partit amb codi verificat al calendari → importació al servidor → confirmació dels cinc titulars. Els partits futurs sense codi publicat es mostren al calendari, però no se'ls inventa un identificador.

## Cobertura i límits

RFEP: els pilots 35529/35537 i la competició 3575. FECAPA: pilot 152027 i competició Infantil OR 4786. El lector és reutilitzable per a altres competicions, però no s'ha activat tot el conjunt anterior de 19 competicions ni totes les categories de Manresa. Els equips presents al calendari són consultables; no s'ha completat la correspondència de clubs/equips amb les taules generals `clubs`, `teams` i `federation_matches`, que requereixen el model de membres dels clubs. L'aplicació encara utilitza l'estructura del pilot autoritzat.

Gols i assistències són valors publicats per acta, sense atribuir automàticament gols administratius com a confirmats. Incidències oficials resten independents dels operadors. No s'apliquen sancions automàtiques ni s'acumulen entre federacions sense identitat/normativa verificades. La plantilla per a partits futurs pot no estar publicada. Colors d'equipació són provisionals.

L'avís legal RFEP https://fep.es/aviso-legal restringeix reutilització/explotació i no dona llicència oberta; conté una referència aliena que cal aclarir. No s'ha verificat el permís general FECAPA. SQL de consulta programada de sis hores preparat al repositori, **sense cap tasca activa desplegada** fins a aclarir autorització. Importació iniciada per l'operador: memòria cau de sis hores; no extraccions massives. No es publiquen les plantilles en obert.

## Validació

Importacions reals des d'Edge Function verificades per registre d'execució per als tres pilots. Comprovació d'identificadors, nombre de jugadors, porters, escuts i marcador oficial. Proves automatitzades del lector, correccions, deduplicació, marcador i errors. Comprovacions RLS i persistència en transaccions de prova que es reverteixen.

Prova visual autenticada: plantilles i escuts oficials carregats al Mode Avançat; confirmació de cinc titulars per equip; gol de prova conservat en reobrir el document i visible en una segona pestanya autenticada; Gol − rebut en directe a la segona pestanya. El marcador final es conserva com abans de la prova. L'historial conserva la confirmació de titulars i el parell Gol + / Gol − de comprovació. S'ha corregit un bloqueig dels controls després de la càrrega asíncrona i s'ha afegit una prova de regressió. Dues pestanyes del mateix navegador validen dues sessions de Realtime, però la prova amb dos dispositius físics encara és pendent.

Advisors: la funció d'accés existent `pilot_claim_eduard_access` és SECURITY DEFINER; la protecció contra contrasenyes filtrades està desactivada i una taula prèvia d'importació no té polítiques. `pg_net` genera avís de localització a public i no és relocatable. No s'han alterat aquestes configuracions sensibles.
