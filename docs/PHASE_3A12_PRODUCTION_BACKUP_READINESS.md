# Fase 3A.12 — Backups productius i recuperació segura

31/10/2026 UTC. Branca `audit/production-backup-readiness-3a12`, des de `7f01fa7fc0bc345aba7d98ed652d23b48db25094`.

## 1. Resum executiu

**No s'ha pogut acreditar cap backup productiu recuperable. La intervenció continua bloquejada.** El projecte està actiu i sa, però això no acredita una còpia. S'ha confirmat el pla **Free**, que no inclou la garantia de backups diaris recuperables documentada per als plans de pagament. No s'ha pogut consultar el llistat real de còpies ni la configuració PITR amb les capacitats disponibles. No es conclou que Supabase no conservi cap còpia interna: es conclou que no hi ha evidència suficient d'una còpia accessible i recuperable per al responsable del projecte.

Zero modificacions productives, exports de dades reals, restauracions, canvis de configuració/permisos, activacions de cron, fusions o desplegaments. Només lectures de gestió i transaccions SQL READ ONLY/ROLLBACK amb resultats agregats. No s'han extret contrasenyes, hashes d'Auth, tokens, objectes Storage o files personals.

## 2. Continuïtat i versions

| Referència | SHA verificat |
|---|---|
| Checkpoint 3A.11 | `7f01fa7fc0bc345aba7d98ed652d23b48db25094` |
| main | `e009f4df40d9ed353cb7d865beafed99d736892d` |
| PR #31 servidor | `3cce75896b7e262811e1b9c59a2daea733aa6782` |
| PR #32 frontend | `b76afcd70bc1f04e95f8a550b38728d77a77bf65` |
| PR #33 importació | `1b839218704bf791313bdd3f78fd5b0b8865ab0b` |
| PR #34 automatització/convocatòries | `c7e987946a693dfd58f86650978f3cc4e9d7d9bf` |

Les quatre PR continuen en esborrany i sense fusionar. Es conserven les dependències, conflictes resolts i set migracions ordenades de [3A.11](PHASE_3A11_INTEGRATION_RELEASE_READINESS.md). Els tres àlies històrics del ledger ja es van contrastar amb SQL registrat idèntic; no es tornen a executar ni es modifica el ledger. No s'ha repetit la bateria funcional 247/73 ni la restauració fictícia de 80 conjunts, perquè el codi funcional és invariant i no proven recuperabilitat productiva.

## 3. Inventari real

[Evidència d'inventari](evidence/phase-3a12-production-inventory.json).

| Camp | Resultat |
|---|---|
| Projecte | ClubHoquei360, referència pública emmascarada `oevp…pnvy` |
| Allotjament | Supabase Cloud gestionat, projecte ACTIVE_HEALTHY |
| Regió | `eu-central-1` — Frankfurt |
| Pla de l'organització | `free`, `tier_free`, verificat via gestió |
| PostgreSQL | release `17.11.0.003`; SQL `17.11` |
| Mida de DB a la lectura | 24.966.835 bytes, aproximadament 23,8 MiB; no és mida garantida del dump ni de tots els serveis |
| Taules public auditades | 45 |
| Auth auditada | recomptes de users, identities i sessions; cap credencial consultada |
| Storage auditat | 0 buckets i 0 objectes a l'instant de la consulta |
| Planificació | 1 feina cron, activa; cap ordre/secret de la feina exportat ni canviat |
| Edge desplegades | federation-sync v6, ihc-sync v3, temporary-access v1; metadades llegides, cap invocació |
| Secrets i credencials de backup disponibles | cap binding configurat a l'entorn; CLI sense access token; OAuth del connector no és una credencial de pg_dump |

Extensions/versionades al JSON d'inventari: inclouen les dependències de la plataforma i les d'aplicació. En preparar una restauració cal comprovar totes les versions, especialment pg_cron/pg_net i les extensions de secrets/encriptació que constin a l'inventari. No s'han llegit valors de secrets ni fitxers del servidor mitjançant SQL. L'existència d'una extensió o de WAL no prova un backup ni PITR contractat.

Les funcions Edge, la configuració de JWT/Auth/SMTP, les claus, les polítiques/ACL i la planificació són components diferents. Un backup de PostgreSQL no es presumeix suficient per recuperar-los tots.

## 4. Backups existents: estats diferents

| Estat | Verificació productiva |
|---|---|
| Backup existent identificat | **No verificat** |
| Backup completat sense errors | **No verificat** |
| Última còpia: data/hora i identificador | **Desconeguts** |
| Còpia descarregable | **No verificat**; backups físics no són necessàriament descarregables |
| Còpia seleccionable/restaurable amb permisos del responsable | **No verificat** |
| Retenció real configurada i finestra recuperable | **Desconegudes** |
| PITR real habilitat, punt mínim/màxim | **No verificat**; no és una prestació inclosa al pla Free documentat |
| Còpia productiva restaurada en entorn aïllat i validada | **No** |
| Backup lògic independent de producció | **No generat en aquesta fase; cap còpia anterior accessible acreditada** |

La documentació actual de [backups Supabase](https://supabase.com/docs/guides/platform/backups) descriu backups diaris per a Pro/Team/Enterprise i recomana exports independents per a Free. Aquesta política no és un llistat de còpies del nostre projecte ni acredita una retenció configurada. La documentació indica backups físics en versions modernes; això tampoc demostra dret de restauració o existència d'una còpia concreta en aquest Free.

Via oficial de consulta identificada: [Management API — Lists all backups](https://supabase.com/docs/reference/api/v1-list-all-backups), **GET `/v1/projects/{ref}/database/backups`**. El connector disponible no exposa aquesta operació. La CLI s'ha consultat legítimament en mode lectura i ha refusat `projects list` per falta d'access token. L'entorn no té credencial de gestió exportable ni identitat sortint configurada per efectuar aquest GET. No s'ha extret el token OAuth del connector, reutilitzat cookies ni eludit el proxy. Tampoc s'ha utilitzat cap endpoint de restauració.

Per completar-ho en una fase autoritzada: el responsable ha de consultar Dashboard → Database → Backups (Scheduled i Point in Time) amb el projecte verificat, o habilitar un canal de gestió de només lectura. Registrar ID/data UTC/tipus/estat/retenció/finestra/opció de restore, sense URL signada ni tokens públics. No prémer Restore, activar PITR o canviar de pla durant aquesta auditoria. No s'ha contractat res ni enviat una consulta de suport.

## 5. Cobertura i exclusions

| Component | Què cal recuperar | Límit a comprovar |
|---|---|---|
| PostgreSQL aplicatiu | esquema, dades, índexs, FK, constraints, seqüències, funcions, triggers, RLS, propietaris, ACL/defaults i ledger | dump completat no equival a restore validat; no perdre ACL amb `--no-acl` ni propietaris indiscriminadament |
| Auth | dades users/identities i dependències; decisions explícites sobre sessions | providers, JWT, SMTP, redireccions i secrets són configuració separada; evitar notificacions i ús de comptes reals durant una prova |
| Rols | definicions i pertinences legítimes, permisos exactes | pg_dump d'una DB no inclou tots els globals; passwords de rols poden no estar al backup del proveïdor; no recrear rols gestionats sense procediment suportat |
| Storage | metadades de buckets/objectes i fitxers reals | el backup DB no inclou el contingut dels objectes; avui buit, però cal revalidar-ho abans de cada intervenció |
| Edge | versions/fonts autoritzades i configuració de cada funció | ni el codi desplegat ni els secrets queden garantits pel dump DB; repositori pot diferir de desplegament |
| Cron/webhooks/HTTP | configuració i estat originals per recuperar-los després | mai arrencar-los en una còpia de prova; pg_net/cron o un trigger poden provocar efectes externs |
| Vault/xifrat | dades i claus necessàries per desxifrar legítimament | existència de taules/extension no garanteix recuperació de la clau externa |
| Pages/DNS/serveis | artefacte verificat, configuració, autenticació i proveïdors externs | tornar Git enrere no restaura DB, Storage o Auth |

## 6. Integritat productiva comprovada

[Recomptes i 95 FK](evidence/phase-3a12-integrity.json), [comprovacions semàntiques](evidence/phase-3a12-semantic-integrity.json), consultes reproduïbles `scripts/inspect-phase3a12-integrity-readonly.sql` i `scripts/inspect-phase3a12-semantic-readonly.sql`.

Una transacció REPEATABLE READ / READ ONLY ha comptat 50 taules seleccionades: les 45 public, tres d'Auth i dues de Storage. **95 FK public sense orfes; 0 constraints public sense validar.** No hi ha FK MATCH FULL que requereixin una comprovació separada de nul·litat parcial. No s'han desactivat constraints ni aplicat correccions. A més, les comprovacions agregades de managed schemas donen 0 identitats Auth sense usuari, 0 sessions sense usuari i 0 objectes Storage sense bucket: [evidència](evidence/phase-3a12-managed-integrity.json).

| Conjunt | Files a la lectura |
|---|---:|
| Clubs / equips / temporades | 1 / 36 / 1 |
| Partits federatius / pilots operatius | 560 / 32 |
| Alineacions federatives / jugadors de pilot | 2.342 / 190 |
| Incidències de pilot | 348 |
| Contextos estadístics / esdeveniments / sessions | 30 / 3 / 1 |
| Assignacions estadístiques | 3 |
| Membres de pilot / membres de club | 32 / 0 |
| Auth users / administradors de plataforma | 1 / 1, sense identificar persones |
| Invitacions temporals / auditoria d'invitació | 0 / 0 |

La resta de recomptes, incloses competicions, jugadors federatius i preparacions/convocatòries, són al JSON. Les autoritzacions noves de #31 i la cua de #34 encara no estan instal·lades: no s'han inventat com a conjunts amb zero files.

**0 grups duplicats** a les claus comprovades de jugador federatiu, entry competició/grup/equip, partit grup/ID, fingerprint de partit, plantilla entry/jugador i alineació partit/costat/jugador. **0 discrepàncies** club/temporada d'equip propi i inscripció; 0 discrepàncies club/temporada d'esdeveniment/context estadístic, equip estadístic aliè o jugador d'un altre partit. Aquestes comprovacions no acrediten tota la semàntica esportiva o duplicats textuals possibles.

**Completesa pendent, sense correcció:** 399 partits de calendari no tenen external_match_id i 20 fonts operatives no tenen federation_match_id. No es qualifiquen automàticament d'orfes o dades corruptes: tenen altres identificadors/vincles i poden ser contextos encara no reconciliats. Cal preservar IDs interns/fingerprints i procedència, sense inventar codis. No s'han fusionat registres ni investigat de nou portals federatius.

Els recomptes són un snapshot, no un backup ni una empremta de totes les files. Els escriptors productius continuen actius; un restore futur haurà de comparar contra el punt consistent de la còpia, no esperar igualtat amb una producció que ha continuat canviant.

## 7. Còpia lògica independent: preparada, NO executada

És tècnicament possible utilitzar pg_dump o l'eina oficial, però **no estan acreditades les garanties per extreure dades reals en aquest workspace**:

- no hi ha credencial PostgreSQL directa aprovada/configurada; el canal SQL MCP de lectura no equival a una connexió de pg_dump;
- el binari pg_dump no està instal·lat al host; la CLI 2.121.0 està disponible i usa Docker, però no s'ha iniciat cap dump/contenidor per exportar producció;
- hi ha aproximadament 24 GiB lliures i work està exclòs de Git, però això no prova xifrat, custòdia, accés ni retenció;
- no hi ha destinació de backup externa aprovada, política de retenció ni custodi de clau de recuperació confirmats.

**No s'ha exportat cap fila productiva.** No guardar dumps reals al repositori ni donar per segur un directori només perquè està a `.gitignore`.

Procediment preparat per a un executor autoritzat en un host de backup aprovat:

1. Aprovar finalitat, responsable, ubicació i accés del backup; còpia xifrada fora del repositori, segon suport separat i retenció acordada. Custodiar la clau privada de recuperació separada de l'arxiu. Configurar monitoratge de còpies futures només en una fase autoritzada.
2. Verificar host/port/DB/projecte/actor contra el projecte real, TLS amb verificació de certificat, compatibilitat del client PostgreSQL 17, permisos de lectura suficients i espai. Credencial per gestor segur/service file 0600; cap password en línia d'ordres, URL publicada, historial o log. Si el rol no pot llegir un component, aturar: no considerar un dump parcial com a complet ni elevar rols durant l'exportació.
3. Revisar càrrega/locks. Un dump és una lectura consistent però consumeix recursos i pot interactuar amb DDL. Preparar `--lock-wait-timeout=3s`, sense paral·lelisme massiu, i política d'aturada davant latència/errors. Per això no s'ha executat ara, sense garanties d'operació/destinació.
4. Preparar pg_dump custom sense exclusions silencioses: esquema+dades, Auth/Storage DB i dependències incloses segons manifest. Conservar propietaris i ACL per a revisió; globals/rols, secrets i fitxers externs es documenten separadament. No usar `--clean`, `--create` o opcions de restauració a l'origen.
5. Xifrar en streaming amb eina validada i destinatari verificat, sense fitxer intermedi de dades en clar. Exemple de preparació, **NO executat i requereix instal·lar/validar age i els fitxers de servei/destinatari**:

```bash
set -o pipefail
umask 077
pg_dump --format=custom --no-password --lock-wait-timeout=3s \
  --dbname='service=ch360_backup_ro' \
  | age --recipients-file "$backup_recipients_file" --output "$encrypted_backup_file"
```

El servei `ch360_backup_ro` és un nom proposat, no configurat ni una connexió verificada. Les variables són rutes aprovades, mai claus ni passwords. Els errors s'han de custodiar privadament i revisar/sanejar, no publicar-los en brut. Si qualsevol etapa falla, l'arxiu és incomplet i no es compta com a backup.

6. Verificar checksum de l'arxiu xifrat i manifest privat de cobertura, versions, snapshot/data UTC i avisos. Comprovar desxifrat i lectura del catàleg de pg_restore en host segur; això prova llegibilitat, **encara no recuperabilitat**. Validar una restauració completa aïllada segons l'apartat següent abans d'utilitzar-lo com a garantia.

La [referència CLI](https://supabase.com/docs/reference/cli/supabase-db-dump) avisa que el dump per defecte exclou esquemes gestionats com auth/storage i no inclou dades o rols. La [guia de migració de plataforma](https://supabase.com/docs/guides/self-hosting/restore-from-platform) descriu un flux filtrat; no es presumeix que tres ordres CLI genèriques cobreixin tot aquest projecte. Cal inspeccionar el manifest/TOC i documentar les exclusions de la versió real. Un pg_dump complet en brut pot incloure objectes gestionats que no es poden reimportar indiscriminadament sobre una instància Supabase existent.

## 8. Prova de restauració: preparada, PENDENT

No hi ha una còpia real accessible autoritzada ni garanties de privacitat suficients; per tant **no s'ha restaurat producció ni dades reals en local**. La còpia fictícia de 3A.11 continua essent evidència limitada del harness/migracions, sense origen productiu ni RTO productiu mesurat.

Pla de prova per a una fase posterior autoritzada:

1. Destinació nova, identificada inequívocament, sense dades prèvies, xarxa sense egress, sense exposició pública i amb xifrat/accés aprovats. Mai el projecte productiu ni un servei que el pugui modificar.
2. Configurar la quarantena **abans** de restaurar: planificadors sense executar, cron/pg_net/webhooks i callbacks externs inactius, Auth/SMTP no iniciats contra serveis reals. Bloquejar trànsit a producció a nivell de xarxa, no confiar només en el nom staging. No aplicar en aquesta auditoria canvis al cron productiu.
3. Verificar versions/extensions, membres/rols ficticis administratius i propietaris suportats; no recrear supabase_admin ni rols gestionats sense procediment del proveïdor. Revisar SQL/triggers/funcions/TOC abans d'executar-los; un dump pot contenir codi i dades de configuració sensibles. Conservar la còpia xifrada original immutable.
4. Restaurar a la DB nova amb aturada davant del primer error i operacions atòmiques quan siguin compatibles; separar les dependències de plataforma i registrar exclusions. No arrencar la Data API/Auth si el restore recupera les ACL insegures conegudes; validar primer a la quarantena. Qualsevol adaptació de destinatari s'ha de documentar, sense presentar-la com un clon exacte de Cloud.
5. Comparar esquema, índexs, constraints, seqüències, funcions, RLS, ACL/defaults i propietaris contra el manifest del punt de còpia. Comprovar recomptes i empremtes canòniques locals privades, 95 FK o el nombre esperat d'aquell snapshot, duplicitats i relacions clubs/equips/partits/estadístiques/Auth. No imprimir usuaris, hashes de password o contingut esportiu als informes públics.
6. Provar recuperació d'aplicació només dins d'aïllament, amb secrets locals nous i identitats fictícies autoritzades separades de les files reals; cap invitació, push o correu real. Validar accés/denegació, preservació i compatibilitat dels RPC. Configuracions externes/Storage requereixen proves específiques.
7. Mesurar des de la disponibilitat de la còpia fins a les verificacions completades i registrar RTO observat, punt recuperable/RPO real i limitacions. Cap valor inventat o promesa de disponibilitat. Aprovar i eliminar/retindre la còpia de prova segons la política, no amb neteja automàtica indiscriminada.

La restauració del Dashboard sobre el mateix projecte pot deixar-lo inaccessible segons documentació: **no és una prova acceptable en aquesta fase**.

## 9. Pla de recuperació per incidència

| Incidència | Acció preparada per a una fase autoritzada | Preservació / aturada |
|---|---|---|
| Error en revocacions | aturar la transacció abans del commit; comparar pre/post ACL; si ja confirmada, correcció mínima revisada dels permisos legítims afectats | no GRANT genèric ni restaurar les 49 concessions insegures per tornar a l'estat anterior |
| Error en migració | aturar següents passos; rollback de la transacció activa si existeix; inventariar estat parcial i preparar correcció endavant | no repetir CREATE ni executar SQL invers cegament; no DROP de dades noves |
| Frontend/Edge incompatible | aturar activació gradual i recuperar artefacte compatible revisat | rollback Git no recupera DB; no desactivar serveis productius aquí |
| RLS impedeix operacions legítimes | diagnòstic de política/capacitat i reparació acotada amb tests negatius | no desactivar RLS ni ampliar rols globals com a drecera |
| Pèrdua/corrupció de dades | triar còpia o PITR només si estan verificats; restaurar primer en aïllament, conciliar deltes legítims i obtenir autorització per recuperació del servei | no sobreescriure producció amb snapshot antic sense preservar incidències/estadístiques/autoritzacions posteriors |
| Importació federativa errònia | aturar només l'escriptor afectat, conservar logs/procedència i reparar registres inequívocs | no reimportació massiva o esborrat; conservar separació acta/alineació/convocatòria/estadística |
| Configuració Auth/Storage/secrets | recuperar configuració aprovada, objectes externs i secrets del custodi; validar en aïllament | no reutilitzar secrets productius a staging ni enviar notificacions reals |

Totes són accions **preparades**, no executades. L'actor, la finestra, els objectius RPO/RTO i la custòdia encara s'han d'acordar. No hi ha rollback automàtic de dades o de plataforma.

## 10. Compatibilitat amb la correcció 3A.8

[Preflight vigent](evidence/phase-3a12-preflight.json): 49 concessions exactes / 27 taules, 0 tuples absents/inesperades i 0 objectes/propietaris incorrectes. [Defaults/rols](evidence/phase-3a12-dependencies.json): les 20 entrades postgres/public coincideixen exactament amb l'inventari, inclosos els dos TRUNCATE de clients; les altres 18 han de romandre. Manifest SHA256 de `ops/truncate-3a8` intacte. Cap revocació aplicada.

No hi ha diferència de l'inventari comprovat que invalidi el paquet mínim. **La manca de recuperabilitat productiva acreditada és una porta independent que impedeix executar-lo.** Revalidar aquest preflight just abans d'una futura intervenció, perquè la lectura d'avui no garanteix l'estat d'aquell moment.

El backup preintervenció contindria els privilegis insegurs coneguts. Cal conservar-lo com a evidència en quarantena i definir la restauració de privilegis legítims amb l'overlay de seguretat aprovat; no exposar una DB restaurada amb aquests grants a clients. Una restauració de prova no autoritza restaurar-los a producció.

## 11. Condicions mínimes per autoritzar la fase següent

1. Còpia productiva identificada, completada, accessible i amb cobertura/retenció conegudes; desxifrat i **restauració aïllada validada**, incloent dependències d'Auth i configuració externa necessària. Si el proveïdor no ofereix backup recuperable en el pla actual, habilitar una via lògica xifrada amb garanties aprovades; cap canvi de pla o cost autoritzat aquí.
2. Responsable executor identificat, custodi de còpia/claus i accés mínim configurats; finestra acordada i procediment de recuperació revisat.
3. Preflight fresc exacte de 49/27+2 i manifest de seguretat invariant; estat de les set migracions/àlies documentat, sense db push indiscriminat.
4. Verificació posterior definida: 0 concessions objectiu, altres permisos/owners/RLS/dades invariants, tests Auth negatius i funcionals. Configurar control de concorrència amb escriptors/cron només dins de la finestra futura autoritzada.
5. Aturada obligatòria davant còpia il·legible/parcial, discrepàncies de cobertura/ACL/cardinalitat, permisos insuficients, regressió d'accés, errors de DB, duplicació/pèrdua o destinació no aïllada. Sense excepcions per pressa de demostració.
6. Autorització expressa diferenciada de la intervenció de permisos; migracions, classificacions, Edge/frontend i activació federativa continuen subjectes a les portes de 3A.11. Aquesta auditoria no n'autoritza cap.

## 12. Evidències, proves i límits

[Readiness](evidence/phase-3a12-readiness.json), inventari/50 recomptes/95 FK, semàntica, Edge i preflight en els JSON `phase-3a12-*`. Consultes SQL agregades executades amb READ ONLY/ROLLBACK. Eines: Supabase MCP (gestió/SQL de lectura), CLI 2.121.0 (versió/help i intent de llistat de projectes sense token), Git i comprovacions locals de JSON, manifest, sintaxi/enllaços i secrets. No s'han executat suites esportives sense canvis de codi.

La consulta de changelog directe ha rebut CONNECT 403; s'han consultat les guies actuals de backup, Management API, CLI i restauració mitjançant documentació MCP. [PostgreSQL 17 pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html) confirma snapshot consistent i separació entre dump d'una DB i globals; no es promet que un pg_dump substitueixi tots els serveis Supabase.

No hi ha fitxer de backup real, ID/data de còpia ni temps de recuperació productiu verificats. Els camps desconeguts es conserven com a desconeguts, no com a zero o absència provada.

## 13. Veredicte final

**VERD — VERIFICAT:** identitat emmascarada/regió/pla/versió/mida/extensions i dependències; 50 recomptes, 95 FK sense orfes, duplicats i relacions comprovades sense incidència als criteris definits; paquet 3A.8 immutable i preflight vigent compatible; procediment d'exportació/recuperació preparat sense executar-lo.

**TARONJA — PENDENT:** llistat real de backups, data/estat/retenció, dret de restore/PITR, cobertura de plataforma, destí xifrat/custòdia/retenció, connexió de lectura per dump, còpia real i restauració autoritzada, RPO/RTO, executor i finestra. 399 codis externs i 20 vincles absents són límits de completesa documentats, sense correcció ni qualificació automàtica d'orfandat.

**VERMELL — BLOQUEJANTS:** no s'ha acreditat cap backup productiu recuperable; el pla Free no garanteix el mecanisme diari recuperable descrit per a plans de pagament; no hi ha garanties per exportar/restaurar dades reals amb seguretat en aquest entorn. Les 49 concessions + dos defaults continuen a producció, sense autorització per corregir-los.

**BACKUP NO VERIFICAT — INTERVENCIÓ BLOQUEJADA**
