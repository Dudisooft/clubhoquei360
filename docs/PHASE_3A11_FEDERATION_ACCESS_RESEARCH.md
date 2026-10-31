# Fase 3A.11 — Accés federatiu oficial i sostenible

31/10/2026 UTC. Investigació complementària a la [consolidació](PHASE_3A11_INTEGRATION_RELEASE_READINESS.md). Cap correu/formulari enviat, sessió personal utilitzada, protecció eludida, planificador activat o dada productiva modificada.

## 1. Diagnòstic concret del CONNECT 403

**CONFIRMAT en aquest entorn:** els intents HTTPS de shell als portals RFEP/FECAPA i `www.server2.sidgad.es` fallen al túnel amb `CONNECT tunnel failed, response 403` / resposta Envoy abans d'establir TLS amb l'origen. La política de xarxa gestionada, revisió 143 enforced, no inclou aquests hosts entre els dominis permesos. El component que inicia la connexió és el procés HTTP de Codex a través del proxy de sessió. Això acredita una denegació d'aquesta ruta de xarxa; **no acredita un 403 del servidor federatiu, un CAPTCHA ni una prohibició deliberada de la federació**.

L'eina web disposa d'una ruta diferent: permet recuperar resultats indexats i en alguns casos la carcassa de competicions, però no l'acta completa ni un recorregut interactiu verificable. No s'ha presentat aquesta ruta com a navegador personal autenticat. El portal RFEP consultat mostra `VOLVER A COMPETICIONES`; no s'ha comprovat directament el seu estat de sessió/JavaScript, ni s'ha substituït pel botó enrere.

**CONFIRMAT i diferent en Supabase Cloud:** les lectures de `federation_import_runs` mostren imports horaris recents de FECAPA i RFEP, inclòs RFEP:3575 a les 07:17 UTC del 31/10. Calendari del 35559 recuperat a 07:17:02.537Z. Per tant, el connector productiu no està bloquejat necessàriament per la restricció de xarxa de Codex.

El mateix run conté **cinc errors en desar actes**, tots `permission denied for table federation_match_events`, inclòs exactament el partit 35559. `service_role` no té INSERT sobre la taula. El run global figura com a `success` i `report_failures=0`: aquest comptador antic no reflecteix els errors de persistència d'official_reports. És una causa demostrada de fallada de persistència i de diagnòstic incomplet, no una explicació hipotètica del 403. [Fonts agregades](evidence/phase-3a11-sources-readonly.json), [diagnòstic](evidence/phase-3a11-backend-diagnostic.json).

La funció ihc-sync desplegada és versió 3; la lectura del seu codi confirma la ruta de commit legacy i absència del control nou de dues alineacions. El JWT de plataforma està desactivat en aquest legacy; el seu control propi de scheduler s'ha de revisar/conservar, i això no equival per si sol a una invocació pública autoritzada. No s'ha invocat la funció. Les correccions #33/#34 estan al codi revisat, sense publicar. No s'han generat nous permisos o accessos per diagnosticar-ho.

## 2. Fonts identificades i nivell d'evidència

| Font | Estat | Què acredita / què no acredita |
|---|---|---|
| [Portal RFEP](https://www.hockeypatines.fep.es/) / [Plata Sud 3575](https://www.hockeypatines.fep.es/league/3575) | CONFIRMAT | Portal públic i identificador conegut; recuperació parcial de carcassa. No acta completa ni contracte API verificats |
| [Portal FECAPA](https://www.hoqueipatins.fecapa.cat/) | CONFIRMAT | Portal de competicions; consulta directa completa bloquejada des de Codex |
| Connectors existents SIDGAD (`www.server2.sidgad.es`) | CONFIRMAT com a mecanisme tècnic existent | Formularis/fragments utilitzats pel connector; no són documentació d'una API autoritzada, llicència o SLA |
| [SIDGAD](https://www.sidgad.es/) i [aplicació RFEP](https://play.google.com/store/apps/details?id=com.sidgad.es.RFEP) | CONFIRMAT via pàgines públiques indexades | Proveïdor i canals publicats; no autorització d'integració de ClubHoquei360 |
| [Documentació API Playoff](https://playoffinformatica.helpscoutdocs.com/article/304-api), actualitzada 10/09/2026 | CONFIRMAT, llegida | API REST de plataforma federativa; dades segons permisos, compte tècnic i recomanació d'ús segur |
| [Referència API Playoff](https://apifederacions.playoffinformatica.com/) | CONFIRMAT com a enllaç de documentació | Interfície Swagger; no s'han cridat endpoints autenticats ni inventat rutes de competicions |
| Aplicabilitat de Playoff a les competicions/actes RFEP/FECAPA actuals | CANDIDATA, PENDENT DE CONFIRMACIÓ | No s'ha trobat prova que aquesta API cobreixi els portals SIDGAD ni les alineacions rivals del 35559 |
| API/exportació oficial oberta i documentada de les dues federacions per a aquests portals | NO DISPONIBLE com a via verificable en aquesta investigació | No significa que no existeixi una via privada, conveni o servei per a clubs |
| Exportació ICS/CSV/acta estructurada amb condicions d'automatització verificades | NO DISPONIBLE | No s'ha acreditat format/contracte públic aplicable; no es promet ni s'inventa |

La documentació Playoff descriu clubs, equips, categories, temporades, lligues/grups/jornades/calendaris/partits/actes/resultats, amb disponibilitat dependent del perfil. Recomana usuari tècnic dedicat, permisos mínims, secrets només al backend, sandbox i consulta de funcions no documentades. És una **via concreta per preguntar**, no una integració RFEP/FECAPA confirmada. No s'ha iniciat sessió ni utilitzat credencials de ningú. Els camps personals aliens a l'objectiu esportiu, encara que existissin a l'API, s'han d'excloure.

No s'han utilitzat agregadors no oficials com a prova d'autorització ni temporades anteriors com a prova esportiva de 2026/2027. Les captures comunicades dels sis equips no són fitxers examinats en aquesta fase; no se n'han inventat hashes.

## 3. Canals institucionals publicats

| Destinatari | Canal i font | Límit |
|---|---|---|
| RFEP, Comitè Hoquei Patins | `hockeypatines@fep.es`, [contacte oficial](https://fep.es/federacion/contacto) | Canal institucional, no IT/API confirmat |
| RFEP, secretaria / oficina Barcelona | `mad@fep.es` / `bcn@fep.es`, mateixa font | Per demanar derivació a responsable tècnic/dades |
| FCP/FECAPA, STC Hoquei Patins | `h-patins@fecapa.cat`, [circular oficial 2025](https://www.fcpatinatge.cat/wp-content/uploads/2025/06/Circular02_hoqueilligacatalana2025.pdf) | Adreça publicada, antiguitat de document explícita; disponibilitat actual a confirmar |
| FCP/FECAPA, general/atenció clubs | `fecapa@fecapa.cat`, `stc@fecapa.cat`, `oac@fecapa.cat`, [document oficial d'atenció a clubs](https://www.fcpatinatge.cat/wp-content/uploads/2024/11/2022basescompeticiosb.pdf) | Via institucional, no suport tècnic API acreditat |
| SIDGAD, proveïdor | `info@sidgad.es` ([web](https://www.sidgad.es/)), `soporte@sidgad.es` ([fitxa aplicació RFEP](https://play.google.com/store/apps/details?id=com.sidgad.es.RFEP)) | Font de proveïdor; demanar derivació/autorització federativa abans d'integrar |

Contactes verificats en contingut públic/indexat; alguns originals retornen 403/502 en accés directe des d'eines. No s'ha comprovat recepció ni vigència mitjançant un enviament. No s'afirma que siguin contactes tècnics directes. **El domini RFEP correcte aquí és fep.es; no confondre'l amb altres federacions que utilitzen rfep.es.**

## 4. Consulta institucional preparada — NO ENVIADA

Destinació proposada: primer el comitè/secretaria federativa, demanant derivació al responsable de dades i al proveïdor autoritzat. No enviar simultàniament ni escalar a tercers sense decisió de l'usuari.

### FCP/FECAPA — esborrany en català

**Assumpte: ClubHoquei360 — consulta d'integració autoritzada de dades de competició i actes**

Benvolguts/des,

ClubHoquei360 és una eina professional interna de gestió esportiva per a clubs d'hoquei patins. Ajuda coordinadors, entrenadors i delegats a preparar partits, convocatòries i anàlisi estadística, evitant duplicar informació federativa. No és un servei de difusió a famílies ni incorpora missatgeria.

Voldríem conèixer la via oficial per sincronitzar, amb autorització i per als clubs que utilitzen el servei, les competicions/temporades, grups, equips i identificadors estables, calendaris, instal·lacions, resultats i estat dels partits. Quan l'acta estigui publicada i sigui lícit, necessitem les alineacions oficials d'ambdós equips, amb identificador de jugador, nom esportiu, dorsal i condició de porter. Una plantilla general no ens permet substituir l'alineació d'un partit. No necessitem DNI, contacte privat, dades mèdiques ni altres dades personals alienes a aquesta finalitat.

Disposeu d'API, exportació estructurada o conveni per a clubs/proveïdors? Quin proveïdor i instància gestiona aquestes dades? La documentació pública de Playoff és aplicable, o cal una integració amb SIDGAD o un altre servei? Podríeu indicar-nos el responsable tècnic competent?

Ens caldria concretar permisos de lectura de rivals dins de competicions autoritzades, accés a actes, identificadors i canvis d'identitat, actualitzacions incrementals, límits de freqüència, autenticació tècnica, versions, sandbox amb dades fictícies i condicions de llicència/retenció/protecció de dades, especialment de menors. La solució ha de ser reutilitzable per clubs autoritzats sense validacions manuals equip rival per equip rival.

Oferim credencials exclusivament de backend, permisos mínims, separació entre clubs, registre de procedència, memòria cau, reintents limitats i respecte dels límits del servei. No utilitzarem sessions personals ni eludirem controls d'accés. Restem a l'espera de les condicions tècniques i administratives abans d'activar cap via nova.

Gràcies. [Responsable i dades de contacte a completar abans d'enviar.]

### RFEP — borrador en castellano

**Asunto: ClubHoquei360 — consulta de integración autorizada de calendarios y actas de hockey patines**

Estimados/as:

ClubHoquei360 es una herramienta profesional interna para coordinadores, entrenadores y delegados de clubes de hockey patines. Queremos evitar la introducción duplicada de datos y automatizar su actualización únicamente mediante mecanismos autorizados. No es un servicio dirigido a familias ni incorpora mensajería.

Solicitamos información sobre API, exportaciones o convenio de integración para competiciones, temporadas, grupos, equipos e identificadores, calendario, instalaciones, resultados y estado de los partidos. Cuando el acta esté publicada y el acceso esté permitido, necesitamos las alineaciones oficiales de ambos equipos, identificadores de jugadores, nombre deportivo, dorsales y porteros; no DNI, datos médicos ni contactos privados. ¿Qué proveedor/instancia gestiona estos datos? ¿Existe una vía aplicable de SIDGAD, Playoff u otro servicio oficial y un responsable técnico de integración?

Como caso de aceptación tenemos SIMAR Igualada HC–Auto Vigatana Patí Vic, 24/10/2026, OK Liga Plata Sur, competición 3575, partido 35559. Nuestro calendario conserva el 1–1, pero no disponemos de la alineación oficial completa. Solicitamos confirmar cómo obtener el acta autorizada, sin sustituirla por la plantilla de temporada.

Nos gustaría concretar cuenta técnica de solo lectura, ámbito de acceso a rivales/actas, entorno de pruebas, identificadores y cambios, deltas, límites de peticiones, condiciones de licencia, conservación y protección de datos de menores. La integración debe poder servir a distintos clubes autorizados sin revisar manualmente cada rival.

Aplicaremos credenciales solo en backend, mínimo privilegio, separación entre clubes, trazabilidad, caché y reintentos limitados. No utilizaremos sesiones personales ni evitaremos protecciones de acceso. Agradecemos su derivación al responsable competente y las condiciones técnicas y administrativas necesarias.

Atentamente, [Responsable y contacto a completar antes de enviar.]

## 5. Arquitectura recomanada: adaptar #34, sense reescriure

Mantenir les capes implementades: àmbits autoritzats per club/federació/temporada/competició, cua persistent, lease i idempotència dels commits, next_due/cooldown, reintents limitats, estats success/partial/failed i traçabilitat. La UI manual complementa la cua; no multiplica importacions per rival.

El connector és el punt substituïble: contracte normalitzat de descobriment de competicions/equips, calendari i acta per identificador estable; capacitat explícita per proveïdor i procedència/data/estat en cada resultat. La mateixa cua admet un adaptador d'API oficial autoritzada en lloc del transport HTML actual. No s'ha programat ni desplegat un adaptador hipotètic ni un planificador real en aquesta fase.

Identitat: federació + temporada + competició/grup + ID d'equip/partit/jugador. Rival determinat per IDs i vincles del partit, mai només pel nom o costat local/visitant. Identitat ambigua queda pendent sense fusionar. Separar plantilla, alineació oficial, convocatòria interna, habitual/reforç i observació estadística. Resposta fallida/incompleta mai és plantilla buida ni autoritza esborrar jugadors. Acta completa només amb dos costats identificats i validats; no emplenar-la amb plantilla general.

Control de càrrega: límits per federació i compte, concurrència controlada, backoff/cooldown, respecte dels errors 403 i aturada si falta autorització. No provar URLs alternatives per eludir controls. Secrets de backend i logs sanejats; el client només consulta/sol·licita dins del seu àmbit i RLS. El contracte institucional pendent determinarà freqüència i drets d'ús: accessibilitat pública no equival a llicència comercial de sincronització.

Per publicar: Edge actualitzat i permisos SQL primer, planificador nou inicialment apagat; inventariar el cron legacy i evitar doble consum/commit. Activar una competició autoritzada, comprovar errors i procedència, després ampliar segons necessitat. Mantenir errors de persistència separats d'errors de fetch. Arquitectura general per a clubs/rivals autoritzats, sense excepcions SIMAR/Vic.

## 6. Estat SIMAR–Vic i següent prova autoritzada

Identitat contrastada a 3A.9: RFEP 3575, temporada 2026/2027, equip local de catàleg 3697 SIMAR, visitant 3727 AUTO VIGATANA PATÍ VIC, calendari intern `51894d05-c323-f3e1-8534-fa79e062c448`, 24/10/2026 20:30 Europe/Madrid, resum finalitzat 1–1. No és Igualada Rigat ni la competició 3568.

A la consulta: **0/0 alineacions oficials desades**. Hi ha observacions parcials de jugadors SIMAR a la plantilla amb referència al partit; no constitueixen dues alineacions verificades i no s'han convertit en convocats. INSERT backend absent acreditat i error de commit del 35559 al run de les 07:17. Això no prova que el parser legacy hagués recuperat correctament totes les dades dels dos costats. No s'ha recuperat una acta completa independent ni una plantilla oficial Vic des de Codex.

La reparació SQL de #33 i el control/estat de #33–#34 són necessaris; la seva futura instal·lació no garanteix que la font publiqui tots els camps. Després d'autorització i controls de seguretat, executar una recuperació dirigida del 35559 amb el connector revisat; exigir dos equips, IDs, dorsals, porters, procedència, data i cardinalitats consistents. Repetir sense duplicar i revisar el vincle amb el pilot antic abans de canviar-lo. Si la font és incompleta, sol·licitar la via institucional/acta al proveïdor competent i mantenir parcialitat; no inventar convocats.

**No es declara preparada una prova real amb dades oficials.** Staging tècnic amb dades fictícies visibles i Auth/PostgreSQL reals, només loopback; no hi ha URL pública de prova per a l'usuari. No s'ha presentat l'aplicació publicada com si incorporés aquestes correccions.

## 7. Resultat accionable

**CONFIRMAT:** restricció del proxy de Codex; backend Cloud capaç de consultar calendaris i arribar al commit del 35559; INSERT absent; estats legacy que oculten errors parcials; canals institucionals publicats; existència de documentació API de proveïdor.

**PENDENT:** autorització i desplegament controlat de la reparació revisada; acta completa amb les dues alineacions; confirmació federativa d'API/exportació/instància, drets de dades de rivals/menors i condicions tècniques; vigència del contacte tècnic definitiu. Playoff és una candidata concreta, no una integració federativa acreditada.

No hi ha una causa única per a tots els problemes ni es demana introduir manualment tots els rivals. Consulta institucional preparada, no enviada. Cap permís, club, convocatòria, acta o estadística productiva modificats.
