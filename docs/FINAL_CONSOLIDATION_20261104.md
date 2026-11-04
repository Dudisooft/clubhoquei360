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

## B–E · Continuïtat

Pendents en aquest checkpoint: recuperar el head remot de backups40573bc, validar scripts i custòdia amb fixtures; inventari i correcció SQL aïllada; suites completes del conjunt; PR final i pla de publicació/recuperació. NO FUSIONAR. NO DESPLEGAR. NO EXPORTAR NI MODIFICAR PRODUCCIÓ.
