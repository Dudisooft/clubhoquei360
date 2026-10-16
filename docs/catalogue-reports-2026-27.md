# Catàleg compartit i actes oficials IHC 2026/27

Verificat el 16/10/2026. Complement de l'[inventari complet per equip](ihc-import-2026-27.md).

## Dades importades efectivament

36 equips, 15 categories, 38 inscripcions, 22 competicions i 553 partits. 227 identitats federatives de jugadors, 538 vincles de plantilla i 255 vincles de staff. S'han recuperat les 90 actes actualment publicades: 1.386 presències de jugadors dels dos participants, 445 presències de staff i 422 incidències oficials. Només 8 actes publiquen una cronologia; les altres 82 no permeten reconstruir-la. S'han desat 451 registres d'estadístiques publicades per jugador i competició, sense sumar totals duplicats entre equips. Els valors contradictoris queden desconeguts i es conserven les publicacions originals.

Fonts: portals oficials FECAPA i RFEP, temporada SIDGAD 41, clubs 252 i 69 respectivament. Les actes es carreguen per POST a les fitxes SIDGAD oficials. Els enllaços de consulta apunten al portal verificat i indiquen el codi exacte; no s'inventa un enllaç GET a l'acta.

El partit FECAPA 156350 publica 4–0 al calendari i 0–0 a l'acta. Es conserven ambdós valors amb avís de discrepància. Els marcadors pendents i les estadístiques buides no es converteixen en zero. El rellotge de cada incidència es conserva tal com es publica, sense convertir-lo en minuts jugats.

## Aplicació

Totes les pestanyes del centre de dades comparteixen club, temporada, categoria i equip. Les categories procedeixen del catàleg oficial i no de l'existència d'estadístiques manuals. Els rivals no es converteixen en equips propis. Els noms permeten navegar a categories, equips, persones i partits. Les columnes admeten ordenació ascendent i descendent. Les estadístiques internes i les oficials es mostren en capes separades.

Les fitxes individuals utilitzen identitats verificades; no es fusionen homònims. El staff sense codi té una presència d'acta independent, sense crear identitats per coincidència de nom. No es carreguen fotografies, dates de naixement ni dades de contacte. No s'han creat usuaris ni permisos d'analista.

## Servidor i seguretat

`ihc-sync` versió 3 desplegada. Es conserva la tasca horària existent, minut 17 UTC, amb rotació de 22 competicions, inclosa FEM15. Es recuperen fins a 12 actes per execució, amb dos treballadors, prioritzant actes absents, discrepàncies i revisions de més de set dies. Els errors i pendents queden registrats. S'ha provat l'endpoint real amb resposta 200; no s'afirma haver observat un cicle complet posterior del cron.

Migracions compatibles: `official-reports.sql`, `official-season-stats.sql`, `published-stats-function.sql` i `catalog-read.sql`. Nova taula `federation_match_staff`; reutilització de les taules normalitzades existents. Les RPC d'escriptura són exclusives del servei. L'accés de lectura autenticat conserva RLS i el superadministrador global existent, sense afegir-lo artificialment a cap club.

Una identitat autenticada aliena veu zero equips, plantilles, presències de staff, incidències i estats privats. El superadministrador existent pot consultar el catàleg complet. Cap anotació privada d'un altre club s'importa com a informació federativa.

## Verificació

28 proves automatitzades correctes, inclosa la lectura i validació de les 90 actes reals. La importació repetida d'una acta amb cronologia no altera els recomptes: 1.386 presències, 445 staff i 422 incidències. Comparació abans/després dels partits, jugadors, fonts, esdeveniments i estats operatius manuals: tots idèntics, inclosos els tres partits Simar protegits.

Prova real a GitHub Pages amb sessió de superadministrador: les sis pestanyes mantenen Infantil, les 15 categories i només els sis equips infantils propis; navegació a Infantil D, jugador, staff i acta 152035; marcador 8–0, faltes 5–2 i convocatòria oficial visibles. Ordenació real de dates comprovada en sentit ascendent. Les proves automatitzades cobreixen també l'ordre descendent i els tipus de totes les columnes.

La prova visual real s'ha fet en navegador d'escriptori. L'entorn no ofereix canvi de viewport o emulació de dispositiu; l'intent de zoom no ha reduït l'amplada CSS. Per tant, la validació visual específica en tauleta i mòbil queda pendent i no es declara superada.

No s'han modificat `avancat.html`, els cronòmetres, la disciplina ni el motor de conciliació de minuts. Les dades temporals de les actes amb noms de menors no s'han publicat al repositori.

## Pendents de font

No hi ha cronologia en 82 actes, ni historial de classificacions verificat. Les durades exactes de sancions no s'infereixen. La identitat compartida entre federacions i el staff sense codi requereixen confirmació. Minis continua pendent de font oficial vigent; no s'ha inventat un equip actiu.
