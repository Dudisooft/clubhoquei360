# Publicació controlada · preparada, NO autoritzada

Candidat únic: [PR #37](https://github.com/Dudisooft/clubhoquei360/pull/37), branca `release/final-consolidation-20261104`, descendent de #35/#36. `main=e009f4df40d9ed353cb7d865beafed99d736892d` continua intacte. Aquest document no és un runner, una fusió ni una autorització.

## Portes prèvies obligatòries

1. Revisió humana de la PR, CI del SHA que es publicarà i comparació amb `MIGRATIONS.json`. Aturar davant conflictes, hash diferent, proves fallides o dependències no verificades.
2. Backup productiu recuperable acreditat segons [el procediment Cloud](../cloud-backup/RUNBOOK.md): destí D: privat, quota Drive vigent, doble còpia xifrada, custòdia separada de claus i recuperació de la clau, components amb la mateixa instantània i restauració aïllada compatible. Les proves fictícies d'aquesta PR no compleixen aquesta porta productiva. No exportar sense una autorització explícita que inclogui Auth sensible i la destinació.
3. Executor i projecte confirmats: perfil privat/TLS, host/port/DB/usuari contrastats amb el Dashboard i projecte aprovat `oevp…pnvy`. No imprimir credentials. El nom `postgres` de la DB no identifica el projecte. No usar credencials de servei per simular accions ordinàries ni elevar el rol executor.
4. Finestra acordada, responsable i suplent identificats, registre privat d'operacions, punt de recuperació i criteris d'aturada. Inventari de schedulers/webhooks/SMTP/Storage i de qualsevol escriptura concurrent que afecti el backup. No activar una cua/planificador nou durant la intervenció.

## Seqüència futura, només amb autoritzacions diferenciades

### 1. Preflight de lectura

- Executar `PREFLIGHT_READ_ONLY.sql` i el preflight detallat immutable `../truncate-3a8/00_preflight.sql`. Comparar les 49 tuples/27 objectes i els 20 defaults, no només totals. Verificar RLS, owners, pertinences, grants legítims i hashes del paquet. Guardar només resultats sanejats al registre públic.
- Estat actual observat: `PENDING_49_PLUS_2`, actor postgres no superusuari, zero owners públics imprevistos, 49 capacitats client efectives; funció canònica reconeguda; service_role sense SELECT/INSERT d'events. No hi ha objectes actuals obligatoris absents.
- El paquet és exclusivament `postgres/public`: dos altres defaults observats de `postgres/storage` es mostren separadament. Les 8 taules Storage són de `supabase_storage_admin`, cap de postgres. No ampliar-hi les revocacions ni canviar owners/rols gestionats. No hi ha cap via destructiva de Storage demostrada a l'aplicació. [Supabase recomana tractar Storage com a esquema gestionat de només lectura](https://supabase.com/docs/guides/storage/schema/design). Qualsevol deriva d'aquest inventari requereix revisió de plataforma.
- Confirmar versions del ledger remot. Les quatre migracions locals antigues ja publicades tenen alguns timestamps diferents al registre Cloud: no usar `supabase db push` ni reaplicar-les. No reparar el ledger remot automàticament.

### 2. Correcció mínima de seguretat

- Requereix autorització expressa, backup recuperable i el preflight exacte vigent. Seguir el [RUNBOOK 3A.8](../truncate-3a8/RUNBOOK.md) amb acknowledgement revisat, transacció, lock timeout i actor legítim propietari no superusuari.
- Aplicar només `01_revoke_current.sql` i, separadament, `02_revoke_postgres_default.sql`. Verificar amb `03_verify.sql`: 0 concessions objectiu, 18 defaults legítims públics preservats, DML/owners/RLS/dades intactes. No esperar que desapareguin privilegis inherents d'owners o administradors.
- STOP davant qualsevol diferència, bloqueig, error, capacitat client residual o canvi no revisat. No revocar indiscriminadament altres esquemes. No usar `supabase_admin` per esquivar límits.

### 3. Set migracions i metadades aprovades

- Aplicar estrictament els set fitxers de `MIGRATIONS.json` en aquell ordre i amb els hashes revisats, una transacció per migració i ledger concordant. No continuar després d'un error. No totes les DDL són repetibles: només ometre una versió ja registrada amb contingut coincident.
- La tercera migra l'importador i repara l'RPC canònic: el seu hash de predecessor ha de coincidir amb un dels dos cossos revisats. No sobreescriure un altre cos per obtenir un PASS. El `SELECT/INSERT` d'events i l'`EXECUTE` de l'RPC són exclusius del backend.
- La quarta és hardening històric ampli. Només és acceptable com a no-op després del paquet mínim i amb ACL/defaults/owners públics sense deriva. Si el preflight no demostra això, STOP i revisar el SQL; no provar-lo cegament.
- Després de cada bloc, comprovar objectes/RLS/EXECUTE/search_path/FK/índexs i fingerprints de les columnes i registres esportius preexistents. Conservar tota incidència, alineació, observació, sessió i autorització legítima. Les noves taules figuren al manifest.
- La classificació esportiva és una operació de dades independent: aplicar només propostes explícitament aprovades amb IDs/temporada/club/cardinalitat verificats, segons `scripts/prepare-reviewed-age-groups.sql`. Els UPDATE de revisió continuen desactivats; no inferir senior per nom de divisió ni concedir excepcions client. Validar sènior/júnior/youth i els dos rols privilegiats amb sessions legítimes.

### 4. Backend federatiu i recuperació autoritzada

- Actualitzar, només amb autorització, els bundles existents necessaris: `federation-sync` amb `index.ts`, `parser.ts`, `fem15.ts`, `public-api.ts` i dependències fixades; el worker de cua existent quan correspongui. Publicar només HTML no instal·la aquest backend. Guardar versions/digests anteriors per a revisió de recuperació.
- No habilitar nous schedulers de manera massiva. Inventariar el cron existent, preparar un únic scope autoritzat i comprovar límits/leases/reintents/procedència abans d'una activació gradual posterior.
- Per Vic: consulta federativa legítima, temporada41/competició3575/partit35559/equips3697–3727, noms/dorsals/porters/IDs d'ambdues alineacions. No substituir amb plantilla general o fixtures. Només després d'autorització d'importació, reconciliar amb els contextos existents i verificar participants realment persistits i absència de duplicats. Si continua el bloqueig de connexió, registrar-lo i usar la via oficial d'accés; no eludir-lo ni escriure a la federació.
- El pilot antic i les dades federatives no es vinculen pel nom. Conservar sessions/estadístiques i comprovar exactament quins IDs comparteixen. El Noia futur continua com a candidats/consulta fins a acreditar la seva alineació.

### 5. Frontend i prova controlada

- Només quan totes les portes siguin satisfactòries i hi hagi autorització de fusió/publicació: publicar el candidat aprovat en l'arquitectura GitHub Pages existent. No una segona aplicació. La verificació local construeix 43 fitxers web; no desplegar `work/`, tests, scripts SQL, backups o configuració privada.
- Dashboard → temporada → competició → equip → partit → mode, sense selecció automàtica. Provar futur/consulta/activació explícita, partit finalitzat/diferit, Base/Avançat, privilegis/denegacions i grants temporals amb identitats legítimes.
- Provar FEM11, FEM15, Infantil D, Júnior A, SIMAR–Vic i SIMAR–Noia amb procedència visible. Validar alineacions pròpies/rivals, porters, reforços separats, gols/targetes, cronòmetres independents, correcció/recarrega i WhatsApp amb còpia explícita sense enviament.
- Revalidar sincronització real entre dispositius i pèrdua de connexió; no atribuir els transports falsos de regressió a Auth o Realtime Cloud. Cap dada fictícia en partits productius: primer lectura, després registre real expressament autoritzat.

## Recuperació i criteris d'aturada

- **Codi:** conservar artefacte i SHA anteriors; tornar al codi aprovat és una operació separada i no restaura SQL/dades. Validar compatibilitat amb backend abans de servir-lo. Davant errors d'autorització, fallades de persistència o escriptures automàtiques, aturar el rollout i impedir noves activacions/importacions per la via autoritzada.
- **Permisos:** conservar ACL abans/després. El simulacre ha recuperat exactament les ACL insegures només en fixtures. NO usar un GRANT genèric ni restaurar TRUNCATE insegur a producció. Preferir correcció endavant revisada i privilegis mínims legítims.
- **Migracions:** no hi ha inversió SQL automàtica segura de les set. Una fallada dins la transacció s'atura; una versió ja registrada no es repeteix. Preservar dades noves legítimes i decidir correcció endavant o restauració aïllada revisada, sense DROP/CASCADE o neteges.
- **Dades:** recuperar un backup real acreditat/PITR només si està disponible i autoritzat. Inventariar escriptures des de la instantània; no prometre RPO/RTO ni absència de pèrdua sense aquesta comprovació. Reconciliar per IDs/mutation_id i verificar totes les relacions/ACL abans d'exposar el servei recuperat. Una restauració d'abans del hardening necessita revalidació de seguretat abans de donar servei.
- **Configuració:** restaurar separadament Auth/providers/SMTP, secrets, Edge Functions, objectes Storage i serveis externs. Ni Git ni un dump PostgreSQL els recuperen tots. No reactivar notificacions/jobs/webhooks en un restore de prova.

## Veredicte actual

**PUBLICACIÓ BLOQUEJADA.** El candidat està integrat i provat en local; falta acreditar backup productiu, obtenir les autoritzacions i executar/verificar la intervenció. Vic encara0/0. El preflight i aquest pla no autoritzen cap acció productiva.
