# Fase 3A.6 · Auditoria d’integració conjunta

29/10/2026. EN CURS. No fusió de PR, desplegament o ordre mutativa productiva.

## Fonts exactes

- main e009f4df40d9ed353cb7d865beafed99d736892d.
- #31 18a57b28932e0ffa20a0674e25fc791736682920.
- #32 6838bca231c38e699731e60c0df5c40827f7190d.
- #33 7434ea5f5b03e9bb1592f4304d53b7ab730ee7a3.

Branca audit/integration-3a6 de main, aplicació de diffs exactes en ordre 31→32→33 amb commits locals de muntatge. No merge de les PR ni actualització de main. Conflictes: CODEX_PROGRESS (conservat historial servidor, fonts originals al remot), tests/helpers/stats-db.mjs (conservats skipModes de #31, incorporació opcional de #32 i exclusió del mòdul d’importació de #33 al fixture operatiu; migració d’importació sí provada sobre el seu predecessor i pendent prova real conjunta completa). Sense canvi funcional silenciós.

## Baseline

Metadades productives actuals llegides via SELECT: 45 taules public, 392 columnes, 67 funcions public/app_private no pertanyents a extensions, constraints/índexs/polítiques/triggers/ACL. Còpia privada només d’esquema a work/3a6; cap fila esportiva, usuari, credencial o secret productiu copiat. Reconstrucció local prevista amb GoTrue real i fixtures explícitament fictícies. Extensió vault/cron/net i configuració Auth de producció no s’han clonat. No equiparar automàticament amb una còpia completa de la plataforma.

## Estat provisional

Completat provisional: reconstrucció estructural 45/392/67 contrastada, tres migracions pendents aplicades localment, 215 Node PASS, 9 blocs API Auth/RLS reals i 6 navegador reals PASS. Primera suite Chromium 67/68 amb error de teardown del test vídeo: correcció d’espera explícita a #32, 3/3 repeticions PASS. Diferències de fixtures originals: status finished no vàlid al predecessor (ara closed), camps obligatoris/llistes de columnes, empremtes úniques i catàleg d’accions de referència de la migració versionada. No s’ha relaxat cap constraint real. Pendents: recorreguts federatius A–H combinats, restauració/reinici/integritat i pla final. Les sis classificacions continuen en proposta, aprovació administrativa pendent; no executar UPDATE. Evidència de captures revisades en la conversa comunicada pel responsable, fitxers originals no examinats per Codex.

**VEREDICTE PROVISIONAL: NO APTE PER A PUBLICACIÓ mentre falten comprovacions crítiques.**
