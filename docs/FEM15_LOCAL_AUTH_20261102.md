# Pilot FEM15 autenticat local — 02/11/2026

Origen verificat: branca `feat/functional-pilots-20261102`, checkpoint `7baf003b7e44144e8097f81c563fc82f29d3d780`. El checkpoint era en una còpia independent del xat anterior, no al clon C:\Projects. Recuperat i seleccionat també al clon demanat, preservant AGENTS.md i la documentació local.

## Resultat

El laboratori anterior autoemetia permisos triats pel navegador. El nou mode amb `PILOT_ACCESS_FILE` desactiva aquesta emissió i exigeix una invitació aleatòria de 256 bits. El servidor fixa usuari, club, partit, perfil i caducitat; ignora qualsevol perfil o usuari enviat pel client. Només desa el resum criptogràfic del codi. Invitacions de 24 hores, sessions d'una hora com a màxim, revocació de sessió en tancar-la i invalidació de totes les sessions en reiniciar. Per retirar una invitació, eliminar-ne l'entrada d'access.json i reiniciar el procés. Fitxers locals exclosos de Git i restringits al propietari amb ACL Windows; no s'han compartit codis.

Preparats dos accessos locals: operador FEM15 per Sant Cugat–Igualada i entrenador de consulta SIMAR per Igualada–Noia. Són credencials del laboratori, sense verificació d'identitat personal ni comptes productius. Jugadores, estadístiques i identitats internes fictícies. Sense connexió a Supabase, dades privades de menors ni accés des d'altres dispositius.

## Evidències executades

- Bateria completa amb accés autoritzat als ports: **277/277 PASS**, `work/verification-authorized.txt`. L'intent restringit va fallar per EACCES/timeout als ports locals; no es compta com a validació. Concurrència limitada a dos processos per evitar saturació de PGlite.
- Afegida després una regressió de convocatòries amb calendaris importats FEM15 i SIMAR: reexecució de convocatòries i permisos, **11/11 PASS**. Total de casos diferents validats: 278; no s'afirma una única execució completa de 278.
- Verificació estàtica PASS, sintaxi dels scripts PASS, build PASS: 41 fitxers, laboratori i credencials exclosos.
- Navegador integrat: invitació FEM15 acceptada; acció a 125 segons confirmada una vegada; recàrrega recupera acció i rellotge 02:05. Captura `work/FEM15-autenticat.png`.
- RFEP consultada en aquesta sessió: calendari real i acta SIMAR–Vic amb 10 jugadors per costat. No s'han persistit noms personals de l'acta.
- Ramón: invitació de consulta acceptada, registre deshabilitat, convocatòria SIMAR–Noia amb hora oficial i convocats de prova a les 19:30. Text del porta-retalls comprovat idèntic a la previsualització. Captura `work/Ramon-convocatoria.png`. Cap missatge enviat.
- FECAPA continua amb la importació oficial datada i avís de font no disponible; pista FEM15 pendent, sense inventar-la.

## Demostració i represa

Demostració verificada en aquesta sessió: http://127.0.0.1:4186/. Només el mateix portàtil. Procés amb base persistent pròpia dins de work/authenticated-*/database-verified. La persistència no depèn del procés, però les sessions sí. No es garanteix mantenir un procés viu després de tancar l'app.

Per preparar un nou pilot: `node scripts/prepare-local-pilot.mjs`. Escriu una carpeta nova i privada sota work i el fitxer INVITACIONS.locals.txt; mai sobreescriu credencials anteriors. Per iniciar-lo: `node scripts/start-local-pilot.mjs <carpeta>`. Port per defecte 4184; es pot indicar PILOT_PORT. No copiar access.json ni INVITACIONS.locals.txt a Git ni als informes. Els codis són personals del laboratori i no s'han enviat a Oriol ni Ramón.

Validació funcional pendent de Ramón: decidir hora real de convocatòria, equipació i instruccions; confirmar les dades pendents abans d'enviar. El text no és una llista de jugadores seleccionades ni acredita elegibilitat.

## Bloquejos

Compte real d'Oriol, dades reals, sincronització entre ordinadors i pilot compartit continuen pendents. Backup PostgreSQL recuperable i revisió de seguretat productiva no resolts per aquesta feina. No s'ha desplegat, fet push, fusionat ni modificat producció. El següent pas funcional és la prova d'Oriol sobre el laboratori local; activar accessos productius exigeix resoldre les condicions de seguretat i autorització diferenciada.
