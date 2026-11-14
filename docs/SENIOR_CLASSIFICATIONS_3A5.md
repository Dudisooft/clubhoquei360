# Informe A · Consolidació de classificacions 3A.5

28/10/2026. Continuació de 3A.4; PR #31/#32 en esborrany. Cap dada productiva modificada.

## Tres nivells d’evidència

1. **Participació comunicada pel responsable:** l’usuari declara haver seleccionat temporada 2026/2027, competicions i equips als portals oficials i haver aportat captures. En aquest torn no són accessibles els fitxers de les sis captures: **no examinades directament**, sense noms de fitxer ni hashes inventats. La declaració queda registrada com a evidència d’origen usuari.
2. **Correspondència d’identitat:** UUID interns, federació, temporada, competició, grup i ID extern procedeixen del catàleg contrastat a 3A.4, no de les imatges. La declaració de participació és coherent amb aquest catàleg. No s’afirma que els IDs siguin visibles a les captures.
3. **Classificació administrativa:** `senior` és proposta per als sis; `apply_approved=false`, revisió administrativa pendent. Ni la participació comunicada ni la coincidència d’IDs són una aprovació administrativa o un permís operatiu.

| Equip | Federació / competició | ID extern del catàleg | Grup | Proposta / revisió |
|---|---|---|---|---|
| Igualada Rigat HC | RFEP 3568, OK Lliga masculina | 3696 | — | senior; pendent |
| SIMAR Igualada HC | RFEP 3575, OK Lliga Plata Sud | 3697 | Sud | senior; pendent |
| Igualada HC | FECAPA 4774, Nacional Catalana | 12077 | — | senior; pendent |
| Igualada HC | FECAPA 4779, Segona Catalana | 12078 | D, 4873 al catàleg | senior; pendent |
| Igualada HC A | FECAPA 4781, Tercera Catalana | 12079 | F, 4944 al catàleg | senior; pendent |
| Igualada HC B | FECAPA 4781, Tercera Catalana | 12080 | E, 4943 al catàleg | senior; pendent |

Rigat és el primer equip segons l’etiqueta interna i la identificació funcional comunicada; la fase no inventa una nova verificació primària d’aquesta condició. Rigat i SIMAR mantenen UUID diferents. Les tres inscripcions de Rigat compten un sol equip. Es conserva l’inventari de 36 equips/38 inscripcions i la proposta 6/4/26, sense inferir-ne completesa federativa.

Fonts de participació comunicades: [RFEP 3568](https://www.hockeypatines.fep.es/league/3568), [RFEP 3575](https://www.hockeypatines.fep.es/league/3575), [FECAPA 4774](https://www.hoqueipatins.fecapa.cat/league/4774), [FECAPA 4779](https://www.hoqueipatins.fecapa.cat/league/4779), [FECAPA 4781](https://www.hoqueipatins.fecapa.cat/league/4781). Consulta directa d’aquesta fase: CONNECT 403; sense afirmar que la federació ho hagi denegat ni que manquin cookies. Evidència de xarxa de l’entorn i manca de resposta útil diferenciades.

## Proposta SQL desactivada

`match-age-group-review-20261027.json` incorpora per equip temporada, proposta, fonts, IDs d’entrada, grups, data 28/10/2026, procedència d’usuari, imatges no examinades i aprovació pendent. `scripts/review-senior-classifications-3a5.sql` prepara sis UPDATE **comentats** i un preflight local: una única fila d’equip per UUID/club/temporada/categoria, temporada 2026/27 i una única inscripció per federació/competició/ID extern. Requereix les columnes de #31; no és una migració ni s’executa sobre producció. Finalitza amb ROLLBACK.

`prepare-reviewed-age-groups.sql` conserva els sis sèniors desactivats. La resta dels 30 equips no canvia de categoria o identitat. No hi ha canvis de RLS, excepcions per divisió ni comptes nous.

Proves locals afectades: `senior-review-3a5.test.mjs` i `match-migration-audit.test.mjs`, **6/6 PASS**. Identitats simulades en PGlite: cardinalitat correcta, duplicat, competició/ID extern incorrecte, temporada anterior, club/categoria incorrectes i rollback sense classificacions persistides. Les proves no certifiquen l’oficialitat de captures que no s’han examinat. CI del codi `cf40ed997027da97923d73993699cbdf5c52382e`: [40754289438](https://github.com/Dudisooft/clubhoquei360/actions/runs/40754289438) success, **194 Node / 47 Chromium**, logs comprovats. Checkpoints posteriors només documentals.

## Pendent

Revisió administrativa expressa i, quan sigui necessari, examen de les captures/documents federatius originals amb context de temporada i competició; completar independentment la correspondència d’ID si es requereix aprovació definitiva. No es demana reconstruir el catàleg o introduir jugadors manualment. Qualsevol aplicació futura necessita autorització expressa separada.

La investigació/correcció d’importadors és a la [PR #33 en esborrany](https://github.com/Dudisooft/clubhoquei360/pull/33), branca basada en main separada de #31/#32. Informe B i empremtes agregades són allà: 20/23 iguals, tres conjunts de catàleg amb recomptes iguals però empremtes diferents durant la fase, causa no atribuïda. Equips, permisos i dades operatives auditades iguals; cap SQL mutatiu. No incorporar-ne el codi aquí. Europa fora d’abast. Sense fusió, desplegament o classificació productiva.
