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

## C–E · Continuïtat

Pendents en aquest checkpoint: recuperar el head remot de backups40573bc, validar scripts i custòdia amb fixtures; inventari i correcció SQL aïllada; suites completes del conjunt; PR final i pla de publicació/recuperació. NO FUSIONAR. NO DESPLEGAR. NO EXPORTAR NI MODIFICAR PRODUCCIÓ.
