# Convocatòries predictives, lectura del delegat i WhatsApp

## Punt de partida verificat

17/11/2026. `main` **83b5468**, després de #49, #50, #51 i #52. #46 i #49 estan fusionades; #41 continua oberta en esborrany i amb conflictes. No s'ha fusionat #41: es recupera el seu criteri d'actes rivals anteriors mitjançant el motor compartit, preservant les correccions manuals i l'historial de main. Worktree nou `feat/predictive-callups-delegate`; treball anterior conservat. No hi ha AGENTS.md aplicable als directoris pare ni al checkout.

## Circuit implementat

- Mateixa aplicació, navegació i targetes. Selector compacte tots/equip, setmana, ordre local/visitant i permisos existents conservats. La setmana incorpora jornada, competició, provisionalitat quan consten i estat de lectura de la versió publicada.
- Motor compartit `roster-prediction.js` per a convocatòries pròpies i preparació rival Base/Avançat. No hi ha un importador nou: només llegeix les dades ja recuperades pels connectors existents.
- Àmbit estricte de federació, temporada, competició, inscripció, costat i partit. Dotze actes anteriors verificades com a màxim; màxim 500 files federatives. Només participacions anteriors al partit objectiu, amb identitat de l'equip comprovada. La classificació és explicable: habitual amb almenys 3 aparicions i freqüència >=60%; ocasional amb almenys 2; poca evidència amb 1. La confiança alta/mitjana/baixa descriu quantitat d'evidència, no probabilitat ni elegibilitat.
- Una aparició per persona i acta. Identificadors estables; els noms i dorsals no fusionen persones. Freqüència, última aparició i procedència visibles; coincidències de nom advertides. Plantilla interna i reforços ja elegibles s'integren com a evidència interna. L'historial intern utilitza l'última versió publicada de cada partit, dins de la mateixa temporada i competició.
- L'acta actual verificada preval sobre l'historial, inclosa una resposta oficial buida. Les propostes rivals antigues es marquen substituïdes; no s'eliminen participants ni incidències desades. Avançat continua utilitzant `pilot_roster_catalogue` i `pilot_prepare_players`, amb procedència provisional i reintents idempotents.
- La convocatòria pròpia conté exclusivament identitats internes del club autoritzat. Les propostes històriques es mostren separades, sense seleccionar ni importar automàticament. Incorporació individual explícita, amb confirmació de pertinença actual i permís equivalent al de l'importador intern existent. Si no consta la posició, es demana revisar-la. Dorsals absents no s'inventen. Duplicats, identitats inactives o un jugador intern d'un altre equip exigeixen revisió; no es creen reforços elegibles automàticament.
- Lectura: només un delegat assignat a l'equip pot confirmar una publicació. Es desen usuari Auth, partit, equip, revisió i hora. Repetir és idempotent. Una versió nova queda pendent sense esborrar les lectures anteriors. No significa comunicació a famílies.
- WhatsApp: text informatiu, sense llista nominal. Previsualització editable, còpia, obertura explícita sense destinatari predeterminat i alternativa manual. No hi ha enviament automàtic, API empresarial ni missatgeria interna.

## Plantilla exacta i ubicació

La prova compara literalment el format aprovat: `‼️ CONVOCATÒRIA`, `JORNADA`, data, hora oficial, dos espais després de 🏑, local - visitant, `📍Pista:` amb enllaç al costat, `⏰ *Convocats:`, equipació, roba i `EQUIP I FORÇA!!🔴🔵💪🤟`. Es conserva l'asterisc únic aportat per l'usuari. No s'afegeix una línia de grup ni una llista de jugadors.

Equip, jornada, competició, pavelló i data s'agafen del context disponible. No es confon hora de partit amb trobada. Preferències de marge (0–240 minuts), equipació i roba per UUID d'equip, amb control de revisió. **Cap marge universal de 60 minuts**: si no està configurat, queda pendent i s'avisa. Càlcul amb zona Europe/Madrid; editable al missatge sense modificar el calendari.

Google Maps prioritza un URL HTTPS verificat. Només genera una cerca si l'adreça està confirmada; no substitueix l'enllaç exacte verificat. Permet completar i marcar explícitament la ubicació al formulari. Un pavelló o URL desconegut queda pendent amb avís, no s'inventa. Els controls queden plegats quan totes les dades estan disponibles. Provisionalitat visible tant a l'avís com al text.

Còpia i popup provats amb APIs simulades a Chromium; enviament real a WhatsApp i dispositius iOS/Android físics pendents. No s'ha comprovat una ubicació real només perquè passi el fixture.

## Dades reals de només lectura

| Equip | Plantilla interna activa | Actes verificades enllaçades | Identitats històriques |
| --- | ---: | ---: | ---: |
| FEM15 | 0 | 6 | 9 |
| Infantil D | 0 | 5 | 8 |
| FEM11 | 0 | 5 | 8 |

36 equips; 0 convocatòries internes desades en el conjunt consultat. Comptatges agregats, sense exportació de noms de menors. Aquest historial acredita participació passada, **no una plantilla actual de 9/8/8 jugadors**. La nova selecció de propostes per partit encara no s'ha executat amb Auth productiva: la migració no està instal·lada. Evidència JSON i SQL repetible inclosos.

La producció ja inclou accés global, setmana i revisió manual; no es repeteix el bloqueig antic de #49. Les connexions al changelog Supabase retornen CONNECT 403 del proxy d'aquest entorn; documentació actual de funcions consultada mitjançant el connector Supabase.

## Servidor i seguretat

Migració nova **20261117081634_predictive_callup_delegate.sql**, generada amb Supabase CLI. Depèn de main, incloses les versions alineades `20261116232329`, `20261116232419` i `20261116234104`. Cap canvi aplicat a producció.

Tres taules privades amb RLS i sense DML per anon/authenticated: lectures de delegats, preferències i traça d'incorporació de propostes. Índexs per a les claus foranes. RPC públiques SECURITY INVOKER; funcions privilegiades privades amb identitat i àmbit verificats, `search_path=''` i sense EXECUTE anònim. Les lectures són STABLE per admetre GET de PostgREST. Els rols es consulten al servidor, sense user_metadata, paràmetres d'URL o localStorage com a autorització.

La confirmació de lectura comparteix el bloqueig de publicació per club; compara revisió i rebutja una versió antiga. Preferències amb CAS per equip. Incorporació revisada serialitzada i idempotent per identitat; no amplia permisos de Base, Avançat ni actes oficials. L'operador estadístic amb accés al partit pot llegir evidència federativa pertinent al partit, però no rep accés a estadístiques o dades internes d'altres partits.

Advisors Cloud de lectura: 5 INFO de RLS sense polítiques, 1 WARN d'extensió a public, 2 WARN de funcions definer executables i 1 WARN de protecció de contrasenyes. Són de l'esquema existent, no una validació de la migració no instal·lada. Referències: [RLS](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [funcions privilegiades](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [contrasenyes](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Cap configuració productiva alterada per fer desaparèixer avisos.

## Proves i evidències

- Node complet: **175/175 PASS**, zero omissions. Migracions SQL reals en PGlite sobre predecessor sintètic; **no és Supabase Auth real** ni una còpia de l'esquema productiu.
- Chromium complet: **73/73 PASS**; després de plegar els ajustos de WhatsApp, **5/5 PASS** repetides. Mòbil 390, tauleta 820 i ordinador 1280; desament, recàrrega, lectura per revisió, preferències, còpia literal i alternativa manual. RPC, clipboard i window.open ficticis.
- Proves dirigides d'evidència, permisos, rivals, prioritat d'acta i tres equips: PASS. Invocació anònima i DML directe denegats, rols i revisió comprovats, RPC de lectura STABLE verificades als catàlegs SQL.
- `npm run check`, `npm run build`: 45 fitxers, PASS. `git diff --check`: PASS. CI [44050425718](https://github.com/Dudisooft/clubhoquei360/actions/runs/44050425718) **success** al codi `32c873e432d1990ac73fa9c8e42ea3e285a8d70f`; logs verificats: 175 Node, 73 Chromium i check/build 45. [PR #53](https://github.com/Dudisooft/clubhoquei360/pull/53) oberta en esborrany. El checkpoint posterior només desa aquests resultats documentals.
- Errors de desenvolupament corregits: ambigüitat d'una variable SQL, volatilitat de RPC GET i expectatives de textarea de les proves. Cap incident productiu declarat resolt amb un mock.
- Logs locals: `/tmp/predictive-node-release.log`, `/tmp/predictive-browser-final.log`, `/tmp/predictive-browser-last.log`, `/tmp/predictive-all-focused.log`. Captures sintètiques fora de Git: `work/delegate-callup-*.png`.

## Guia de revisió

1. Instal·lar la migració només en l'entorn aïllat autoritzat; servir l'artefacte de la mateixa aplicació amb credencials de prova. No apuntar una previsualització a producció.
2. Coordinador → Convocatòries → tots/equip → setmana → Preparar convocatòria. Obrir procedència d'una proposta; validar pertinença i posició coneguda; incorporar-la explícitament, seleccionar i publicar.
3. Delegat del mateix equip → mateixa publicació → He llegit la convocatòria. Recarregar; comprovar lectura. Coordinador publica una versió nova; torna a quedar pendent.
4. Revisar previsualització de WhatsApp, completar camps pendents, configurar marge/equipació/roba, desar preferències si es té permís; copiar i obrir amb selecció manual de destinatari.
5. Repetir com a entrenador no assignat i usuari d'altre club: no han de llegir ni modificar dades de l'equip.
6. Base/Avançat: proposta rival provisional procedent d'actes anteriors; confirmació manual pels permisos existents; acta actual preval sense perdre incidències ni estadístiques.

## Publicació i recuperació

**Preparat per revisió; no publicat.** La PR #49 fusionada no conté aquestes funcionalitats noves. No s'han creat comptes ni dades de prova productives, ni desplegat, importat o executat migracions en Cloud.

Abans de publicar: CI del candidat, revisió de permisos i avisos existents, backup productiu restaurable acreditat, migració en staging amb Auth real i comptes legítims de coordinador/entrenador/delegat, i autorització diferenciada per aplicar-la a producció. Només després publicar frontend i validar amb dades autoritzades. Comprovar el ledger i les definicions efectives, no només els noms de migració.

Aturar davant qualsevol dependència absent, versió inesperada, permís indegut, duplicació o pèrdua de dades. Rollback de frontend independent de dades: les lectures, preferències i traces legítimes es conserven. Si cal revertir el catàleg de preparació, recuperar la definició revisada de `pilot_roster_catalogue` de main juntament amb el frontend compatible; **no eliminar taules, lectures, convocatòries ni estadístiques**. La restauració productiva i el pla d'intervenció requereixen prova i autorització; no s'ha acreditat aquí un backup real recuperable.
