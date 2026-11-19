# PR #53 — preparació segura del desplegament

Data: 17/11/2026 (Europe/Madrid). **NO PREPARADA PER PUBLICAR**: falten garanties productives de recuperació i la intervenció de seguretat autoritzada. Aquest informe no autoritza cap publicació.

## Estat exacte i correcció mínima

`main` verificat a `83b5468bd1a78dfaec754ad0f0aea2c498aa70de`; [PR #53](https://github.com/Dudisooft/clubhoquei360/pull/53), branca `feat/predictive-callups-delegate`, inicialment `f36f328f5ebe0d3512674b82fddacb957929ba63`, oberta en esborrany i sense conflictes. #49/#50/#51/#52 ja formen part de main. No s'han incorporat altres PR pendents.

La prova amb GoTrue/PostgREST reals ha demostrat que SQLSTATE `40001` retornava HTTP 500 en dues operacions amb conflicte de versió. S'ha corregit exclusivament `acknowledge_callup` i `save_callup_preferences` a `PT409` en la migració pendent, amb regressions. No s'han canviat permisos ni regles funcionals. La primera aplicació íntegra local tenia el codi inicial; després s'han substituït aquestes dues definicions locals i s'ha provat el resultat final. La suite SQL aplica també la migració final des de zero.

## Migracions i compatibilitat

Única migració nova de #53: `20261117081634_predictive_callup_delegate.sql`, després de la revisió manual de convocatòries. Tres taules privades: rebuts, preferències i revisions de propostes. RLS activada, sense DML de client; RPC públiques invoker i funcions privades amb `search_path=''`, identitat i àmbit comprovats. No hi ha importacions automàtiques a la plantilla interna.

El ledger Cloud conté 35 versions. Hi ha diferències històriques de timestamp respecte dels noms locals (convocatòries i advanced_lineup); **no s'han de reaplicar cegament totes les migracions del repositori**. Set cossos de funció predecessor coincideixen exactament per MD5 amb main: `pilot_roster_catalogue`, `callup_can_edit`, `callup_candidates`, `read_club_callups`, `save_club_callup_with_staff`, `read_club_callup_week`, `read_callup_manual_review`. El workflow nou encara no existeix a producció. Això és contrast parcial verificat, no equivalència completa de l'esquema Cloud.

La migració no és de reexecució indiscriminada: `CREATE TABLE/FUNCTION/INDEX` exigeix absència dels objectes nous. Aturar-se si existeixen parcialment. Aplicar transaccionalment només la versió nova, amb registre de versió coherent, després de backup i autorització. No hi ha canvis productius efectuats.

## Seguretat

La prova real local ha validat sis comptes ficticis GoTrue: coordinador principal, entrenador, delegat, usuari ordinari, usuari d'un altre club i superadministrador. JWT obtinguts per signup/password/login i comprovats per PostgREST; no són rols JavaScript ni JWT d'usuari fabricats. Les operacions ordinàries no utilitzen `service_role`.

PASS: coordinador amb tres equips, entrenador restringit, rival exclòs, adopció explícita/idempotent, lectura només de la versió publicada, reinici després de modificació, conservació de rebuts anteriors, CAS de preferències, anònim/altre club denegats i cap DML oficial/REST privat. Les lectures GET no creen plantilles ni convocatòries. Els snapshots de dades oficials i estadístiques pròpies no han canviat durant aquests recorreguts.

**Bloqueig anterior encara obert:** les 49 concessions explícites TRUNCATE sobre 27 taules coincideixen exactament amb l'inventari validat (cap tuple extra/absent ni grant option). Dos defaults de `postgres` també pendents. Dos defaults del creador gestionat `supabase_admin` s'han inventariat separadament: no modificar-los indiscriminadament ni canviar propietaris. No s'ha demostrat una via destructiva des del navegador; això no equival a resoldre les concessions innecessàries. El paquet de les fases 3A.8/3A.9 es conserva intacte; qualsevol aplicació requereix preflight nou i autorització diferenciada. Avisos Cloud previs de funcions definer/extension public i protecció de contrasenyes continuen sent revisió pendent, no s'han ocultat.

## Proves de regressió

Checkpoint de codi actual: **177/177 Node, 73/73 Chromium, zero fallades/omissions**, check/build 45 fitxers, diff sense errors. Inclou dues proves noves de bloqueig de destinacions productives i regressions PT409. Les suites generals inclouen PGlite i mocks de navegador; els 10+6 blocs natius detallats a continuació són una evidència addicional diferent. Logs locals ignorats: `work/pr53-staging/node-release.log` i `chromium-release.log`. CI del codi final `57969a186fc728bf6480af1a7c1b64c4550b7711`: [44071214914](https://github.com/Dudisooft/clubhoquei360/actions/runs/44071214914) **success**; logs comprovats: 177 Node, 73 Chromium i check/build 45. El checkpoint posterior només actualitza documentació i evidència agregada.

## Staging i restauració realment executats

Linux/Docker local, xarxa interna sense sortida, serveis en loopback. PostgreSQL **17.11**, GoTrue **2.197.0**, PostgREST **16.4**; sis identitats fictícies i quatre equips ficticis. Predecessor sintètic amb les migracions reals, no clon productiu. Mateixa aplicació i SDK local; configuració de resposta substituïda només en staging. Cap servei permanent instal·lat.

- **10/10 blocs Auth/API reals PASS**.
- **6/6 blocs navegador amb Auth real PASS**, mòbil i ordinador, sense mocks RPC/porta-retalls/popup. WhatsApp verificat només com a intent de navegació extern avortat; cap enviament. No s'han provat apps natives iPhone/Android.
- Còpia `pg_dump` custom xifrada amb age i restauració a un PostgreSQL nou: **67 taules / 372 files**, dades sintètiques. Dades, funcions, vistes, índexs, restriccions, RLS i privilegis efectius equivalents.
- Diferències explicades i comprovades: compactació de 15 slots de columnes eliminades; omissió de 96 ACL explícites del mateix propietari, amb propietat i matriu de privilegis efectius preservades. Les ACL de clients no s'han descartat ni s'han fet GRANT genèrics per forçar l'equivalència.
- Auth restaurat: nous inicis de sessió reals de coordinador/delegat i denegació del compte d'un altre club amb PostgREST. Les noves sessions modifiquen intencionadament les taules Auth després de comparar el snapshot.
- SHA256 del xifrat fictici: `e309b4b9aaeb510e74d370df77c5bef85337aaddf8f89c485cb92e4f8a611012`.

[Evidència sanejada](PR53_STAGING_EVIDENCE_20261117.json) i [reproducció](../ops/pr53-staging/README.md). Credencials, arxius de dades i claus fora de Git. No hi ha URL pública de previsualització; el servidor local no és una nova publicació.

## Backup productiu: no acreditat

Projecte Cloud Frankfurt, PostgreSQL 17.11, referència sanejada `oev…nvy`, mida consultada 26.490.547 bytes. Taules: public 45, app_private 7, Auth 27, Storage 10 i ledger 1; no són el mateix baseline que el staging. Storage actual: zero buckets/objectes. Extensions gestionades inclouen cron/net/vault: la seva configuració i secrets no es recuperen automàticament amb el dump local.

Les còpies `.age` locals trobades indiquen explícitament dades sintètiques. Les carpetes visibles de Drive de còpies xifrades/verificacions són buides. No s'ha pujat, descarregat ni compartit cap backup. L'API disponible no permet acreditar backups gestionats/PITR de Cloud; no es pot afirmar que no existeixin fora de l'accés disponible.

No hi ha credencial SQL nativa Cloud autoritzada per executar pg_dump en aquest entorn; el connector SQL de lectura no és un transport de backup. La unitat D: no és accessible aquí. El disc de treball s'ha exhaurit; els nous artefactes s'han mogut a RAM privada després de comparar-ne els hashes, preservant els anteriors. **RAM és efímera i no acredita custòdia ni una còpia productiva recuperable.**

El motor de backup anterior s'ha reutilitzat sense reescriure'l (hash al README). Per exportar producció cal verificar destinació duradora privada, espai, dues custòdies autoritzades, claus separades/recuperables, TLS/connexió SQL autoritzada i retenció. Procediment: dump snapshot-consistent complet de dades/esquema/ACL/RLS/funcions i ledger amb PostgreSQL 17, xifratge autenticat sense secret en arguments/logs, manifest xifrat, verificació del xifrat, còpia independent i restauració en un destí sense webhooks, correu ni cron extern. Mapar els rols gestionats sense sobreescriure'ls; verificar Auth, Storage i configuració separadament. [Runbook Cloud existent](https://github.com/Dudisooft/clubhoquei360/blob/40573bc541548d8bd19b5551cdc0a8b51bf2ffa1/ops/cloud-backup/RUNBOOK.md). No s'ha exportat ni restaurat cap dada real.

## Plantilles reals (només lectura)

| Equip | Actes verificades en historial | Identitats històriques | Plantilla interna activa |
|---|---:|---:|---:|
| FEM15 | 6 | 9 | 0 |
| Infantil D | 5 | 8 | 0 |
| FEM11 | 5 | 8 | 0 |

Recomptes confirmats de nou el 17/11. Una segona consulta restringida a la inscripció/competició del pròxim partit i a les dotze actes anteriors ha retornat també 6/9, 5/8 i 5/8. Propers partits disponibles en aquella lectura: FEM15 22/11 a les 14:00, Infantil D 21/11 a les 16:30, FEM11 22/11 a les 12:30 (Europe/Madrid). No són convocats actuals ni una garantia d’elegibilitat. El motor restringeix per inscripció, competició, temporada i data; limita les actes anteriors a dotze. La RPC nova no està instal·lada a Cloud, per tant no s'ha executat com un usuari productiu. La incorporació i el filtratge complet s'han validat amb Auth local i dades fictícies; no s'han creat jugadors reals.

## Delegat, WhatsApp i Maps

Lectura vinculada a usuari/partit/equip/versió/data, retry idempotent; una nova publicació torna a pendent i preserva els rebuts anteriors. Format literal aprovat, sense llista nominal de menors, hora de trobada configurable, preferències per equip, edició abans de copiar i alternativa manual. Porta-retalls real Chromium validat; l'obertura externa es captura i s'atura abans de contactar WhatsApp. No s'ha enviat cap missatge.

Maps prioritza enllaç exacte marcat verificat, després adreça confirmada per a una cerca; URL maliciosa/desconeguda rebutjada, sense inventar ubicacions. Les proves són amb ubicacions fictícies: no acrediten l'adreça física de cap partit real.

## Ordre de publicació i recuperació (preparat, NO executat)

1. Revalidar SHA, CI i ledger. Aturar-se si hi ha canvis no revisats, drift d'ACL/esquema o fallades.
2. Acreditar un backup productiu recent amb custòdia duradora, clau recuperable i restauració aïllada; documentar cobertura/temps real. Sense això, aturar tota intervenció productiva.
3. Autorització específica de seguretat: preflight de l'inventari exacte; aplicar únicament el paquet TRUNCATE/defaults de postgres validat; verificació de tuples/ACL restants i permisos legítims. No modificar propietat ni rols gestionats. Davant anomalia, aturar; no restaurar concessions insegures com a rollback genèric.
4. Autorització específica de migració: assegurar absència dels nous objectes, funcions predecessor correctes, una transacció per la nova migració i ledger coherent. Si falla abans de commit, rollback transaccional; instal·lació parcial exigeix diagnòstic, no reaplicació cega.
5. Prova autenticada controlada de coordinador/delegat sobre dades autoritzades: lectura, proposta revisada, guardar, publicar, lectura/revisió i denegacions. No importar llistes senceres ni alterar actes oficials.
6. Només amb tots els gates satisfets i autorització expressa, fusionar/publicar la PR #53 a GitHub Pages. Verificar artefacte de 45 fitxers i compatibilitat dels RPC; no publicar tests, SQL, carpetes privades o claus. Activació gradual sense planificador nou.
7. Validar postpublicació, inclosos dos dispositius reals amb sessions autoritzades. Davant regressió frontend, tornar al commit/artefacte anterior; això **no reverteix la base de dades**.

Recuperació: conservar taules noves/rebuts/convocatòries i aturar funcionalitat afectada; no DROP destructiu per tornar al frontend anterior. Corregir endavant amb revisió. Si hi ha corrupció de dades, restaurar primer en entorn aïllat, verificar i planificar reconciliació/commutació explícita; no prometre SQL invers ni RTO/RPO productiu que encara no s'ha mesurat. Auth/Storage/secrets/Edge Functions requereixen el seu inventari i procediment separats.

## Veredicte

**Validació local amb Auth real completada; preparació de publicació BLOQUEJADA.** Bloquejos: backup productiu recuperable no acreditat, concessions/defaults pendents i falta d'autorització de les operacions productives. Cap fusió, desplegament, migració, compte, importació ni permís productiu modificat.

## Punt de recuperació després del reinici de l’entorn

El codi i l’evidència sanejada es van pujar a `57969a1` abans del reinici. S’ha recuperat la mateixa branca des de GitHub sense sobreescriure el worktree original. El disc arrel continua ple; el checkout documental actual és `/dev/shm/ch360-pr53-final`. Els artefactes i claus ficticis en RAM de l’execució anterior ja no hi són. Això no invalida els resultats històrics desats, però impedeix presentar aquell fitxer com una còpia encara disponible o una custòdia duradora. Les eines permeten repetir la prova en un entorn nou; no cal repetir-la només per reobtenir els mateixos resultats. No s’ha treballat amb dades productives.
