# Fase 3A.9 · Preflight productiu i prova SIMAR–Vic

30/10/2026. Branca `audit/production-preflight-vic-3a9`, des de `932e505a33ee1a901903774d4ed42662a6ddcbee`.

**Seguretat: PREFLIGHT SUPERAT, PENDENT D’AUTORITZACIÓ.**

**Prova real SIMAR–Vic: BLOQUEJADA PER ALINEACIONS.** El recorregut tècnic amb participants ficticis funciona en staging local; no és la prova real preparada. També falta un entorn de revisió accessible des dels dispositius de l’usuari. Cap modificació productiva, fusió o desplegament.

## A. Seguretat productiva

### Recuperació i dependències

Caps remots comprovats abans de treballar i PR confirmades en esborrany, obertes i sense fusionar:

| Font | SHA |
|---|---|
| main / últim Pages registrat | `e009f4df40d9ed353cb7d865beafed99d736892d` |
| #31 servidor | `3cce75896b7e262811e1b9c59a2daea733aa6782` |
| #32 frontend | `b76afcd70bc1f04e95f8a550b38728d77a77bf65` |
| #33 importació | `1b839218704bf791313bdd3f78fd5b0b8865ab0b` |

Reutilitzats els informes 3A.7/3A.8, inventari i paquet amb SHA256 verificats. Cap canvi al paquet SQL o al codi esportiu de les PR. La correcció d’identitat de #33 està inclosa al punt de partida; no s’ha reimplementat.

### Resultat de lectura

Executats únicament blocs `BEGIN READ ONLY … ROLLBACK` sobre el projecte `oevprbchlhyglhvopnvy`. Cap funció operativa/RPC d’escriptura, login productiu, prova destructiva o script històric de smoke amb escriptures revertides executat. El script antic `verify-production-rfep-vic-20261024.sql` **no és de només lectura i no s’ha executat**.

| Control | Resultat actual |
|---|---|
| ACL explícites esperades / observades | 49 / 49, tuples coincidents |
| Taules diferents | 27 |
| Beneficiaris | 22 anon, 27 authenticated |
| Objectes absents / owner incorrecte / concessions inesperades | 0 / 0 / 0 |
| Propietari i grantor | postgres, en tots els casos |
| RLS | Activa en les 27 taules |
| TRUNCATE efectiu dels clients | 49, per les concessions directes |
| Defaults postgres/public | 20 entrades exactament iguals a l’inventari |
| Defaults TRUNCATE a retirar separadament | 2: anon i authenticated |
| LOGIN / CREATE public / pertinença dels clients al propietari | No / no / no |
| Executor observat | postgres, NOSUPERUSER, propietari dels objectes |
| Modificacions productives | 0 |

L’executor té l’autoritat de propietari sobre aquestes ACL i sobre els seus defaults; això s’ha contrastat amb catàlegs i amb l’aplicació local no-super de 3A.8, sense executar una revocació productiva per demostrar-ho. No cal assumir supabase_admin. Les capacitats administratives i defaults d’altres creadors continuen fora d’aquesta correcció mínima.

Evidències: [preflight detallat](evidence/phase-3a9-preflight.json), [rols/herència/defaults](evidence/phase-3a9-roles.json), [comparació exacta](evidence/phase-3a9-security-comparison.json), [defaults complets i partit](evidence/phase-3a9-inspection.json). La comparació inclou cada taula/rol/owner/grantor i els altres defaults, no només recomptes. `scripts/verify-preflight-3a9.py` torna a verificar aquests fitxers localment; no connecta a cap DB.

### Intervenció manual preparada, NO executada

Paquet immutable de 3A.8 a [ops/truncate-3a8](../ops/truncate-3a8/RUNBOOK.md):

1. `00_preflight.sql`: identitat del destí i inventari, només lectura.
2. `inventory.json` i `MANIFEST.json`: tuples esperades, acknowledgement i empremtes.
3. `01_revoke_current.sql`: 49 revocacions exclusives de TRUNCATE.
4. `02_revoke_postgres_default.sql`: pas separat dels dos defaults postgres/public.
5. `03_verify.sql`: verificació posterior, només lectura.
6. `RUNBOOK.md`: permisos, backup recuperable, transacció conjunta, timeouts/locks, aturades i recuperació sense GRANT genèric.

Abans d’una intervenció futura: autorització humana **nova i expressa**, connexió/host/projecte/DB/usuari/TLS contrastats, inventari actual encara coincident i còpia productiva amb recuperació demostrada. Aturar amb qualsevol drift, estat parcial, owner/grantor inesperat, canvi de permisos legítims, bloqueig o regressió. La correcció actual no s’executa automàticament des d’aquesta branca.

Cal revisar/versionar un únic camí coherent amb l’antiga migració broad de #31 abans de publicar la combinació; no executar tots dos camins a cegues. La fase 3A.8 va verificar restauracions locals, no PITR ni recuperació completa Cloud. El bloqueig de 3A.7 **continua obert a producció** malgrat aquest preflight satisfactori.

## B. Partit SIMAR Igualada HC – Vic

### Identitat inequívoca i procedència

| Camp | Dada contrastada al catàleg federatiu emmagatzemat |
|---|---|
| Federació / temporada | RFEP / 2026/2027, temporada federativa 41 |
| Competició | OK LIGA PLATA SUR, ID 3575 |
| Partit | Codi oficial importat 35559, jornada 5 |
| Calendari intern | `51894d05-c323-f3e1-8534-fa79e062c448` |
| Empremta | `RFEP:41:3575:3575:JORNADA 5:3697:3727` |
| Local | SIMAR IGUALADA HC, equip RFEP 3697 |
| Visitant | AUTO VIGATANA PATÍ VIC, equip RFEP 3727 |
| Club propi intern / federatiu | `a48efe2f-c218-633e-6be6-4ce26e61f5cd` / 69 |
| Equip propi intern | `f9eed270-6221-42dc-7ac4-3df490ad65db` |
| Inscripció pròpia interna | `3f0368be-a87a-f1a4-66f0-3705f3ab4e7a` |
| Club federatiu del Vic | No recuperat independentment; no deduït del nom o escut |
| Data | 24/10/2026 20:30 Europe/Madrid = 18:30 UTC |
| Lloc | COMPLEJO DEPORTIVO LES COMES – IGUALADA |
| Resultat / estat importat | 1–1 / `FINALIZADO COMPLETED FINALE FINALIZAT` |
| Última importació observada | Calendari 30/10/2026 09:17:02.915 UTC; resum 09:17:03.110 UTC |
| Context operatiu històric | `18fa0a6e-e5c6-487e-8315-5bc371e22cb1` |

La identitat es contrasta per IDs, competició, temporada, empremta i costat, no només per noms. SIMAR no és Igualada Rigat HC (3696/3568). Font registrada: [calendari RFEP 3575](https://hockeypatines.fep.es/league/3575). El resultat i estat són dades **importades emmagatzemades**, no una acta oberta i examinada en directe avui. No s’ha afirmat verificació independent dels participants.

### Alineacions, plantilla i registres

| Capa | SIMAR | Vic |
|---|---|---|
| Plantilla general al catàleg consultat | 19 jugadors amb ID, 13 amb dorsal; 3 porters segons raw position; 10 staff separats | Cap inscripció RFEP 3727 trobada en les competicions emmagatzemades consultades; cap plantilla recuperable per aquesta via |
| Alineació oficial del partit | 0 files | 0 files |
| Convocats i dorsals del partit verificats | No | No |
| Jugadors al pilot existent | 0 | 0 |

El resum de l’acta consta `verified`, però això **no significa alineacions persistides**. Els 19 jugadors de temporada no són 19 convocats, i el staff no són jugadors. No s’han copiat ni inventat convocats, dorsals o identitats personals als informes/staging.

Desajust concret addicional: el calendari canònic ja té 35559 i resultat final, però el pilot continua `scheduled` i la seva font té `federation_match_id = null`, import_status `pending`, snapshot del 24/10 i calendari vinculat antic. Per això una consulta només per `federation_match_sources.federation_match_id='35559'` no troba el pilot; s’ha comprovat també l’UUID històric. No s’ha corregit en producció. Abans de la prova real cal reconciliar **aquest vincle existent** amb precondicions estrictes, sense crear un altre partit/context o sobreescriure registres.

En aquesta consulta: 0 incidències federatives persistides del calendari i 0 jugadors/incidències/estadístiques/sessions del pilot. No són proves d’absència universal de qualsevol registre o activitat fora d’aquest àmbit. Backend `service_role` continua sense INSERT a federation_match_events; authenticated tampoc el té. La reparació de #33 encara no s’ha instal·lat; no s’ha cridat l’importador per provocar una escriptura productiva.

Evidències sense noms de persones: [detall del pilot](evidence/phase-3a9-match-detail.json), [comptes agregats i permisos](evidence/phase-3a9-supplements.json). Consultes exactes principals a `scripts/inspect-vic-3a9-readonly.sql` i diagnòstic heretat `scripts/audit-privileges-3a7-readonly.sql`.

### Recuperació federativa i aplicació publicada

Xarxa de l’executor revisió 142: RFEP, SIDGAD i GitHub Pages retornen **CONNECT 403 del túnel**, abans de tenir una resposta de l’origen. No es conclou que la federació hagi denegat les dades o que una plantilla sigui buida. No s’han evadit controls.

L’eina web independent recupera només la carcassa de RFEP amb temporades i `VOLVER A COMPETICIONES`; no el recorregut dinàmic, el partit o les alineacions. L’endpoint conegut de l’acta `https://www.server2.sidgad.es/rfep/rfep_gr_35559_1.php` no és accessible amb aquestes eines. No s’ha fet servir goBack com a substitut del botó del portal. Alineació oficial del Vic **pendent**, també la del SIMAR.

Últim desplegament Pages comprovat als runs i logs de GitHub: [40498968602](https://github.com/Dudisooft/clubhoquei360/actions/runs/40498968602), commit `e009f4d`, build/deploy success, `Reported success` a 27/10 11:49:38.673 UTC i URL correcta. Això identifica el codi publicat registrat, però no substitueix una inspecció del navegador/CDN actual. La connexió directa a Pages està bloquejada i no hi ha sessió Auth real de l’usuari disponible.

Les PR #31–#33 no estan fusionades. La RPC `match_mode_access(uuid,uuid)` no existeix a producció, tot i que existeix la taula basic_match_contexts de fases anteriors. No es declara disponibles el nou panell/modes/activació de #31/#32 o la reparació d’importació #33. Avançat i l’anàlisi de vídeo ja existien en versions anteriors; la seva disponibilitat amb **aquest compte/partit i alineacions** no s’ha pogut validar avui en producció. No s’ha iniciat cap context ni desat cap estadística de prova allí.

### Alternativa tècnica local preparada i provada

Reutilitzat l’entorn aïllat de 3A.8 amb integració de les tres PR, sense reexecutar les suites completes inalterades. PostgreSQL 17.11, GoTrue i PostgREST reals; cap PGlite o mock d’Auth en aquest recorregut.

Fixture nova `a3900000-0000-4000-8000-000000000001`, títol **PROVA LOCAL FICTÍCIA · SIMAR – VIC**, sense codi federatiu oficial assignat, resultat fictici 1–1 i estat operatiu `review`. Referència 35559 només documental; no és una còpia de l’acta. Reutilitza equips/inscripcions ficticis d’integració, no els IDs federatius reals com a identitat dels participants. Deu jugadors ficticis (cinc per costat, un porter cadascun), explícitament identificats com a fixtures. No modifica els contextos de prova preexistents.

Banner visible en les pàgines de l’artefacte privat: **ENTORN LOCAL DE PROVA · DADES FICTÍCIES · NO ÉS PRODUCCIÓ NI L’ACTA 35559**. Cap canvi a l’HTML funcional del repositori. SDK local i claus exclusives del staging; sense service_role al navegador. Les peticions de navegador externes són rebutjades.

Nova prova Chromium sobre mòbil 390×844, resultat PASS:

1. Dashboard i login GoTrue real d’un coordinador fictici del club de prova.
2. Partit sense preselecció; temporada → competició 3575 → SIMAR fictici → partit disputat fictici.
3. Obertura Avançat autoritzada; perfil Estadístic i activació explícita del registre propi si cal.
4. Vídeo en diferit; ajust a 02:15, inici i pausa del cronòmetre independent.
5. Passada d’equip i passada individual d’un visitant fictici.
6. Desament i recàrrega, esperant la càrrega real d’Auth/dades; recuperació del mode i sessió pausada.
7. Mateix nombre d’esdeveniments després de recarregar, sense duplicats al registre d’auditoria.
8. Pilot, participants, font i incidències oficials de la fixture idèntics abans/després; zero errors de pàgina.

[Evidència del recorregut](evidence/phase-3a9-staging-browser.json). S’han corregit errors del harness abans del resultat final: accent de FICTÍCIA, espera de càrrega abans de canviar perfil, activació explícita del registre i comprovació de mutation_id a stats_event_audit, on existeix. Els intents previs només han afectat dades fictícies locals i no es presenten com proves superades. La captura visual final es fa després de carregar la sessió, no sobre la plantilla HTML provisional.

Prova addicional en un context de navegador nou, sense còpia local del rellotge: sessió de vídeo pausada, temps exacte del servidor i observacions individuals recuperats amb Auth real, sense canviar la sessió ni el recompte ([evidència](evidence/phase-3a9-fresh-browser.json)).

La fixture conserva sis observacions fictícies de les execucions que van arribar al registre (dues per execució); els intents fallits del harness no s’han declarat superats ni s’han eliminat dades per fer coincidir el resultat. La recàrrega i el navegador nou no afegeixen observacions.

Checkpoint recuperable: [backup local](evidence/phase-3a9-backup.json) restaurat en una DB aïllada nova, 77 conjunts i metadades lògiques coincidents; no és una prova de backup productiu. SHA256 `c25ce27fa916937ee9185ea627ef09c4275c533a214b90c5f5d027b535a0ac35`. Fitxer privat i destí de restauració a `work/3a9/checkpoint-private.json`; cap credencial o dump inclòs a Git.

Comprovació d’evidències/manifest PASS; check/build local 38 fitxers PASS. Les 236 Node/68 Chromium i Auth/RLS de 3A.8 es reutilitzen com a evidència del mateix codi aplicatiu, no com suites executades de nou en 3A.9. En aquesta fase no hi ha canvis de seguretat ni funcionalitat esportiva que justifiquin repetir tota l’auditoria.

### Accés i instruccions concretes

**L’usuari encara no pot fer una prova real completa des del mòbil/TV.** No hi ha URL de staging remot publicada o habilitada; loopback del workspace no és accessible des del telèfon o ordinador personal. No es presenta `127.0.0.1` com un enllaç públic.

Per a revisió tècnica dins del mateix workspace autoritzat, amb el clúster local existent:

```sh
node scripts/remediation-api.mjs
node scripts/vic-3a9-staging-site.mjs .
```

Executar en terminals separats, només si els ports 56431/56490 són lliures; no iniciar un segon servidor si ja estan actius. Obrir al navegador **d’aquell entorn** `http://127.0.0.1:56490/clubhoquei360/dashboard.html`. El compte fictici de prova s’obté del fitxer privat local `work/staging-3a8/accounts-private.json` per qui té accés autoritzat al workspace; no publicar credencials ni usar-hi el compte productiu. La fixture es pot preparar una sola vegada amb `node scripts/prepare-vic-3a9-staging.mjs`; el script verifica físicament el destí i no accepta URLs remotes. La prova reproduïble és `node scripts/verify-vic-3a9-staging.mjs` i afegeix dues observacions fictícies en cada execució, no dades oficials.

Per fer la prova real posteriorment cal, en aquest ordre:

1. Recuperar l’acta/alineacions oficials de **35559** dels dos equips, amb IDs, dorsals i porters; facilitar un export oficial verificable o disposar d’accés federatiu autoritzat. La gravació [YouTube facilitada per l’usuari](https://www.youtube.com/live/T9ANG2Ew0Mg) serveix per analitzar, no certifica convocats federatius.
2. Validar i persistir-les mitjançant la correcció d’importació revisada, i reconciliar el pilot existent amb el calendari/codi oficial. Això requereix una fase d’escriptura expressament autoritzada; ara no s’ha fet.
3. Disposar d’un entorn integrat accessible i aïllat, o autoritzar posteriorment la publicació controlada quan es compleixin els gates. Validar el compte real sense concedir rols generals addicionals.
4. Llavors seguir el selector 2026/27 → OK Lliga Plata Sud → SIMAR → Vic del 24/10, Avançat → Estadístic → Vídeo en diferit; comprovar les dues alineacions abans d’activar el registre. Ajustar temps jugat, registrar, pausar, desar i recarregar; no iniciar el rellotge oficial per analitzar el vídeo.

Enllaç productiu històric de consulta del pilot existent, **no certificat com a prova preparada**: `https://dudisooft.github.io/clubhoquei360/avancat.html?match=18fa0a6e-e5c6-487e-8315-5bc371e22cb1&view=stats`. No registrar-hi dades de prova ni crear contextos per intentar resoldre l’absència d’alineacions.

### Criteri d’acceptació i veredictes

| Condició per a prova real | Estat |
|---|---|
| Partit 35559 inequívoc | Sí, al catàleg importat |
| Acta i alineacions oficials dels dos equips | No, 0/0 persistides i font inaccessible |
| Jugadors/dorsals/porters correctes del partit | Pendent |
| Avançat i diferit funcionals | Sí en staging fictici; compte productiu no validat |
| Persistència i separació de l’acta | Sí en prova local real Auth/DB |
| Entorn integrat accessible a l’usuari | Pendent; només loopback local |
| Producció preservada | Sí; només SQL READ ONLY i lectura de metadades |

**SEGURETAT PRODUCTIVA — PREFLIGHT SUPERAT, PENDENT D’AUTORITZACIÓ.** Les concessions encara existeixen; cap correcció productiva aplicada.

**PROVA SIMAR–VIC — BLOQUEJADA PER ALINEACIONS.** Recorregut tècnic preparat i verificat amb dades fictícies, amb accés remot d’usuari també pendent. **No es declara «PROVA REAL IGUALADA–VIC PREPARADA».** Cap resultat autoritza fusionar, desplegar o escriure a producció.
