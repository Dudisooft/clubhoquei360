# Fase 2B · Desplegable de reforços i validació general

27/10/2026, Europe/Madrid. Branca `feat/base-roster-reinforcement-toggle`, des de `main` `314ecb0` (PR #29 fusionada). PR #28 i regles de la PR #29 conservades.

## Comportament

La preparació mostra primer els habituals i un botó «Possibles reforços (N)» per equip, plegat inicialment. Obrir/plegar no altera la selecció ni desa convocatòries. El recompte discret de seleccionats continua visible quan es plega. Cada costat s'obre independentment; els renders d'actualització conserven el desplegament durant la sessió. En obrir un partit o recarregar, torna a estar plegat amb la selecció confirmada recuperada.

El botó natiu admet teclat i tacte, té `aria-expanded`, `aria-controls`, indicador visual i alçada mínima de 48 px. Els candidats sense verificació continuen desactivats. Els participants històrics confirmats continuen seleccionats i es poden conservar encara que el catàleg deixi de mostrar-los. El snapshot de les noves confirmacions conserva un booleà opcional `reinforcement`, sense alterar snapshots existents ni esquema. Les metadades antigues de procedència es respecten quan permeten identificar un reforç; si no hi ha cap evidència de la classificació antiga, el jugador es conserva sense inventar-la.

La lògica és comuna a tots els equips i als dos costats. No s'han afegit excepcions de FEM11, Infantil o cap equip. `basic-eligibility.js` i `basic-roster.js` són idèntics a `main`: no es modifiquen les regles d'elegibilitat. El camí genèric IHC de la PR #29 continua aplicant-se a totes les categories del club. No s'han canviat navegació, Mode Avançat, gols, targetes, taules, migracions, permisos ni imports.

## Dades reals i limitacions

Vegeu la [matriu per equip](base-roster-validation-20261027.md) i el [resum verificable](base-roster-validation-20261027.json). Consultes fetes amb la connexió Supabase existent, sempre `BEGIN READ ONLY` i `ROLLBACK`. No s'han usat credencials personals, comptes nous ni escriptures de producció.

S'han comprovat **30 equips de base reals**, incloent iniciació, prebenjamins, benjamins, alevins, Infantil A–F, Juvenil A–E, Júnior A–D i FEM11/FEM13/FEM15. Per a cadascun, el filtre real s'ha reproduït sobre el següent partit disponible i l'última acta verificada: **60 mostres**, sense incidències tècniques detectades. Les comprovacions usen identificadors i evidències d'equip; no una coincidència de nom. FEM9/FEM17 no consten al catàleg i queden pendents per manca de dades, sense inventar-los.

Els descriptors d'equip de les proves unitàries provenen d'aquest catàleg; els esportistes, actes i escriptures de les proves automàtiques són ficticis. La reproducció del catàleg real és una comprovació separada: omet noms i dades personals de jugadors, no simula importacions i no opera al navegador del compte real.

La consulta de presència de camps troba **592 files de jugadors, cap amb `birth_year` o `sex` informat** en aquests camps del catàleg IHC 2026/27, inclosos sèniors. Això no afirma que no existeixin en altres sistemes. La normativa oficial continua sense verificar-se i no s'ha canviat en aquesta fase. Els reforços prospectius sense evidència suficient continuen bloquejats, tal com exigia la PR #29. La matriu diferencia filtre verificat d'elegibilitat reglamentària pendent.

La consulta dels contextos Base vinculats al catàleg localitza una convocatòria de l'Infantil D, amb sis esdeveniments. Se'n captura una empremta abans i després de les proves; el resultat final es registra a la matriu. Als altres equips d'aquest subconjunt no hi ha convocatòries desades per comprovar-ne la recuperació real: queda pendent per manca de dades. La preservació funcional es prova amb fixtures, sense crear registres reals per completar la matriu.

La xarxa de l'entorn, revisió 139, continua limitada als dominis configurats. L'intent de consultar el changelog de Supabase retorna CONNECT 403 del proxy. No s'ha implementat cap funcionalitat nova de Supabase; només s'han utilitzat les taules existents per SELECT. La connexió de dades MCP sí que ha permès les lectures. Les comprovacions no acrediten els permisos RLS del navegador de l'usuari ni la normativa federativa real.

## Proves i recuperació

Resultats finals locals: Node **153/153**, sense fallades ni omissions; Chromium complet **47/47**, sense fallades ni omissions (17 Base, inclòs el snapshot històric antic). Check/build: 35 fitxers correctes; `git diff --check` correcte. Primera execució específica Base 16/16 i primera completa 46/46; repetida amb el cas addicional antic, 47/47. Captura mòbil fictícia inspeccionada visualment sense desbordament. La CI es verifica separadament al checkpoint final; no s’ha executat validació física de l’usuari. Trenta proves Node noves cobreixen totes les categories/equips de la matriu amb membres ficticis propis, duplicats entre actes, mateix nivell exclòs, reforç puntual no promogut i falta d'elegibilitat. El helper d'aquestes proves ha requerit corregir un import en extreure'l; les 33 proves implicades s'han tornat a executar correctament.

Les proves de navegador afegeixen obertura inicial plegada, teclat, diversos/cap seleccionats, recompte, plegament sense pèrdua, costats independents, mòbil, confirmació/recàrrega i reforç històric desaparegut del catàleg sense modificar la convocatòria en confirmar sense canvis. La suite completa conserva els casos de navegació, Base i Avançat.

## Guia visual de revisió

1. En un entorn de revisió d'aquesta branca, entrar des del Dashboard i seleccionar explícitament temporada, competició, equip i partit. Repetir amb dues categories i dos equips de la mateixa categoria.
2. Al Mode Base, comprovar habituals visibles i «Possibles reforços (N)» plegat. Obrir-lo amb tacte i amb Enter/Espai; comprovar el recompte i els motius de bloqueig. Amb les dades reals actuals, no s'espera poder afegir reforços prospectius sense verificació.
3. En el fixture de prova amb acta verificada, seleccionar dos reforços, plegar i tornar a obrir: les marques han de persistir. Desmarcar-los ha de permetre continuar sense reforços. Confirmar i recarregar ha de recuperar la selecció amb el desplegable plegat.
4. Revisar una convocatòria històrica: els participants i incidències s'han de conservar. Confirmar sense canvis no ha de generar una nova convocatòria. No provar escriptures de demostració sobre partits reals.
5. Comprovar mòbil, tauleta i ordinador, sense desbordament horitzontal. Verificar els accessos Base/Avançat i que els registres habituals de gols i targetes continuen igual.

Reproducció automatitzada visual: `npx playwright test tests/browser/basic.spec.mjs --grep 'reinforcement disclosure' --headed` en un entorn amb pantalla. Captura local fictícia: `work/reinforcement-toggle-mobile.png`. La còpia de catàleg a `work/` no es publica ni s'inclou a l'artefacte Pages.

No fusionar ni desplegar sense autorització expressa. Coordinació, rivals i importacions segueixen fora d'abast.

Punt de recuperació: codi verificat `54ec8df5247b066a7d279f10d26dd42d27312985`, [PR #30 en esborrany](https://github.com/Dudisooft/clubhoquei360/pull/30). Proves locals i [CI 40493246421](https://github.com/Dudisooft/clubhoquei360/actions/runs/40493246421) superades al commit `61afb276227ea6a76f61b33e53f0156beb6db4e0`: 153 Node, 47 Chromium i check/build 35, comprovats als logs. Aquest tancament documental no canvia runtime. Cap desplegament d’aquesta fase.
