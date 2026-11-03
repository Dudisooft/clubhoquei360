# Integració del pilot recuperat · 03/11/2026

Origen: recovery/functional-pilots-20261102, **4970f5ad93bb008809dc3969bcad51437af3b0af**, descendent de **7baf003b7e44144e8097f81c563fc82f29d3d780**. Destinació: release/official-integration-20261102 / PR #35, des de **114b3c0300140c87e4205e25e91c2d0d13efe6e3**.

## Integració selectiva

S'han comparat els arbres complets i l'historial. No s'ha copiat tot l'arbre recuperat: hauria eliminat millores posteriors de #35 i afegit laboratoris. Es conserven íntegrament els permisos, autoritzacions temporals, importació segura, cua i estadístiques de #31–#34, així com els avisos de procedència de #35.

- El selector deriva equips de les inscripcions autoritzades, no només dels partits carregats. Les 36 identitats i 38 inscripcions existents es conserven; un equip sense calendari continua visible. No s'inventa un calendari.
- Base reconeix RFEP i FECAPA en la lectura de catàleg i comparatives. Els enllaços mantenen el partit; només es trasllada el mode vídeo quan és explícit.
- PublicFederation recuperat es trasllada a **supabase/functions/federation-sync/public-api.ts**, usat per l'entrypoint v6 existent. El wrapper Node carrega exactament el mateix mòdul. FECAPA manté el parser i el transport existents.
- El camí v6 conserva autenticació getUser, operador/token de programador, claim, memòria cau, registre d'execució i RPC. No hi ha un segon importador ni nous permisos.
- La consulta valida competició/temporada, codi de partit, equips, porters, noms i IDs. La cache d'actes queda lligada també a temporada/competició/equips. Una cache antiga o resposta parcial no es desa com a consulta fresca.
- La persistència reutilitza federation_commit_snapshot i, quan hi ha calendar_match_id verificat, federation_commit_official_report. Es comproven codi/equips/temporada/competició abans dels compromisos esportius. Són dos passos separats: una fallada canònica posterior es comunica com partial/error; no es promet atomicitat conjunta.
- Els candidats històrics del Noia retenen procedència i no acrediten convocatòria o elegibilitat. No s'eleven els candidats bloquejats ni es canvien les regles de reforços.
- Es conserven registre en directe/diferit, cronòmetre estadístic, persistència Supabase, outbox i sincronització de l'aplicació. No se substitueixen per la base PGlite ni els tokens ficticis del laboratori.
- Convocatòries: timeout del porta-retalls amb fallback i neteja del camp temporal. Format oficial, preferències per equip i còpia sense enviament preservats.

No s'han incorporat pilot-demo.*, club-local.js, club.html, servidors de demostració, pilot-access, bases locals, sessions, access.json ni fitxers personals d'alineacions. Build estàtic original:43fitxers. Cap canvi a package.json, lockfile, migracions o RLS.

## Abast de les dades federatives

El JSON recuperat acredita participants i els totals publicats, no necessàriament la cronologia o personal tècnic. No s'inventen assistències, incidències, classificacions ni estat de tancament. El snapshot conserva personal/incidències previs marcats not_refreshed. El report canònic indica event_timeline_status=not_retrieved i score_source=calendar. No s'altera el resultat oficial ni s'escriu a les bases federatives.

La cua de #34 es conserva. El calendari/plantilla general del worker continua amb els transports configurats #33/#34; no es declara que tots els endpoints SIDGAD s'hagin convertit a JSON. La legalitat d'una explotació general o nous serveis no es dedueix de l'accés públic del portal.

## SIMAR–Vic / Noia

L'evidència recuperada del portàtil declara una consulta oficial del02/11: RFEP35559,temporada41,equips3697/3727,10+10 i coincidència exacta amb la còpia local. La resposta amb dades personals i la base local no formen part de Git. És una comprovació documentada a la màquina d'origen; no una consulta nova efectuada aquí.

La primera demo descartava noms. El replay posterior normalitzava noms/dorsals/porters/IDs i els connectava a pilot_players de la base local. El seu servidor substituïa el catàleg per SIMAR i dos partits, i redirigia l'entrada al Vic. Això explica les10+10 locals i la desaparició aparent d'altres equips; no acredita esborrat productiu.

La lectura productiva del03/11 retorna Vic0/0; no retorna35574. No s'ha fet cap importació per canviar-ho. Les20files FICTÍCIES de regressió són independents de les10+10 documentades al portàtil. Les candidates Noia no són una alineació oficial.

L'executor obté CONNECT403 d'Envoy abans de TLS al portal RFEP. No s'ha eludit el bloqueig ni atribuït a la federació. La revalidació en viu des d'aquí continua pendent. FECAPA conserva les limitacions ja documentades.

## Proves i recuperació de l'execució

Abans de la interrupció de l'executor: **264 Node PASS**, **83 Chromium PASS**, check/build43 PASS, sis blocs de navegador amb Auth GoTrue/PostgreSQL/PostgREST reals locals i8comptes ficticis PASS. Inclou FEM11,FEM15,InfantilD,JúniorA,SIMAR,36equips/38inscripcions,cache/candidats,Base/Avançat,diferit,WhatsApp,persistència i mides390/820/1440.

Les proves del handler Edge utilitzen respostes sintètiques; no són una importació oficial en viu. Auth real local no equival a Auth productiu. La repetició nova de dues sessions va quedar sense resultat inspeccionable; no es declara superada. Les evidències anteriors es conserven separadament.

L'executor va quedar no disponible mentre es desava documentació, abans del commit. Per preservar el resultat, s'han recuperat els fitxers autoritatius per connector GitHub i reconstruït les mateixes transformacions revisades. La CI verifica de nou l'arbre efectivament desat. El futur checkout local ha de comparar els canvis pendents amb aquest commit, sense reset/clean ni sobreescriure'ls.

## Publicació

Zero fusions/desplegaments/migracions/importacions/escriptures productives. La font del pilot ja no és un bloqueig. Continuen pendents: backup productiu recuperable,49concessions TRUNCATE,2defaults postgres,set migracions, revisió i autorització separada del backend/frontend, reconsulta oficial i reconciliació explícita de contextos.

La futura posada en servei requereix actualitzar el bundle de federation-sync amb public-api.ts,parser.ts,fem15.ts i les dependències existents; publicar només HTML no activa el connector nou. Després cal verificar les10+10 realment persistides. Cap pas productiu s'executa des d'aquest informe.

## Correcció de compatibilitat posterior

La revisió del contracte ha reproduït una incompatibilitat: v6 publica external_id i el helper Base recuperat només cercava id/federation_player_id. Corregit amb IDs estables i costat, sense noms. Una acta actual verificada es reconeix; un candidat pendent no amplia elegibilitat. Regressió reproduïda abans/després amb la funció pura i afegida a la suite. La CI final ha de comprovar265Node i83Chromium; les264Node locals anteriors no inclouen aquesta prova nova.
