# Fase 2A · Plantilla pròpia i reforços del Mode Base

Data: 27/10/2026 (Europe/Madrid). Branca `feat/base-roster-eligibility`, basada en `main` `428f166`, després de la PR #28. Referències consultades: auditoria `c03f039` de `docs/auditoria-global-2026-10-26` i [fase 1](match-navigation-phase1.md).

## Implementació i abast

El filtre general del catàleg recollia esportistes dels altres equips del club; només Infantil disposava d'una restricció específica. La correcció limita els habituals de l'IHC a vinculacions del mateix equip i temporada, dins de competicions de la mateixa federació. Recupera les actes verificades anteriors al partit, comprovant data, grup, equip federatiu i costat de l'alineació. Si falta la data no utilitza aquesta acta com a antecedent. Una aparició posterior no acredita la pertinença anterior.

Els identificadors estables de jugador unifiquen aparicions i variants del nom. Es conserven dorsal conegut, identificador federatiu i referència de procedència. Si l'acta no té FK de jugador però sí un codi federatiu numèric, s'utilitza una identitat temporal de catàleg basada en aquest codi, mai un nom ni una FK inventada. Les files federatives no es modifiquen. Un esportista conegut com a membre d'un altre equip no es converteix automàticament en habitual perquè hagi reforçat l'equip en una acta passada. L'acta verificada del partit actual continua sent una font directa d'aquest partit.

La interfície presenta «Jugadors de l’equip» i després «Possibles reforços». Ser habitual no equival a estar convocat per al partit actual. Els candidats sense evidència suficient es mostren desactivats i amb el motiu. S'exclouen els d'altres equips de la mateixa categoria o superior. La successió adjacent de categories només serveix per limitar la presentació de candidats; **no constitueix una regla federativa d'elegibilitat**.

Les convocatòries confirmades es recuperen intactes, encara que el catàleg actual no acrediti algun participant. Es mostra un avís, sense obligar a reconfirmar ni impedir el registre per aquest motiu. Confirmar la mateixa selecció no genera cap canvi de convocatòria. Una modificació explícita conserva les incidències i els snapshots històrics. No hi ha canvis de permisos, SQL, importacions, Mode Avançat ni selector jeràrquic.

El snapshot admet `selection_basis`, `origin_reference` i `callup_reference` opcionals per conservar la procedència d'una futura convocatòria de coordinació. No s'ha implementat cap entrada, servei ni pantalla del Busi, ni s'atorga elegibilitat a partir d'aquests camps.

## Fonts i límit reglamentari

Fonts prioritàries investigades:

- https://hoqueipatins.fecapa.cat/league/4786
- https://hockeypatines.fep.es

L'entorn vigent, revisió de política 138, denega la connexió a aquests dominis: les peticions HEAD del 26/10/2026 a les 23:25 UTC van rebre CONNECT 403 del proxy abans d'arribar a la destinació. Dues cerques web de normativa 2026/27 també van retornar error, sense contingut. No s'ha verificat cap document normatiu ni excepció oficial de 2026/27. No es presenten edats, sexes o salts de categoria com a normes confirmades.

Els inputs de plantilla consumits no aporten una verificació suficient d'any de naixement, sexe i resta de condicions reglamentàries. La funció de validació exigeix norma verificada amb font oficial, referència, temporada, competició i federació, categories explícites, anys i sexes admesos i verificació de les altres condicions. **El camí de producció no subministra aquesta norma ni certifica les altres condicions: cap reforç prospectiu nou es considera elegible.** El cas positiu unitari és un contracte completament fictici, no una norma ni una elegibilitat real acreditada.

Altres absències es tracten conservadorament: sense acta pròpia verificada o data comparable no es dedueixen habituals d'una llista general de competició. No s'han fet consultes noves de producció ni escriptures reals en aquesta fase. La recuperació de rivals i els jugadors provisionals continuen fora d'abast.

## Verificació executada

- Node: **123/123**, sense fallades ni omissions. Vuit casos nous cobreixen FEM11, Infantil, identitat repetida, acte posterior, membres d'altres equips, reforç sense dades i contracte fictici positiu/negatiu. Els vuit casos s'han repetit després dels darrers ajustos d'àmbit de federació/competició.
- Chromium: **44/44**, sense fallades ni omissions; suite completa Base, Avançat i navegació. Inclou FEM11 mòbil, selecció/desmarcatge, recàrrega, reforç bloquejat i convocatòria històrica preservada amb gol existent. Una regressió inicial promovia un reforç d'una acta passada a habitual: corregida i coberta en unitàries i navegador. L'antiga prova que exigia retirar un convocat històric s'ha adaptat al requisit de preservar-lo.
- `npm run check`: 35 fitxers, correcte. `npm run build`: artefacte estàtic Pages de 35 fitxers, correcte. `git diff --check`: correcte.
- Fixtures i escriptures de proves fictícies. No s'ha provat amb el compte físic de l'usuari ni desplegat. Els resultats automàtics no acrediten normativa ni validació esportiva real.

## Validació visual per a revisió

1. A l'entorn local de la branca, entrar des del Dashboard a Partit i seleccionar explícitament temporada, competició FEM11, equip IHC i partit. Repetir amb Infantil D. La navegació de la fase 1 ha de mantenir-se.
2. Obrir la preparació del Mode Base: habituals primer, possibles reforços després. Comprovar origen i dorsal conegut; cap llista indiscriminada de tot el club. Si no hi ha evidència, ha d'aparèixer l'avís i no una plantilla inventada.
3. En amplada mòbil, marcar i desmarcar un habitual. Els reforços sense dades s'han de mantenir desactivats amb motiu. No s'ha de preseleccionar tota la llista.
4. En un partit fictici amb convocatòria confirmada i gol/targeta, recarregar: conservar selecció i incidències. Si un jugador ja no apareix al catàleg fiable, mostrar l'avís; confirmar sense canvis ha de preservar la convocatòria.
5. Comprovar gols, targetes, banqueta i resum al Mode Base; obrir el Mode Avançat i comprovar que conserva el comportament anterior.

La reproducció automatitzada fictícia de FEM11 és a `tests/browser/basic.spec.mjs`, cas «FEM11 mobile preparation…»; es pot executar amb `npx playwright test tests/browser/basic.spec.mjs --grep FEM11 --headed` en un entorn amb pantalla. No calen dades ni credencials reals.

## Estat i continuïtat

Filtratge d'habituals, presentació i preservació: implementats i verificats localment. Certificació reglamentària dels reforços: **bloquejada per evidència oficial i dades personals esportives insuficients**; no simular-la. Pendent revisar la PR esborrany, validar visualment i verificar normativa/dades abans d'habilitar reforços nous. No fusionar ni publicar sense autorització expressa.

Punt de recuperació remot: codi verificat `b709f93f0498774d8c5a79248c145f7d1425ca6d`, [PR #29 en esborrany](https://github.com/Dudisooft/clubhoquei360/pull/29). La primera consulta de CI encara no mostrava execucions: els resultats anteriors són locals, no una afirmació de CI superada.
