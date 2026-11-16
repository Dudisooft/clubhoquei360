# Fonts federatives per a ClubHoquei360

17 de novembre de 2026

## A. Consulta dels portals oficials

| Dada | FCP / FECAPA | RFEP |
| --- | --- | --- |
| Clubs, equips i competicions | La FCP documenta la inscripció d’equips a SIDGAD i la publicació de grups i calendaris. El catàleg de ClubHoquei360 conserva identificadors de competició i d’inscripció quan s’han pogut verificar. | El portal ofereix consulta de competicions i partits. El catàleg anterior identifica equips participants en les competicions consultades. La cobertura d’un directori complet de clubs queda per confirmar. |
| Calendari i partits | El catàleg conserva horaris, rivals i resultats publicats quan són disponibles. La FCP tramita ajornaments i canvis a SIDGAD. Cal tractar les dates com a revisables. | El portal mostra un llistat de partits per competició. Les dades desades presenten cobertura desigual de resultats i actes. |
| Jugadors i dorsals | Hi ha mostres d’alineacions i dorsals en actes desades. La plantilla de temporada i la vigència de llicències requereixen una font validada. | Només s’han verificat exemples en actes desades. La disponibilitat sistemàtica de plantilles, dorsals i identificadors personals queda per confirmar. |
| Convocatòries i actes | SIDGAD gestiona les actes i hi ha actes verificades al catàleg. L’acta correspon a participants registrats en un partit. Les convocatòries internes les prepara coordinació. | El portal té actes o fitxes per a determinats partits segons el catàleg disponible. La convocatòria interna correspon al club. |

La consulta puntual i els enllaços oficials són viables. Per a FCP, l’avís tècnic de ClubHoquei360 documenta respostes 403 en peticions automatitzades i diferències de cobertura entre calendari, resultats i actes. La documentació federativa situa les inscripcions i els canvis oficials a SIDGAD. Abans d’activar una recollida sistemàtica cal acordar-ne l’abast i les condicions amb la FCP. [Inscripcions i calendari FCP](https://www.fcpatinatge.cat/wp-content/uploads/2025/06/Circular01_edatsinscricpcionssorteig-_.pdf) · [Canvis de calendari FCP](https://www.fcpatinatge.cat/wp-content/uploads/2024/11/notainformativarenunciapartit.pdf)

La RFEP publica un avís que requereix autorització expressa per a l’extracció automatitzada i la reutilització sistemàtica, amb l’excepció dels usos legalment permesos que l’avís recull. El portal identifica SIDGAD. La freqüència i la cobertura d’actualització s’han de validar amb la federació abans d’acordar una integració. [Portal RFEP i avís de reutilització](https://www.hockeypatines.fep.es/league/247)

## B. Accés estructurat autoritzat

SIDGAD anuncia gestió de competicions, resultats, actes i partits en línia. La FCP documenta usos autenticats del programa. La revisió de fonts públiques no ha trobat documentació d’una API pública ni d’una exportació federativa per a ClubHoquei360. La viabilitat depèn que cada federació autoritzi els usos previstos i que el proveïdor confirmi quins serveis pot oferir. [SIDGAD Software](https://www.sidgad.es/) · [Protocol d’actes de la FCP](https://www.fcpatinatge.cat/wp-content/uploads/2025/05/PROTOCOL-TBCN-2025.pdf)

Per validar la via B, cal demanar un fitxer de mostra o documentació del servei, les competicions i temporades cobertes, els camps disponibles i el mecanisme d’actualització. L’abast mínim és clubs, inscripcions, calendari, canvis i actes. Per a jugadors i dorsals, cal concretar si el proveïdor pot donar la plantilla autoritzada per equip i temporada, i com identifica cessaments o llicències vigents. Les convocatòries internes poden continuar al club. Una exportació periòdica autoritzada permetria començar mentre es defineix un servei incremental.

## Identificadors, duplicats i privadesa

- Identificar competicions i partits amb la federació, la temporada i els identificadors documentats. En un partit provisional sense codi, mantenir la identitat local i vincular-hi l’acta només amb una correspondència inequívoca. Preservar els canvis d’horari, les dates de verificació i la referència de la font.
- Enllaçar jugadors mitjançant identificadors verificats de la mateixa font. Tractar el dorsal com una dada del partit. Quan les federacions usin codis diferents, registrar la correspondència validada pel club. Si la identitat és ambigua, deixar-la pendent de revisió. Repetir una importació ha de preservar els mateixos registres.
- Limitar les dades importades als camps necessaris i als equips autoritzats. Definir amb el club la finalitat, la base del tractament, els terminis de conservació i l’accés per rol, amb atenció als menors. Per preparar convocatòries són suficients el nom operatiu, el dorsal si es coneix, la posició, l’equip i la vinculació interna. Evitar DNI, contactes i documentació de llicència. [RGPD, articles 5 i 25](https://eur-lex.europa.eu/eli/reg/2016/679/oj)

## Decisió per al pilot

Fer servir el calendari desat i el CSV de plantilla validat pel club. Preparar i publicar convocatòries dins de ClubHoquei360 amb selecció manual, reforços elegibles i historial. Les actes es consulten com a referència separada. Qualsevol integració recurrent queda subjecta a una font autoritzada i a una prova de correspondència d’identitats.

El full «IHC Convocatòries 26-27» s’utilitza com a referència visual i funcional de lectura. La publicació automàtica al Google Drive de l’IHC queda desactivada fins que el club n’autoritzi l’accés i la finalitat.
