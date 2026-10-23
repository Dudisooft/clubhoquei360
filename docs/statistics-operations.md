# Estadístiques del Centre de partit · operació i pilot FEM15

**Instrucció vigent del 23/10/2026:** l’accés extern passa a invitacions temporals exclusives del superoperador global, sense alta personal tradicional ni UUID externs manuals. [Implementació, estat i configuració](temporary-access.md). Aquest bloc nou està preparat en desenvolupament, pendent d’autorització i de verificació de correu real; el sistema estadístic publicat es conserva.

## Posada en servei autoritzada

La posada en servei està autoritzada per l’ordre «Endavant». La migració additiva ja està aplicada i verificada al PostgreSQL de producció; no tornar-la a executar. L’estat de fusió i Pages consta a [statistics-deployment.md](statistics-deployment.md). No es requereix cap servei nou ni de pagament.

Ordre de publicació i comprovació:

1. Revisar la PR amb comprovacions satisfactòries i el flux Pages existent de `main`. Aplicar i verificar la base de dades abans de fusionar el frontend per evitar publicar una interfície sense infraestructura.
2. En una instal·lació compatible sobre l’esquema previ, aplicar la migració inicial `supabase/migrations/20261017005241_match_statistics.sql` i després `supabase/migrations/20261017133038_require_session_revision.sql`, amb l’eina de migracions autoritzada. En aquest projecte ja consten com `20261017130942_match_statistics` i `20261017133038_require_session_revision`: no reaplicar-les. Els SQL històrics de l’arrel de `supabase/` no són una seqüència de migracions des de zero: no tornar-los a executar.
3. Comprovar que `app_private` continua fora dels esquemes exposats de la Data API i que les polítiques de les taules noves són actives. Les RPC públiques són invoker; els comandos privats definer fan comprovacions explícites d’identitat/abast per mantenir escriptura atòmica, revisions i auditoria sense DML directe del client.
4. Comprovar la lectura amb usuari autoritzat i el rebuig amb anon/delegat/usuari aliè. Cap rol de `pilot_members` dona accés avançat automàticament.
5. Comprovar contexts `stats_matches` i correspondència exacta d’equip/temporada/identificador federatiu. El bootstrap usa els identificadors existents; no uneix per nom. Un trigger pot afegir contexts de fonts noves verificades, sense modificar els anteriors, observacions o permisos.
6. Designar un principal temporal mitjançant un administrador/coordinador autoritzat, o la superadministració existent. Les assignacions no creen comptes.
7. Publicar els fitxers estàtics i executar la prova de fum autenticada a Pages: entrada, partit, perfil Estadístic, registre, recàrrega, consulta des d’una altra sessió i revocació.
8. Comprovar Realtime real en dues sessions de Supabase i dos dispositius físics amb el protocol següent. El client també refresca cada quinze segons i en reconnectar per recuperar missatges perduts i caducitats.

La compilació `npm run build` deixa un artefacte estàtic a `work/site`: no inclou tests, SQL, node_modules ni credencials. El workflow de la branca només comprova; no desplega.

## Validació prèvia del superadministrador

Decisió del responsable del projecte: primer comprovar el mòdul amb el compte de superadministrador existent. Els comptes d’Oriol Codinach i Ventu encara no estan creats; es prepararan quan el responsable ho demani després de la validació. No cal aportar UUID externs per començar aquesta comprovació.

1. Iniciar sessió al dashboard amb el compte propi i obrir Centre de partit → Estadístic.
2. Seleccionar el partit a comprovar. Si encara no hi ha principal, prémer **Activa el meu registre (8 h)**. Es desa una assignació al compte actual, per aquell partit, amb caducitat de vuit hores. No crea cap compte. El servidor valida l’autoritat del gestor.
3. Iniciar/pausar el rellotge d’anàlisi, registrar accions d’equip i individuals, corregir, anul·lar, recarregar i consultar informes. Les accions introduïdes es conserven com a observacions del partit: anul·lar les que només s’hagin fet per provar el funcionament.
4. A Operadors es pot consultar i revocar l’assignació pròpia. Un principal existent no es reemplaça automàticament; cal revisar-lo i, si correspon, revocar-lo explícitament.
5. La prova bàsica real ja es va confirmar el 20/10/2026: [evidència sanejada](statistics-acceptance-20261020.json). Preparar els comptes temporals només quan el responsable demani el pilot; la confirmació bàsica no n’ordena la creació automàtica.

## Comprovació de connexió en dos dispositius

La línia **Connexió compartida** informa de la subscripció real. «Establerta» només confirma connexió. **Darrera actualització en directe** apareix quan una notificació de canvi ha desencadenat una lectura autoritzada correcta; el desament HTTP, la lectura inicial i el refresc periòdic no actualitzen aquesta hora. L’hora es mostra a Europe/Madrid. En reconnectar es torna a consultar el partit per recuperar canvis perduts.

1. Obrir el mateix partit autoritzat en dos dispositius físics. Es pot emprar el compte propi ja existent als dos, sense crear comptes temporals. Mantenir el rellotge pausat al dispositiu de consulta per evitar conflictes de sessió.
2. Comprovar l’estat de connexió als dos. No donar la prova per superada només perquè hi consti «establerta».
3. Al dispositiu de registre, introduir una acció real observada al vídeo o corregir una observació que realment ho necessiti. Al de consulta, comprovar el mateix esdeveniment a l’historial i que apareix o avança l’hora de l’actualització en directe, sense recarregar. No introduir accions fictícies en partits reals per forçar la prova.
4. Si les dades arriben però l’hora no avança, només s’ha verificat el refresc HTTP; Realtime continua pendent. En cas d’error de connexió, la pantalla indica reconnexió i reintenta lectures cada quinze segons. Anotar resultat, hora i dispositius sense publicar identitats ni contingut esportiu privat.

El controlador i la indicació de fallada es proven amb transport local de proves. **Protocol físic acceptat pel responsable el 23/10/2026, ordinador → mòbil:** l’acció apareix a l’historial sense recarregar i apareix o avança l’hora d’actualització en directe. [Evidència sanejada](statistics-realtime-acceptance-20261023.json). És una confirmació humana; l’agent no ha controlat els dispositius ni inspeccionat logs de la prova. No cal repetir-la en reprendre. La prova amb comptes d’operadors diferents forma part del pilot FEM15 quan s’autoritzi preparar-lo.

## Pilot real FEM15, temporada 2026/27

Identitat federativa documentada: FECAPA, competició `4802`, equip `12419`, temporada SIDGAD `41`, grup `5010`. Seleccionar el partit ja importat; no crear-lo a mà. Les importacions conserven la procedència i no reescriuen la capa analítica.

La petició anterior de comptes personals per Oriol Codinach/Ventu queda substituïda per invitacions temporals. No s’han creat comptes, invitacions ni permisos a nom seu. Quan el responsable demani activar el pilot i la nova funcionalitat estigui instal·lada/verificada:

- El superoperador global entra a **Accessos temporals**, introdueix el correu destinatari autoritzat, selecciona Igualada HC → FEM15 → perfil i caducitat. Per a registre limitat cal seleccionar partits i categories. Els administradors de club no gestionen invitacions.
- Generar i copiar l’enllaç d’un sol ús o enviar-lo si SMTP consta configurat. El destinatari ha de verificar el seu correu amb Supabase Auth; no rep una contrasenya ni permisos d’entrenador/coordinador. No afegir-lo a `pilot_members`.
- Confirmar la consulta del receptor amb els seus permisos interns existents o amb una invitació de consulta, sense rols generals de club.
- Fer l’anàlisi amb vídeo extern/local i cronòmetre manual, registrar accions reals, revisar informes, corregir/desfer, desar i reprendre. La capa oficial roman separada.
- Comprovar consulta amb el receptor i revocació/caducitat amb la sessió del convidat oberta. Les dades i l’auditoria es conserven després de revocar. El procediment complet i els requisits de configuració són a [temporary-access.md](temporary-access.md).

## Semàntica de les dades

`stats_events` conserva UUID, club, temporada, equip intern quan existeix, identificador federatiu de l’equip rival, costat, partit, període, mil·lisegons del període, jugador UUID opcional, codi d’acció/resultat, operador original, modificador, dates, origen, validació, revisió i referència oficial opcional.

Els codis `pass_complete`, `pass_failed`, `shot_target`, etc. identifiquen el resultat de l’acció. Els totals són derivats. Un xut observat i un gol són indicadors diferents: el marcador federatiu no genera automàticament intents de xut ni eficàcia. El percentatge només s’ofereix amb denominador positiu i una mostra coherent. Una passada amb resultat desconegut impedeix presentar una precisió completa de passada.

Les incidències operatives `pilot_events` de gol/falta/assistència s’usen com a projeccions de consulta. Una correcció analítica les referencia una sola vegada, fins i tot si les anul·la a l’anàlisi. No es converteixen agregats d’actes federatives en successos individuals. Els gols administratius i rectificacions negatives no s’infereixen com a xuts o golejadors nous.

Una acció d’equip i la seva atribució posterior són el mateix UUID. Reintents i ACK perduts utilitzen la mateixa mutació. Els àmbits dels operadors no es poden solapar, i el principal no registra en un àmbit delegat a un altre operador. Registres semblants al mateix instant produeixen un avís: el sistema no pot saber si dos observadors es refereixen a la mateixa jugada sense identitat compartida. No s’elimina una acció esportiva plausible només per coincidència temporal.

La possessió és una seqüència d’intervals temporals observats. S’inclou «en disputa» en el temps total mostrejat, i es rebutgen solapaments del mateix període. Pausar, ajustar o canviar període tanca l’interval real anterior; no afegeix el salt de temps. En revisar un interval ja observat, cal corregir/anul·lar l’anterior abans de substituir-lo. La còpia local conserva l’interval obert amb identitat estable per recuperar-lo una sola vegada després d’una interrupció.

La participació individual només es calcula amb parelles coherents d’entrada/sortida del mateix període. Sense parella completa es mostra no registrada; no es reconstrueixen minuts a partir de noms o d’un recompte de participants.

«No registrat» és diferent de zero. El principal pot marcar una categoria d’equip completa després de revisar tot el partit; aleshores l’absència d’accions es pot mostrar com a zero. Les categories sense cobertura completa ni accions continuen desconegudes.

## Recuperació i conflictes

- Cua local: `ch360-stats-v2:<usuari>:<partit>:outbox`. Les peticions no desapareixen fins a rebre una confirmació real del servidor.
- Rellotge local: la mateixa arrel amb sufix `clock`; sessió compartida a `stats_sessions`, amb revisió optimista per usuari/partit.
- Si una resposta es perd després del commit, el reintent reutilitza la mateixa mutació i no afegeix un segon esdeveniment.
- Un error de permisos, validació o revisió conserva la petició com a rebutjada pendent de revisió. Es pot reintentar, exportar en JSON o descartar explícitament la petició local. Descartar-la no esborra registres confirmats.
- Si dues pestanyes del mateix usuari modifiquen el rellotge, la revisió obsoleta es rebutja. També es rebutgen revisions nul·les/negatives al servidor. La còpia local no sobreescriu la sessió compartida fins que l’operador la recupera explícitament.
- Caducitat i revocació es comproven al servidor a cada petició. Les dades ja descarregades abans de revocar no es poden «desveure»; el client amaga el panell en perdre accés.
- No es proporciona funcionament complet en fred sense xarxa ni un service worker. La cua protegeix escriptures interrompudes; cal tornar a connectar per validar permisos i recuperar dades compartides.
- Les claus antigues del prototip `ch360-stats-v1` no s’esborren. No es migren automàticament perquè només contenen noms/dorsals i identificadors lliures. La ruta antiga ara obre el mòdul integrat; conservar aquestes dades locals per a una conciliació explícita si n’hi ha.

CSV UTF-8 és la sortida de taula; els camps amb risc de fórmula es neutralitzen. JSON conserva esdeveniments, revisions, cobertura, sessió i cua pendent per a auditoria i recuperació assistida. No hi ha un importador massiu de còpies JSON que pugui sobreescriure dades esportives.

## Verificació reproduïble

```sh
npm ci
npm run check
npm test
npm run build
npm run test:browser
```

Playwright usa `/usr/bin/chromium` per defecte a l’entorn actual. En una màquina sense Chromium de sistema:

```sh
npx playwright install chromium
PLAYWRIGHT_BUNDLED=1 npm run test:browser
```

El servidor de proves només escolta a `127.0.0.1`; ofereix un transport local sobre PostgreSQL/PGlite amb RLS. Les identitats i els partits s’etiqueten com a ficticis; el pilot local té set participants per equip, amb una portera i sis jugadores de pista fictícies. El transport de proves d’Auth i WebSocket no acredita l’Auth ni Realtime de producció. La prova de diversos operadors sí que escriu/consulta una base de dades compartida real local, amb les mateixes funcions SQL i polítiques; no usa un array compartit com a substitut de persistència.

La continuïtat del desenvolupament és a [CODEX_PROGRESS.md](CODEX_PROGRESS.md). L’ordre de represa és **CONTINUA CLUBHOQUEI360**.
