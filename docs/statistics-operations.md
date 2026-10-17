# Estadístiques del Centre de partit · operació i pilot FEM15

## Posada en servei pendent d’autorització

La branca conté la implementació i una migració additiva verificada en PostgreSQL local. No s’ha modificat Supabase de producció ni s’ha publicat a Pages. No es requereix cap servei nou ni de pagament.

Ordre de publicació quan estigui autoritzada:

1. Revisar i fusionar la PR només amb comprovacions satisfactòries. La configuració Pages actual no està versionada: confirmar que la font continua sent `main` i l’arrel del repositori.
2. Aplicar **només** `supabase/migrations/20261017005241_match_statistics.sql` al projecte existent, amb l’eina de migracions autoritzada. Els SQL històrics de l’arrel de `supabase/` no són una seqüència de migracions des de zero: no tornar-los a executar.
3. Comprovar que `app_private` continua fora dels esquemes exposats de la Data API i que les polítiques de les taules noves són actives. Les RPC públiques són invoker; els comandos privats definer fan comprovacions explícites d’identitat/abast per mantenir escriptura atòmica, revisions i auditoria sense DML directe del client.
4. Comprovar la lectura amb usuari autoritzat i el rebuig amb anon/delegat/usuari aliè. Cap rol de `pilot_members` dona accés avançat automàticament.
5. Comprovar contexts `stats_matches` i correspondència exacta d’equip/temporada/identificador federatiu. El bootstrap usa els identificadors existents; no uneix per nom. Un trigger pot afegir contexts de fonts noves verificades, sense modificar els anteriors, observacions o permisos.
6. Designar un principal temporal mitjançant un administrador/coordinador autoritzat, o la superadministració existent. Les assignacions no creen comptes.
7. Publicar els fitxers estàtics i executar la prova de fum autenticada a Pages: entrada, partit, perfil Estadístic, registre, recàrrega, consulta des d’una altra sessió i revocació.
8. Comprovar Realtime real en dues sessions de Supabase i dos dispositius físics. El client també refresca cada quinze segons i en reconnectar per recuperar missatges perduts i caducitats.

La compilació `npm run build` deixa un artefacte estàtic a `work/site`: no inclou tests, SQL, node_modules ni credencials. El workflow de la branca només comprova; no desplega.

## Pilot real FEM15, temporada 2026/27

Identitat federativa prèviament documentada: FECAPA, competició `4802`, equip `12419`, temporada SIDGAD `41`, grup `5010`. Cal seleccionar el partit ja importat i no crear-lo de nou a mà. L’actualització federativa conserva la procedència i no reescriu la capa analítica.

Oriol Codinach és el provador previst i Ventu és l’entrenador receptor. **No s’han creat comptes, credencials ni permisos a nom seu.** Cal confirmar els UUID dels seus comptes existents abans d’assignar accés real. No s’han utilitzat noms de menors reals en les proves de desenvolupament.

Procediment per al responsable autoritzat:

- Confirmar partit FEM15, dates i temporada al selector federatiu.
- Amb el principal designat, entrar a Estadístic → Operadors. Assignar el UUID verificat del provador amb rol operador, caducitat de la prova, categories necessàries, costat correcte de l’IHC i, si correspon, jugadors. Sense selecció de jugadors es permet registre d’equip i individual; amb selecció, només aquells jugadors.
- No concedir un rol d’entrenador/coordinador al provador ni afegir-lo a `pilot_members`. El nou accés dona SELECT només al partit assignat i les escriptures estadístiques indicades; no permet alterar marcador, titulars ni cronòmetre oficial.
- Assegurar el rol d’entrenador d’equip o una assignació de consulta corresponent per al receptor. No concedir consulta de tot el club per conveniència.
- Obrir el vídeo extern o seleccionar-ne un fitxer local. El fitxer no es puja al servidor. El rellotge manual d’anàlisi és independent; es pot pausar, reprendre, retrocedir, ajustar o copiar una vegada el temps oficial. No hi ha sincronització automàtica del reproductor.
- Registrar passades, xuts, gols, recuperacions, pèrdues, faltes i intervencions segons l’assignació. L’acció individual també suma per a l’equip. Per atribuir un jugador a una acció d’equip existent, corregir aquella acció.
- Revisar globals/individuals; corregir i desfer una observació; activar «Mostra anul·lades» per recuperar-la o consultar-ne revisions. Qualsevol correcció de referència oficial queda a la capa analítica.
- Desar, tancar i tornar a obrir. La recuperació queda pausada. Fer consulta des del compte receptor i confirmar que no pot editar. Revocar el provador en acabar; les dades i l’auditoria es conserven.

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
- Si dues pestanyes del mateix usuari modifiquen el rellotge, la revisió obsoleta es rebutja. La còpia local no sobreescriu la sessió compartida fins que l’operador la recupera explícitament.
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

El servidor de proves només escolta a `127.0.0.1`; ofereix un transport local sobre PostgreSQL/PGlite amb RLS. Les identitats i els partits s’etiqueten com a ficticis. El transport de proves d’Auth i WebSocket no acredita l’Auth ni Realtime de producció. La prova de diversos operadors sí que escriu/consulta una base de dades compartida real local, amb les mateixes funcions SQL i polítiques; no usa un array compartit com a substitut de persistència.

La continuïtat del desenvolupament és a [CODEX_PROGRESS.md](CODEX_PROGRESS.md). L’ordre de represa és **CONTINUA CLUBHOQUEI360**.
