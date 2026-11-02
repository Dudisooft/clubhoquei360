# Recuperació del pilot local — 02/11/2026

Branca original local `feat/functional-pilots-20261102`, cap `7baf003b7e44144e8097f81c563fc82f29d3d780`. Les ampliacions del catàleg, registre en diferit, candidats i navegació multiequip eren canvis del working tree sense commit. Recuperades en una còpia independent; cap checkout, reset, neteja o modificació del treball original.

El commit de recuperació és descendent de `7baf003`, sense reescriure aquest commit ni els seus avantpassats. Destinació nova: `recovery/functional-pilots-20261102`. No modifica `main`, cap branca preexistent ni la PR #35. No hi ha desplegament ni connexió a Supabase productiu.

## Verificació

- Inventari conservat: 36 equips, 38 inscripcions i 22 competicions. Calendaris incomplets no amaguen els equips.
- Acta RFEP 35559 consultada novament al portal públic oficial: temporada 41, equips 3697/3727, 10 jugadors per costat. Comparació en memòria d'identitats, dorsals i noms contra la còpia local: coincidència exacta. Evidència sense noms a `docs/evidence/recovery-source-20261102.json`.
- Les dades locals del Vic i els candidats Noia existeixen fora de Git: 20 jugadors del Vic i 10 candidats per costat del Noia. Aquests darrers són històrics i no acrediten convocatòria ni elegibilitat futura.
- Les proves de registre persistent, reobertura de base, permisos i navegació fan servir fixtures ficticis. Bateria completa: 288/288 PASS amb concurrència 1. La primera execució restringida: 279/288, nou errors per EACCES als ports loopback; no comptada com a validació. Reexecució amb accés als ports locals autoritzat: 288/288.
- Verificació estàtica: 48 fitxers PASS. Construcció estàtica: 42 fitxers. Els fronts i les bases del laboratori queden fora del paquet productiu.

## Contingut exclòs de la publicació

No s'han copiat actes amb noms personals, bundle de jugadors/candidats, bases PGlite, sessions, invitacions, access.json, captures, logs, node_modules ni directoris work. La revisió de 430 fitxers del candidat no ha trobat noms dels jugadors recuperats ni patrons de secrets/claus privades. Les proves incorporen només identitats fictícies; les metadades públiques de calendari i equips no són alineacions personals.

La branca conserva el codi per recuperar actes legítimament i preparar el laboratori. Les dades personals locals es conserven al portàtil original; no s'empaqueten a GitHub. L'execució del replay en una màquina nova necessita tornar a obtenir els documents oficials o una còpia local autoritzada; la seva absència no s'ha de suplir amb jugadors inventats presentats com a oficials.
