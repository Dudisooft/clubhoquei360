# Preparació real del cinc inicial · 24/10/2026

## Auditoria i objectiu

El responsable no pot escollir el cinc inicial de l’Igualada–Vic. No és només el selector de perfil: `pilot_players` del partit és buit. La font és un calendari verificat amb fitxa pendent. La preparació avançada només carregava alineacions d’una fitxa `verified` i, per tant, no oferia cap jugador.

Diagnòstic de Supabase real: el responsable conserva `operator`; SIMAR RFEP `3697`, competició `3575`, temporada `41`, disposa de **19 jugadors** al catàleg (29 registres amb tècnics), 11 dorsals i 3 indicis de porter de fonts anteriors. No consta cap entrada de plantilla del Vic `3727`. Les dades de temporada no s’han de presentar com a convocatòria ni elegibilitat del partit. No s’han llegit credencials ni modificat dades reals en aquesta auditoria.

La preparació ha de permetre a l’operador incorporar jugadors reals del catàleg o introduïts explícitament, escollir un porter i quatre jugadors de pista per equip, confirmar-ho al servidor i continuar el registre habitual. Cap nom, dorsal o ID federatiu inventat. Les dades introduïdes per l’operador queden identificades amb aquesta procedència; la fitxa RFEP continuarà pendent fins a importar-la.

## Blocs de desenvolupament

1. Comandos de preparació comprovats al servidor: catàleg acotat al partit, incorporació/identitat de jugadors, confirmació atòmica del cinc inicial amb revisió i auditoria. Manté els permisos de l’operador del partit i bloqueja tercers/operadors només estadístics.
2. Integració dins de la preparació existent del Mode Avançat, sense app paral·lela: catàleg sense reescriure noms, entrada manual quan la font no existeix, desament de la preparació i selecció del cinc inicial.
3. Registre manual de l’operador després de confirmar la preparació, independent de l’acta RFEP. Cap canvi de marcador/cronòmetre causat per accions estadístiques ni importació federativa.
4. Proves locals de PostgreSQL/RLS, regressió de navegador completa (confirmar, iniciar, pausa, gol, recàrrega, separar anàlisi/oficial) i publicació verificada. No executar automàticament una convocatòria o un partit de prova de producció.

Branca `fix/advanced-starting-five`, base `113b517031b5616d2606337577c959b0022718c5`, checkout `/workspace/work/clubhoquei360-starters`. Migració creada amb la CLI fixada: `20261024105636_advanced_lineup_preparation.sql`, implementada i verificada localment; no aplicada a producció. El nou bloc substituirà el bloqueig transitori del registre oficial només quan hi hagi preparació explícita i validada; no marcarà una acta pendent com a RFEP verificada.

Represa: llegir `docs/CODEX_PROGRESS.md`, revisar Git i continuar el primer bloc pendent. No repetir la vinculació RFEP publicada, les migracions d’estadístiques, bàsic o invitacions, ni les proves antigues de codi intacte.

## Verificació del bloc servidor

12/12 proves PostgreSQL/PGlite correctes: 8 de preparació i 4 de regressió RFEP. Catàleg restringit, UUID estables, entrada manual explícita, unicitat federativa/dorsals, reintents idempotents, 5 + 1 porter, revisions, confirmació atòmica, registre posterior i bloqueig de tercers. Cap dada de prova personal real; cap DML de producció. La UI continua pendent en aquest checkpoint.
