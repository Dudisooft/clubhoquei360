# Fase 3A.1 · accés extern temporal al Mode Avançat

27/10/2026. Frontend de la PR #32; servidor dependent a la PR #31, commit `ae4efb398518376bce2842978bb404debdf81a67`. Cap fusió, desplegament, migració remota, correu enviat o compte real modificat en aquesta fase. No s’incorporen altres PR pendents.

## Canvis i límits

El client consumeix `match_mode_access` i `stats_access`; un operador amb autorització temporal activa pot obrir únicament el seu partit en perfil estadístic, encara que sigui inferior a Júnior. A Partit apareix «Partits amb accés temporal», obtingut de `match_temporary_list(NULL)` per al compte autenticat, sense concedir accés al catàleg de tot el club. La jerarquia habitual no canvia ni selecciona automàticament un partit.

Estadístiques mostra la caducitat i que l’accés no concedeix permisos oficials. El formulari «Accés extern al Mode Avançat», dins Operadors / Assignacions temporals, només apareix si el servidor retorna `temporary_manage`. Demana UUID Auth existent, equip del partit, inici, final, categories i costat. Proposa 24 h, modificables; el servidor rebutja durades infinites o superiors a 168 h i comprovacions d’àmbit manipulades. Les categories seleccionades s’envien com a codis concrets d’accions. La funció de servidor permet addicionalment limitar jugadors per UUID.

Només superadministrador habilitat o coordinador esportiu principal del club (`general_coordinator`, sense equip) poden concedir/revocar. El rol visual, l’URL, localStorage i el rellotge del dispositiu no són fonts d’autoritat. No s’afegeixen rols, membres, assignacions antigues ni permisos sobre actes, plantilles, convocatòries o Base. Un delegat amb Base previ rep únicament l’excepció estadística Advanced; les guardes d’oficials de #31 queden separades.

Després de caducitat/revocació, el servidor denega operacions noves immediatament. El client refresca capacitats en rebre 42501 i periòdicament durant l’ús; en caducar atura el rellotge d’anàlisi i mostra l’avís. El temps del client només ajuda la interfície. Les estadístiques legítimes romanen al servidor i els responsables amb drets independents les poden consultar. Les mutacions rebutjades romanen identificades a la cua local per revisió, sense presentar-se com a confirmades ni reenviar-se en obrir una pantalla. La recuperació requereix permisos vigents i una acció explícita; es mantenen els UUID per evitar duplicats. Si falla la consulta de permisos després d’una denegació, el client tanca el registre conservant la còpia local.

Model, RLS, bloqueigs, auditoria i procediment de desplegament: `docs/temporary-match-operators-server.md` a la PR #31. Migració nova `20261027183214_temporary_match_operators.sql`, posterior a `20261027170248_match_mode_access.sql`. Cap SQL de servidor es copia a aquesta branca ni s’aplica a producció.

## Invitació o vinculació segura, encara pendent

Aquest panell exigeix un UUID de compte Auth existent i verificat. Si no existeix, un administrador amb infraestructura Auth segura el convida mitjançant Supabase Auth / OTP, amb SMTP comprovat i enllaços de retorn adequats. El destinatari verifica el seu correu; després l’autoritzador identifica l’UUID correcte i concedeix l’accés al partit. No crear contrasenyes conegudes, claus de servei al navegador ni membres del club per simular l’accés. No es reutilitzen credencials personals ni s’integra la PR d’invitacions pendent. En aquesta fase no es creen comptes del pilot FEM15 ni s’assignen permisos a Oriol o Ventu.

## Guia visual en entorn de revisió

1. Amb dades de prova i servidor compatible, el coordinador principal o superadmin obre el context existent del partit FEM15 → Estadístiques → Operadors. Una consulta de calendari no crea context. Si manca, preparar-lo mitjançant l’activació explícita autoritzada de #31, abans de concedir el permís.
2. A «Accés extern al Mode Avançat», seleccionar l’equip, UUID de l’operador verificat, dates i categories necessàries; prémer «Autoritza aquest partit». Comprovar caducitat i fila d’autorització. No solapar àmbits amb altres operadors; no s’alteren assignacions vigents.
3. En un altre navegador, entrar amb el compte de prova extern → Partit → «Partits amb accés temporal». Obrir el partit i comprovar perfil Estadístic, avís de caducitat i controls oficials desactivats. No ha d’aparèixer la gestió d’operadors.
4. En vídeo, iniciar, registrar una passada d’equip i un gol estadístic d’un jugador disponible; pausar, recarregar i reprendre. Comprovar històric i sessió. El gol estadístic no altera el marcador oficial.
5. Intentar un altre `?match=` o afegir `role=platform_superadmin`: accés denegat, sense substitució de partit.
6. El coordinador prem «Revoca accés extern». Una nova acció de l’operador ha de ser denegada i mostrar «revocat»; el responsable continua veient les dades desades. Repetir amb un termini curt i comprovar «caducat». No canviar el rellotge del dispositiu per simular el servidor.
7. Repetir la consulta ordinària de sènior/júnior, Base inferior i futur sense context; confirmar que cap simple obertura produeix registres.

Captures locals de la prova fictícia: `work/temporary-fem15-admin.png`, `work/temporary-fem15-expired.png`. No s’incorporen captures amb dades personals ni tokens al repositori.

## Evidència executada

| Àmbit | Resultat local | Què acredita |
| --- | --- | --- |
| Node frontend | **158/158 PASS** | Regressions, cua, revocació i còpia del rellotge davant denegació; PostgreSQL/PGlite de la branca |
| Chromium frontend | **67/67 PASS** | Base, Avançat, selector, reforços i persistència, contractes ficticis |
| Node servidor #31 | **181/181 PASS**, 14 noves | Migracions PostgreSQL/PGlite, funcions reals, RLS/ACL, rols ficticis i límits |
| Chromium servidor #31 | **47/47 PASS** | Regressions de la branca servidor |
| Integració nativa FEM15 | **PASS** | UI real #32 + SQL #31, 2 observacions, vídeo/pausa/reprèn/recarrega, altres partits/acta denegats, revocació/caducitat, 0 membres/contextos creats, assignacions i dades oficials intactes |
| Integració nativa futur RFEP | **PASS** | Consulta 0 escriptures, activació explícita, 1 context/1 membre operatiu/1 passada/0 incidències oficials, recàrrega sense duplicat |
| Check/build/diff | **PASS**, 38 fitxers | Artefacte Pages sense tests, SQL ni credencials |
| Auth / dades / desplegament reals | **PENDENT** | No es concedeixen permisos ni s’instal·len migracions en aquesta fase |

Comandes de reproducció des de la branca frontend, amb checkout separat i revisat del servidor:

```sh
npm test
npm run test:browser
npm run check
npm run build
node scripts/verify-match-mode-integration.mjs ../clubhoquei360-mode-server/supabase/migrations/20261027170248_match_mode_access.sql ../clubhoquei360-mode-server/supabase/migrations/20261027183214_temporary_match_operators.sql
node scripts/verify-temporary-integration.mjs ../clubhoquei360-mode-server/supabase/migrations/20261027170248_match_mode_access.sql ../clubhoquei360-mode-server/supabase/migrations/20261027183214_temporary_match_operators.sql
```

No executar els dos scripts simultàniament: comparteixen el port local 4173. `PLAYWRIGHT_BUNDLED=1` usa Chromium instal·lat per Playwright. Les rutes `__test/temporary-*` només existeixen al servidor local de proves, exclòs del build, amb identitats fictícies; no són endpoints Supabase. Les crides del navegador es redirigeixen a PGlite local i no s’envien a producció.

La CI de #32 afegeix els dos recorreguts natius carregant les dues migracions del commit revisat de #31, fixat explícitament. No es fusionen branques per provar-les. En un futur arbre amb migracions pròpies s’utilitzen les locals sense repetir-les. Els resultats de CI s’anoten a CODEX_PROGRESS quan s’hagin comprovat, sense confondre codi, automatització i validació real.

Pendent: revisió de les dues PR i metadades de 3A; validació visual humana i Auth real en entorn autoritzat; SMTP/invitació si cal; desplegament únicament amb autorització expressa. Sense altres canvis de plantilles, reforços, imports, multiclub o estadístiques.
