# Paquet mínim TRUNCATE · només preparat, NO aplicat a producció

Versió de revisió 30/10/2026. La fase 3A.8 només autoritza staging local. Qualsevol execució productiva exigeix una autorització humana nova, expressa i diferenciada. Aquest directori no conté cap connexió, clau, CLI remota o mecanisme que executi automàticament SQL productiu.

## Contingut

- `inventory.json`:49 ACL esperades,27 taules,20 entrades de default de postgres/public i empremta/acknowledgement de l’abast revisat.
- `00_preflight.sql`:només lectura; identitat de connexió, casos detallats, owner, RLS, beneficari, grantor, concessió explícita i capacitat efectiva.
- `01_revoke_current.sql`:una operació DO atòmica,49 REVOKE TRUNCATE exactes; cap ALL TABLES, GRANT, canvi d’owner/RLS o dada.
- `02_revoke_postgres_default.sql`:operació separada exclusivament del creador postgres i esquema public;2 entrades de TRUNCATE de client. Preserva tots els altres defaults.
- `03_verify.sql`:només lectura, efectivitat i casos detallats posteriors; els permisos del propietari/backend no han de desaparèixer.
- `MANIFEST.json`:empremtes dels fitxers de SQL/inventari/runbook i evidències de validació. No és una ordre d’execució.

## Requisits i límit d’autoritat

PostgreSQL17 compatible, actor **postgres no-superusuari** i propietari de totes les 27 taules; capacitat de canviar les pròpies ACL/defaults. No cal ni es permet assumir supabase_admin. Anon/authenticated no poden tenir LOGIN, CREATE public ni herència cap a rols elevats. Abans de qualsevol escriptura humana futura, contrastar host, port, DB, projecte, usuari actual/de sessió, TLS i configuració amb el destí aprovat; no fiar-se del nom «staging». L’acknowledgement és una protecció contra errors d’operació, no una credencial o substitut de permisos PostgreSQL.

La validació local usa connexió dins del contenidor a 127.0.0.1:5432 amb el compte postgres no-super. El Docker intern no publica el binding sol·licitat56432; no es promet una connexió TCP externa en aquest port. El supervisor local fictici s’utilitza per bootstrap/backup/restore, mai per aplicar les revocacions com a usuari ordinari. Les claus/contrasenyes del perfil local no són productives.

## Ordre preparat per a una autorització posterior

1. Revisar inventari, hashes, SQL, incidències i autorització exacta; fixar commit. No afegir objectes o rols sense nova revisió. Aturar si hi ha drift o si les PR/SQL no corresponen al baseline revisat.
2. Només lectura en el destí futur autoritzat: executar 00 amb sessió identificada; comprovar49 casos,27 objectes, owner/grantor postgres,0 inesperats,0 objectes perduts/owner incorrecte i49 permisos efectius. RLS activa per cas. Inspeccionar també schema/funcions/rols/defaults/contextos i historial amb el preflight de 3A.6; READY_SCHEMA no és autorització.
3. Si l’estat és0, verificar per cas i capacitat efectiva que ja està corregit, no inventar49 canvis nous. Si és parcial, conté altres concessions o el grantor/owner canvia: STOP, nova auditoria. Els defaults només poden coincidir amb20 entrades inicials o18 després de retirar les 2 previstes; un altre estat obliga a revisar, no «normalitzar-lo» amb GRANT ALL.
4. Obtenir còpia de seguretat real autoritzada i verificar-ne restauració en destí separat, incloses ACL/defaults, funcions, RLS, seqüències i dades legítimes. Les proves locals no acrediten PITR/recuperació Cloud. Conservar inventari complet previ amb permisos legítims, no només els 49 retirats. No exportar dades personals o secrets a Git.
5. Finestra de manteniment curta i coordinada amb escriptures/DDL concurrents. ACL no exigeix esborrar o reimportar dades, però sí locks de catàleg. Comprovar transaccions llargues, bloquejos i activitat de migració. Configurar statement_timeout i lock_timeout abans d’executar; avortar si no es poden complir. No prometre zero bloqueig/downtime.
6. Després de l’autorització explícita: en una **única transacció de sessió aprovada**, establir l’acknowledgement literal d’inventory.json i statement_timeout adequat; incloure 01 i 02 i confirmar només si tots dos acaben correctament. Exemple de revisió, no connexió executable ni autorització:

   ```sql
   BEGIN;
   SET LOCAL statement_timeout = '30s';
   SET LOCAL lock_timeout = '5s';
   SET LOCAL clubhoquei360.truncate_review = '<acknowledgement revisat d’inventory.json>';
   -- Incloure els cossos EXACTES de 01 i 02 revisats, sense editar-los.
   -- COMMIT únicament amb tots els pre/postcontrols correctes.
   ```

   El driver automàtic del repositori només accepta el perfil local físicament verificat. No usar-lo contra Cloud, no usar db push/migration up ni enganxar dades de connexió productives als scripts locals.
7. Executar 03 només lectura. Exigir0 ACL actuals/effectives de TRUNCATE de client sobre public, owner correcte i RLS per a tots els casos; cap altra ACL canviada. Els 49 «missing» de la llista inicial són normals quan s’han retirat: validar-los amb actual=0,unexpected=0,objectes correctes i capacitat efectiva=0. Confirmar18 defaults postgres/public i cap TRUNCATE anon/authenticated del creador aplicatiu; mantenir altres creadors/defaults en revisió separada, no canviar supabase_admin.
8. Comprovar API/Auth/RLS i funcionalitat amb fixtures dedicades autoritzades, sense proves destructives o escriptures sobre actes reals. Comparar dades/invariants i controlar denegacions/errors/logs. Les proves destructives negatives de TRUNCATE són exclusives de staging. Reobrir funcionament només si els controls esperats passen.

## Condicions d’aturada

Host/port/DB/projecte/usuari/TLS inesperats; hash diferent; objecte/owner/grantor/rol fora d’abast;49/0 no demostrats per detall; capacitat efectiva diferent de l’ACL directa; herència/PUBLIC inesperats; default parcial/global no revisat; RLS desactivada; locks/timeouts; canvi de DML/rols/funcions/dades; regressió funcional crítica. Cap paquet o veredicte autoritza continuar ignorant una condició.

## Recuperació sense GRANT genèric

- Abans de confirmar, qualsevol error obliga a ROLLBACK de la transacció exterior. Provat localment: fallada del pas de defaults desfà també les 49 revocacions precedents i el drift de prova; no es confirma un estat parcial.
- Si ja s’ha confirmat, preservar evidències i bloquejar l’operació afectada. Preferir correcció endavant revisada i comprovada. El paquet és idempotent en estat correcte; no reintroduir TRUNCATE perquè una aplicació falli per un altre problema.
- No utilitzar GRANT ALL, ALTER OWNER, DROP/CASCADE o restauració cega d’una base antiga. Una retirada d’ACL no ha d’alterar dades esportives.
- Si s’identifica un privilegi legítim diferent perdut, reconstruir només aquella tupla a partir del snapshot previ i amb autorització diferenciada, sense restaurar les concessions insegures. Les comparacions de staging demostren que aquest paquet no les modifica.
- Recuperar l’estat anterior amb 49 ACL només s’ha fet en còpies locals aïllades per provar fidelitat; reaplicar-hi01+02 abans d’exposar-les a proves Auth. **No restaurar concessió insegura a producció** com a rollback automàtic. Qualsevol recuperació Cloud requereix reconciliar dades legítimes creades després del backup i verificar el pla real.

## Compatibilitat i decisions pendents

Validat en l’esquema aplicatiu capturat i combinat de #31/#32/#33, amb dades fictícies. Staging registra4 migracions del dump anterior i reconstrueix explícitament les 49 ACL legacy per a aquesta prova; no és una còpia de dades productives ni l’estat exacte de Cloud sense les PR. Un supervisor, la xarxa, Auth/configuració i propietaris gestionats no són equivalents a tota la plataforma Cloud.

#31 encara conté l’anterior migració broad 20261029040738. Aquest paquet és la proposta mínima revisable, **no** una instrucció per aplicar els dos camins cegament ni per canviar la PR sense revisió. Abans d’una publicació futura, decidir/versionar un únic camí de hardening coherent amb l’historial real, repetir preflight i no declarar49 revocacions noves si el primer camí ja les va retirar. No s’han modificat #31/#32 o les seves migracions en3A.8.

#33 inclou una correcció mínima d’adaptador d’alineacions justificada per la regressió real Base: conservar l’ID federatiu existent evita duplicats amb el jugador ja desat. No és una dependència SQL de les revocacions ni canvia elegibilitat. Cal revisar-la com a correcció funcional abans de publicar la combinació; no confondre-la amb un problema de permisos o donar verd sobre una UI antiga que encara duplica jugadors.

El bloqueig productiu de 3A.7 continua obert fins que hi hagi autorització, aplicació i verificació productiva. Supabase Support/defaults gestionats, classificacions i altres condicions de publicació continuen separats d’aquesta correcció local.
