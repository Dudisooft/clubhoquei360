# Fase 3A.10 · Automatització federativa i convocatòries per WhatsApp

30/10/2026. Branca `feat/federation-automation-callups-3a10`, base `00db330` (integració/auditoria 3A.9). Primer checkpoint `39241eb`; consultar `CODEX_PROGRESS.md` i `git log -1` per al tancament. Sense fusió, desplegament ni escriptura productiva.

## 1. Estat inicial i dependències

main `e009f4d`; PR #31 `3cce758`, #32 `b76afcd`, #33 `1b83921`, obertes/en esborrany i sense fusionar. La branca de revisió conté la integració anterior; **no s’atribueix aquesta integració a main o a producció**. #31 aporta l’accés de modes/RLS, #32 la navegació i #33 l’importador additiu/permisos tècnics. No s’han canviat aquestes branques.

El camí ihc-sync tenia manifest, club i temporada fixos i un cas FEM15 específic. Es conserva per compatibilitat; la nova cua reutilitza el transport, parser i sincronització d’actes existents, amb àmbit explícit. No hi havia generador WhatsApp ni plantilla canònica posterior trobada al repositori: la font funcional és el format original aprovat al prompt 3A.10, verificat literalment al test del model.

El paquet `ops/truncate-3a8` no es modifica. Les 49 concessions/27 taules i dos defaults continuen amb l’estat de bloqueig productiu de 3A.9; cap SQL de correcció executat.

## 2. Fonts disponibles i limitacions

Fonts de referència: [FECAPA](https://www.hoqueipatins.fecapa.cat/) i [RFEP](https://www.hockeypatines.fep.es/). Els importadors existents usen fragments públics SIDGAD amb IDs de competició/grup/equip/acta, sense cookies personals, autenticació de federació ni credencials de l’usuari.

Consultes d’investigació a dominis oficials i cerca de documentació no han acreditat una API pública documentada, feed ICS o contracte d’exportació de plantilles/actes autoritzat per als dos portals. L’existència d’altres webs que reutilitzen dades no és prova d’autorització ni font oficial substitutiva. No s’han importat dades d’aquests tercers.

Connexions des de l’executor: CONNECT 403 del túnel cap a RFEP, FECAPA i server2.sidgad.es, abans de resposta d’origen; no s’atribueix a un bloqueig de la federació. L’eina web independent només mostra parts indexades/carcassa, sense acta 35559 recuperable. El recorregut portal → temporada → competició → grup → equip → pestanya → «Tornar a competicions» es conserva documentat; no s’ha simulat com a reproducció real ni substituït per goBack.

Cal confirmar amb FECAPA/RFEP el canal suportat, autorització d’ús, límits, identificadors de temporada/club i accés a les actes. Proposta de consulta preparada al final, **no enviada**. La xarxa ha de permetre els dominis autoritzats abans de validar extracció real. Un 403 no es converteix mai en una plantilla buida.

## 3. Arquitectura d’automatització

Tres migracions noves, creades amb Supabase CLI i només aplicades al clúster local verificat:

1. `20261030142034_federation_automation_callup_preferences.sql`: accés i preferències de convocatòries.
2. `20261030142117_scoped_federation_jobs.sql`: configuracions/cua/auditoria i RPC d’estat/sol·licitud.
3. `20261030142337_scoped_federation_commit.sql`: persistència per àmbit i passarel·les d’actes amb lease.

`federation_sync_scopes` vincula club, temporada interna, competició interna, federació, club federatiu i temporada federativa revisats. L’administrador/coordinador principal pot configurar en un sol pas totes les competicions ja vinculades del club/temporada/federació (`federation_configure_club`); no es configura rival per rival. La cua també detecta noves competicions que apareguin al catàleg, amb una única correspondència revisada de club/temporada; les correspondències contradictòries no es fusionen. No es creen competicions absents basant-se en noms.

La nova Edge Function `club-federation-sync` és un hook **exclusiu de backend**, amb el mateix mecanisme de token de planificador existent. Una invocació reclama una competició amb `FOR UPDATE SKIP LOCKED`, lease de deu minuts i UUID de lease. El client no veu el token/lease ni pot reclamar/acabar treballs o invocar persistència tècnica.

No s’ha instal·lat cap cron, Edge Function o servei de pagament. El sistema està preparat per a un planificador autoritzat; fins que s’instal·li no s’afirma sincronització automàtica operativa. No conviure amb el cron legacy per als mateixos àmbits: cal escollir un camí en el desplegament revisat.

## 4. Identificació i reconciliació

La configuració del servidor determina federació/temporada/competició/club; el parser comprova identificadors i escuts de club del calendari, no coincidències textuals. Amb scope explícit no hi ha excepcions de noms IHC, FEM15 o exclusió femenina. El camí legacy manté les seves restriccions anteriors.

La persistència nova deriva del nucli additiu revisat de #33 i conserva el seu punt d’entrada legacy. Reutilitza inscripcions/grups/equips ja existents amb IDs verificats; els objectes nous tenen namespace club/temporada/federació. Una correspondència amb múltiples IDs interns es rebutja. Els jugadors tenen identitat federativa canònica, no identitat basada en nom/dorsal. Els rivals són inscripcions de competició amb `club_team_id=null`, mai equips gestionats ni membres del club.

Les equivalències d’un mateix equip entre federacions requereixen una correspondència interna ja verificada; no es fusionen per nom o patrocinador.

Un partit es reconcilia per codi oficial dins de la competició o empremta de calendari/grup. Es conserva l’UUID quan es publica el codi o canvia data/hora/jornada; un canvi de costat o correspondència ambigua s’atura. No es fusionen equips/partits ambigus. No hi ha activació de contextos, membres, convocats, estadístiques o classificacions esportives per importar calendari.

## 5. Incrementalitat, freqüència i errors

Freqüència configurable: 60–10080 minuts (per defecte 360). Una competició per invocació, tres recursos principals i com a màxim quatre actes; peticions seqüencials al nou camí. Transport amb timeout, límit de resposta i `credentials:omit`; sense evasió de controls.

Un hash de contingut canònic ignora timestamp de recuperació/lease: si calendari/plantilla/classificació no canvien, s’omet la persistència d’aquest paquet. Les actes pendents encara es revisen. Les dades parcials no desactiven jugadors anteriors ni esborren marcadors vàlids. El log diferencia comptadors de refrescada de canvis reals; es registren deltes de data/instal·lació/resultat/codi per partit, sense copiar dades personals innecessàries.

Reintents diferits amb espera creixent, fins a cinc nivells i després espera diària; errors de permisos 403 impliquen espera d’un dia. Un error d’acta rota la cua amb metadata d’intent, perquè les primeres actes fallides no monopolitzin el pressupost. Les RPC d’actes comproven que el lease continua vigent i que el partit pertany a la competició reclamada. La consulta no crea contextos.

«Actualitzar dades federatives» sol·licita una actualització autoritzada de la competició, no una importació per jugador/equip ni una evasió del cooldown/backoff. L’estat mostra font, últim intent, resultat, recompte, pendents/errors i propera data. Una configuració absent és diferent d’una configuració en espera. No es declara acabada una actualització perquè s’hagi posat a la cua.

## 6. Actes i alineacions

La plantilla de temporada continua separada de l’acta. Es recuperen local/visitant, IDs, dorsals i porters només d’una resposta amb identitat comprovada i participants als dos costats. Els resums, errors, respostes incompletes i plantilles no es converteixen en convocats ni alineacions oficials.

La reparació tècnica de federation_match_events continua a #33; cap permís nou d’actes per a usuaris ordinaris. Les correccions avançades i les actes oficials segueixen separades. La nova passarel·la d’importació no concedeix drets als operadors temporals.

## 7. SIMAR–Vic i catàleg real

Consulta productiva puntual **READ ONLY**, [evidència](evidence/phase-3a10-production-readonly.json): Igualada 36 equips/22 competicions; no s’ha trobat Manresa al catàleg consultat. No es crea un club fictici a producció per omplir el desplegable.

35559 continua identificat com SIMAR–AUTO VIGATANA PATÍ VIC, calendari `51894d05-c323-f3e1-8534-fa79e062c448`, competició 3575, resultat importat 1–1, alineacions **0/0**. «report_status=verified» és un resum, no prova de participants persistits. La incidència del pilot pendent/sense codi descrita a 3A.9 no s’ha corregit a producció.

No s’han recuperat alineacions oficials noves. La reconciliació productiva requereix acta verificable, reparació revisada i autorització diferenciada; no crear un segon pilot. Les proves noves usen diversos clubs/codis/escenaris ficticis, no 35559 com a únic cas i no una acta real del Vic inventada.

## 8. Generador de convocatòries

`convocatoria.html`, `callup-ui.js`, `callup-model.js`. Accés contextual des del selector de partit, Base, Avançat i consulta; al Dashboard s’aprofita el placeholder Convocatòries existent, sense afegir una nova secció principal.

Club → equip → partit, amb noms i temporada, propers partits primer i calendari accessible complet. Els RPC retornen exclusivament clubs/equips autoritzats i partits vinculats al seu equip. Canviar de club/equip neteja la selecció incompatible i protegeix de respostes asíncrones antigues.

Al pilot local s’han provat Igualada i Manresa amb dades identificades com a fictícies; això no acredita les dades federatives o comptes productius de Manresa. Els colors visuals reutilitzen els valors existents de ClubHoquei360 per aquests clubs; no concedeixen permisos ni acrediten identitat.

## 9. Plantilla principal i edició

Ordre literal aprovat: ‼️ CONVOCATÒRIA → jornada/competició → GRUP → 📅 → hora de partit → 🏑 local-visitant → pista/Maps → hora de convocatòria → samarreta → roba → observacions opcionals → tancament. El test reprodueix exactament l’exemple de l’usuari amb dades fictícies. No s’utilitza un format alternatiu del Ramón.

Hora de convocatòria, samarreta, roba, indicacions finals i observacions són editables. Les correccions excepcionals de data/hora visibles, categoria, jornada, grup, noms o ubicació afecten **només el text**; mai l’hora, resultat o dades oficials del partit. Els camps absents mostren «Pendent de confirmar». No s’inventen pistes/adreces/Maps.

Maps: només URL HTTPS de dominis Google Maps acceptats, sense credencials ni javascript. Una URL manual vàlida no certifica la ubicació geogràfica; cal revisar-la. Només es preomple el Maps de la font quan té marca explícita de verificació.

## 10. Preferències i portapapers

`callup_preferences` desa preferències **personals** per usuari/equip (club derivat de l’equip). No s’imposen samarreta/roba d’un equip als altres. Les preferències no són una convocatòria confirmada, ni modifiquen habituals/reforços/participants. No s’ha introduït un editor global de plantilles compartides o rols nous.

El text de previsualització és exactament el que es copia; conserva salts i emojis. Clipboard API amb fallback seleccionable/execCommand, error explícit si no es pot copiar. Cap destinatari, grup, API WhatsApp, enllaç d’enviament, missatgeria interna o enviament automàtic. L’usuari enganxa manualment el text on correspongui.

## 11. Seguretat

Rols verificats al servidor: admin/coordinador general amb àmbit club, altres responsables només amb assignació explícita a l’equip; superadministrador segons funció autenticada existent. Els operadors temporals d’estadístiques no reben permisos de convocatòries per aquest permís temporal.

RLS de preferències comprova auth.uid i equip autoritzat a lectura/insert/update; no és suficient ocultar botons. Els endpoints nous de consulta filtren clubs/equips/partits al servidor. Configurar fonts exigeix administrador/coordinador general del club o superadministrador habilitat. Les funcions tècniques són invoker i només service_role; les definer de consulta/sol·licitud tenen search_path buit i comprovacions explícites.

Cap secret al client. Les noves taules revoquen els privilegis de client heretats de defaults i concedeixen només les operacions previstes, amb RLS. No es modifica el paquet TRUNCATE ni es toca supabase_admin. Les UUID d’usuari noves es validen per auth.uid/RLS; no s’afegeix una dependència REFERENCES sobre la taula Auth gestionada. No hi ha via per assignar preferències a un altre usuari.

## 12. Proves i evidències

Resultats detallats i SHA al registre de tancament/evidències:

- 246 Node complets (236 anteriors + 10 nous), 0 fallades/omissions.
- 73 Chromium complets (68 anteriors + 5 nous), incloent selector, preferències, canvi de club, Maps invàlid, còpia/fallback i tres resolucions.
- PostgreSQL/GoTrue/PostgREST reals locals: persistència genèrica multiclub, rivals, hash/no-op, canvis de calendari/resultat, resposta parcial, 403/backoff, concessió de jobs concurrent i denegacions de lease/club; acta fictícia amb dues alineacions i repetició idempotent; RLS de preferències.
- Navegador real amb Auth i portapapers: tres resolucions, dos clubs, previsualització=còpia, preferències desades/recàrrega i absència de canvis a calendaris/actes/estadístiques.
- Auditoria de noves ACL/RLS/EXECUTE/search_path només local; anon no pot invocar RPC i funcions tècniques no accessibles a authenticated.
- Regressions #31–#33 repetides sobre PostgreSQL/Auth reals: 9 blocs API, 6 blocs de navegador i 8 escenaris federatius A–H PASS. El primer intent de navegador sobre una fixture reutilitzada va detectar solapament amb una autorització de prova acabada dins del mateix minut; s’ha repetit el recorregut complet sobre un partit FEM15 fictici independent, sense esborrar històrics ni canviar la protecció del servidor. CI: veure tancament. No confondre PGlite/HTML fictici amb extracció federativa o Auth real de producció.

Incidents de harness corregits: APIkey tècnica no acceptada pel gateway local (Bearer tècnic passa només al backend), FK a auth.users no disponible per al propietari local (evitada dependència gestionada), i una reexecució local parcial de definicions de funció havia omès les revocacions del nou wrapper (aplicat el bloc complet amb ACL i auditat). Els SQL versionats inclouen les revocacions i el tercer bloc és atòmic. Cap protecció de plataforma relaxada o canvi productiu.

No verificat físicament: WhatsApp a Android/iPhone/iPad ni enganxat en grup real. S’ha provat el contingut del portapapers de Chromium, sense enviar-lo. Cap afirmació de publicació o ús real del club.

## 13. Riscos residuals i via oficial

Fonts oficials accessibles i condicions d’ús/API encara pendents; no hi ha importació real generalitzada acreditada. El projecte encara no té dades de Manresa consultables al catàleg productiu observat. Els IDs de club/temporada i correspondències noves requereixen configuració revisada, no noms inventats. Una competició absent del catàleg encara necessita descobriment/alta verificada, no es crea a partir d’una cerca textual.

Consulta tècnica preparada, NO ENVIADA: «ClubHoquei360 necessita sincronització interna dels clubs autoritzats FECAPA/RFEP. Quin canal oficial (API, export o conveni), límits, temporada/club/team IDs i accés a alineacions d’actes estan suportats? Els fragments del portal no constitueixen una API documentada. Faciliteu el procediment autoritzat i l’accés a l’acta RFEP 35559 sense sessions personals.»

El predecessor local és l’esquema aplicatiu capturat + integració #31–#33 + fixtures, no una clonació completa de Cloud. Cal preflight del predecessor real, backup productiu recuperable, decisió sobre cron legacy, classificacions i gates de seguretat abans de qualsevol posada en servei.

## 14. Preparació de publicació, sense executar

1. Revisar dependències #31/#32/#33 i aquest canvi apilat, sense fusionar-los ara.
2. Resoldre amb autorització diferenciada el paquet TRUNCATE pendent, revisar baseline i recuperació productiva.
3. Aplicar en un entorn autoritzat les tres migracions noves en ordre, verificar RLS/EXECUTE i absència de privilegis no previstos. No activar un worker sobre una instal·lació parcial.
4. Confirmar accés/condicions federatives i configurar fonts verificades del club/temporada. No crear Manresa real o alterar comptes per provar.
5. Instal·lar la nova Edge i un planificador backend amb token protegit en Vault/secrets; invocar una competició per torn, supervisar pressupost i no duplicar el cron legacy. Cap secret al SQL públic o navegador.
6. Validació funcional amb comptes legítims, portapapers/dispositius i dades oficials autoritzades; desplegar frontend només amb autorització expressa.

Recuperació: desactivar el worker/planificador nou davant anomalies, conservar log/configuracions/preferències i dades importades legítimes, corregir endavant. No DROP de taules, restauració cega o reintroducció de TRUNCATE. El camí legacy es conserva però no s’ha de reactivar en paral·lel sense revisar els àmbits.

## 15. Veredicte

**AUTOMATITZACIÓ — VERD tècnic en staging:** cua, identificació, persistència, errors i integració provats amb fixtures. **TARONJA:** fonts oficials/API/accessos i alta d’àmbits verificats pendents. **VERMELL per a prova real 35559:** alineacions oficials absents; no declarat resolt.

**GENERADOR — VERD en staging:** format aprovat, selectors autoritzats, camps, preferències i còpia fidels verificats. **TARONJA:** validació física WhatsApp/Android/iOS, dades reals de Manresa i publicació pendents. No hi ha error bloquejant conegut del generador validat; no s’afirma operatiu en producció.

**SEGURETAT/PUBLICACIÓ:** PR #31–#33 continuen en esborrany, paquet 3A.8 intacte, bloqueig productiu obert, tres migracions noves i Edge pendents de revisió/instal·lació. **Canvis productius: 0. Desplegaments: 0.**
