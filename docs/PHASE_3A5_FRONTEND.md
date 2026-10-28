# Fase 3A.5 · Separació de responsabilitats i modes

28/10/2026. #32 continua en esborrany, sense codi funcional nou. No es fusionen les branques ni es publica.

- [Informe A, #31](https://github.com/Dudisooft/clubhoquei360/blob/feat/match-mode-access-server/docs/SENIOR_CLASSIFICATIONS_3A5.md): sis participacions oficials comunicades per l’usuari, captures no accessibles/no examinades. IDs contrastats al catàleg, no visibles a les captures segons la declaració. Proposta senior, aprovació administrativa pendent i sis UPDATE desactivats amb precondicions/cardinalitat. 36 equips/38 inscripcions i 6/4/26 conservats.
- [Informe B, #33](https://github.com/Dudisooft/clubhoquei360/blob/fix/federation-roster-import-safety/docs/FEDERATION_NAVIGATION_IMPORT_3A5.md): importació additiva de rivals com inscripcions, sense equips gestionats/convocatòries automàtiques; identitats RFEP al component de plantilla, errors i resum/persistència separats. Migració/permisos tècnics només preparats en aquella PR, cap RLS de modes alterada.

Les correccions de #33 són independents de les capacitats/RPC de #31/#32; no se n’ha copiat o fusionat codi aquí. No hi ha permisos especials per divisions, patrocinadors o equips. Categories inferiors i elegibilitat #29/#30 mantenen les regles vigents. La integració textual del helper de proves compartit de #31 i #33 necessita conciliació en una revisió conjunta futura; no és una fusió feta en aquesta fase.

Estat de fonts: CONNECT 403 del túnel de l’executor; eina web veu controls de temporada i Tornar a competicions però no n’executa handlers ni certifica cookies/tokens. No s’usa goBack com a substitut. Navegació real i importació federativa del Vic pendents; 8 visitants Alpicat i 7 Salt consten al catàleg, però no s’ha validat la sessió de l’usuari en producció.

#33 té suites locals 169 Node/48 Chromium PASS i últimes 25 afectades PASS, amb dades fictícies/PGlite; no és Auth real nou. #31 té 6 proves afectades de classificació PASS. Les suites de modes/Auth de 3A.2/3A.3 no s’han repetit aquí perquè aquest codi no ha canviat. No es declara desplegament ni plantilles reals recuperades.

CI actual del checkpoint `d6a1c5292385acb6498da62838678d2c66824ecf`: [40757017804](https://github.com/Dudisooft/clubhoquei360/actions/runs/40757017804) success, **158 Node / 67 Chromium** i recorreguts conjunts natius/PGlite amb servidor revisat, logs comprovats. Servidor #31 [40754289438](https://github.com/Dudisooft/clubhoquei360/actions/runs/40754289438) success 194 Node/47 Chromium; importació #33 [40756623866](https://github.com/Dudisooft/clubhoquei360/actions/runs/40756623866) success 169 Node/48 Chromium. Checkpoints posteriors només documentals.

**Pendent:** revisió administrativa i fonts accessibles; revisió de #33/migració en staging d’importació complet, sense permisos o dades productius. Cap compte real modificat.
