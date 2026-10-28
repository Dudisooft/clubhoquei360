# ClubHoquei360 · Auditoria final 3A.2


Actualització posterior: [3A.3 · Auth real local](STAGING_AUTH_3A3_2026-10-28.md), completada en pila aïllada. Els pendents d’Auth d’aquest informe es conserven com a estat de 3A.2; les limitacions i condicions de classificació/desplegament continuen vigents.
Inici 27/10/2026; recuperació i tancament 28/10/2026. Temporada 2026/27. Auditoria del candidat de les PR [#31 servidor](https://github.com/Dudisooft/clubhoquei360/pull/31) i [#32 frontend](https://github.com/Dudisooft/clubhoquei360/pull/32), separades i en esborrany, base `main e009f4d`. No hi ha fusió, desplegament, migració remota, classificació instal·lada, compte o permís real modificat.

**Resultat: APTE AMB CONDICIONS.** El defecte de seguretat reproduït està corregit i les suites finals són verdes. Abans de publicar cal validar Auth en un entorn aïllat autoritzat, aportar/revisar les evidències d’edat pendents i revisar les metadades i el procediment de desplegament. No equival a autorització per publicar.

## Evidència i recuperació

El treball local vàlid s’ha recuperat sense reset/clean. La correcció `1b6cad8` no estava pujada; s’ha conservat i publicat junt amb el checkpoint de preflight/metadades **`07504fd6d0f216464115bd026d68ab5467187ea7`**. Frontend verificat **`9c61ca0e6dbe26c6d9e9e513763005c21cbeeb56`**, amb servidor fixat a aquest SHA, sense copiar migracions ni fusionar branques. Els commits documentals posteriors no canvien el runtime verificat.

Informes 3A i 3A.1 i les dues migracions rellegits; política INSERT i funcions rellevants contrastades amb l’esquema real mitjançant SELECT. La nova prova de regressió reprodueix el predicat de producció amb identitats fictícies. No és una segona persona revisora ni una validació Auth real: és una revisió separada dels supòsits anteriors, amb reproducció independent del defecte.

Els logs /tmp de l’execució interrompuda s’han perdut. S’han conservat els resultats de les eines a la conversa i els informes JSON Chromium originals. Només s’han repetit les tres proves afectades per l’últim canvi de preflight i els recorreguts conjunts modificats. La CI final torna a executar les suites completes sobre els commits indicats. Evidències persistents: [proves](evidence/audit3A2-tests.json) i [dades](evidence/audit3A2-data-check.json), sense noms de jugadors, correus ni credencials.

## VERD — completat i verificat

### Correcció de seguretat A01

La política antiga real `pilot_events_authorized_insert` permet notes al rol `statistician`. La fixture anterior només reproduïa la branca `operator`, de manera que no detectava dues vies: notes amb marques Base (`basic_finished`, `basic_participants`, targeta groga), i notes amb `payload.kind='gol'` en categories amb Avançat disponible. Els models de consulta interpreten el payload, per tant es podia alterar la representació de l’acta sense usar `event_type='goal'`.

Reproducció local abans de corregir: **2 proves fallen / 2 passen**. Correcció a la migració 3A no instal·lada: política restrictiva addicional `pilot_event_semantic_operator`, amb helper privat d’identitat de l’operador oficial del partit. Comprova tipus, kind i origen Base; tenir Avançat esportiu o una autorització estadística no substitueix el rol oficial. No es relaxen polítiques anteriors ni s’alteren files històriques. Regressió focalitzada **32/32**; suite final **188 Node / 47 Chromium**, sense fallades ni omissions.

No s’ha corregit directament la producció: el defecte queda resolt al candidat revisable. La protecció entrarà en servei únicament després d’una instal·lació autoritzada del servidor corregit.

### Permisos i modes

| Cas | Disponibilitat esportiva | Escriptura i evidència |
|---|---|---|
| Sènior i Júnior, qualsevol divisió | Base i Avançat | Requereix permisos operatius existents; tests PostgreSQL i contractes UI, inclosos OK Lliga, Tercera Catalana i Júnior Or/altres |
| Juvenil i inferiors | Base ordinari | Avançat ordinari denegat també per URL; entrenador, delegat, admin i coordinador de secció no obtenen excepció |
| Superadmin habilitat | Excepció Avançat | Identitat/estat a dades del servidor; deshabilitat o rol diferent denegat |
| Coordinador esportiu principal | Excepció Avançat del seu club | `general_coordinator`, `team_id IS NULL`; no herència des de coordinació de secció ni travessa de clubs |
| Categoria desconeguda | Base; Avançat ordinari denegat | No es dedueix sènior d’una divisió desconeguda |
| Operador temporal | Base segons drets previs; Avançat només al partit autoritzat | Àmbits d’acció/costat/jugador, termini i RLS; no crea membre ni rol global, no concedeix actes oficials |

La disponibilitat del mode no crea una assignació estadística. Les comprovacions de les funcions privilegiades usen `auth.uid()` i dades protegides, no `user_metadata`, URL, perfil visual, localStorage o rellotge client. RLS protegeix lectura i escriptura; les taules estadístiques no tenen DML directe per al client. Els àlies anteriors són inexecutables pels clients i no actuen de bypass. No hi ha vistes noves que esquivin RLS. Les vies de preparació oficial segueixen la guarda de 3A; les estadístiques temporals no s’hi afegeixen.

### Autoritzacions temporals

Proposta 24 h, inici/final configurables, màxim **168 hores absolutes**, també en canvi d’horari; sense dates infinites. Només els dos autoritzadors aprovats concedeixen/revoquen. UUID Auth existent, club/equip/context canònic i scopes verificats. Identificadors o permisos manipulats i reutilització incompatible de peticions es deneguen. Repetició legítima del mateix request/mutation UUID no duplica dades.

Dues autoritzacions del mateix compte en partits diferents funcionen de manera independent. Revocar-ne una no revoca l’altra ni elimina dades. Revocació i escriptures comparteixen bloqueig de partit; sessions amb revisions CAS. L’expiració es comprova amb temps del servidor a cada operació nova. Sessió oberta i client amb estat antic: 42501, refresc de capacitats i registre bloquejat; cua local conservada sense simular ACK. Recarregar després de revocació/caducitat denega també l’entrada directa. Les observacions legítimes, les sessions i l’auditoria romanen desades.

Mentre el permís és vigent es pot consultar l’històric del partit autoritzat. Després de perdre l’únic permís no es llegeixen estadístiques; només metainformació pròpia d’autorització. Responsables amb drets independents mantenen la consulta. Les assignacions ordinàries vigents no s’esborren ni s’amplien. No se solapen àmbits temporals amb altres operadors i les concessions ordinàries posteriors també es comproven.

**Pèrdua de privilegis de l’autoritzador:** es comprova i es denega qualsevol concessió/revocació nova seva. Una delegació finita legítimament concedida conserva el termini original fins que un responsable vigent la revoca; no és una herència dinàmica del rol. Aquesta conducta està provada explícitament. El procediment de baixa ha d’incloure revisar/revocar les delegacions actives abans de retirar l’autoritzador; no s’ha introduït una anul·lació automàtica nova.

### Activació i preservació

- RFEP futur: consulta sense escriptures → activació explícita autoritzada → una passada → recàrrega. **1 context / 1 membre operatiu / 1 estadística / 0 incidències oficials**. Activar repetidament conserva la mateixa identitat.
- Context Base sènior existent: compleció explícita per Avançat sobre el mateix UUID, sense substituir incidències. Un futur no es bloqueja només per la data.
- En curs/disputat: recuperació del registre, sessions i mutacions existents. Consultar o recarregar no envia la cua ni crea registres automàticament.
- Finalitzat: conserva les regles de tancament; quan correspon exigeix anàlisi separada explícita i conserva l’original.
- FEM15 fictici: autorització, vídeo manual, equip/jugador, pausa/reprèn/recarrega, intent sobre un altre partit i acta denegats, revocació/caducitat i nova recàrrega denegada. **2 observacions conservades, 0 membres externs nous, 0 contextos nous**, assignacions i estat oficial iguals.

### Migracions i preflight

Ordre: `20261027170248_match_mode_access.sql` → `20261027183214_temporary_match_operators.sql`. La correcció s’inclou a la primera perquè s’ha confirmat que encara no està instal·lada. No s’ha reescrit una migració aplicada.

[Preflight de només lectura](../scripts/preflight-match-mode-access.sql): dependències, signatures, polítiques requerides, ambdues columnes d’edat, vuit àlies esperats, tres RPC temporals, taules i contextos club/temporada. Detecta columna sola, instal·lació parcial, ordre incorrecte o versió diferent i retorna STOP. El resultat real actual és **READY_SCHEMA**, cap dependència absent i zero contextos d’equip incoherents. No certifica Auth ni aprova metadades.

Proves locals PostgreSQL/PGlite: ordre invertit falla dins de transacció sense deixar taules; error injectat en la primera migració torna al baseline; només primera migració → STOP parcial; ambdues → comprovació posterior; reexecució accidental falla i es reverteix, sense alterar dades; dependència eliminada → STOP. No es tracta la DDL com a reexecutable: la història de migracions i el preflight prevenen duplicats. ACL, SECURITY DEFINER, search_path buit, anon, àlies i RLS comprovats. Les funcions operatives són idempotents pels seus identificadors, no recreen contextos.

No s’han detectat recursions RLS als casos executats; la consulta de correcció oficial usa helper delimitat. Els bloqueigs de partit i de sessió tenen ordre consistent als camins revisats. PGlite/CAS no equival a una prova de càrrega o concurrència amb múltiples connexions PostgreSQL reals: aquesta comprovació queda al pla de staging.

### Proves i CI finals

| Àmbit | Local | CI comprovada |
|---|---|---|
| Servidor #31 | 188 Node durant l’execució anterior; tres afectades repetides 3/3; informe Chromium 47/47 conservat | [40643271480](https://github.com/Dudisooft/clubhoquei360/actions/runs/40643271480): **188 Node / 47 Chromium, check/build 35 PASS**, commit `07504fd` |
| Frontend #32 | Runtime intacte: 158 Node previs i informe Chromium 67/67 conservat | [40643528800](https://github.com/Dudisooft/clubhoquei360/actions/runs/40643528800): **158 Node / 67 Chromium, check/build 38 PASS**, commit `9c61ca0` |
| Integració conjunta | Futur RFEP i FEM15 reforçat: PASS a la represa | Dos scripts natius PGlite + Chromium PASS a la CI #32 amb migracions del SHA servidor `07504fd` |
| Regressions #28/#29/#30 | Incloses a les suites: selector, Base, filtratge/elegibilitat i reforços | PASS; sense incorporar altres PR pendents |
| Auth real | No executada | No acreditada per identitats fictícies ni pels JWT locals de proves |

Logs de CI llegits, sense fallades/omissions. El preflight endurit després de la suite local anterior sí queda inclòs a la suite completa final de CI. No hi ha diferències funcionals observades entre els resultats locals i CI.

### Comparació de dades

[Empremtes i recomptes](evidence/audit3A2-data-check.json): 23 conjunts de dades/permisos. Inclou equips, plantilles/jugadors, convocatòries dins del journal, contextos, gols/targetes, estadístiques, sessions, assignacions, estats oficials, membres i comptes. Taules d’autorització 3A.1 inexistents a producció; la seva preservació es prova localment.

Entre el 27 i la represa del 28: tots els recomptes iguals; **19 empremtes iguals i 4 diferents** (`federation_match_sources`, `federation_matches`, `federation_team_entries`, `federation_team_roster`). No es pot determinar la causa ni afirmar que només canviessin timestamps amb una empremta agregada. Semàntica rellegida dels 36 equips/38 entrades —ID, nom, categoria, club, temporada i inscripcions— igual a l’instantània anterior. Actes d’operador, estadístiques, sessions i permisos mantenen empremtes iguals.

**Tram de represa, abans/després de les consultes de només lectura: 23/23 recomptes i empremtes iguals.** Totes les consultes remotes de l’auditoria han usat BEGIN READ ONLY/ROLLBACK. No s’ha exportat contingut personal de jugadors/comptes als informes ni s’ha escrit en partits reals.

## TARONJA — condicions i límits abans de publicar

### A02 · evidència de classificació

[Matriu completa de 36 equips](match-security-matrix-20261027.md) i [JSON](match-security-matrix-20261027.json). Proposta: 6 sènior, 4 júnior i 26 inferiors; **no aplicada**. 31 amb categoria d’edat explícita al catàleg, revisió humana pendent. Cinc propostes sènior només tenen divisió i necessiten evidència independent: **SIMAR, Nacional Catalana, Segona Catalana i Tercera Catalana A/B**. Els seus UPDATE estan comentats; sense classificació verificada el servidor denega Avançat ordinari conservadorament. Això impedeix publicar donant per complet l’accés ordinari de tots els sèniors.

El script de proposta exigeix revisió explícita i acaba en ROLLBACK. Provat: sense aprovació no escriu; amb aprovació local només proposa 31 canvis i els reverteix. No és un script per instal·lar a cegues.

SIMAR consta al catàleg RFEP **3575 · OK LIGA PLATA SUR**; Rigat, a **3568 · OK LIGA MASCULINA** i altres competicions. No es canvien inscripcions per ajustar-les a denominacions de prompts anteriors. No es confonen equips A/B/C/D ni un reforç amb un habitual. FEM9/FEM17 i altres categories absents no s’inventen. La xarxa ha denegat les fonts federatives directes amb CONNECT 403; l’evidència del catàleg no és una nova verificació web ni acredita que el catàleg inclogui tot el club.

### A03 · Auth i entorn

Inventari accessible repetit a la represa: un projecte Supabase, el de producció, i zero branques de desenvolupament. No hi ha un staging aïllat accessible i autoritzat. **Auth real pendent**. No s’han creat comptes, canviat rols o executat proves d’escriptura a producció. La consulta amb l’actor tècnic no és una sessió Auth del superadministrador ni valida el coordinador principal real.

Avisos del projecte existent revisats durant l’auditoria: pg_net a public, dues RPC antigues SECURITY DEFINER intencionades i configuració de protecció de contrasenyes. La reclamació antiga d’accés comprova compte Auth/correu confirmat i partits delimitats; no es basa en user_metadata. No es modifica aquí. Cap vista nova ni credencial de servei al client. Els avisos de producció no certifiquen les migracions encara no instal·lades; cal revisar exposició d’esquemes i configuració Auth a staging.

## NEUTRE — pla de validació i desplegament pendent d’autorització

### Staging i Auth real

1. Autoritzar i identificar un projecte/entorn separat, amb ref i URL diferents de producció, cost conegut abans de crear-lo. No clonar dades personals de producció; esquema compatible i dades esportives explícitament fictícies. Confirmar aïllament, backups i absència de trànsit al projecte productiu.
2. Preparar un artefacte frontend de revisió amb app-client apuntant exclusivament al ref i clau pública de staging, sense claus de servei. No canviar la configuració publicada ni reutilitzar sessions locals de producció. Comprovar també Edge Functions/URLs de retorn i esquemes exposats; app_private no és una API de clients.
3. Comptes legítims de prova verificats per Auth/OTP o invitació amb SMTP funcional, sense credencials personals ni contrasenyes conegudes al codi. UUID reals de staging per superadmin habilitat, coordinador principal, secció, entrenador, delegat, operador extern i usuari d’un altre club. Assignacions mínimes, només sobre dades fictícies.
4. Instal·lar baseline compatible i ambdues migracions en ordre; preflight abans/després. Executar la matriu de permisos també fent REST/RPC directes amb sessions Auth reals: rols deshabilitats, metadata/URL manipulats, equips i clubs diferents, denegació d’acta i de preparació oficial a l’extern. Repetir concessió, revocació i caducitat curta amb el rellotge del servidor; no simular-la movent el rellotge del mòbil.
5. Dos dispositius i connexions reals: scopes diferents, duplicat del mateix UUID, ACK perdut, revisions CAS, revocació amb sessió oberta i cua offline. Comprovar que no es crea cap context per consultar i que el responsable continua veient les observacions després de revocar. Validar el procediment de cessament de l’autoritzador.
6. Guardar resultats/empremtes sense tokens ni dades personals i revisar visualment mòbil/tauleta/ordinador. Només després decidir la publicació.

### Desplegament controlat

1. Completar evidència dels cinc equips pendents i revisió humana de tota la proposta; cap whitelist de divisions a RLS. No instal·lar la proposta actual sense aquest pas. Completar la validació Auth/staging anterior.
2. Revisar i autoritzar expressament les dues PR. Capturar versions, ACL/polítiques, recomptes/empremtes i còpia recuperable; preparar una finestra d’operació que eviti escriptures concurrents durant la instal·lació.
3. Executar el preflight de només lectura. Davant qualsevol STOP, ajornar i investigar; no forçar IF NOT EXISTS ni reiniciar dades. Instal·lar cada migració transaccionalment, per ordre i amb història versionada. No publicar frontend entre les dues.
4. Instal·lar només classificacions amb evidència aprovada, preservant valors existents i procedència. Verificar integritat, ACL/RLS i smoke tests autoritzats; comparació de dades abans/després.
5. Publicar frontend #32 compatible només quan el servidor estigui verificat. Pilot delimitat i reversible, amb comptes ja autoritzats, seguit de supervisió de denegacions/duplicats. No hi ha cap acció de publicació executada per aquesta auditoria.

### Recuperació sense pèrdua

- Si una migració falla dins de transacció, ROLLBACK de la transacció fallida i preflight; conservació provada per fault injection. Si només la primera es va confirmar, deixar frontend anterior i aturar la publicació; revisar i completar cap endavant, mai executar la segona cegament sobre un estat desconegut.
- Si falla el frontend, recuperar l’artefacte anterior verificat i mantenir les guardes de seguretat del servidor. No retirar la política correctora ni recrear permisos amplis per fer desaparèixer errors.
- Si es detecta un problema de seguretat en servei, amb autorització administrativa congelar escriptures als RPC públics **i** helpers privats de registre/sessió/activació afectats, a partir de les ACL guardades; o revocar les delegacions concretes amb el RPC auditat. Preservar consulta autoritzada i còpies locals. Un rollback només visual no bloqueja l’API.
- No DROP de taules/columnes/àlies amb dades o dependències, ni DELETE d’autoritzacions, estadístiques, sessions o auditoria. No restablir la producció sencera a un punt anterior perdent registres legítims posteriors. Una còpia es restaura en un entorn aïllat per comparar i preparar reparació cap endavant.
- Recuperar permisos des de les ACL exactes revisades; no GRANT global a anon/authenticated ni rehabilitar àlies privats antics. Reparacions amb migració nova i revisió, conservant UUID, revisions, procedència i auditoria. No s’ha aplicat cap d’aquestes mesures a producció.

## Veredicte final

**APTE AMB CONDICIONS.** Candidat amb defecte reproduït corregit, proves locals/CI i integració compatibles. No queda cap vulnerabilitat reproduïda pendent de correcció al candidat auditat. Abans de publicar són imprescindibles l’evidència/revisió de classificacions —especialment els cinc sèniors—, la validació Auth en staging aïllat, la revisió humana del procediment i l’autorització expressa. Les PR continuen en esborrany, sense fusió ni desplegament.
