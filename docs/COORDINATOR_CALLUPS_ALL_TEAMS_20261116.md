# Convocatòries de tots els equips — 16/11/2026

## Estat recuperat

- `main`: `ca9682aa4c028a09dc6b2b73f7d6eacb84af1ed1`; PR #46 fusionada (`0515ef1`). També hi consten #47 (configuració CSV) i #48 (rol global verificat).
- PR #49 oberta, base main, branca `feat/weekly-callups`, punt inicial `914f8f3708c512aa884d10f1f474bd5e813f49a3`. CI inicial satisfactòria: [43910114766](https://github.com/Dudisooft/clubhoquei360/actions/runs/43910114766).
- Treball en un worktree nou. El checkout antic i els altres worktrees es conserven. No s'incorporen altres PR pendents.

## Causes i correcció

No hi ha una excepció FEM15 al selector. El selector anterior triava un equip i no tenia opció global; la vista setmanal, en canvi, ignorava l'equip triat. Ara el desplegable compacte ofereix **Tots els equips del club** i cadascun dels equips retornats pels permisos del servidor. S'aplica el mateix àmbit en ambdues vistes, inclosa la resposta asíncrona setmanal. Una resposta antiga no substitueix un filtre nou. La deduplicació utilitza partit + equip: un derbi no perd la segona convocatòria.

El selector de club també funciona per a un coordinador amb equips autoritzats en més d'un club. No es creen drets nous. Les targetes conserven l'estructura, els escuts i l'ordre local/visitant. Es manté la categoria disponible i el botó **Preparar convocatòria**. Només es corregeix el contrast del desplegable de capçalera (text blanc sobre fons blanc) i el seu límit d’amplada; la disposició de les targetes i la lògica de Base/Avançat no canvien. El botó Setmana ja no afirma que sempre mostri tots els equips quan hi ha un filtre individual.

El servidor existent ja valida els candidats amb club i temporada d'origen, i només admet els reforços de la relació d'elegibilitat interna. Ambdues RPC de desament rebutgen jugadors rivals i jugadors d'altres equips sense elegibilitat. No cal una política RLS ni una migració nova per a aquest canvi. No es carreguen jugadors de l'acta rival com a candidats; l'anàlisi independent de rivals continua intacta.

L'estat buit diu **Encara no hi ha jugadors disponibles per convocar**. Si el servidor retorna permís d'importació, reutilitza **Importa la plantilla CSV** amb l'equip ja triat. Aquesta operació requereix previsualitzar i confirmar; obrir la pantalla no importa ni desa jugadors. Els entrenadors i delegats conserven les operacions que el servidor ja els autoritza; aquesta PR no els converteix en coordinadors.

## Comprovació real, només lectura

Font: catàlegs i funcions de Supabase, transaccions `BEGIN READ ONLY` / `ROLLBACK`, sense modificar JWT ni impersonar usuaris. Procediment repetible: `scripts/inspect-callup-readiness.sql`. Evidència sense noms de persones: `docs/evidence/callup-readiness-20261116.json`.

| Equip | Jugadors interns actius per convocar | Files federatives existents | Estat real |
| --- | ---: | ---: | --- |
| FEM15 | 0 | 15 | Plantilla interna pendent |
| Infantil D | 0 | 44 | Plantilla interna pendent |
| FEM11 | 0 | 18 | Plantilla interna pendent |

Hi ha 36 equips i zero convocatòries internes desades al conjunt consultat. Una segona lectura ha confirmat els mateixos recomptes (36 equips / 0 jugadors interns actius / 0 convocatòries) i les mateixes dues dependències de servidor. Les files federatives no equivalen a jugadors habituals elegibles; no s'han copiat ni promogut automàticament.

La funció productiva `callup_can_edit` **encara no inclou** `is_platform_superadmin`, a diferència de `main`. Això explica que un compte global sense altres afiliacions operatives pugui acabar veient només els equips dels partits que ja tenia autoritzats. `club_setup_access` i `import_club_csv` sí existeixen. Les RPC de la vista setmanal i responsables de #49 encara no existeixen. La pantalla avisa de l'actualització pendent i conserva els partits disponibles.

## Verificació

- Suite Node completa: **167/167 PASS**, zero fallades o omissions. Inclou SQL real de les migracions en PGlite amb identitats fictícies; no és Supabase Auth real.
- Regressió SQL addicional de les dues vies de desament: PASS; rival rebutjat fins i tot amb una fila d'elegibilitat errònia entre clubs. FEM15, Infantil D i FEM11 amb jugadors ficticis, porteria, costat visitant i recuperació d'esborranys.
- Chromium complet: **68/68 PASS**, zero fallades o omissions. Després de l'ajust puntual de contrast s'han repetit les **10/10 proves de convocatòries PASS**, incloses comprovacions de contrast, recàrrega en vista de tots els equips, mòbil (390), tauleta (820), ordinador (1280), llista buida i servidor setmanal pendent. Captures sintètiques mòbil i ordinador inspeccionades. CI del codi `03b97575fc6eca653cbea793fb5c389bbfb35fe5`: [43932100980](https://github.com/Dudisooft/clubhoquei360/actions/runs/43932100980) **success**, logs comprovats: 167 Node, 68 Chromium, check/build 41. Els checkpoints posteriors només registren aquests resultats documentals.
- Incidències de desenvolupament corregides: una dada sintètica sense `position` i dues expectatives de prova incorrectes (text del títol i setmana seleccionada després de recarregar una vista sense setmana). No es documenten com a errors productius. Cap prova fallida al resultat final.
- `npm run check` i `npm run build`: PASS, 41 fitxers d'aplicació; rutes relatives compatibles amb GitHub Pages. `git diff --check`: PASS.
- Les proves de navegador utilitzen RPC fictícies i estat de sessió de prova. No s'ha fet un desament amb un compte real ni una validació Auth productiva. No hi ha eina de navegador connectada a una sessió de l'usuari en aquest entorn.

## Guia de revisió visual

1. Executar les proves o obrir el candidat en l'entorn de revisió habitual, sense apuntar-hi claus privilegiades.
2. Entrar a Dashboard → Convocatòries. Triar club si n'hi ha més d'un. El selector Equip és un desplegable; **Tots els equips del club** mostra les targetes autoritzades.
3. Canviar a Setmana i després a un equip individual: només ha de quedar aquell equip. Canviar de setmana i tornar a tots.
4. Comprovar els dos ordres local/visitant i obrir **Preparar convocatòria**. Seleccionar/desseleccionar, desar esborrany i recarregar. Els reforços continuen separats.
5. Amb una plantilla buida, comprovar el missatge i l'accés a la importació existent, només si està autoritzada. Amb un entrenador restringit no apareixen altres equips ni s'habilita una escriptura no autoritzada.
6. Repetir en 390, 820 i 1280 píxels. Les captures fictícies de la suite queden a `work/callup-all-teams-*.png`, fora de Git.

## Publicació i dependències

**Preparat per revisió, no publicat.** No s'ha fusionat, desplegat, executat una migració ni alterat cap dada o permís de producció.

Abans de publicar:

1. Acreditar una còpia de Supabase recuperable i les garanties de seguretat de la intervenció. No consta una evidència nova de restauració productiva en aquest treball; no s'exporten dades.
2. Revisar i autoritzar expressament les actuacions de servidor pendents: `20261116163049_global_callup_access.sql` ja present a main, i `20261116163644_callup_weekly_staff.sql` de #49. Comprovar el ledger abans d'aplicar: l'evidència d'aquesta revisió és la definició efectiva de les funcions, no només els noms de migració.
3. Completar les plantilles internes amb una font del club validada i el flux existent, sense substituir-les per actes o llistes federatives massives. És una necessitat de dades real, no un filtre que es pugui relaxar al client.
4. Validar amb sessions Auth reals de coordinador i entrenador, inclòs desament i recàrrega, en l'entorn autoritzat.
5. Comprovar CI del commit final, revisar i decidir la fusió/publicació. La URL productiva és https://dudisooft.github.io/clubhoquei360/ ; no incorpora aquests canvis mentre #49 continuï oberta. No s'ha creat una previsualització pública connectada a producció.
