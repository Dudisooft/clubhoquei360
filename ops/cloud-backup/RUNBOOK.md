# Còpia Cloud real: preparació, NO execució

03/11/2026. Referència funcional PR#35 **3ba0775**. Es reutilitza sense modificar el motor3A.13. No és una autorització ni un runner productiu. El gestor manager.py continua refusant Cloud i només admet fixtures; no li afegiu una URL real ni marqueu dades reals com a fictícies.

**Destí principal definitiu aprovat:** sobretaula, `D:\ClubHoquei360\Backups`, en substitució del portàtil. La preparació local està autoritzada, però encara no executada: aquest executor Linux no té accés al sobretaula. [Estat i represa local](DESKTOP_D_PREPARATION.md). Aquesta decisió no autoritza cap exportació productiva.

## Abast i portes obligatòries

1. Autorització humana nova: exportar dades aplicatives, Auth sensible i metadades Storage del projecte acordat; xifrar-les i restaurar-les només en una destinació aïllada. Això no autoritza restaurar producció, modificar permisos, migrar, publicar, enviar correus o canviar el pla.
2. Host executor i carpeta duradors aprovats, permisos verificats i espai suficient; segona custòdia independent i clau de recuperació comprovada. Aquest workspace és efímer i no és la custòdia del responsable. La unitatD: no és accessible/verificada aquí. Si no hi ha aquesta garantia, STOP.
3. Credencial PostgreSQL existent proporcionada per canal segur/configuració privada, mai al xat, codi, argv o logs. No restablir una contrasenya per obtenir accés sense una altra autorització. OAuth del connector SQL no equival a pg_dump. No usar la service_role del frontend com a contrasenya SQL.
4. Connexió TLS validada a host/port/DB/usuari/projecte aprovats. Preferir directe IPv6 o **session pooler5432** del Dashboard; no endevinar el host. No usar transaction pooler6543. No cal contractar IPv4 si session pooler funciona. L'executor actual no té grants TCP ni credencial SQL productiva; cal una via autoritzada des d'un host adequat, sense esquivar el proxy.
5. Clients pg_dump/pg_restore17 compatibles, age verificat, target Supabase/PostgreSQL17 compatible amb **totes** les extensions i esquemes gestionats. Un postgres17 genèric no inclou necessàriament pg_net,pg_cron,Vault o les taules d'Auth actuals. El baseline target s'ha de comparar amb l'inventari abans de carregar dades; no ometre taules/columnes incompatibles per obtenir un PASS.
6. Sense DDL/migracions concurrents durant el backup. Les escriptures esportives ordinàries poden continuar amb la instantània compartida; controlar durada, locks i recursos. Aturar si el lock timeout, la connectivitat o qualsevol component fallen. Mai declarar còpia completa a partir d'un dump parcial.

## Preparar custòdia sense secrets versionats

En el **host aprovat**, usar una carpeta privada fora de Git amb còpies0600/directoris0700 (o ACL Windows equivalents efectivament comprovades), sense sincronització pública. Les claus són en un altre lloc i la recuperació en una segona custòdia física o gestor segur aprovat. No reutilitzar les claus fictícies3A.13.

Generació futura amb age-keygen oficial, amb umask077 i fitxers nous, mai sobreescrits: crear identity.txt amb `age-keygen -o`, obtenir recipient.txt amb `age-keygen -y`, xifrar l'escrow de la identitat amb el recipient de recuperació i provar-ne la recuperació abans del dump real. No imprimir la identitat; controlar permisos i swap/disc del host. Un fitxer age no protegeix contra perdre totes les claus al mateix equip.

Reserva orientativa per aquesta DB: almenys1GiB lliure privat, a més de RAM suficient per autenticar components sencers, eines i restore; recalcular amb l'inventari vigent. La DB de24,5MiB no garanteix la mida del dump. El motor actual posa un límit128MiB per sortida/paquet; si se supera, STOP i nova revisió, no augmentar-lo cegament. Retenció preparada:14dies i almenys3**grups complets**, amb almenys una restauració verificada i segona còpia xifrada independent. No activar neteja o programador en aquesta fase.

## Perfils de connexió

Copiar pg_service.conf.example a una ruta privada i completar-la des del Dashboard. PGPASSFILE0600 es configura fora de Git amb el secret existent. Els processos reben només **rutes**, no una URL amb contrasenya:

```bash
export PGSERVICEFILE=/RUTA_PRIVADA/pg_service.conf
export PGPASSFILE=/RUTA_PRIVADA/credentials.pgpass
export PGSERVICE=ch360_backup_source
# Cap d'aquestes variables conté una contrasenya.
psql -X -w -v ON_ERROR_STOP=1 -f ops/cloud-backup/preflight.sql
```

Ordres de revisió preparades, **no executades contra Cloud**. Confirmar la identitat de connexió fora dels logs públics i comparar abast/owners/versions. No publicar el fitxer privat complet. La consulta metadata actual del connector no prova que aquesta sessió SQL nativa es pugui autenticar.

## Components i consistència

Manteniu oberta una connexió psql a la mateixa base, amb:

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT pg_export_snapshot();
-- Mantenir aquesta sessió oberta fins que tots els components s'han exportat.
```

Guardar l'identificador SNAPSHOT al manifest **privat** del grup. Tots els dumps següents han d'importar aquesta mateixa instantània; si el keeper es tanca, STOP. Les comprovacions de files/fingerprints futures també s'han de fer en una transacció que importi la mateixa instantània, no comparant recomptes de moments diferents mentre hi ha activitat.

Arguments exactes preparats per als dumps (cap connexió real s'ha fet):

```bash
# A: aplicació, esquema privat i ledger; dades+DDL+ACL+RLS+funcions+seqüències.
pg_dump -w -Fc --lock-wait-timeout=3s --snapshot="$SNAPSHOT" \
  --schema=public --schema=app_private --schema=supabase_migrations
# B: dades gestionades; l'esquema target s'ha de preparar amb baseline compatible.
pg_dump -w -Fc --lock-wait-timeout=3s --snapshot="$SNAPSHOT" \
  --data-only --schema=auth --schema=storage
# C: esquema gestionat, només per inspecció/compatibilitat i recuperació revisada.
pg_dump -w -Fc --lock-wait-timeout=3s --snapshot="$SNAPSHOT" \
  --schema-only --schema=auth --schema=storage
```

**No executar aquestes ordres sense connectar stdout directament al xifratge.** En l'operació autoritzada, cada ordre ha d'anar per una pipeline amb `set -euo pipefail` a `age --encrypt -R /RUTA_PRIVADA/recipient.txt`, escrivint un fitxer parcial xifrat nou en carpeta privada. Cap dump en clar al disc. Verificar exit0 dels dos processos abans de publicar atòmicament amb no-overwrite. Un fitxer age vàlid amb un pg_dump fallit NO és una còpia vàlida.

Esquema d'ordre: `pg_dump [arguments anteriors] | age -R "$RECIPIENT_FILE" > "$NEW_ENCRYPTED_PARTIAL"`. No conté contrasenyes ni claus literals. Els noms de fitxer només inclouen UUID. El manifest del grup, també xifrat, associa cada component, hash de ciphertext, snapshot, versions, cobertura, owners/ACL/rols/pertinences sense contrasenyes SQL i fingerprints privats. No barrejar aquests components amb la retenció del gestor de còpies senceres3A.13.

Capturar inventari de globals rellevants separat: owners, flags, ACL/defaults i pertinences, sense pg_authid o hashes de contrasenyes SQL. No restaurar indiscriminadament rols administratius gestionats ni executar un pg_dumpall --globals-only contra el target. La correspondència de rols es revisa contra el baseline. Els hashes/tokens d'Auth, si s'exporten, són dades sensibles dins el componentB xifrat i necessiten l'autorització explícita indicada.

El rol observat postgres és NOSUPERUSER amb BYPASSRLS. La connexió nativa futura ha de verificar el mateix abast; no afegir --enable-row-security al dump perquè podria convertir restriccions en una exportació parcial. Si pg_dump no pot llegir totes les dades previstes, STOP; aquesta fase no autoritza cap GRANT per resoldre-ho.

No incloure cues runtime net/realtime ni restaurar cron actiu. Vault/secrets gestionats, claus/JWT, SMTP/OAuth, configuració Cloud i funcions Edge necessiten inventari i custòdia separats o regeneració autoritzada: el dump no els fa portables per si sol. Les extensions instal·lades no es poden assumir disponibles al target. Les definicions dels jobs s'han de recuperar només en configuració privada xifrada i no activar-les al restore.

Acabar el keeper amb ROLLBACK després dels components i manifest complets. Registrar un resultat privat amb productor, instantània i tots els exit codes. Cap automatització recurrent activada.

## Restauració aïllada, autorització inclosa separadament

1. Verificar target independent, compatible i nou; no URL/ref/host productius, sense egress, ports públics, binds amb secrets reals, SMTP, webhooks o schedulers actius. Usar versions PostgreSQL/Auth/Storage i extensions contrastades. Restaurar a Cloud productiu està prohibit per aquesta autorització.
2. Comprovar clau recuperada i manifest/grup sencer. Desxifrar **completament** cada component abans de passar-lo a pg_restore; no fer `age -d | pg_restore`, que podria consumir sortida abans de validar el final autenticat.
3. Preferir buffers limitats del motor existent; per una execució manual amb CLI, la sortida en clar només pot existir en tmpfs privat verificat i sense swap en clar. Una pipeline age→fitxerRAM pot escriure contingut parcial, però no es pot iniciar SQL fins que acaba tot amb exit0. No utilitzar un temporal ordinari de D: o /tmp sense aquestes garanties.
4. Inspeccionar `pg_restore --list` i comparació del baseline abans de DDL/dades. Managed-schemaC és material de diagnòstic, no una ordre per sobreescriure les taules gestionades d'un altre Supabase. Si difereixen, STOP; no eliminar COPY, desactivar RLS o ignorar errors per forçar-lo.
5. Preparar rols i extensions **només al target** segons mapa revisat. Mantenir owners, ACL, polítiques i funcions amb privilegis com l'origen; evitar `--no-owner` global si altera SECURITY DEFINER. No reproduir rols/passwords administratius com una concessió pública.
6. Amb baseline gestionat compatible: carregarB iA segons dependències del TOC. Fer pg_restore amb `--exit-on-error --single-transaction` per cada component. No es promet atomicitat entre diversos components: un error posa el target sencer en quarantena i no produeix rebut PASS.
7. Si el TOC d'A inclou CREATE SCHEMA public i el target ja té l'esquema preexistent correcte, filtrar **només aquella entrada SCHEMA - public**, després de comprovar owner/ACL/baseline. Conservar les entrades d'ACL, constraints i totes les altres definicions. No DROP CASCADE ni ignorar el conjunt d'errors.
8. Verificar dades, Auth i ledger; claus foranes, owners, permisos/defaults, índexs, funcions/triggers i RLS amb identitats controlades. Les seqüències són no-MVCC: el seu high-water mark pot avançar respecte de les files del snapshot; no abaixar-lo ni exigir igualtat temporal falsa.
9. Comparar hashes/fingerprints privats amb els de la instantània. Provar revocació/club isolation sense correus externs ni comptes productius modificats. Un Auth.users fictici reduït no prova el baseline real Cloud. No provar contrasenyes personals ni enviar notificacions.
10. Escriure rebut privat només si tota la cobertura passa, provar l'accés amb la clau de recuperació i guardar una segona còpia completa xifrada independent. Sense còpia real restaurada i aquestes garanties, el bloqueig de publicació no es considera resolt.

Els objectes físics Storage no són dades PostgreSQL. La lectura de metadades revalidada04/11retorna0buckets/0objectes; cal repetir aquest inventari abans d’una exportació autoritzada i no extrapolar-lo a fitxers externs. Si canvia, STOP fins a tenir inventari/checksums i autorització per copiar-los; no donar-los per inclosos enB.

## Cost i evidències

Cost de llicència/plataforma addicional necessari: **0€**, amb compute/disc ja disponibles. Ni Pro, PITR, IPv4 de pagament o un projecte nou són requisits d'aquesta via. Un segon suport físic, si no existeix, pot requerir compra; no s'ha pressupostat ni autoritzat. Temps d'operació i electricitat no són quota Supabase.

Evidències del03/11:19blocs originals,8camins CLI i1error esperat,7comprovacions noves del layout i snapshot compartit, només ficticis. S'ha detectat i resolt al simulacre el conflicte CREATE SCHEMA public; els components tenen una carpeta privada separada de les còpies senceres. No és una restauració real de Cloud ni una prova de tots els27objectes Auth reals.
