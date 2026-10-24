# Entrada al registre col·lectiu després de la prova real fallida

## A. Resultat real i diagnòstic

El responsable comunica des del pavelló que no ha pogut iniciar el registre. L’acceptació real d’aquest partit és **FALLIDA EN L’INICI**, encara que hi hagi proves automatitzades prèvies vàlides. Consulta de producció 24/10/2026 19:09:54 UTC: zero accions, convocats, sessions i assignacions vigents; estat oficial nul. No hi ha dades registrades per recuperar. No s’ha inferit la causa només a partir d’aquests zeros.

La pantalla Principal destaca la preparació dels dos cincs abans d’activar el cronòmetre oficial. El registre estadístic col·lectiu existent és independent i admet equips sense convocatòria, però l’accés quedava dins del selector de perfil. L’operador real conserva permisos d’anàlisi read/manage/club_manager, comprovats per SQL de només lectura.

## B. Canvi acotat

`avancat.html` incorpora un panell amb «Obre el registre d’equip», amb el mateix estil i botó tàctil de 44 px. `federation-client.js` el mostra al Principal només quan l’anàlisi autoritzada està carregada; obre el perfil Estadístic i selecciona registre d’equip. `stats-ui.js` mostra el registre i inicialitza directe només si no hi ha sessió ni còpia local prèvies i el partit no està finalitzat. Conserva modes, períodes i temps de sessions existents.

L’accés navega sense escriure: l’activació pròpia continua sent el botó existent i la verifica el servidor. Cap nou rol, compte, migració, importació de plantilla o canvi de dades oficials. Els delegats no obtenen permisos estadístics. Es manté íntegra la confirmació oficial dels cincs. S’han versionat els imports modificats per evitar combinar mòduls antics amb el nou client.

## C. Proves executades

7/7 casos RFEP Chromium locals correctes i 2/2 Node d’interfície; check/build 31 fitxers i diff correctes. Després del reforç, 2/2 casos nous passats: iniciar amb zero convocats des de Principal, activació explícita existent, directe P2 a 03:20, passada d’equip amb UUID/temps, pausa i recàrrega; zero escriptures d’estat oficial i acta/cronòmetre iguals. També preservació d’una sessió de vídeo desada en tornar pel nou accés, i denegació per a un delegat sense anàlisi. Resolució mòbil 390 sense overflow i captura del nou accés revisada.

Transport local d’Auth/PostgREST sobre PostgreSQL/PGlite amb dades fictícies; no és una nova validació al dispositiu real. La consulta SQL de permisos real no equival a un login Auth controlat per l’agent. Evidència: [JSON](live-team-entry-acceptance.json).

## D. Estat

Entrada i recorregut col·lectiu: OPERATIUS I VERIFICATS per proves locals, CI i publicació Pages. Prova humana al pavelló: FALLIDA EN L’INICI, no reclassificar-la com a superada. Plantilla Vic: bloquejada per xarxa a la branca independent i PR #22; aquest canvi no la importa.

## E. Git i continuïtat

Branca `fix/live-team-recording-entry`, base main `02ca084`, checkout `/workspace/work/clubhoquei360-live-entry`; checkpoint d’auditoria `bf06a36`. La publicació és una esmena del mateix registre de partit ja autoritzat. Codi verificat `7132b50725e9d4b2aa92057e2c7ad4add9933dfe`; [CI 40124627984](https://github.com/Dudisooft/clubhoquei360/actions/runs/40124627984) success: **110 Node, 34 Chromium**, check/build 31, logs verificats. [PR #23](https://github.com/Dudisooft/clubhoquei360/pull/23) fusionada a `8a14b8be17a41b59b58d942caf340084ef00a187`; [Pages 40124867007](https://github.com/Dudisooft/clubhoquei360/actions/runs/40124867007) build/deploy/report success amb SHA i URL als logs. El navegador real del responsable després del canvi continua sense nova validació; no presentar-la com a superada. Tancament documental a `docs/live-team-recording-release`.

## F. Ús i pendent necessari

Principal → «Obre el registre d’equip» → «Activa el meu registre (8 h)» si cal → ajustar període/minut si s’incorpora al partit començat → «Inicia anàlisi». Les accions anteriors no es dedueixen del temps ajustat. L’anàlisi posterior del vídeo pot completar observacions quan es disposi de la gravació. La configuració de l’entorn per importar Vic es reprendrà quan el responsable pugui fer-la; no és un requisit d’aquesta entrada col·lectiva.
