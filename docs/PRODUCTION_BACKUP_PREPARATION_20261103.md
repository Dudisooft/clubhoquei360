# Preparació de còpia productiva recuperable · 03/11/2026

Referència de publicació: PR#35,3ba0775381faa1aae6b7bb43f1aacf0f778ebfb2. Branca independent ops/cloud-backup-readiness-20261103. **No s'ha exportat cap dada productiva ni modificat la base, permisos, pla, configuració, migracions, PR#35 o Pages.**

## Què ja estava resolt i es reutilitza

Motor scripts/backup/manager.py de c274b33, sense modificar-lo: pg_dump custom, age autenticat, publicació sense sobreescriptura, validació d'integritat, recuperació de clau/escrow i pg_restore transaccional aïllat amb comprovació d'esquema/dades/ACL/RLS. Les cinc peces originals del motor/fixture/tests s'han traslladat sense canvis a aquesta branca, no reimplementades. La configuració del motor continua **només fictícia** i no s'ha afegit cap via d'execució productiva.

S'han rellegit els informes3A.12/3A.13 i conservat les evidències històriques; no s'han repetit les investigacions federatives, els permisos49+2 ni les suites esportives. S'ha revalidat el motor en aquest entorn i provat només la bretxa de composició Cloud: instantània compartida i layout gestionat/aplicatiu.

## Lectura Cloud actual

Projecte emmascarat oevp…pnvy, Supabase Cloud Frankfurt, PostgreSQL17.11 (release17.11.0.003). Base25638579bytes,24,45MiB. Pla Free ja verificat3A.12, sense canvi de pla; no s'ha assumit un backup diari accessible de pagament ni PITR.

| Àmbit | Taules | Cobertura prevista |
| --- | --- | --- |
| public |45|Aplicació: dades, índexs, constraints, triggers, RLS, funcions i ACL |
| app_private |1|Dades i funcions/rols privats necessaris; inclòs expressament |
| supabase_migrations |1|Ledger actual30versions, sense aplicar les set pendents |
| auth |27|Dades sensibles i baseline gestionat; no reduir a auth.users |
| storage |8|Metadades; ara0buckets/0objectes, cap fitxer físic pendent a l'instant consultat |

També hi ha cron,net,realtime,Vault. No es restauren cues runtime o planificadors actius com si fossin dades esportives. Secrets/configuració necessiten custòdia separada o regeneració autoritzada. El rol SQL del connector és postgres no-superusuari; té SELECT sobre les taules inventariades. Això no acredita credencial nativa per pg_dump ni dret a recrear objectes gestionats en una altra plataforma.

Owners: postgres per public/app_private/ledger; supabase_auth_admin per Auth; supabase_storage_admin per Storage.79polítiques;0views en els quatre àmbits consultats. Versions d'extensions: pg_cron1.6.4,pg_net0.20.4,pg_stat_statements1.11,pgcrypto1.3,plpgsql1.0,supabase_vault0.3.1,uuid-ossp1.1. No s'han llegit secrets, contrasenyes, hashes d'Auth, fitxers, noms de persones o contingut de jobs.

## Adaptació preparada

[Runbook exacte](../ops/cloud-backup/RUNBOOK.md), preflight SQL READ ONLY i perfil libpq d'exemple sense secrets. Via principal: pg_dump17 amb perfils privats PGSERVICEFILE/PGPASSFILE i TLS verificat, components coherents amb pg_export_snapshot, stdout directe a age, manifest xifrat i restauració només aïllada. El CLI Supabase2.121.0 està disponible i les opcions s'han verificat; el seu filtratge d'internals i el ledger no es pressuposen equivalents a un dump complet.

No hi ha una credencial SQL Cloud configurada ni accés TCP autoritzat al DB/session-pooler des d'aquest executor. El connector de lectura no pot lliurar un pg_dump consistent. La destinacióD: no és accessible aquí. La carpeta privada existent Linux té permisos0700, eines/claus fictícies fora de Git i uns22GiB lliures; és efímera i no és custòdia productiva ni còpia externa acreditada.

S'han definit: reserva mínima orientativa1GiB per aquesta mida, límits128MiB per component del motor, autenticació completa abans de SQL, grups complets amb manifest, retenció14dies/almenys3grups i una segona custòdia independent. No s'ha activat neteja, planificador, export recurrent o transmissió a cap núvol.

## Proves executades, només ficticis

- **19blocs originals PASS**, inclosos xifratge, restauració, RLS, recuperació de clau i fallades. PostgreSQL/pg_dump/pg_restore17.11 i age1.3.2.
- **8camins CLI correctes i1error esperat**, PASS, amb restauració independent.
- **7comprovacions noves PASS**: tres components xifrats autenticats; un únic snapshot/grup; escriptures concurrents sintètiques excloses coherentment; esquema/owners/ACL/RLS/ledger/dades conservats; seqüència no rebaixada; metadades Storage distingides d'objectes; cap egress, bind o port publicat.

El primer simulacre va descobrir CREATE SCHEMA public contra un esquema preexistent. Corregit només al TOC d'aquella entrada, preservant ACL i la resta d'objectes; cap DROP CASCADE o error ignorat. Els primers components de prova es van posar en quarantena privada separada perquè no es barregessin amb la retenció de còpies senceres; no es va modificar el motor per acceptar-los. La reexecució CLI i del layout passa.

Auth/Storage del simulacre són **esquemes ficticis reduïts**, no els27/8de Cloud ni GoTrue real. No s'ha acreditat una restauració Cloud completa. El baseline Supabase17 i totes les versions/esquemes gestionats s'han de contrastar al destí real autoritzat; postgres17 genèric no és suficient per prometre totes les extensions. No es descarten dades incompatibles per obtenir un PASS.

## Què falta per una còpia real recuperable

1. Host/ruta privada duradora verificats, espai, destinatari de xifratge i recuperació amb custòdia independent; no reutilitzar claus fictícies.
2. Credencial SQL existent subministrada per un canal segur, host/session-pooler exacte i connectivitat TLS autoritzada; no exigir pagar IPv4 si es pot usar session pooler5432. No demanar ni publicar contrasenyes al xat.
3. Autorització humana explícita d'exportació única d'esquema/dades aplicatives, Auth sensible i metadades Storage, i restauració de verificació en entorn privat aïllat. No és permís de modificar producció.
4. Executar aquella còpia, autenticar el conjunt complet, restaurar-lo i comprovar el baseline real, integritat, rols/RLS i Auth, amb xarxa/notificacions/schedulers bloquejats. Només llavors hi haurà evidència d'una còpia productiva recuperable.
5. Cobertura separada de configuració Cloud/JWT/SMTP/OAuth/Edge/Vault i, si Storage deixa d'estar buit, dels objectes físics. No confondre esquemes amb fitxers ni secrets amb dades restaurades.

Els49TRUNCATE i2defaults continuen pendents. La còpia preserva l'estat per recuperació, no el corregeix ni autoritza tornar a exposar ACL inadequades després d'un restore.

## Cost i autorització

Quota de plataforma/programari addicional necessària: **0€ amb equip/disc existents**. No s'ha contractat Pro,PITR,IPv4,cap projecte o servei. Si no existeix un segon suport de custòdia, aquest pot requerir material; no se n'ha inventat un preu. L'emmagatzematge i manteniment són responsabilitats reals encara que no hi hagi quota.

Autorització pendent proposada: «Autoritzo una còpia única de la base ClubHoquei360 —esquema/dades,Auth sensible i metadades Storage— xifrada en el destí privat i amb la custòdia de claus prèviament verificats, i la restauració exclusiva d'aquesta còpia en un entorn de verificació aïllat. No autoritzo restaurar o modificar producció, migrar, canviar permisos/pla, fusionar o desplegar.» L'autorització no substitueix les credencials ni les garanties de destí.

**BACKUP REAL NO EXECUTAT. Procediment preparat i simulat; publicació encara bloquejada fins a còpia real restaurada i autoritzacions següents.**

Fonts oficials consultades03/11: [Backups](https://supabase.com/docs/guides/platform/backups), [CLI backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [Restauració a self-hosted](https://supabase.com/docs/guides/self-hosting/restore-from-platform). El changelog.md no s'ha pogut llegir pel visor (content-type no admès); no es declara cap verificació de canvis a partir d'aquell error.
