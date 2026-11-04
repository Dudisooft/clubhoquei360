# Consolidació final · 04/11/2026

## Estat i metodologia

Branca release/final-consolidation-20261104, base11066ef8c414f2583c3e547af974e22cd454ae17 de PR#36, descendent de PR#35(3ba0775). main remot e009f4d. Les dues PR es mantenen draft i sense fusionar; la nova branca conté l’aplicació original integrada i no canvia main. No hi ha AGENTS.md als checkouts accessibles. Cap font Windows o backup productiu s’ha suposat accessible. Ordre A→B→C→D→E.

## A · Connectors i SIMAR–Vic

- Revalidació remota: recovery/functional-pilots-20261102=4970f5ad93bb008809dc3969bcad51437af3b0af; la branca original feat/functional-pilots-20261102 ja no es retorna. El checkpoint recuperat i la seva comparació són accessibles. No es reconstrueix una altra aplicació.
- Evidència recuperada docs/evidence/recovered-pilot-20261103-source.json: consulta al portàtil02/11, endpoint públic RFEP /rfep/v1/hp/report/, temporada41, partit35559, equips3697/3727,10+10. La resposta personal original no és al repositori ni s’ha reconsultat aquí. Les dades de regressió FICTÍCIES són independents. No acredita persistència productiva.
- federation-sync productiva ACTIVE v6: index.ts,parser.ts,fem15.ts coincideixen byte a byte amb main e009f4d; no incorpora PublicFederation ni public-api.ts de #35. Es reutilitza el connector existent i no es desplega.
- Nova comprovació als portals RFEP i FECAPA: curl informa CONNECT tunnel failed403, resposta server:envoy abansTLS. La política vigent és restringida i no inclou els hosts federatius. És un bloqueig de la connexió del proxy, no una resposta HTTP autenticada de la federació. No s’han fet connexions directes ni s’ha esquivat cap control.
- PostgreSQL productiu17.11: service_role NO té SELECT ni INSERT sobre public.federation_match_events. La concessió mínima exclusiva del backend ja és preparada a20261028191801_preserve_partial_federation_rosters.sql. El permission denied és independent del403. No es concedeix res a usuaris ordinaris.
- Lectura real04/11: Vic35559,24/10 18:30UTC,1–1,report_status verified, alineacions0/0; Alpicat152043,3–1,8/8,updated07:17UTC. Cap importació ni registre de prova productiu.
- Revisió addicional del predecessor SQL real: federation_commit_official_report fa actualització additiva de participants però el seu ON CONFLICT no actualitza el camp estructurat is_goalkeeper; una correcció federativa de posició podria quedar només al JSON. Aquesta diferència s’ha localitzat al codi SQL real, no s’ha provocat en dades reals. Preparar regressió i correcció limitada a la faseC.
- Recuperació legítima pendent: garantir backup, revisar permisos/migracions, autoritzar actualització del bundle existent federation-sync amb public-api.ts, confirmar competició3575/temporada41/equips3697/3727/partit35559, consultar acta per una connexió permesa i validar identitats/porters/10+10 abans d’una importació explícitament autoritzada. Reconciliar amb el context existent; no crear un segon pilot ni usar candidats. Si la font continua inaccessible, sol·licitar accés oficial amb la consulta institucional ja preparada, sense enviar-la automàticament.
- Fonts complementàries: la investigació institucional3A.11 continua aplicable; no s’ha acreditat una API pública reutilitzable d’OKMob/HoqueiPatins i no s’han reutilitzat sessions personals.

## B · Backups i doble custòdia

Recuperats13fitxers versionats d’ops/cloud-backup-readiness-20261103, head40573bc541548d8bd19b5551cdc0a8b51bf2ffa1, sense fusionar aquesta branca ni perdre #35/#36. Reutilitzat el motor3A.13, sense afegir cap runner productiu.

- Entorn efectiu Linux/cloud, Docker local28.4.0, PostgreSQL17.11 i age1.3.2;14GiB lliures observats al workspace. Aquesta mida NO és l’espaiD:. No hi ha accés verificat al sobretaula. La preparació Windows i el directori privatD: continuen com a comunicats pel responsable.
- 19comprovacions reals locals de backup/fallada PASS: dump custom, xifrat autenticat sense dump temporal en clar, restauració exacta13taules/esquema/índexs/funcions/RLS/ACL, claus fictícies recuperades, tamper/clau incorrecta/espai/versió/destí rebutjats, interrupció transaccional sense taules parcials, font fora de línia. Evidència phase-3a13-backup-tests.json.
- 7comprovacions Cloud-layout PASS: components amb snapshot compartit, ledger/owners/ACL/RLS, Auth sintètic i metadadesStorage, escriptura concurrent exclosa de la instantània, seqüències segures i cap port exposat. No són esquemes gestionats Supabase Cloud complets ni Auth real. 8camins CLI més una fallada esperada PASS.
- Fonts/restores en contenidors etiquetats fixtures, network=none, sense host mounts ni ports. Eines/claus/paquets privats fora de Git. No s’han generat claus productives ni executat pg_dump remot.
- Drive: carpeta existent ClubHoquei360 i Verificacions/Backups xifrats llegides; shared=false i només owner, sense canvis de permisos. El connector de perfil no exposa quota. La captura històrica13,01/15GB no és una verificació actual. No s’ha contractat capacitat.
- Prova real de transport amb fitxer estrictament FICTICI .age305bytes a Verificacions: pujada, readback de mida/permís privat, descàrrega binària, SHA256 ciphertext idèntic, age autenticat i SHA256 text idèntic. Cap dada ni clau productiva. Evidència final-consolidation-drive-synthetic-20261104.json. El fitxer de prova queda identificat; no s’ha eliminat/sobreescrit cap fitxer existent. Això NO és un backup PostgreSQL al núvol ni una prova de custòdia física de claus.
- Doble custòdia preparada:D:\ClubHoquei360\Backups privat → paquet age verificat → Drive privat → descàrrega/verificació/restauració aïllada; claus i escrow fora de tots dos destins, titular/suplent i suport separat. Retenció14dies/almenys3grups complets amb supervivent restaurada, sense activació de tasques o neteja productiva. Cal quota vigent/espai real abans d’exportar.
- Còpia productiva: NO EXECUTADA. Falten credencial SQL/TLS autoritzada, connexió/host/destíD:/quota i custòdia física verificats, clau productiva recuperable, baseline Supabase compatible complet i autorització explícita d’exportació/restauració aïllada. Secrets, objectes físics Storage, proveïdors Auth i configuracióCloud requereixen recuperació separada.

## C · Seguretat, migracions i correcció implementada

Preflight productiu exclusivament SELECT04/11:49concessions explícites/27taules,0absents,0inesperades i0diferències en els20defaults postgres/public (2TRUNCATE de clients).45taulespublic, totes de postgres;49capacitats efectives de clients,0defaults globals addicionals de clients. postgres NOSUPERUSER/BYPASSRLS, anon/authenticated NOLOGIN/NOSUPERUSER/NOBYPASSRLS. Paquet3A.8 immutable amb manifest verificat; cap execució productiva.

Canvi implementat al fitxer pendent20261028191801_preserve_partial_federation_rosters.sql, que NO consta aplicat a Cloud:

1. S’actualitzen is_goalkeeper/is_captain, nom no buit i player_id resolt sense canviar ID de l’alineació; camps absents conserven valors vàlids.
2. Una resposta només de participants no esborra l’estat oficial, marcador de report ni incidències/timeline prèviament recuperats quan el nou endpoint declara not_retrieved. No s’esborren files de personal/incidències/alineacions; els resultats de calendari i estadístiques pròpies no es modifiquen.
3. Identificador de participant/costat absent rebutjat atòmicament. RPC explícitament SECURITY INVOKER/search_path buit, sense EXECUTE per PUBLIC/anon/authenticated; exclusiu service_role. El SELECT/INSERT mínim d’events ja previst per #33 es manté, sense grants d’escriptura a clients.
4. Precondició de hash del cos SQL: només accepta el predecessor oficial llegit o la versió corregida, i rebutja deriva no revisada. S’afegeixen5regressions específiques; juntament amb3existents,8proves dirigides PASS en PostgreSQL/PGlite.

PostgreSQL17.11 natiu, contenidors nous networknone/noports/nomounts:

- tests/backup/security_rehearsal.py: reconstrucció exacta49+2, propietari no superusuari, preflight d’acknowledgement, revocació mínima, altres ACL/dades/RLS iguals,18defaults legítims preservats, idempotència, recuperació exacta de les ACL originals només al fixture i reaplicació, taules futures sense TRUNCATE de clients. Les proves entren realment a anon/authenticated a través d’un authenticator SQL fictici i validen current_user; no es confon una denegació de SET ROLE amb una denegació sobre la taula.
- Altre DB buit del mateix clúster: predecessor de l’RPC verificat, porter antic erroni reproduït i corregit, error d’INSERTevents reproduït/reparat, identitats/altrescostats/metadades conservats, repetició sense duplicats i clients sense EXECUTE. Aquest test s’incorpora a CI amb imatge oficial fixada per digest.
- tests/backup/migration_rehearsal.py: captura SQL privada local de3A.11, SHA25600b45a56f9a9f524da007263fd8cbb5ef5d9690a03bfec27a9fab7ac0878f9a7, Auth fictici i schema aplicatiu conegut. No és un dump productiu ni s’incorpora a Git. S’hi afegeixen19registres public inventats i un usuari fictici als8Auth locals previs.45taules public, amb empremtes de les columnes originals comparades després de cada migració; cap alteració. Backup custom natiu restaurat en un altre DB del clúster i comparat. Auth real/GoTrue no s’exercita en aquest test.
- La reconstrucció del harness ha requerit reproduir USAGE/SELECT/REFERENCES legítims de postgres sobre Auth, confirmats en lectura a Cloud, i propietat d’objectes aplicatius. No s’han ampliat permisos productius ni convertit l’actor de migració en superusuari. No és una rèplica completa de plataforma (Vault/cron/proveïdors/secrets/Storage físic exclosos).
- Les migracions DDL NO són totes idempotents: el duplicat d’age_group rebutja una segona execució i reverteix la transacció. El ledger local només omet versions amb hash igual;7omissions de represa comprovades. No es recomana executar SQL dues vegades ni un rollback destructiu. #33 i paquet49+2 sí són repetibles en el fixture.

Ordre preparat: paquet manual49+2 autoritzat → set migracions20261027170248,20261027183214,20261028191801,20261029040738,20261030142034,20261030142117,20261030142337. La quarta és hardening històric més ampli: només admissible com no-op després de la correcció mínima i preflight sense deriva/propietaris imprevistos; davant qualsevol canvi, STOP. Les metadades d’edat revisades es mantenen separades i sense executar UPDATE.

Hi ha versions locals antigues dels primers mòduls amb timestamps diferents dels noms ja publicats: NO utilitzar db push per reaplicar-les. Només les set versions revisades, amb registre/hash/preflight explícits i permisos autoritzats. La llista de30migracions remotes llegida confirma que les set pendents encara no s’han publicat.

Evidències: final-consolidation-native-security-20261104.json, final-consolidation-native-migrations-20261104.json. Scripts antics d’integració i motor de backup reutilitzats; les diferències del harness es documenten, no es presenten com Cloud real.

## D–E · Continuïtat

Pendents en aquest checkpoint: recuperar el head remot de backups40573bc, validar scripts i custòdia amb fixtures; inventari i correcció SQL aïllada; suites completes del conjunt; PR final i pla de publicació/recuperació. NO FUSIONAR. NO DESPLEGAR. NO EXPORTAR NI MODIFICAR PRODUCCIÓ.
