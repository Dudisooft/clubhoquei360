# Backup productiu autoritzat — represa al portàtil Windows

## Autorització vigent

L'encàrrec «EXECUCIÓ REAL: BACKUP PRODUCTIU I DESPLEGAMENT PR #53» autoritza executar una exportació productiva de només lectura, xifrar-la, custodiar-la persistentment al portàtil i verificar-ne la restauració **exclusivament en un entorn aïllat**, si es compleixen les garanties. Inclou dades/esquema/Auth segons els permisos i cobertura disponibles. No autoritza encara modificar permisos o migracions productius, fusionar PR ni publicar. No cal tornar a demanar l'autorització del backup ja concedida; si manca una credencial o garantia, identificar concretament el bloqueig.

**Destinació preferent vigent:** `C:\ClubHoquei360-Backups\Supabase\Production`. Substitueix per a aquest encàrrec les preferències històriques del sobretaula D:. Verificar físicament màquina, espai, persistència, ACL privades i separació de claus abans d'exportar. No crear una ruta amb aparença Windows en un servidor Linux.

## Bloqueig comprovat en aquesta sessió

L'executor disponible és Linux Cloud, no el portàtil Windows. No hi ha muntatges a `/mnt` o `/media`, cap eina de terminal remota Windows disponible, cap secret SQL configurat al runtime i el disc persistent de 32 GiB és ple. La RAM temporal no és una alternativa vàlida per custodiar dades productives. No s'ha connectat al portàtil ni s'ha creat la destinació proposada; espai, eines i claus d'aquella màquina no estan verificats.

No s'ha exportat cap dada productiva ni restaurat dades reals. No s'ha simulat el backup. La prova fictícia anterior de restauració segueix sent evidència històrica, no un backup productiu.

## Una única instrucció per al Codex que s'executi localment al portàtil

Copiar aquesta instrucció al Codex amb accés local de terminal al portàtil Windows del projecte; el terminal d'aquesta sessió Cloud no obté accés al portàtil només perquè s'obri la conversa en un navegador Windows:

> EXECUTA EL BACKUP PRODUCTIU AUTORITZAT DE CLUBHOQUEI360. Treballa des del portàtil Windows amb accés real al repositori Dudisooft/clubhoquei360 i continua la PR #53, branca feat/predictive-callups-delegate. Llegeix AGENTS.md, docs/CODEX_PROGRESS.md i ops/cloud-backup/LAPTOP_PRODUCTION_RESUME.md. Recupera el RUNBOOK Cloud existent del commit 40573bc541548d8bd19b5551cdc0a8b51bf2ffa1, sense sobreescriure canvis locals. Verifica màquina, clients PostgreSQL 17, age, espai, carpeta privada persistent C:\ClubHoquei360-Backups\Supabase\Production, custòdia recuperable i separada de claus i destinació de restauració aïllada. Utilitza una credencial SQL existent per canal privat i TLS verificat; no imprimeixis secrets ni canviïs contrasenyes o permisos. Amb les garanties satisfetes, executa l'exportació de només lectura amb instantània coherent, xifratge autenticat i manifest, incloent aplicació, esquemes, ledger i Auth segons cobertura real; conserva una còpia duradora al portàtil. Verifica integritat, recuperació de clau i restauració completa en un entorn aïllat sense correu, cron, webhooks ni connexions productives. No declaris èxit si algun component és parcial o falla. El motor fictici manager.py no admet Cloud: no li passis una URL real ni eludeixis la seva protecció; reutilitza el procediment Cloud ja preparat. No repeteixis les suites generals si el codi no canvia. Desa només evidència sanejada i el checkpoint a la PR #53. Si manca accés, credencial o custòdia, atura l'exportació i identifica el requisit concret. No apliquis revocacions, migracions productives, fusions ni desplegaments: requereixen autorització posterior específica.

Aquesta és una instrucció de represa per a l'agent local, **no una ordre PowerShell ni un runner de backup ja executable des del núvol**. Evita oferir un comandament fictici que assumís eines, credencials o una connexió que no s'han pogut verificar.

## Estat de la publicació

PR #53 verificada oberta/en esborrany a `757bfac`, base main `83b5468`; CI [44370612438](https://github.com/Dudisooft/clubhoquei360/actions/runs/44370612438) satisfactòria. Codi `57969a1` amb CI i proves ja acreditades; no s'han repetit.

Després d'acreditar recuperació productiva: preflight vigent del paquet de 49 concessions/27 taules i dos defaults postgres, correcció mínima i migració `20261117081634_predictive_callup_delegate.sql` preparades per autorització separada. Posteriorment, autorització final de fusió/publicació i verificació de la web real. Cap d'aquestes operacions està executada per aquesta instrucció.
