# Fase 3A.13 — Backup xifrat independent, validació fictícia

01/11/2026 UTC. Branca `feat/encrypted-backups-3a13`, base `3f721e3a7d784d5d784fabc06c5ed49235e19900`. **Cap connexió de backup a producció, exportació real, canvi de permisos reals, migració productiva, planificador, desplegament o fusió.**

## Resultat i arquitectura

**VERD local:** cicle real PostgreSQL 17.11 → pg_dump custom → paquet xifrat age → autenticació → pg_restore → comparació de dades/esquema/ACL/RLS. Dinou blocs de prova passen, inclosa recuperació amb origen aturat i amb clau recuperada d'un escrow xifrat. [Evidència](evidence/phase-3a13-backup-tests.json).

Implementació: `scripts/backup/manager.py`, biblioteca Python estàndard i CLI age oficial; cap algorisme criptogràfic implementat de nou. El paquet conté `database.dump` i `manifest.json` dins d'un ZIP sense compressió addicional, **tot xifrat i autenticat**. El manifest associa SHA256 del dump, UUID de còpia, moment, versió PG i snapshot de verificació. El checksum identifica l'arxiu; la detecció criptogràfica de manipulació correspon a age, no a un SHA públic editable.

`pg_dump -Fc` inclou dades, schema, índexs, seqüències, constraints, funcions, triggers, RLS i ACL. El fixture també incorpora `auth.users` fictici i `supabase_migrations.schema_migrations` fictici. Els globals no són al dump: el manifest i el restaurador admeten **només els rols NOLOGIN ficticis explícits de la llista permesa**, recreats al clúster de destí; no és un exportador general de tots els rols/pertinences de Supabase Cloud.

L'exportació i la preparació del paquet estan limitades a 128 MiB per sortida/paquet. Es comprova l'espai abans de començar i abans de publicar. El contingut en clar resideix en memòria; no es crea cap fitxer temporal de dump en clar. No és un disseny per a DB arbitràriament grans: per superar el límit caldrà un pipeline revisat, no incrementar-lo cegament. Python/OS poden conservar buffers o fer swap; no s'acredita memòria segura ni xifrat del swap de la màquina.

## Eines i origen verificat

- PostgreSQL, pg_dump, pg_restore i psql **17.11**, dins d'imatge oficial existent i fixada a digest `postgres@sha256:266d3c257594e195b309ae9d1805e54c788f1d7b375f56bf6c367aac6c917e7b`.
- CLI Supabase **2.121.0**, només inventari/versió; no participa en exports ni hi ha `db push`.
- age / age-keygen **1.3.2**, binaris de la [publicació oficial](https://github.com/FiloSottile/age/releases/tag/v1.3.2). Arxiu linux-amd64 verificat contra el SHA256 publicat per GitHub: `cbe24006683f8eb669266162894b9a522a1af52f2665fbc63a4bb032ed26ac10`. No s'ha executat el binari abans de comprovar-lo.
- Opcions reals `--help`/`--version` de les eines consultades. Inicialment no hi havia age ni clients PostgreSQL al host; s'utilitzen age fora del repo i clients de la imatge. L'ordre `go install` no estava disponible a l'executable Go d'aquest entorn; no se n'ha deduït cap instal·lació reeixida. S'ha utilitzat el release oficial amb digest verificat.
- [Especificació age](https://age-encryption.org/v1): destinataris X25519, encapsulació de clau, MAC de capçalera i chunks ChaCha20-Poly1305 amb marcador final autenticat. No s'utilitza una contrasenya en arguments ni una clau literal al codi.

L'entorn gestionat ha arrencat durant la fase; política de xarxa enforced. El changelog Supabase directe continua rebutjat pel proxy; documentació actual consultada per MCP/web. No s'han eludit proteccions.

## Destinació i custòdia

Cap `D:`, `/mnt/d`, `/media/d` o equivalent verificat en aquest executor Linux. No s'ha accedit físicament a l'ordinador de sobretaula del responsable.

| Element local | Ruta | Control |
|---|---|---|
| Backups ficticis | `/workspace/private/ch360-backups-3a13` | fora de Git, directori 0700, fitxers 0600 |
| Claus/configuració fictícies | `/workspace/private/ch360-keys-3a13` | fora de Git, propietari actual, 0700/0600 |
| Clau de recuperació | subcarpeta `recovery` de claus | identitat separada; no impresa ni versionada |
| Escrow de la clau principal | subcarpeta `escrow` | còpia de la identitat principal xifrada per la identitat de recuperació |
| Eines verificades | `/workspace/private/ch360-tools` | binaris oficials, accés restringit |
| Rebuts de restore | `audit` dins de la carpeta de backups | JSON privat, hash de còpia i comprovació de restauració |

S'han comprovat físicament rutes/propietari/permisos i aproximadament 24 GiB lliures inicialment. La creació dels clústers de prova consumeix espai; es comprova el disponible de nou per cada còpia. Cap còpia a Drive/Dropbox/núvol, cap carpeta de sincronització emprada.

Els noms `bk-<uuid>.age` no contenen club, persona o partit. Publicació atòmica sense sobreescriptura: fitxer parcial xifrat O_EXCL/O_NOFOLLOW, fsync i link final no-replace; error si ja existeix. Rebuig de symlinks, fitxers compartits per hardlink, mode insegur o qualsevol directori dins d'un working tree Git.

**Límit de custòdia:** les claus principal i de recuperació són en carpetes separades del mateix executor; la recuperació lògica s'ha provat, però no una segona còpia física independent ni custòdia del responsable. No és un backup durador del seu ordinador ni un acord de recuperació productiu. Si es perd aquest workspace i les dues identitats, el repositori no permet desxifrar els fitxers; això és intencionat. Caldrà aprovar i verificar una segona custòdia física/gestor segur abans de dades reals.

## Aïllament i proteccions

Tots els PostgreSQL d'aquesta fase tenen xarxa Docker `none`, zero ports i zero bind mounts del host. Únic transport SQL: socket Unix del contenidor, mitjançant el daemon local fixat a `/var/run/docker.sock`. Es rebutgen selectors Docker externs, noms que no siguin `ch360_bk13_*`, etiqueta no fictícia, imatge diferent, xarxa habilitada, ports o mounts de host.

L'origen també ha de contenir el marcador `clubhoquei360-3a13-fictional`. No hi ha paràmetre d'URL PostgreSQL, claus Supabase ni bypass de producció. El destí ha de ser independent, buit i PG17; no s'accepta l'origen com a destí. La versió del manifest ha de correspondre al servidor. Els destins antics de prova creats en aquesta fase s’han retirat després de verificar etiqueta/imatge/aïllament, conservant l’últim restaurat, origen, client i còpies xifrades; no s’ha netejat cap contenidor aliè. No s'ha aplicat cap privilegi al projecte real; només rols/permisos de prova exigits pel fixture.

El paquet es desxifra **completament** i es valida el final autenticat abans de descomprimir/verificar o enviar cap dada a pg_restore. Aquest detall evita consumir sortida parcial de desxifratge no autenticada. pg_restore usa `--exit-on-error --single-transaction`. Un error/timeout mai genera un rebut PASS; el destí queda en quarantena i no es reintenta automàticament. Els rols globals, preparats abans de la transacció del dump, poden quedar presents després d'un error; no es declara buit el clúster complet ni es neteja indiscriminadament.

Un arxiu age garanteix integritat/confidencialitat, no identitat del remitent davant d'una substitució total feta per algú amb la clau pública. La carpeta privada i el manifest/rebut controlen còpies accidentals; una futura custòdia externa ha de definir autenticitat/procedència i, si cal, manifest signat. No restaurar dumps desconeguts: PostgreSQL pot executar-ne funcions/SQL. La quarantena sense xarxa i sense mounts és obligatòria.

## Dades i comprovació de cobertura

`tests/backup/fixture.sql`: dos clubs, dos equips, deu jugadors inventats, dos usuaris ficticis sense credencials personals i tres rols SQL de prova, una competició/partit, alineacions i convocatòries, dues estadístiques, assignació fictícia, rols NOLOGIN, índex, funció i política RLS per club, defaults i dues entrades de ledger fictícies. Tretze taules, inclosa una taula privada app_private i un trigger d’auditoria fictici. **auth.users és un fixture de forma reduïda, no Supabase Auth/GoTrue real.** No s'han copiat actes, persones o UUID productius.

Abans/després del dump es compara l'estat del fixture: si canvia, no es publica la còpia. El destí restaurat ha de coincidir en taules/owners/RLS, columnes, índexs, constraints, seqüències, triggers, funcions/owners/EXECUTE incloent app_private, polítiques, ACL de taula/esquema/defaults, rols suportats i recomptes/empremtes canòniques de files. pg_dump és consistent, però aquesta comprovació de fixture immutable no és un snapshot exportat compartit amb un importador productiu concurrent. L'adaptació productiva ha de resoldre explícitament aquest punt.

RLS restaurada: dues identitats SQL ordinàries veuen cadascuna només les estadístiques del seu club de prova; modificar un paràmetre de sessió no canvia aquest vincle. INSERT i guest són denegats, TRUNCATE no concedit. També s'ha exercitat el trigger privat en una transacció fictícia revertida, després de comparar la restauració inicial exacta. Relacions del fixture i FK restaurades intactes. No s'equipara aquest SET ROLE de PostgreSQL a JWT/Supabase Auth real.

## Proves executades

[19 blocs, tots PASS](evidence/phase-3a13-backup-tests.json):

1. PostgreSQL 17 i clients reals; origen sense xarxa.
2. Backup xifrat i catàleg custom llegible, sense dump en clar al disc.
3. Restauració en un altre clúster, amb dades/esquema/app_private/triggers/permisos/ledger exactes.
4. RLS per identitat SQL, intent d’àmbit fals, trigger, denegacions i privilegis restaurats.
5. Escrow xifrat de clau, recuperació amb identitat separada i nova restauració amb la clau recuperada.
6. Fitxer truncat/incomplet: autenticació refusada.
7. Byte de ciphertext alterat: refusat.
8. Identitat incorrecta: refusada, sense restore.
9. Espai insuficient: llindar requerit superior al lliure real; refusat abans de publicar, sense omplir el disc.
10. Fitxer absent: refusat.
11. Origen com a destí i nom no autoritzat: refusats abans de DDL.
12. Mode de clau insegur i rol SQL sense SELECT: refusats.
13. Manifest autenticat que requereix PG18 davant d'un destí PG17 real: refusat sense DDL. **No és una migració real PG18→17 provada.**
14. Sobreescriptura i symlink: refusats; còpia original invariant.
15. Restauració interrompuda real: SQL extret per pg_restore, transacció en destí, cancel·lació del backend abans de COMMIT; zero taules aplicatives parcials. No s'ha executat cap cancel·lació fora del fixture.
16. Destí parcial amb una vista: rebutjat abans de crear rols/objectes.
17. Auditoria: diferencia autenticació d’una còpia i rebut de restauració real coincident.
18. Retenció: dry-run, còpies caducades fictícies, conservació d’almenys tres incloent una restaurada i de les còpies dins de la retenció i eliminació explícita només de les candidates locals.
19. Origen aturat: el fitxer i la clau permeten verificar i restaurar sense connectar-se a la DB d'origen.

Incidència del banc de proves: el primer escenari d'origen aturat va intentar comparar després del restart un origen tmpfs ja perdut. La restauració independent havia passat, però el tancament global va fallar. S'ha corregit el test: comprovar invariància abans d'aturar, verificar el destí recuperat contra el manifest i regenerar només el seed fictici després del restart. Una altra iteració del test de retenció assumia que sempre quedaven exactament tres fitxers, ignorant còpies recents vàlides d'execucions anteriors: s'ha aïllat cada mostra i s'ha comprovat que es conserva el mínim i tota la finestra de retenció. El motor no eliminava còpies recents; no s'ha relaxat la política. La bateria final passa completa; no es presenta l'intent fallit com a èxit ni s'ha canviat cap regla de seguretat.

A més, [8 ordres CLI reals i una fallada esperada](evidence/phase-3a13-cli-tests.json) han passat: backup, verify, restore, audit, cleanup dry-run, escrow-key, recover-key, verify amb clau recuperada i fitxer absent. El rebut d’auditoria independent citat històricament no consta al checkpoint de recuperació; no es considera una evidència disponible. La nova execució CLI queda registrada a l’evidència enllaçada anteriorment.

Temps local observat de backup+primera restauració al JSON; **no és RTO productiu**, no inclou una incidència, obtenció d'una còpia remota o reconfiguració Cloud.

## Ús i reproducció

Des del repositori, amb Docker local i age verificat disponibles:

```bash
python tests/backup/validate.py
python tests/backup/cli.py
python scripts/backup/manager.py --config /workspace/private/ch360-keys-3a13/config.json --help
```

El banc crea/reutilitza només el marcador i contenidors ficticis de la fase. Per a altres màquines cal preparar/configurar explícitament rutes privades fora de Git, imatge oficial fixada i eines verificades; els binaris/claus/dumps no són al repositori. PostgreSQL usa tmpfs de prova, perdut en aturar: no és emmagatzematge productiu.

Ordres disponibles del gestor: `init-key`, `backup`, `verify`, `audit`, `restore --target`, `escrow-key`, `recover-key --output`, `cleanup`. `verify` comprova autenticació i TOC; `audit` afegeix si existeix un rebut de restauració amb hash coincident. **Només restore més comparació genera un rebut de recuperació**. El client pg_restore de verificació és un contenidor d'eines buit independent, no necessita l'origen actiu.

`cleanup` és dry-run per defecte. Política preparada: 14 dies, almenys tres còpies, i almenys una supervivent amb rebut de restauració i hash concordant. Només `--apply` elimina candidates autenticades dins de la carpeta privada. No elimina claus, fitxers desconeguts, errors, còpies manipulades o tots els backups. Cap tasca programada creada; no hi ha exports recurrents.

Linux/POSIX i Docker són l'entorn verificat. No es declara suport Windows/iOS ni una ACL NTFS provada. Si es vol D: a Windows/WSL, cal verificar accés, ACL i destí real amb l'adaptador corresponent; no substituir simplement la ruta ni donar per segur chmod sobre una unitat muntada.

## Fora de cobertura i pla complementari

| Fora del dump/prova actual | Preparació complementària necessària |
|---|---|
| Metadades Storage Cloud | no presents al fixture; cal validar-ne esquema/dades i permisos explícitament en el manifest productiu |
| Objectes físics Storage | inventari i còpia xifrada separada amb verificació de contingut |
| JWT, API keys, Vault/claus i passwords de rols | custodi segur i procediment de regeneració/recuperació aprovat; mai al manifest públic |
| Providers Auth, SMTP, redireccions, secrets | inventari de configuració i prova aïllada sense enviaments |
| Edge, Pages, DNS, serveis externs | artefactes/versionat i configuració recuperables separadament |
| Cron, webhooks, pg_net i egress | quarantena i arrencada controlada; cap activació en una restauració de prova |
| Esquemes/rols gestionats Supabase Cloud i Auth real | mapa de cobertura, permisos de lectura i restore suportat pel proveïdor; el fixture no els representa íntegrament |
| Globals/pertinences no ficticis i càrrega concurrent | adaptador revisat i snapshot consistent; no elevar permisos o copiar secrets per fer-lo funcionar |

La CLI Supabase pot filtrar auth/storage, mentre que un pg_dump en brut pot incloure objectes gestionats no restaurables indiscriminadament. Cap dels dos és una garantia per defecte de cobertura integral Cloud.

## Condicions abans d'exportar producció

1. Destinació real privada verificada, fora de Git i de sincronització pública.
2. Xifratge i restauració verificats amb la versió/eines del destí.
3. Custòdia del responsable i segona còpia de recuperació física/segura acreditades.
4. Espai, límit de memòria/càrrega i política d'aturada suficients.
5. Retenció aprovada, sense eliminació de l'última còpia recuperable.
6. Accés mínim/ACL i host protegits; secrets fora d'arguments/logs/repositori.
7. Restauració aïllada provada amb cobertura real acordada, sense notificacions/planificadors/connexions productives.
8. Manifest de cobertura i globals/serveis exclosos, amb snapshot concurrent adequat.
9. Credencials/transport PostgreSQL autoritzats i adaptador revisat: el gestor d'aquesta fase **refusa producció per disseny** i no té una opció per saltar la guarda.
10. Autorització humana expressa diferenciada. No basta que les proves fictícies siguin verdes.

**BACKUP PRODUCTIU: NO EXECUTAT — PENDENT D'AUTORITZACIÓ.** El bloqueig productiu de 3A.12 i les 49 concessions TRUNCATE/27 taules + dos defaults continuen oberts. Cap migració de les set pendents executada en producció. La [comparativa Free/Pro](PHASE_3A13_SUPABASE_PLAN_COMPARISON.md) no canvia aquest estat.
