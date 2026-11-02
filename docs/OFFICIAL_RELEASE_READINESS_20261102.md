# Preparació de publicació oficial · 02/11/2026

**VEREDICTE: AJORNAR LA PUBLICACIÓ.** Hi ha una integració funcional revisable; no una versió productiva completa. Zero fusions, desplegaments, migracions, canvis de permisos o dades productives executats.

## Fonts i integració

Branca `release/official-integration-20261102`, des de `main` e009f4df40d9ed353cb7d865beafed99d736892d. SHA remots comprovats el 02/11:

| PR | SHA | Integració |
| --- | --- | --- |
| #31 servidor | 3cce75896b7e262811e1b9c59a2daea733aa6782 | Diferencial funcional incorporat |
| #32 interfície | b76afcd70bc1f04e95f8a550b38728d77a77bf65 | Diferencial funcional incorporat |
| #33 importació | 1b839218704bf791313bdd3f78fd5b0b8865ab0b | Diferencial funcional incorporat |
| #34 automatització/convocatòries | c7e987946a693dfd58f86650978f3cc4e9d7d9bf | Diferencial funcional incorporat |

S'han reutilitzat els cinc commits de reproducció funcional ja revisats a la fase 3A.11, conservant les resolucions del helper compartit i les condicions CI. No s'han fusionat les branques originals. S'ha conservat el JSON de classificació requerit per les proves. No s'han incorporat indiscriminadament informes antics al paquet executable.

La branca sol·licitada `feat/functional-pilots-20261102` no existeix al remot consultat. El SHA aportat 7baf003b7e44144e8097f81c563fc82f29d3d780 no és accessible: `git fetch` respon `not our ref`. Els cinc adjunts inclouen informe, prova, JSON, ref i reflog; no inclouen el connector ni el codi funcional d'aquell commit. Metadades minimitzades a `evidence/release-20261102-pilot-inputs.json`; no es publica el reflog personal. El repositori Windows C:\Projects\ClubHoquei360 no és accessible des d'aquest entorn Linux. No s'ha trobat AGENTS.md als checkouts accessibles.

L'informe adjunt descriu explícitament un laboratori fora del build original, amb IndexedDB/PGlite i sincronització entre dispositius no verificada. Les seves 272 proves Node i 18 específiques són resultats comunicats, no executats aquí. Les cinc Playwright adjuntes consten preparades, amb zero superades en aquell entorn. Els selectors del laboratori no són els de l'aplicació original: no s'han presentat com proves d'aquesta integració.

Altres PR obertes revisades, sense incorporar canvis incompatibles: #10 duplica part de la cua ja substituïda per #34 i requereix conciliació multiclub; #11 manté publicació condicionada a SMTP/OTP no acreditats; #22 és una importació dirigida antiga, no autoritza executar-la; #27 entra en conflicte amb Base/importadors/helper i requereix preservar les regles genèriques #29/#30. No es declara una vulnerabilitat reproduïda en aquestes PR ni que les seves funcionalitats estiguin integrades.

## Canvis segurs d'aquesta execució

- Mateixa aplicació estàtica, Dashboard i navegació existent, sense crear un segon producte. Els canvis #28–#30 es conserven en partir de main.
- `match-provenance.js` i la consulta de partit diferencien alineacions desades, parcials, absents i errors de lectura. Un resultat verificat no acredita els convocats; una plantilla candidata no es presenta com acta. Consulta exacta per match_id i sense escriptures.
- Proves FEM11, FEM15, Infantil D, SIMAR–Vic i SIMAR–Noia afegides a la mateixa interfície, amb dades explícitament fictícies. La data Noia 14/11/2026 20:30 és una dada comunicada en l'adjunt, no una nova verificació federativa.
- `scripts/serve-release-staging.mjs` genera un artefacte privat de l'aplicació, marcat NO PRODUCCIÓ i limitat a loopback, amb bloqueig de l'identificador productiu. Reutilitza el backend aïllat anterior; no és un staging públic ni funciona sense aquells scripts de suport.
- `ops/truncate-3a8` conserva el paquet preparat amb els hashes originals. Cap SQL mutatiu d'aquest paquet s'ha executat sobre producció.

## Evidència funcional executada

| Comprovació | Resultat | Abast |
| --- | --- | --- |
| Node complet | 233 PASS, 0 fallades/omissions | Inclou SQL/PGlite, Base, reforços, modes, importació, convocatòries |
| Chromium complet | 78 PASS, 0 fallades/omissions | Aplicació original; fixtures i RPC locals |
| Data específica Noia posterior | 1 PASS | Canvi exclusiu de fixture/assert del 14/11 |
| Check/build | PASS, 42 fitxers | GitHub Pages sense dependència de servidor web propi |
| Auth/API real aïllat | 9 blocs PASS | GoTrue, PostgreSQL 17.11, PostgREST 16.4, 8 identitats fictícies |
| Navegador amb Auth real | 6 blocs PASS | Dashboard, rols, FEM15, revocació, caducitat, RFEP futur |
| Dues sessions reals | PASS | 1440 i 390 px, acció visible sense recàrrega, conservada després, 0 duplicats |

Les dues sessions utilitzen recuperació periòdica HTTP del backend local; no acrediten WebSocket productiu ni dos dispositius físics. Les suites Chromium comproven altres mides responsives i els casos Júnior, WhatsApp i persistència. El text copiat es comprova amb clipboard del navegador, no s'ha enviat cap WhatsApp. No es declara provat l'enganxat a l'aplicació nativa d'iPhone/Android.

Les proves reals locals reutilitzen un predecessor d'esquema auditat amb dades esportives fictícies i Auth propi. No és una còpia integral demostrada de producció. Les operacions normals s'executen amb JWT d'usuari, sense service_role per simular permisos ordinaris. Els errors inicials de la nova prova d'alineacions es devien al fixture sense match_id i s'han corregit; 24 proves afectades repetides amb èxit. Evidències JSON sanes a docs/evidence/release-20261102-*.json i logs privats a work/release.

## Estat productiu de només lectura

- 36 equips i 38 inscripcions conservats. No s'ha fet cap importació o reconciliació productiva.
- Partit RFEP 3575/35559 inequívoc: SIMAR (3697)–AUTO VIGATANA PATÍ VIC, 24/10/2026, resultat 1–1. Alineacions desades **0 locals / 0 visitants**. El report_status verificat és el resum, no prova de 20 convocats.
- No s'ha trobat el partit canònic RFEP 3575/35574 de Noia. No s'ha creat.
- L'entrada FEM15 Or 12419 existeix al catàleg; no confondre-la amb una altra inscripció femenina.
- `match_mode_access(uuid,uuid)` encara absent i INSERT tècnic sobre federation_match_events encara denegat. Les PR pendents no estan instal·lades al backend.
- Preflight mínim actual: 49 concessions exactes, 27 taules, 0 absents, 0 inesperades, propietaris previstos. Continuen obertes. Dos defaults postgres públics requereixen correcció; també hi ha dos defaults del rol gestionat supabase_admin, que el paquet **no modifica**. No confondre aquests dos conjunts.
- Backup productiu recuperable continua no verificat. Una restauració fictícia anterior no ho substitueix. Classificació administrativa dels sis sèniors pendent, UPDATE desactivats.

La referència comparada és main e009f4d i els informes previs del desplegament. No s'ha pogut inspeccionar íntegrament el CDN publicat ni una sessió productiva autenticada en aquest entorn. No es declara que Pages ja contingui aquesta branca.

## Fonts federatives consultades

| Font | Verificat ara | Limitació / acció |
| --- | --- | --- |
| RFEP https://www.hockeypatines.fep.es/league/3575 | Portal públic i selecció de competicions | No s'ha recuperat aquí l'acta completa 35559. El connector nou comunicat necessita el codi original |
| FECAPA https://www.hoqueipatins.fecapa.cat/ag/ | Temporada 2026/27; enllaços oficials a SIDGAD Competició i Playoff Llicències | Acredita funcions separades, no una API de competició reutilitzable |
| OKMob https://apps.apple.com/es/app/okmob/id6803087016 | Aplicació amb dades de calendari/resultats | No s'ha verificat API pública ni llicència d'ús de dades |
| Hoquei Patins Catalunya https://hoqueicat.cat/preguntes-frequents | FAQ descriu actualització periòdica i exportacions iCal | Font complementària; no acta oficial ni contracte d'API |
| https://hockeyapp.es/hockey-patines | Llistats públics de competicions/equips | No autoritza reutilització d'una API |

Les connexions shell als hosts federatius retornen CONNECT 403 del proxy abans de TLS; el visor web pot llegir alguns portals. Això no prova un bloqueig deliberat de la federació ni l'absència de dades oficials. No s'han eludit restriccions, autenticacions o CAPTCHA ni utilitzat sessions personals. No s'ha escrit a cap federació. Les 10+10 de Vic i les candidates Noia són evidència comunicada al laboratori, no dades verificades ni incorporades en aquesta aplicació. Cap dada fictícia s'ha etiquetat com a convocat oficial real.

Es conserva el motor incremental i la cua per abast de #34: identitat federació/temporada/competició/grup/equip/partit, cache, límits, backoff i preservació de respostes parcials. El treball pendent és adaptar el connector legítim quan es recuperi el codi o obtenir via oficial autoritzada; no demanar introducció manual de tots els rivals ni desplegar un planificador encara.

## Procediment de publicació preparat, NO executat

1. Recuperar el codi del pilot al remot; revisar-ne el diferencial i integrar només connectors i funcionalitats compatibles en aquesta mateixa aplicació. Verificar acta Vic 10+10, candidats Noia i procedència amb identificadors; decidir reconciliació explícita del pilot antic, sense duplicar-lo.
2. Acreditar destinació, custòdia, backup productiu i restauració; responsable executor i finestra. Sense això, aturar la intervenció.
3. Amb autorització específica: repetir `ops/truncate-3a8/00_preflight.sql`, comparar exactament 49/27 i defaults postgres. Aturar davant drift o permisos insuficients. Aplicar manualment 01 i 02, i validar 03. Mai modificar supabase_admin ni restaurar concessions insegures amb GRANT genèric.
4. Revisar ledger predecessor: no executar `db push` indiscriminadament. Ordre pendent: 20261027170248, 20261027183214, 20261028191801, 20261029040738, 20261030142034, 20261030142117, 20261030142337. Validar hashes, definicions i alias històrics; la migració de TRUNCATE ha de comprovar-se compatible amb el paquet mínim ja aplicat. Les classificacions sèniors són una operació separada encara no aprovada.
5. Verificar RPC/EXECUTE/RLS, permisos exclusius backend d'importació i Edge Function compatible abans del frontend. Actualitzar només funcions necessàries amb autorització; cap service_role al client. Comprovar equips, alineacions, convocatòries, actes i estadístiques abans/després. Aturar si canvia cap conjunt inesperat.
6. Revisió humana i CI de la PR; només amb autorització fusionar/publicar Pages. Build estàtic existent amb .nojekyll; mantenir main estable fins llavors. Comprovar Dashboard, selector, Base, Avançat, diferit, drets temporals, WhatsApp i persistència en dispositius reals.
7. Activar sincronització gradual separadament, després de provar la font autoritzada; no duplicar el cron antic. Fonts fallides conserven dades vàlides i mostren error, no plantilla buida.

Recuperació: conservar SHA publicat i artefacte Pages per rollback de codi. Una regressió de backend requereix aturar escriptures/importacions afectades, preservar dades noves i aplicar correcció endavant o restauració assajada aprovada; tornar Git enrere no restaura PostgreSQL. No fer DROP ni SQL invers destructiu. Permisos legítims es recuperen amb snapshot exacte revisat; no restituir TRUNCATE indegut. Auth, Storage físic, secrets i configuració externa necessiten recuperació separada del dump.

## Validació visual de revisió

En un entorn aïllat: Dashboard → Partit → temporada → competició → equip → partit → mode. FEM11/FEM15/Infantil: Base ordinari; Avançat només excepció de servidor. Júnior i SIMAR: dos modes amb permís. Consulta no crea context; activació explícita no duplica. Obrir Vic comprova el missatge d'alineacions pendents; una fixture fictícia de 10+10 només valida la visualització. Obrir Noia fictici comprova estat futur i candidats separats. Convocatòries: club → equip → partit, jornada/grup, hora de convocatòria independent, text i salts del format aprovat, copiar sense enviar. Repetir en mòbil, tauleta i escriptori; no usar dades fictícies contra Supabase productiu.

La PR de publicació és un punt de revisió, no una autorització. No es declara satisfet el criteri d'acceptació real Vic mentre faltin font examinable, alineacions i entorn publicat autoritzat.
