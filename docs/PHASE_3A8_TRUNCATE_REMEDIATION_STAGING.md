# Fase 3A.8 · Validació de les 49 revocacions TRUNCATE en staging

30/10/2026. **CORRECCIÓ VALIDADA EN STAGING — PENDENT D’AUTORITZACIÓ PRODUCTIVA.** Les 49 concessions i els 2 defaults revisats s’han retirat només en entorns locals aïllats. El bloqueig productiu de 3A.7 continua obert: cap REVOKE/GRANT/default/migració o altra escriptura productiva executada. Cap fusió o desplegament.

## 1. Recuperació i SHA

| Font | Punt inicial verificat | Estat final del treball funcional |
|---|---|---|
| main | e009f4df40d9ed353cb7d865beafed99d736892d | Preservat |
| Branca d’auditoria 3A.7 | a46c872427f322c0d49ce19699720c028a0b65d6 | Punt de partida, no SHA de les PR |
| PR #31 · servidor | 3cce75896b7e262811e1b9c59a2daea733aa6782 | Sense canvis |
| PR #32 · frontend | b76afcd70bc1f04e95f8a550b38728d77a77bf65 | Sense canvis |
| PR #33 · importació | 7434ea5f5b03e9bb1592f4304d53b7ab730ee7a3 | Correcció mínima0f7b7683cfd12d9d1356e669e479c440c66951e0, posterior documentació 1b839218704bf791313bdd3f78fd5b0b8865ab0b |

Branca pròpia `audit/truncate-remediation-staging-3a8`. Checkpoints de codi: `56febd6` (paquet/core), `ad23fdc929e9800cdf4885238e880bc135b34560` (regressió real Base/Auth recuperat). Commits posteriors tanquen evidències/runbook i no alteren la correcció funcional provada. Llegits progressos, informes3A.6/3A.7, inventaris, migracions i scripts abans de modificar. Sense perdre treball preexistent o incorporar altres PR.

## 2. Estat inicial i inventari detallat

[Metadades productives READ ONLY del 30/10](evidence/remediation-3a8-production-metadata.json): PostgreSQL 17.11,49 tuples schema/taula/beneficiari/owner/grantor/privilegi i20 entrades de default del creador postgres/public. Cap fila esportiva o Auth productiva exportada. Aquesta ha estat l’única consulta de metadades productives necessària; no s’ha investigat de nou cap portal federatiu.

[Inventari immutable del paquet](../ops/truncate-3a8/inventory.json), derivat de 3A.7:49 concessions explícites sobre27 taules,22 anon+27 authenticated, owner/grantor postgres. No són49 vulnerabilitats independents ni drets del propietari. No hi ha via d’explotació de navegador demostrada a 3A.7; l’objectiu és retirar una capacitat SQL innecessària. La propietat i els permisos de backend s’han de conservar.

[Preflight inicial detallat](evidence/remediation-3a8-preflight-before.json):49 esperats,49 trobats,0 inesperats,0 absents,0 objectes/owners incorrectes,49 autoritzacions efectives. La comparació no s’ha basat només en el recompte: cada tupla s’ha contrastat amb l’inventari, el tipus d’objecte i propietari i les ACL completes. La [verificació posterior](evidence/remediation-3a8-postflight.json) mostra per cas owner/RLS/privilegi efectiu, amb 0 concessions i0 autoritzacions efectives de client. Les 49 absències respecte la llista inicial són esperades després de retirar-les.

## 3. Staging i comprovacions d’aïllament

Perfil dedicat `clubhoquei360-3a8-local`, contenidors `ch360_3a8_db/auth/rest/mail`, volum `ch360_3a8_pgdata`, xarxa Docker pròpia interna. API principal `127.0.0.1:56431`, web `127.0.0.1:56490`; còpia de recuperació amb API separada `127.0.0.1:56441` i serveis Auth/PostgREST propis. No projecte Cloud, compte real o servei de pagament creat.

Docker 28.4/vfs, PostgreSQL 17.11, GoTrue v2.197.0, PostgREST 16.4 i Mailpit local. DB sol·licita binding 127.0.0.1:56432, però el motor no publica ports de la xarxa interna. El transport SQL **real** és Dockerexec amb connexió a 127.0.0.1:5432 dins del contenidor, no una connexió externa en 56432. Els proxies Node de loopback accedeixen només als contenidors etiquetats dins la xarxa local.

Abans de cada SQL es comprova URL/projecte locals exactes, socket Docker local, etiqueta, digest d’imatge, volum, xarxa interna, binding configurat, DB/usuari/IP/port reals retornats pel servidor i sentinel de projecte. Cap CLI accepta URL arbitrària o credencials remotes. Postgres operatiu és **NOSUPERUSER** i BYPASSRLS com el rol Cloud consultat; aplica les revocacions com a propietari. Supervisor fictici separat `stage_cluster_admin` només per inicialització/backup/restore. No existeix ni s’ha canviat supabase_admin al clúster de prova. Serveis/client tenen credencials locals noves, anon key pròpia i JWT GoTrue locals; cap clau productiva usada per inicialitzar-los.

El frontend de staging es construeix en work/, substitueix les dues connexions Supabase, usa SDK local i rebutja el ref productiu. Les proves de navegador bloquegen URLs externes. No hi ha peticions Auth/API de prova contra producció.

## 4. Predecessor verificable i parts reconstruïdes

Els contenidors antics no estaven actius en reprendre l’entorn. S’ha usat el dump **local**3A.6, amb SHA coincident amb l’evidència de backup/restauració prèvia. Conté dades íntegrament fictícies i8 identitats @ch360.invalid; cap dades personals/esportives productives. El predecessor aplicatiu prové de la captura verificada 3A.6:45 taules/392 columnes/67 funcions originals, amb constraints/polítiques/triggers/ACL contrastats, després combinació de les PR pendents i dades de prova.

El dump local ja registrava4 migracions, inclosa l’antiga correcció broad 20261029040738. **No** s’ha fingit un predecessor productiu sense migrar. Les 49 ACL legacy i els 20 defaults rellevants s’han reconstruït literalment en el nou staging des de l’inventari de només lectura, abans del snapshot i la validació. Les tres primeres migracions aporten el servidor/RLS/autoritzacions i importador de la combinació; l’objectiu d’aquesta reconstrucció és provar la nova correcció mínima sobre el risc anterior.

El dump 3A.6 tenia 76 taules dels esquemes public/app_private/auth; el sentinel local afegeix1:77 conjunts de files comparats. La captura també inclou metadades de seqüències, inclòs last_value. La comparació lògica entre DB restaura ACL/defaults/funcions/rols/constraints/indexos/RLS/triggers/columnes/dades; exclou els noms físics de catàleg de la DB que necessàriament difereixen entre còpies. No s’han omès identitats o permisos per obtenir coincidència.

No són una clonació total de Supabase Cloud: propietaris/rols gestionats addicionals, event triggers de plataforma, vault/cron/pg_net, configuració d’Auth/providers/SMTP, xarxa/TLS i dades productives no es reprodueixen íntegrament. Els rols de projecte rellevants i propietat s’han reproduït per provar l’autoritat ordinària de postgres, sense convertir-lo en superusuari. No s’acredita recuperació/PITR productiu.

## 5. SQL revisat i abast

[Paquet ops/truncate-3a8](../ops/truncate-3a8/RUNBOOK.md): preflight, inventari/acknowledgement,49 revocacions explícites en01, correcció separada dels defaults en02 i verificació en03. Les 49 ordres indiquen taula i rol; retiren **només TRUNCATE** i no utilitzen ALL TABLES/GRANT. Els defaults només afecten postgres/public→anon/authenticated/TRUNCATE. Cap canvi d’owner, RLS, rol administratiu, compte, plantilla, acta o estadística dins del paquet.

Guardes: scope acknowledgement explícit, actor postgres no-super, absència de capacitats inesperades dels clients, identitat/owner/grantor/conjunt esperat, estat complet49 o 0 i coincidència amb capacitat efectiva. Una desviació parcial o concessió fora d’inventari obliga a STOP. Les empremtes de tots els altres permisos/defaults es comparen dins de les operacions atòmiques; una diferència força error/rollback. L’acknowledgement evita accidents; no és un secret ni una frontera d’autorització.

Els pre/postchecks són només lectura i mostren la connexió. El runbook exigeix contrastar també el projecte/host/DB/TLS aprovats abans d’una aplicació humana futura. La prova local no habilita el paquet contra Cloud. No s’ha usat db push/migration up ni eines de migració remota.

## 6. Snapshot, backup i recuperabilitat abans d’escriure

[Evidència core](evidence/remediation-3a8-core.json): writers Auth/PostgREST locals pausats durant snapshots/còpies per evitar canvis concurrents. Inventari complet, definicions i estat de migracions privats a work/staging-3a8; hashes i resum públics sense contrasenyes/tokens. Dump local privat mode600; restauració **abans** d’aplicar en una DB nova, comparació dels 77 conjunts i metadades lògiques completa PASS.

Els backups contenen hashes de password d’usuaris ficticis i es mantenen fora de Git. El supervisor local s’utilitza per poder restaurar Auth i propietats; el SQL de correcció s’executa després com postgres no-super. Els noms de les DB de còpia tenen prefix validat i sentinel del projecte. Cap sobreescriptura d’una DB esportiva existent, cap eliminació de volum.

## 7. Aplicació de 49 ACL i prova separada dels defaults

[Diff detallat](evidence/remediation-3a8-acl-diff.json): **49 ACL retirades,0 afegides**. L’inventari complet passa de 909 a 860 entrades; l’únic delta són aquestes 49 concessions. Es preserven SELECT/INSERT/UPDATE/DELETE i altres privilegis legítims, column/schema ACL, funcions/EXECUTE/search_path, propietaris, RLS, rols/membresies i totes les files. No s’exigeix que desaparegui TRUNCATE del propietari o backend.

Després de 01, els dos defaults clients encara existien. Una taula fictícia creada dins d’una transacció revertida demostrava que els clients tornarien a obtenir TRUNCATE, fins i tot amb RLS activada. **02 separat** retira només aquestes 2 entrades de postgres/public:20→18. Tots els altres defaults queden iguals. La nova taula de prova després del canvi neix sense TRUNCATE per als clients; owner/backend continuen autoritzats. No s’ha tocat un default gestionat de supabase_admin.

## 8. Proves negatives i guardes

- 49 intents SQL reals amb SET LOCAL ROLE anon/authenticated sobre cada tupla revisada: denegació per permisos. Es fa en transaccions locals que reverteixen; cap taula o dada productiva implicada. No és una autenticació JWT simulada: és una prova directa separada del permís PostgreSQL.
- La mateixa prova es repeteix després d’idempotència i en la recuperació; en total4 lots de 49 denegacions sobre les còpies/estats indicats, sense pèrdua de dades.
- Falten acknowledgement,48 casos parcials o 51 concessions amb taula extra: aturada abans de modificar i rollback complet de l’intent. No es fa verd només perquè el recompte global sigui semblant.
- 6 regressions del guard local: URL productiva, altre projecte, port, DB i alias/parametrització de connexió rebutjats abans de connectar.
- Auth real: vuit comptes ficticis obtenen JWT GoTrue, /user i PostgREST/RLS. Superadministrador d’aplicació/coordinador/operador segueixen sent SQL authenticated; metadata editable o JWT manipulat no eleven permisos. El rol tècnic backend s’utilitza només en proves explícites d’importació, no per suplantar un usuari ordinari.

## 9. Proves funcionals amb dades fictícies

[Manifest de proves](evidence/remediation-3a8-tests.json).

| Àmbit | Execució i resultat |
|---|---|
| Consulta esportiva | Lectura autenticada de teams, pilot_players, competicions, calendari/partits, plantilles i convocatòria. RealBase/selector mostren dades, no només una pantalla buida |
| Mode Base | [Prova real](evidence/remediation-3a8-base-real.json): delegat Auth amb assignació fictícia explícita al partit importat; confirmació de participants, gol i groga guardats per PostgREST/RLS, marcador/incidències iguals després de recarregar. Avançat ordinari en inferior denegat |
| Mode Avançat | [9 blocs API reals](evidence/remediation-3a8-auth-api.json) i [6 blocs navegador reals](evidence/remediation-3a8-auth-browser.json): sènior/Júnior ambdós modes, inferiors/privilegiats segons rol, estadístiques equip/jugador, pausa/recàrrega i futur activat explícitament sense duplicar |
| Operadors temporals | Concessió autoritzada, scopes,24h proposades/168h límit, revocació/caducitat en sessió oberta, denegació d’acta oficial/altres equips/clubs, preservació d’observacions i CAS/idempotència |
| Importació pròpia/rival | [A–H](evidence/remediation-3a8-federation.json): RPC tècnica real amb fixturesHTML;8 rivals Alpicat-equivalent,8 de catàleg/7 d’alineació Salt-equivalent, respostes parcials i repeticions sense duplicats, homònims Valls per IDs, habituals/reforços Júnior separats |
| Reparació federation_match_events | CasF reprodueix manca INSERT backend en una transacció local, verifica rollback/preservació, recupera amb el permís tècnic de #33 i repeteix sense duplicar; authenticated no obté INSERT |
| Selector | [3 resolucions×2 competicions](evidence/remediation-3a8-selector.json), quatre nivells explícits, Base/Avançat, sense preselecció en recàrrega ni escriptures de consulta |
| Recuperació amb Auth | [9 blocs API reals repetits sobre DB restaurada](evidence/remediation-3a8-recovery-auth-api.json): Auth/PostgREST de la còpia, mateix esquema endurit, escriptures estadístiques autoritzades i denegacions efectives, sense canviar la DB principal |

No s’han utilitzat portals federatius, jugadors reals o comptes productius per aquestes proves. Els codis de competició dels fixtures són contractes d’integració; les plantilles són fictícies. No es declara recuperada una plantilla real inaccessible. La lectura d’API de recuperació usa GoTrue propi de la còpia, no un JWT d’usuari fabricat ni un service role per simular un operador.

## 10. Regressió funcional imprescindible detectada i corregida

La prova nova Base va trobar un defecte **preexistent**, independent de TRUNCATE: readCatalogueFixture ometia raw_data.external_id de l’alineació. Un jugador de catàleg/alineació i el seu pilot_player ja desat no es conciliaven; seleccionar les dues representacions podia fallar amb la UNIQUE de dorsal per partit/equip. DDL/DML i RLS no havien canviat amb la correcció de permisos.

Correcció mínima justificada a **PR #33**: basic-practice.js conserva l’identificador federatiu numèric positiu que ja existeix a la font. IDs absents/malformats continuen desconeguts i la identitat d’alineació es manté; no es dedueix de nom/dorsal, no s’inventen codis o participants. Cap canvi de servidor, política RLS, migració, elegibilitat, reforços o històric. Les identitats de jugadors ja desats es conserven.

Nou test de regressió mostra fallada abans del canvi i2/2 PASS després. Prova Base real passa amb convocatòria/alineacions existents, gol, targeta i recàrrega. Després del canvi s’han executat les suites completes afectades; #31/#32 no s’han modificat. Aquest és l’únic canvi funcional de 3A.8, imprescindible per completar la regressió sol·licitada, no una funcionalitat esportiva nova.

Altres incidents del harness, resolts sense relaxar controls:

- Ports publicats no presents a NetworkSettings en Docker intern: verificació de binding configurat i transport SQL físic, no ús de noms com a única prova. inet_server_addr també normalitza /32.
- Comparació de restauració diferia només en noms físics de catàleg de DB: s’exclouen aquests noms, no permisos, dades o seqüències.
- Fixture inicial de defaults tenia 12 entrades, faltaven 8 explícites de l’owner. El pas02 ho va rebutjar correctament; intent/snapshot conservats privats. Reconstruïdes literalment les 20 verificades i repetit el bloc complet. No s’ha relaxat la precondició per ocultar-ho.
- La fixture bàsica d’Auth sense context/escut verificat va ser denegada per RLS quan s’intentava escriure oficialment. Es va usar la fixture de calendari/importació verificada i una assignació fictícia exacta de delegat; RLS es manté intacta. Un primer assert de càrrega es va substituir per esperar dades reals abans de seleccionar.

## 11. Resultats de suites i CI

| Execució final | PASS | FAIL | Omeses | Tipus |
|---|---:|---:|---:|---|
| Node conjunt |236|0|0|Inclou SQL/PGlite i regressions #28/#29/#30, auditories i6 guardes noves/2 d’identitat |
| Chromium conjunt |68|0|0|Fixtures de navegador/SQL, després de la correcció d’identitat |
| Node PR #33 |171|0|0|Branca original, sense incorporar altres PR |
| API/Auth principal |9 blocs|0|0|GoTrue/PostgreSQL/PostgREST reals |
| Navegador/Auth principal |6 blocs|0|0|Real, després del hardening; el canvi posterior de l’adaptador es cobreix amb Base real i suites completes |
| Federació A–H |8 blocs|0|0|Backend real amb dades fictícies |
| API/Auth recuperació |9 blocs|0|0|GoTrue/PostgreSQL/PostgREST sobre còpia restaurada |
| Base real / selector |1 /3 resolucions|0|0|Gol/targeta/recàrrega i consulta sense escriptures |

Els primers228/234 Node i68 Chromium anteriors al petit canvi no es presenten com el resultat final del codi corregit. Node 236/Chromium 68 posteriors i CI verificada avalen el codi actual. Les proves backend/Auth sense canvi de SQL es conserven amb la seva evidència; no es falseja el tipus d’entorn.

- CI conjunta [41031860726](https://github.com/Dudisooft/clubhoquei360/actions/runs/41031860726), codi ad23fdc: **success 236 Node/68 Chromium**, check/build i 2 recorreguts de fixtures conjunts PASS, logs comprovats.
- CI #33 [41031697108](https://github.com/Dudisooft/clubhoquei360/actions/runs/41031697108), codi 0f7b768: **success 171 Node/48 Chromium**, logs comprovats. Posterior1b83921 només actualitza documentació.
- Check/build local PASS,38 fitxers; artefacte Pages sense SQL, tests, credencials o node_modules. **No desplegat.**

La CI és Node/PostgreSQL/PGlite+Chromium; no s’hi atribueixen les proves Docker/Auth local reals. El staging real està documentat a part. Els dos tests d’identitat usen fixtures unitàries, complementats amb Base real, no en substitució d’aquest.

## 12. Idempotència i recuperació integral

01 accepta l’estat complet49 o el correcte0; parcialitats es rebutgen. 02 accepta els defaults revisats 20 o18, no un estat mixt. Segona execució:0 canvis d’ACL/defaults,0 concessions noves,0 funcions/rols/RLS/dades alterats, denegacions encara efectives.

Backup previ recuperat exactament, backup corregit recuperat en altra DB, restauració de l’estat anterior en **còpia local nova**, reaplicació i comparació completa amb el correcte,49 denegacions crítiques. Una API/Auth real de recuperació repeteix9 blocs sobre aquella còpia. No s’ha restaurat un GRANT genèric; s’ha usat el dump exacte només en staging i reaplicat el hardening abans d’exposar la còpia als usuaris ficticis de prova.

[Verificació final](evidence/remediation-3a8-final-verification.json): després de tots els registres funcionals, nova idempotència de la DB principal, backup amb els nous gols/targetes/estadístiques/convocatòries ficticis i restauració dels 77 conjunts amb igualtat de metadades/seqüències/ACL/dades. La còpia principal queda invariant.

També s’ha provat el **bundle en una única transacció exterior**: provocar un default inesperat fa fallar02 i reverteix les 49 revocacions precedents i la desviació de prova. Execució completa vàlida i segona execució PASS, amb 49 denegacions sobre còpia recuperada. Això prepara una aplicació atòmica futura, sense presentar rollback Cloud/PITR com a verificat.

## 13. Paquet productiu preparat, ordre i aturada

[Runbook](../ops/truncate-3a8/RUNBOOK.md) i manifest del paquet. Ordre: revisió/autorització nova→identitat del destí→preflight READ ONLY detallat→backup real recuperable→finestra/locks/timeouts→única transacció amb acknowledgement incloent 01+02→postflight→comprovacions funcionals/integritat autoritzades. No hi ha connexió o runner automàtic productiu.

Aturar davant host/projecte/usuari/DB/TLS o SHA inesperats; objectes/owners/grantors/concessions/inherència/PUBLIC diferents; default no revisat; RLS absent; lock/statement timeout; canvi de privilegis legítims/funcions/dades o regressió. No substituir un inventari canviat per GRANT ALL ni continuar després d’un error. Recuperació d’emergència detallada al runbook, prioritzant rollback no confirmat o correcció endavant revisada; no restaurar concessions insegures en producció.

No confondre aquest paquet amb l’antiga migració broad de #31. Abans d’una futura instal·lació, revisar i versionar **un sol camí** coherent amb el baseline/historial real; no executar tots dos a cegues o declarar49 revocacions noves si ja eren0. La fase no canvia les migracions #31/#33 ni autoritza aplicar-les. La petita correcció funcional de #33 s’ha de revisar separadament com a dependència de la combinació validada.

## 14. Limitacions i checkpoint

- El baseline és una reconstrucció verificable d’esquema+PR amb fixtures i ACL legacy, no una còpia productiva de dades o tota la plataforma. Default/rols gestionats supabase_admin i garantits Cloud no s’han canviat ni certificat.
- No es valida recuperació/PITR, Auth/providers/SMTP/TLS de producció amb una restauració local. Aquesta és una condició de la fase productiva posterior, no un èxit atribuït a aquestes proves.
- No es resolen fonts federatives reals inaccessibles, aprovacions esportives o incidents d’altres fases no relacionats amb la regressió concreta. No s’han investigat portals.
- Les 49 concessions productives continuen presents segons la lectura de l’inici de fase, i no s’han modificat. No hi ha una verificació productiva posterior a una escriptura perquè aquesta no existeix.

Checkpoint privat: work/staging-3a8/core-checkpoint-private.json i final-checkpoint-private.json; backups/snapshots privats, resultats a work/3a8 i evidències públiques sense secrets. Les seqüències de core acabades no s’han de repetir sense canvi de SQL: els snapshots finals recuperables i els hashes permeten reprendre des del primer pendent. Una reconstrucció en un altre entorn necessita el backup fictici privat validat o recaptura autoritzada de metadades+seed local; mai copiar dades reals per comoditat.

## 15. Veredicte

**VERD — VALIDAT EN STAGING:**49 revocacions exactes,2 defaults aplicatius separats, actor no-super, altres permisos/dades preservats; pre/postflight, guardes, denegacions, idempotència, recuperació i Auth real recuperat; ModeBase/Avançat/importació/temporals i suites236/68 PASS, CI verificada. Regressió d’identitat mínima corregida i provada a #33.

**TARONJA — LIMITACIONS:** diferències de plataforma/creadors gestionats/configuració Cloud, baseline reconstruït, recuperació productiva encara no exercida i decisions independents de publicació pendents. No són permisos locals fallits ni s’amaguen com una certificació productiva.

**VERMELL — BLOQUEJANTS:** cap error de correcció o pèrdua de dades pendent en staging. La fallada funcional Base detectada ha quedat corregida; no resta una regressió crítica coneguda d’aquest paquet. El bloqueig **productiu** de 3A.7 continua obert perquè no s’ha aplicat res allí; no s’ha fet desaparèixer un avís canviant criteris.

**NEUTRE — PENDENT D’AUTORITZACIÓ:** revisió del paquet i dependències, autorització humana expressa per aplicar-lo en producció i verificació posterior, amb backup real i condicions indicades. Les PR continuen en esborrany. No fusionar o desplegar automàticament.

**CORRECCIÓ VALIDADA EN STAGING — PENDENT D’AUTORITZACIÓ PRODUCTIVA.** No declarar resolt el bloqueig productiu fins a una fase autoritzada i verificada allí.
