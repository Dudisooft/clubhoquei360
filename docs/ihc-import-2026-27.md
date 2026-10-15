# Importació integral IHC 2026/27

Estat verificat el 16/10/2026 (hora de Barcelona). Importació efectiva a Supabase, no una estructura buida.

## Cobertura

36 equips esportius, 38 inscripcions competitives, 22 competicions, 36 grups i 553 partits únics. D'aquests, 90 tenen resultat i codi oficial publicat; 463 encara no publiquen codi de partit. Cinc partits no tenen data/hora completa: no s'ha inventat cap inici. Les sis trobades entre dos equips IHC tenen dos vincles d'equip però un sol partit.

227 identitats federatives de jugadors, amb 538 vinculacions a plantilles. Una identitat es reutilitza per federació i codi oficial, independentment de l'equip o temporada. No es fusionen persones de federacions diferents només perquè coincideixi el nom: aquesta conciliació queda pendent quan no hi ha un identificador compartit verificat.

89 identitats d'staff amb codi federatiu i 80 registres d'staff procedents de fitxes sense codi verificat. Aquests 80 registres poden solapar-se amb altres persones; **no representen 80 persones noves confirmades**. Les funcions E1/E2/D/A/M/F es conserven quan la fitxa les publica; no s'infereixen càrrecs a partir del nom. No s'ha confirmat un coordinador general actual a partir de la pàgina antiga del club.

Les plantilles publicades inclouen inscripcions i participants en més d'un equip: els 40 jugadors de Nacional i 45 de Segona no es presenten com una convocatòria fixa ni exclusiva. Els dorsals i les posicions són observacions d'una fitxa oficial, amb el partit de procedència, no una suposició per categoria.

## Inventari importat

La columna d'staff indica registres amb codi + registres de fitxa pendents de conciliar. El fitxer [ihc-inventory-2026-27.json](ihc-inventory-2026-27.json) conté fonts i identificadors sense noms de menors.

|Categoria|Equip oficial del club|Federació:equip|Competició / grup|Jugadors|Staff identificat + pendent|
|---|---|---|---|---:|---:|
|ALEVÍ|IGUALADA HC A|FECAPA:12416|4789 / 4934|9|4 + 2|
|ALEVÍ|IGUALADA HC B|FECAPA:12417|4789 / 4935|7|3 + 2|
|ALEVÍ|IGUALADA HC C|FECAPA:12418|4789 / 4934|9|3 + 3|
|ALEVÍ|IGUALADA HC D|FECAPA:12423|4790 / 4879|12|3 + 3|
|BENJAMÍ|IGUALADA HC A|FECAPA:12425|4810 / 4945|8|4 + 2|
|BENJAMÍ|IGUALADA HC B|FECAPA:12426|4810 / 4947|8|4 + 2|
|BENJAMÍ|IGUALADA HC C|FECAPA:12427|4810 / 4949|13|3 + 3|
|BENJAMÍ|IGUALADA HC D|FECAPA:12428|4811 / 4957|12|3 + 3|
|FEM 11|IGUALADA HC|FECAPA:12422|4806 / 5002|10|3 + 3|
|FEM 13|IGUALADA HC|FECAPA:12421|4804 / 5001|9|2 + 1|
|FEM15|Igualada HC · FEM15|FECAPA:12419|4802 / 5010|7|5 + 0|
|INFANTIL|IGUALADA HC A|FECAPA:12410|4786 / 4921|16|5 + 3|
|INFANTIL|IGUALADA HC B|FECAPA:12411|4786 / 4917|9|3 + 2|
|INFANTIL|IGUALADA HC C|FECAPA:12412|4786 / 4917|10|4 + 0|
|INFANTIL|IGUALADA HC D|FECAPA:12413|4786 / 4920|34|6 + 2|
|INFANTIL|IGUALADA HC E|FECAPA:12414|4786 / 4925|16|5 + 3|
|INFANTIL|IGUALADA HC F|FECAPA:12415|4787 / 4992|17|4 + 4|
|JÚNIOR|IGUALADA HC A|FECAPA:12081|4782 / 4901|16|3 + 2|
|JÚNIOR|IGUALADA HC B|FECAPA:12082|4782 / 4902|16|3 + 3|
|JÚNIOR|IGUALADA HC C|FECAPA:12083|4782 / 4900|25|3 + 2|
|JÚNIOR|IGUALADA HC D|FECAPA:12406|4782 / 4901|27|7 + 2|
|JUVENIL|IGUALADA HC A|FECAPA:12404|4784 / 4912|15|5 + 2|
|JUVENIL|IGUALADA HC B|FECAPA:12405|4784 / 4907|14|6 + 3|
|JUVENIL|IGUALADA HC C|FECAPA:12407|4784 / 4909|21|5 + 3|
|JUVENIL|IGUALADA HC D|FECAPA:12408|4784 / 4911|20|4 + 3|
|JUVENIL|IGUALADA HC E|FECAPA:12409|4785 / 4894|19|5 + 2|
|NACIONAL CATALANA MASCULINA|IGUALADA HC|FECAPA:12077|4774 / 4864|40|12 + 2|
|OK LIGA|SIMAR IGUALADA HC|RFEP:3697|3575 / 3575|18|7 + 3|
|PREBENJAMI|IGUALADA HC A|FECAPA:12430|4813 / 4999|7|5 + 3|
|PREBENJAMI|IGUALADA HC B|FECAPA:12431|4814 / 4967|6|3 + 0|
|PREBENJAMI INICIACIO|IGUALADA HC A|FECAPA:12432|4816 / 4975|6|3 + 0|
|PREBENJAMI INICIACIO|IGUALADA HC B|FECAPA:12434|4816 / 4973|6|2 + 0|
|SEGONA CATALANA MASCULINA|IGUALADA HC|FECAPA:12078|4779 / 4873|45|23 + 2|
|SÈNIOR · primer equip|IGUALADA RIGAT HC|RFEP:3696|3568 / 3568|0|0 + 0|
|SÈNIOR · primer equip|IGUALADA RIGAT HC|RFEP:3696|3592 / 3592|0|0 + 0|
|SÈNIOR · primer equip|IGUALADA RIGAT HC|FECAPA:12074|4858 / 4859|11|9 + 5|
|TERCERA CATALANA MASCULINA|IGUALADA HC A|FECAPA:12079|4781 / 4944|12|4 + 3|
|TERCERA CATALANA MASCULINA|IGUALADA HC B|FECAPA:12080|4781 / 4943|8|2 + 2|

Són 2 equips d'iniciació, 2 prebenjamins, 4 benjamins, 4 alevins, 6 infantils, 5 juvenils, 4 júniors, FEM11/FEM13/FEM15 i 6 sèniors. No s'ha deduït el sexe de cap jugador ni s'ha declarat una categoria de base masculina o mixta sense publicació explícita.

El primer equip té una sola identitat interna i tres inscripcions: FECAPA 12074 (Lliga Catalana) i RFEP 3696 (OK Lliga i Supercopa). La coincidència s'ha contrastat amb els calendaris oficials i la crònica municipal del Vilafranca–Igualada Rigat 1–4 del 14/10. La plantilla del primer equip és accessible a la FECAPA; els apartats RFEP d'OK Lliga/Supercopa encara no publiquen una plantilla per a aquesta identitat, i queden expressament pendents en aquesta font.

## Fonts verificades

- FECAPA: https://www.hoqueipatins.fecapa.cat/ temporada 41, club 252. L'índex oficial associa el club a 19 competicions actuals.
- RFEP: https://www.hockeypatines.fep.es/league/3568 temporada 41, club 69, i les competicions 3575 i 3592.
- Club: https://www.igualadahc.com/base_equips/ . Aquesta pàgina inclou fotografies del 2024 i categories antigues; no s'ha utilitzat per inventar equips del 2026/27.
- Contrast del primer equip: https://radioigualada.cat/lacarta/igualada-rigat-tanca-fase-de-grups-lliga-catalana-victoria-contundent-pista-vilafranca/

El terme Minis de la pàgina del club queda pendent de verificació actual, registrat com a incidència d'inventari a federation_import_runs. No s'ha creat un equip federat fictici. Tampoc s'han creat equips antics només perquè apareguin a les fotografies de la web.

## Implementació i actualitzacions

Es reutilitzen clubs, seasons, teams, federation_competitions, federation_groups, federation_team_entries, federation_players, federation_team_roster, federation_matches i federation_import_runs. Només s'afegeixen dues relacions necessàries: club_staff_people (identitat d'staff) i federation_match_teams (equips IHC participants, inclosos derbis). Les columnes short_name, verification_status i source_url de teams i staff_person_id de la plantilla són additives.

La funció nova federation_commit_ihc és SECURITY INVOKER i només executable pel servidor. Valida club/temporada, rebutja equips i partits aliens, treballa dins una transacció, usa bloqueig assessor i claus estables. Les dades incompletes no eliminen dorsals, marcadors o horaris verificats. Les baixes de plantilla es marquen sense eliminar l'històric. Els registres i errors de sincronització són interns.

La funció Edge ihc-sync (versió 1) està desplegada i utilitza l'autorització de servidor existent del projecte, desada a Vault. No s'han creat credencials ni comptes. No hi ha claus privades al repositori. La consulta federativa s'executa al servidor, no al navegador.

La tasca cron ihc-federation-hourly està activa a les :17 de cada hora UTC. Actualitza una competició per execució, amb memòria cau de 18 hores; una rotació completa abasta 21 competicions. La competició FEM15 es conserva amb el seu importador existent, inclosa l'actualització en seleccionar un partit. No s'han modificat el seu codi ni les seves fonts operatives. El descobriment d'una nova competició fora del manifest pot consultar-se amb l'acció discover; cal revisar i incorporar la nova entrada abans d'afegir-la a la rotació.

S'han consultat les últimes fitxes disponibles de cada equip quan hi havia un codi publicat per verificar dorsals i posicions. Algunes fitxes incompletes no superen la validació de porters i queden marcades indisponibles; la plantilla federativa publicada continua disponible. No s'han importat totes les línies d'incidències de tots els partits ni s'han reconstruït minuts absents.

## Privacitat i preservació

No s'han creat pilot_matches, pilot_members, club_memberships ni comptes amb aquesta importació. Cap permís nou de client. Les noves relacions romanen reservades al servidor i no s'han ampliat els drets de lectura existents. **El model està importat; la navegació gràfica i la configuració futura d'accés de club es treballaran en una altra fase.** Els comptes actuals sense afiliació de club continuen sense accés a les taules normalitzades: no s'ha resolt obrint-les públicament.

Les polítiques existents protegeixen la informació interna per membres de partit i per club en el model normalitzat. La nova política restrictiva impedeix noves anotacions en partits federatius verificats aliens a l'IHC. federation_prepare_match rebutja preparar-los com a partit intern; la consulta admissible és el resultat públic i l'enllaç federatiu. El pilot antic sense font federativa, ja assignat a l'operador, es conserva com a excepció de compatibilitat. El registre antic Vilano–Alcobendas no s'elimina ni es reescriu, però ja no admet noves anotacions internes.

La comparació immediatament posterior a la importació va confirmar idèntics els 31 partits operatius previs, fonts, 153 jugadors operatius, 342 esdeveniments, 6 estats d'operador, membres i afiliacions de club. En el control final hi ha activitat paral·lela a 23:00–23:01 UTC: la funció federation-sync antiga ha renovat fetched_at/last_checked_at/last_imported_at en tres Simar i els estats d'operador han rebut noves revisions. Els camps esportius oficials i tots els esdeveniments continuen idèntics. Aquest importador no escriu aquestes taules i no s'han restaurat estats anteriors sobre l'activitat concurrent. Inclou els tres Simar protegits i tot el FEM15. No s'han tocat avancat.html, federation-client.js, historial.html, historial.js, el motor de minuts, disciplina, cronòmetres o pantalles d'estadístiques.

## Proves

- npm test: 18 proves superades en aquesta auditoria, inclosa lectura de les fonts reals de les 22 competicions. Les proves permanents utilitzen dades sintètiques. Els HTML i les plantilles personals temporals no es publiquen al repositori.
- Primera migració i importacions de prova dins transacció revertida, abans de la importació efectiva.
- Dues importacions consecutives de Nacional dins transacció: sense duplicats.
- Invocació real Edge de la Lliga Catalana: HTTP 200, verified, 1 equip, 4 partits i 25 registres de plantilla.
- Endpoint sense autorització: HTTP 401. anon/authenticated no poden executar l'importador.
- Inserció amb l'operador real en un partit aliè: rebutjada per RLS. Inserció en un partit Simar: acceptada. Ambdues proves revertides sense deixar esdeveniments.
- Identitat de prova aliena: 0 esdeveniments i 0 estats privats visibles; el model de club no té accés concedit.
- Cap duplicat de clau de partit; relacions de participants i identificadors revisats.

L'assessor de seguretat conserva avisos previs: pg_net en public, funció antiga pilot_claim_eduard_access SECURITY DEFINER i protecció de contrasenyes filtrades desactivada. No s'han modificat aquestes configuracions sensibles. federation_import_runs no té política de client perquè és un registre reservat al servidor. Referència: https://supabase.com/docs/guides/database/database-linter

## Fitxers i següent fase

Codi: supabase/functions/ihc-sync/{index.ts,parse.ts,manifest.json}. SQL: supabase/ihc-import.sql, ihc-privacy.sql i ihc-schedule.sql. Proves: tests/ihc.test.mjs. .gitignore exclou els fitxers generats de les proves. El parser compartit i l'importador FEM15 es conserven intactes.

Següent fase funcional: construir la navegació Club → Temporada → Categoria → Equip sobre aquestes dades i decidir explícitament els accessos de club; confirmar Minis i conciliar les identitats d'staff sense codi. No cal tornar a introduir manualment les plantilles ni els calendaris importats.

