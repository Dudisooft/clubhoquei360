# Fase 3A.11 — Integració i preparació de publicació

31/10/2026 UTC. Branca `audit/integration-release-3a11`, des de `c7e987946a693dfd58f86650978f3cc4e9d7d9bf`. **Auditoria i staging: cap fusió, desplegament ni modificació productiva.** Aquest document no autoritza cap intervenció.

## 1. Versions i dependències verificades

| Component | SHA remot auditat | Estat / dependència |
|---|---|---|
| main | `e009f4df40d9ed353cb7d865beafed99d736892d` | Preservat |
| [PR #31](https://github.com/Dudisooft/clubhoquei360/pull/31) | `3cce75896b7e262811e1b9c59a2daea733aa6782` | Esborrany; servidor, categoria, RPC/RLS, autoritzacions |
| [PR #32](https://github.com/Dudisooft/clubhoquei360/pull/32) | `b76afcd70bc1f04e95f8a550b38728d77a77bf65` | Esborrany; requereix RPC de #31 |
| [PR #33](https://github.com/Dudisooft/clubhoquei360/pull/33) | `1b839218704bf791313bdd3f78fd5b0b8865ab0b` | Esborrany; importació segura i permís tècnic d’actes |
| [PR #34](https://github.com/Dudisooft/clubhoquei360/pull/34) | `c7e987946a693dfd58f86650978f3cc4e9d7d9bf` | Esborrany apilat, base `audit/production-preflight-vic-3a9` (`00db330d7d7e9ba0453932ab52d907b8d741dbb3`) |

#33 aporta preservació d'alineacions, identitats i permís tècnic d'actes; #34 reutilitza aquests connectors i afegeix RPC de convocatòries, cues i commit acotat. No s'ha canviat la base de cap PR.

**Advertiment de lliurament:** #34 no és una PR independent sobre main. No fusionar la seva base d'auditoria a main indiscriminadament. Cal revisar el conjunt funcional amb les resolucions documentades, i decidir explícitament quins scripts d'auditoria/staging es lliuren. Els scripts locals de #34 depenen del runtime d'auditoria existent a la seva base; això no és una dependència del frontend publicat.

## 2. Integració independent i conflictes

Reconstrucció en worktree separat des de main, branca local `audit/replay-3a11`, mitjançant aplicació seqüencial dels diffs funcionals #31 → #32 → #33 → #34. Cap `git merge` ni actualització de main. Checkpoint funcional de reconstrucció `9e0354aace81d4f44080318fc8726d7fadfed271`; fixture JSON de classificacions de #31 conservat després a `df8d16236a2fe9d08c3359b2cfd7ec913c487d25` (sense canvi de codi funcional).

Conflictes: `tests/helpers/stats-db.mjs` en combinar els fixtures de servidor/frontend i l'exclusió de migracions que requereixen predecessor complet; `.github/workflows/statistics.yml` en combinar les branques de CI. Resolució: conservar suport SQL extern/skipModes, franges fictícies, exclusions de l'importador i condicions de CI compatibles. Cap conflicte en codi esportiu ni en SQL de les set migracions.

Els **157 fitxers funcionals reconstruïts coincideixen byte a byte** amb el conjunt auditat c7e9879. Això no afirma equivalència de tot el repositori: la branca d'auditoria conté també 45 fitxers de paquet TRUNCATE, harness i proves de fases anteriors absents del replay. [Evidència](evidence/phase-3a11-replay.json). La documentació acumulada també és diferent. No hi ha correccions funcionals noves en aquesta fase.

## 3. Predecessor i migracions

La consulta actual de només lectura coincideix amb l'esquema aplicatiu capturat a 3A.6 en **taules, columnes, polítiques, triggers, constraints i funcions**: [comparació](evidence/phase-3a11-current-baseline.json). Les 45 taules public són de postgres. S'ha comprovat també que postgres NO és superusuari i disposa legítimament de REFERENCES/SELECT sobre auth.users i USAGE d'auth: [ACL Auth](evidence/phase-3a11-cloud-auth-acl-readonly.json).

Staging: PostgreSQL real, GoTrue, PostgREST, Chromium, xarxa interna Docker i serveis únicament loopback. Comptes ficticis `@ch360.invalid`, secrets locals diferents dels productius, comprovacions de host/port/DB/projecte/labels/actor/sentinel abans d'escriure. Cap dada personal o esportiva productiva copiada.

S'ha restaurat una **còpia nova del predecessor**, amb l'esquema aplicatiu capturat, Auth natiu local i 619 registres ficticis de 45 taules preexistents. No és una còpia completa de Supabase Cloud: Auth, infraestructura, Vault, cron i configuració del proveïdor no són idèntics. La primera reconstrucció va detectar REFERENCES absent al harness; reproduir localment la concessió legítima comprovada a Cloud ha resolt el problema sense elevar l'actor de migració ni modificar propietaris gestionats.

Ordre provat, amb postgres NOSUPERUSER i el paquet mínim de seguretat aplicat abans:

| Ordre | Migració | Objectiu |
|---|---|---|
| 1 | `20261027170248_match_mode_access.sql` | age_group, accés per categoria/rol i activació explícita |
| 2 | `20261027183214_temporary_match_operators.sql` | Autorització temporal d'un partit, RLS i auditoria |
| 3 | `20261028191801_preserve_partial_federation_rosters.sql` | Preservació parcial i SELECT/INSERT tècnic d'actes |
| 4 | `20261029040738_revoke_client_truncate.sql` | Hardening històric de #31; no substitueix el paquet mínim revisat |
| 5 | `20261030142034_federation_automation_callup_preferences.sql` | Consulta autoritzada i preferències personals |
| 6 | `20261030142117_scoped_federation_jobs.sql` | Configuració, cua, lease i cooldown per àmbit |
| 7 | `20261030142337_scoped_federation_commit.sql` | Importació/actes acotades i atòmiques |

[Resultat i hashes SQL](evidence/phase-3a11-migrations.json): set PASS; les projeccions de totes les columnes originals de les 45 taules i els seus recomptes/empremtes es conserven després de cada migració. Sense concessions efectives TRUNCATE per anon/authenticated al final. El paquet mínim continua idempotent després de les set.

**No assumir que les migracions es poden repetir:** algunes CREATE POLICY/funcions no són rerunnable. Les primeres migracions no inclouen embolcall transaccional propi: el procediment executor haurà d'aplicar cadascuna atòmicament, amb ON_ERROR_STOP i registre de versió/hash. La prova local d'error intencionat després de la primera migració, dins d'una transacció externa, torna exactament a l'estat inicial. Sense aquest embolcall no es promet absència d'instal·lació parcial.

**Diferència de ledger conciliada només en lectura:** Cloud té 30 versions; tres dels quatre fitxers històrics de main tenen un timestamp diferent del registre amb el mateix nom (match_statistics, basic_catalogue_contexts, advanced_lineup_preparation). S'han consultat també les sentències realment registrades de les quatre versions: **SQL byte a byte idèntic** al repositori en tots quatre casos, amb SHA256 igual. [Comparació i correspondències](evidence/phase-3a11-ledger-comparison.json). No és una inferència pel nom. Es documenten els tres àlies, sense modificar el ledger. No fer `supabase db push` ni executar les migracions antigues: el manifest futur ha de contenir exclusivament les set noves versions, amb aquestes dependències ja acreditades.

## 4. Seguretat i classificacions

Preflight productiu fresc estrictament READ ONLY/ROLLBACK: **49 entrades exactes / 27 taules**, cap absent/inesperada ni propietari incorrecte; 49 capacitats SQL efectives de clients. Defaults postgres/public: 20 entrades, incloses les dues TRUNCATE de clients; les altres 18 s'han de conservar. [Preflight](evidence/phase-3a11-preflight.json), [defaults i backend](evidence/phase-3a11-backend-diagnostic.json). El manifest immutable `ops/truncate-3a8/MANIFEST.json` continua verificat.

**Bloqueig productiu obert.** No s'ha demostrat una via de TRUNCATE des del navegador, però les concessions SQL explícites innecessàries continuen presents. RLS no protegeix TRUNCATE. No s'ha executat cap REVOKE/GRANT/ALTER remot, ni s'ha alterat supabase_admin.

La migració 4 és més àmplia que el paquet mínim: només és admissible després de la correcció mínima i de comprovar ACL/defaults/PUBLIC/propietaris sense drift, de manera que no elimini concessions addicionals no revisades. En el predecessor revisat és compatible i no deixa capacitats client; davant d'un estat diferent, aturar i revisar el SQL de la PR original. No repetir el recompte esperat 49 després d'haver-les eliminat: usar el postflight corregit.

RLS/Auth reals locals: servidor decideix categoria, club, equip, partit i accions; ni URL ni localStorage eleven rols. Operadors temporals no poden importar, alterar actes o altres partits; revocació/caducitat amb JWT encara vàlid bloquegen noves escriptures i preserven dades. Cap clau privilegiada al client públic; service_role només per a tasques backend locals autoritzades, mai per simular un usuari ordinari.

Es conserven les propostes de 36 equips / 38 inscripcions: sis sèniors, quatre júniors i 26 inferiors. Els sis sèniors continuen com a **proposta administrativa pendent**, amb participació comunicada/contrastada i correspondències de catàleg documentades a [3A.5](SENIOR_CLASSIFICATIONS_3A5.md). Les captures originals no s'han examinat aquí. Sis UPDATE desactivats; cap classificació productiva aplicada. Sense aprovació/metadades fiables, categoria desconeguda continua sense Avançat ordinari; no s'introdueixen excepcions insegures.

## 5. Proves i regressions

[Evidències i hashes dels logs](evidence/phase-3a11-validation.json). Producte c7e9879 sense canvis funcionals.

| Comprovació | Resultat i límit |
|---|---|
| Suite Node conjunta amb eines d'auditoria | 247 PASS, 0 fallades, 0 omeses |
| Chromium conjunt | 73 PASS, 0 fallades, 0 omeses |
| Reconstrucció independent des de main | 229 Node / 73 Chromium finals PASS; 18 tests exclusius d’auditoria no hi formen part |
| API noves de #34 | 10 blocs PASS, Auth/PostgreSQL/PostgREST reals; respostes federatives fictícies |
| Convocatòries amb navegador/Auth/clipboard | PASS a 390×844, 820×1180, 1440×1000; dos clubs ficticis i preferències aïllades |
| API regressió #31–#33 | 9 blocs PASS, incloses concurrència, CAS, revocació, caducitat i bypass de notes |
| Navegador Auth regressió | 6 blocs PASS, vuit comptes locals, FEM15 i futur RFEP |
| Escenaris federatius A–H | Evidència anterior vàlida reutilitzada pel runner: mateix codi; no s'han recuperat actes reals |
| SQL nou predecessor | 7 migracions PASS, 619 files preservades |
| Recuperació local | 80 conjunts i metadades restaurats en una altra DB, font invariant |
| Check/build | 41 fitxers, sintaxi/IDs/enllaços i artefacte Pages PASS |
| CI del commit funcional auditat | [run 41077189934](https://github.com/Dudisooft/clubhoquei360/actions/runs/41077189934), success; no és CI del nou checkpoint documental |

Incidències del harness conservades: assignació històrica solapada denegada correctament; repetició completa sobre context FEM15 fictici independent PASS. Un primer clon va col·lidir amb la clau única de procedència i es va revertir íntegrament; s'ha emprat un ID fictici nou. Cap relaxació de permisos ni eliminació d'històrics per fer passar proves. La reconstrucció independent exclou eines d'auditoria, però ha de conservar el JSON de classificació consumit pels tests: s'ha restaurat el blob exacte de #31 després d'un primer intent incomplet que va bloquejar el procés de prova. Prova afectada 3/3 i suite final independent 229 Node PASS, 0 fallades/omissions. Un primer Chromium d'aquest replay va donar 71 PASS/2 errors route.fetch (ECONNRESET i petició en acabar test); repetició dirigida 2/2 PASS i repetició completa final 73/73 PASS, sense canviar codi ni controls. Es conserva aquesta inestabilitat del harness com a límit de diagnòstic, sense atribuir-la a càrrega o al producte sense evidència.

La CI de #32 encara fixa el servidor 60d7d1b; s'ha comprovat que migracions i scripts d'integració d'aquell pin són idèntics als del head #31 auditat 3cce758. No s'ha usat el pin com a substitut de la reconstrucció amb els heads actuals. Les quatre CI de head són success: [estat verificat](evidence/phase-3a11-pr-status.json).

El generador manté el format original: títol/emojis, jornada, grup, data, hora oficial, local/visitant, pista/Maps, hora de convocatòria, samarreta, roba, observacions i tancament. Hora de convocatòria i overrides no modifiquen el partit. Preferències personals per usuari/equip, recuperades després de recarregar; canvi de club neteja la selecció. Comparació exacta text/clipboard i captura mòbil revisada, sense desbordament. Cap enviament, destinatari, API WhatsApp o missatgeria interna. **Enganxat a WhatsApp físic i Safari/iOS no provats.**

## 6. Integritat i límits

[Backup/restore i atomicitat](evidence/phase-3a11-recovery.json): dump privat local, restitució independent de 80 conjunts i definicions/ACL idèntics. No demostra recuperació Cloud/PITR, secrets, cron, Storage o configuració administrativa.

Les tres variacions d'empremta de 3A.5 (federation_matches, federation_team_entries, federation_team_roster) continuen sense causa històrica demostrada: no existeixen snapshots de files suficients. El cron horari i imports observats avui proven un mecanisme de canvi, però no expliquen retroactivament aquelles tres variacions. No s'han declarat benignes. Qualsevol nova còpia productiva ha de controlar també els escriptors federatius concurrents; les empremtes d'aquesta fase sobre metadades són estables, no una garantia sobre tot el contingut esportiu remot.

El Vic continua amb alineacions oficials 0/0. Cloud arriba al commit de l'acta 35559 i falla per INSERT backend absent; a més el runner antic etiqueta success malgrat errors d'actes. #33/#34 corregeixen aquests camins al codi no publicat. No s'ha executat una reimportació real ni vinculat el pilot antic. Vegeu [investigació federativa](PHASE_3A11_FEDERATION_ACCESS_RESEARCH.md).

## 7. Procediment de publicació PREPARAT, NO EXECUTAT

Cada pas exigeix autorització humana posterior i un responsable executor identificat. No hi ha runner automàtic productiu en aquesta fase.

1. Fixar SHA de les quatre PR i resolucions, revisar PR34 apilada i paquet de lliurament. Revalidar els tres àlies històrics del ledger i els hashes conciliats, sense executar-los ni modificar el registre. Revisar classificacions i aprovar separadament qualsevol UPDATE previst. Aturar davant SHA, definició, owner, cardinalitat o estat parcial inesperat.
2. Preparar finestra; inventariar i suspendre temporalment els escriptors federatius autoritzats per evitar concurrència, conservant la configuració. Backup Cloud verificat amb restauració autoritzada a entorn separat: esquema, dades, ACL, sessions/autoritzacions i configuració externa pertinent; xifrat i accés limitat. Si no es pot demostrar recuperació i preservar els canvis del període, aturar.
3. Executar només el preflight de `ops/truncate-3a8/00_preflight.sql` i revisar els defaults/roles. Exigir les 49 tuples/27 objectes i dos defaults exactes, no només un total. Autorització específica de seguretat. Aplicació manual transaccional de `01_revoke_current.sql` i `02_revoke_postgres_default.sql`, amb acknowledgement i precondicions del RUNBOOK. `03_verify.sql`: 0 concessions objectiu, 18 defaults legítims preservats, DML/owners/RLS intactes. Qualsevol drift o error obliga a aturar abans de migrar.
4. Instal·lar exclusivament les set migracions de la taula en ordre, atòmicament cadascuna, amb manifest/hash/registre concordants. No continuar després d'error ni repetir cegament. Verificar RLS, EXECUTE/search_path, dependències Auth, FK/índexs, permisos tècnics i empremtes/cardinalitats després de cada bloc. La migració 4 requereix revisió de no-op després de la correcció mínima. Cap estadística/acta/alineació esborrada.
5. Si estan administrativament aprovades, aplicar metadades esportives amb identificadors/cardinalitats estrictes en una intervenció diferenciada; altrament mantenir les restriccions de desconeguts i informar que l'accés ordinari previst no està activat.
6. Preparar Edge actualitzat de #33/#34 i secrets backend. Contrastar JWT/scheduler token, domini/procedència i permisos. Desplegament separat autoritzat; planificador nou inicialment inactiu, sense doble execució amb ihc-sync legacy. Verificar errors d'actes com a partial/failed, no success fals. No posar service_role al frontend.
7. Publicar únicament l'artefacte Pages que correspongui al conjunt aprovat, després de smoke Auth/RPC/RLS autoritzat. Provar Dashboard→selectors, Base/Avançat, consulta sense writes, convocatòries/còpia, revocació i caducitat amb comptes de prova legítims; sense escriure fixtures en partits reals.
8. Activació gradual del connector només amb fonts/condicions autoritzades: un àmbit, freqüència conservadora, reintents limitats, observabilitat i cap planificador duplicat. Reimportació 35559 només amb autorització específica, dues alineacions verificades, IDs/dorsals/porters/procedència i revisió de vinculació del pilot existent. Si falta un costat no declarar l'acta completa; preservar les dades vàlides i registrar parcialitat.

**Aturades:** accés entre clubs, operador temporal escrivint actes, concessió SQL imprevista, modificació de resultat/convocatòria, pèrdua/duplicat, hash inesperat, API incompatible, error crític de consola, backup no recuperable o identitat federativa ambigua. Fonts caigudes no s'han d'interpretar com a plantilla buida.

## 8. Recuperació

Codi/Edge: conservar artefactes i configuracions anteriors verificats; aturar primer el worker afectat i comprovar compatibilitat del client anterior amb l'esquema nou abans de recuperar-lo. No suprimir taules/columnes ni restaurar concessions insegures perquè es retira frontend.

Dades: cap SQL invers automàtic. Correcció endavant revisada preferent; si cal restauració, entorn separat, verificació de còpia, conciliació dels deltes legítims, autorització humana i preservació d'actes/alineacions/estadístiques/sessions/assignacions/autoritzacions/preferències/auditoria. Recuperació de privilegis legítims per inventari exacte, mai GRANT genèric. La recuperació local de prova no és una garantia de recuperació productiva.

## 9. Represa tècnica i evidències privades

Consultes preparades: `scripts/inspect-phase3a11-readonly.sql` i preflight immutable de 3A.8. El primer recull metadades/defaults/estat del 35559/ledger sense noms de jugadors; cap script de producció automàtic. Les evidències publicades són agregades i no inclouen tokens, contrasenyes ni SQL amb dades personals.

En aquest workspace, recuperar l'entorn amb `node scripts/remediation-runtime.mjs`; el runtime comprova Docker/volum/sentinel i reutilitza el clúster, no reexecuta migracions instal·lades. API local: `node scripts/remediation-api.mjs`; frontend fictici: `node scripts/phase3a10-site.mjs .`. Per repetir només quan hi hagi canvis: `node scripts/verify-phase3a11-migrations.mjs` crea una altra còpia de predecessor, i `node scripts/verify-phase3a11-recovery.mjs` una altra còpia per provar atomicitat/restauració. Mai apuntar-los a Cloud.

Els scripts necessiten els artefactes privats de predecessor/captura i els comptes ficticis existents a work, no versionats. En un workspace nou cal recuperar el checkpoint local protegit o reconstruir-lo amb captura autoritzada de l'esquema sense files i provisionament fictici de 3A.6–3A.8. El repositori per si sol no constitueix un backup dels secrets locals ni de Cloud. El manifest de hashes permet comprovar si les proves anteriors continuen vàlides.

## 10. Veredicte

**VERD — consolidació funcional validada localment**, incloses migracions, Auth/RLS, convocatòries, preservació i recuperació aïllada. No s'han introduït funcionalitats noves ni modificat les PR originals.

**TARONJA — limitacions:** àlies històrics del ledger documentats que impedeixen un db push indiscriminat, Auth/infraestructura Cloud no clonats completament, classificacions administratives pendents, WhatsApp físic/iOS pendent, evidència històrica d'empremtes incompleta i integració federativa institucional no confirmada.

**VERMELL — publicació bloquejada actualment:** 49 concessions + dos defaults encara a producció; còpia/recuperació Cloud i intervenció no autoritzades/executades. El Vic no disposa d'acta completa importada.

**Preparació tècnica documentada amb condicions; no apta per publicar mentre continuïn els bloquejos productius.** La següent decisió humana pot aprovar o ajornar una intervenció controlada amb aquestes portes de verificació; aquest informe no l'executa ni l'autoritza.
