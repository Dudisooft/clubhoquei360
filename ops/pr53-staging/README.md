# PR #53 — staging local amb Auth real

Aquestes eines serveixen **la mateixa aplicació**, amb una configuració local substituïda només a la resposta HTTP. No són un frontend alternatiu ni una còpia de producció.

## Requisits i límits

Linux amb Docker local, Node, Python 3, Chromium de Playwright i `age`/`age-keygen` verificats. PostgreSQL 17.11 està fixat per digest; GoTrue 2.197.0 i PostgREST 16.4. Xarxa Docker interna sense sortida, ports publicats només a `127.0.0.1`. No instal·la serveis permanents ni configura cap planificador.

El predecessor de `baseline.synthetic.sql`/`policies.synthetic.sql` és sintètic, adaptat de la validació anterior; **no és un dump de Supabase Cloud**. Les migracions de l'aplicació són les reals del repositori. Els comptes GoTrue i els JWT d'usuari són reals locals; els clubs, jugadors, actes i ubicacions són ficticis. No hi ha credencials productives. Les claus de la infraestructura local no són identitats d'usuari simulades.

`work/pr53-staging` ha de ser privat (0700), fora de qualsevol publicació o sincronització. Els fitxers de credencials són 0600 i ignorats per Git. Si el disc no té espai, es pot muntar un directori privat temporal i enllaçar-hi `work`; **no serveix de custòdia duradora**. No esborreu altres worktrees, còpies ni contenidors per obtenir espai.

## Execució manual en un entorn nou

1. `node ops/pr53-staging/runtime.mjs start`
2. En terminals separats, `node ops/pr53-staging/api.mjs` i `node ops/pr53-staging/site.mjs`.
3. `node ops/pr53-staging/prepare.mjs` (esperar primer que Auth respongui al seu `/health`).
4. `node ops/pr53-staging/verify.mjs`.
5. `node ops/pr53-staging/browser.mjs`.
6. `python3 ops/pr53-staging/restore.py`.
7. `node ops/pr53-staging/restore-auth.mjs`.

Les proves de navegador no simulen RPC, `window.open` ni el porta-retalls. Intercepten i aturen la navegació externa a WhatsApp: verifiquen la intenció d'obertura i el text, **sense enviar missatges ni validar una app WhatsApp instal·lada**. Les ubicacions fictícies no acrediten cap pavelló real.

La restauració reutilitza `scripts/backup/manager.py` sense canvis respecte del motor ja validat a `40573bc541548d8bd19b5551cdc0a8b51bf2ffa1` (SHA256 `8c7b6b11bc709f83e0bb932d141c57c882c7ce8df35aecb1302658f6c693066a`). Requereix els binaris verificats a `/workspace/private/ch360-tools/age` i `age-keygen`; adapteu aquesta ubicació privada abans de repetir en una altra màquina. El dump personalitzat queda en memòria limitada; el fitxer guardat és xifrat i autenticat. La clau es genera exclusivament per a la prova fictícia, fora de Git. El llistat TOC temporal no conté dades i viu en tmpfs.

`restore.py` congela els escriptors locals Auth/PostgREST, conserva l'original i restaura en un contenidor nou. La comparació exigeix igualtat de dades, funcions, índexs, restriccions, RLS, vistes i privilegis efectius. Només admet compactació demostrada dels slots de columnes eliminades i omissió de concessions explícites al mateix propietari; no descarta ACL de clients ni restaura permisos amb un GRANT genèric. Després, `restore-auth.mjs` acredita nous inicis de sessió contra la base restaurada i denegació entre clubs.

**Atenció:** PostgreSQL utilitza tmpfs; aturar-lo perd la base fictícia en memòria. No promet recuperació després de reiniciar la màquina. Els identificadors, secrets i rebuts locals es conserven per reprendre una mateixa execució, però per repetir des de zero cal un entorn nou verificat. No substituïu dades ni claus d'un intent anterior. La restauració conserva un punter d'intent per revisar-la sense sobreescriure la còpia xifrada.

Per finalitzar, atureu els processos Node i únicament els contenidors amb etiqueta `ch360.staging=clubhoquei360-pr53-local`. `runtime.mjs stop` atura els quatre contenidors font; els contenidors `ch360_pr53_restore_*` s'han d'aturar també després de verificar-ne l'etiqueta. No elimina recursos d'altres tasques.

## Producció

Aquestes eines **no tenen mode Cloud ni exportació productiva**. No feu servir el seu baseline, comptes ni claus en producció. El procediment Cloud existent continua a [RUNBOOK del checkpoint de preparació](https://github.com/Dudisooft/clubhoquei360/blob/40573bc541548d8bd19b5551cdc0a8b51bf2ffa1/ops/cloud-backup/RUNBOOK.md). Una prova fictícia satisfactòria no acredita una còpia productiva recuperable. Cal destinació duradora privada, doble custòdia autoritzada, credencial SQL/TLS legítima, cobertura Auth/Storage/configuració i autorització específica abans d'exportar dades reals.
