# Mode Base mòbil · redisseny del 24/10/2026

## Estat i abast

**Preparat en branca pròpia, encara no instal·lat ni publicat.** Base de producció `12444a9` (PR #9); branca `feat/base-mobile-rosters`, worktree `/workspace/work/clubhoquei360-base-redesign`. El checkpoint documental de la publicació anterior s’ha recuperat amb `e109e79`, sense repetir-la. L’encàrrec nou exigeix validar els canvis i autoritzar-ne expressament la fusió/publicació; l’autorització de la versió anterior ja desplegada no s’ha utilitzat per instal·lar aquesta migració nova.

L’auditoria revisa el Mode Base, els adaptadors federatius, `ClubCatalog`, `pilot_players`, el flux `pilot_events`, l’estat avançat i els escuts/equipacions. No es modifica la lògica de `avancat.html`, `federation-client.js` ni `stats-*`. S’han identificat dues PR paral·leles, #10 multiclub i #11 accessos temporals: no s’hi ha escrit ni s’han fusionat. El nou backend comprova el rol global existent o un operador ja autoritzat de la mateixa competició, club i temporada; no substitueix aquestes branques ni crea comptes.

## Comportament implementat

1. Preparació única amb dues llistes de convocats (local i visitant), caselles grans, nom/dorsal/origen, altres equips coneguts i avisos d’elegibilitat. No hi ha quota fixa de jugadors. «Confirma convocatòries i continua» desa els dos equips junts. Es poden modificar sense tocar incidències prèvies.
2. Pantalla de partit amb escuts originals verificats des de la font, noms, marcador fix i pestanyes LOCAL/VISITANT. Cada pestanya mostra exclusivament els convocats d’aquell equip. Les pestanyes canvien immediatament fins i tot durant un desament.
3. Files grans amb la silueta de samarreta del llenguatge visual avançat, dorsal i comptadors discrets. No hi ha publicitat ni fotografia. No s’ha trobat cap font de colors/patrons d’equipació verificats: els colors són **provisionals**, determinats per la identitat de l’equip i la funció coneguda, no una equipació atribuïda a tots els equips del club.
4. Tocar jugador → panell inferior amb Gol, Groga, Blava i Vermella. Tocar banqueta → només les tres targetes. Es registra equip, actor, tipus i snapshot identificatiu, amb confirmació visible i estat de desament real. Les targetes no alteren el marcador. Hi ha una alternativa explícita de gol sense identificar quan no es coneix el rival.
5. Historial amb «Corregeix» i «Anul·la»: correcció i substitució en un únic lot append-only, sense esborrar originals. Els noms i dorsals registrats es conserven encara que es retiri un convocat de la llista.
6. Finalització local amb gols/targetes de cada jugador, targetes de les dues banquetes i taules de contrast per equip. No hi ha cronòmetre, titulars, canvis, minuts, passades, assistències, xuts ni possessió. L’acta oficial no s’escriu ni es tanca.

## Identitats, elegibilitat i dades verificades

No es vinculen persones per nom/dorsal. S’utilitzen UUID de jugador, codi de jugador federatiu o la identitat de la fila de l’acta d’aquest partit. Un jugador d’una acta verificada sense codi federatiu individual es pot incorporar amb referència local estable a aquella fila; el codi federatiu continua nul. Les incorporacions reutilitzen `pilot_players`, amb el mateix actor canònic que el registre existent. Cap jugador o dorsal nou s’inventa.

El catàleg intern es combina amb les dades de l’acta accessible. La pertinença a un altre equip del club no prova elegibilitat: els candidats de reforç sense evidència específica del partit queden bloquejats. Un reforç present a l’acta **d’aquest partit** es pot seleccionar; una acta d’un partit antic no certifica un partit futur. La plantilla pròpia del catàleg es mostra amb l’avís «Elegibilitat no acreditada» quan la font no aporta aquesta garantia. El responsable continua havent de respectar la normativa; no s’hi introdueixen regles d’edat o equivalències no verificades.

Fonts llegides de Supabase sense canvis esportius reals:

| Partit | Data i hora Europe/Madrid | Identitat del catàleg | Dades federatives disponibles |
|---|---|---|---|
| Igualada HC D – Oxford HC Salt A | 10/10/2026 16.45 | `b89dd91d-933f-841a-ad43-f03553ca14a5` | FECAPA `152035`, 8–0, acta `FINALIZAT`, 8 locals i 7 visitants |
| Igualada HC D – Hoquei Club Alpicat A | 24/10/2026 18.15 | `8b5cd05a-149e-7e21-73b3-5782994e0d07` | Codi federatiu encara nul, marcador desconegut, cap convocatòria oficial de partit importada |

Consulta desada de la font: 23/10/2026. Competició FECAPA 4786, Infantil OR 4. Font: https://www.hoqueipatins.fecapa.cat/league/4786 . El catàleg IHC D conté 34 registres de plantilla marcats actius per l’importador; **no es presenten com 34 jugadors elegibles verificats**. El Salt aporta 15 presències d’acta. Les identitats reals es carreguen només amb Auth/RLS, no s’han copiat noms de menors a tests o fitxers públics.

## Persistència i integració federativa

Totes les incidències del nou flux, també les proves compartides, utilitzen **el mateix `pilot_events` de Supabase**, amb `pilot_members` i la cua de recuperació existent. UUID estables, lots de correcció atòmics, reintent d’un ACK perdut sense duplicar, pendent visible i prohibició de donar per desada una finalització amb escriptures pendents. La cua es conserva abans d’enviar; si falla l’emmagatzematge del dispositiu es refusa l’acció. L’arrencada en fred continua requerint connexió/Auth.

La taula additiva `basic_match_contexts` només vincula el catàleg amb un context `pilot_matches`: **no és una segona taula d’incidències**. Per al directe es reutilitza l’UUID real del catàleg, o el partit ja importat per identitat federativa. Una prova obté un context separat marcat PROVA; no toca el partit històric ni el 8–0. La creació és explícita amb «Activa el registre…», comprovada al servidor i idempotent. Un partit verificat amb estat `FINALIZAT` no es pot activar com a directe. Les dades locals de la prova antiga es conserven i s’ofereixen per descarregar: no s’envien silenciosament al servidor ni es descarten.

La migració nova és `supabase/migrations/20261023214042_basic_catalogue_contexts.sql`, creada amb Supabase CLI. RLS a la nova taula; lectura només de membres o superadministrador global; sense escriptura directa autenticada. RPC pública SECURITY INVOKER i helper SECURITY DEFINER en esquema privat, `search_path=''`, actor derivat d’`auth.uid()`, sense claims editables ni paràmetre de rol/usuari. Executar és denegat a anon/PUBLIC. El helper comprova participació d’un equip del club al catàleg i permisos existents sobre club/temporada/competició. No canvia les polítiques de partits, jugadors, estadístiques ni incidències.

«Actualitza amb FECAPA» conserva les incidències locals. En partits pilot amb font ja configurada reutilitza l’Edge Function existent i declara la memòria cau de sis hores. En contexts del catàleg torna a consultar les dades federatives importades disponibles; **no fa una extracció nova al portal** ni exigeix un codi d’acta inexistent. No s’afegeix scraping fràgil ni consultes contínues. La manca de dades no bloqueja l’anotació manual. Les targetes oficials de banqueta no estan estructurades i resten «No verificable». Un text `FINALIZAT` es mostra com a estat publicat, sense afirmar un tancament formal amb un contracte no verificat. No s’ha pogut accedir al portal directament des de l’entorn; no es declara una revalidació en directe.

## Proves i límits

- Base consolidada del redisseny: **88/88 Node i 26/26 Chromium**, incloses les 14 regressions avançades. Check/build/diff correctes. Després s’han reforçat l’avís d’equipació per equip i les comprovacions d’identitat/acta; verificació final específica: 23/23 model/PostgreSQL i 12/12 Chromium correctes; també s’ha comprovat separadament el superadministrador global sense referència i la preservació de noms en corregir un jugador completament retirat. La CI de la PR verifica el HEAD complet.
- PostgreSQL/PGlite real local: activació idempotent, context separat, negació a lectors i operadors d’una altra competició, RLS, anon denegat, wrapper invoker/helper privat, ACK perdut i reintent, correccions persistents, jugador amb identificació d’acta però sense codi individual, preservació del marcador/registre històric i rellotge avançat, rebuig de directe per una acta finalitzada i de partits sense participació del club.
- Navegador amb dades fictícies: convocats dels dos equips, reforç verificat i bloqueig d’un altre, pestanyes, escuts, dorsals, tres targetes individuals, dues banquetes, correcció/anul·lació, canvi de convocats, recàrrega, errors de connexió, duplicació de pulsacions, FECAPA manual/error, resum/reobertura, prova compartida sense canviar l’històric i partit similar a l’Alpicat sense acta/codi/rival conegut. Mòbil 390×844, tauleta 820×1180 i ordinador 1440×1000, sense scroll horitzontal.
- El navegador bàsic utilitza un transport sintètic; permisos, transaccions i persistència també es proven separadament en PostgreSQL local. No s’han creat comptes, partits de prova, gols ni targetes reals de producció. No es declara prova Auth/Realtime real d’aquest redisseny en dos dispositius.
- Limitacions reals: colors d’equipació provisionals; normativa d’elegibilitat no disponible; convocats de l’Alpicat absents fins que la font els publiqui/importi; contrast del catàleg sobre importacions, no extracció immediata; contextos nous de partits sense acta operatius al Mode Base, sense canviar el flux d’alta d’estadístiques avançades.

## Desplegament exacte, pendent d’autorització

1. Revisar la PR d’aquesta branca i la CI del HEAD. Comparar amb main i amb les PR #10/#11 abans de fusionar, mantenint les seves migracions i permisos fora d’aquest desplegament.
2. Instal·lar **només** la migració `20261023214042_basic_catalogue_contexts.sql` en staging/projecte autoritzat, amb el mecanisme de migracions Supabase existent. No executar de nou l’esquema inicial ni les migracions estadístiques. No executar `supabase db push` indiscriminadament si hi ha migracions remotes desalineades: el primer esquema estadístic té un timestamp local diferent del registrat en producció.
3. Comprovar permisos/RLS/funcions i advisors al projecte destinatari. Executar les proves de staging amb dades fictícies; no registrar accions de prova al partit esportiu real.
4. Amb autorització expressa, fusionar la PR a main. Pages existent publicarà el frontend; comprovar build/deploy success i SHA exacte. No cal desplegar una Edge Function nova, canviar Auth/SMTP ni instal·lar les branques paral·leles.
5. Obrir al mòbil amb sessió autoritzada i validar primer el context de prova del Salt. Per rollback del frontend, tornar al SHA de producció `12444a9`; conservar la nova taula i les incidències que s’hi hagin vinculat. No eliminar contexts/dades per revertir la pantalla.

## Prova exacta des del mòbil després de publicar

Salt: `https://dudisooft.github.io/clubhoquei360/base.html?practice=b89dd91d-933f-841a-ad43-f03553ca14a5`.

Alpicat: `https://dudisooft.github.io/clubhoquei360/base.html?catalogue=8b5cd05a-149e-7e21-73b3-5782994e0d07`.

Aquests enllaços apunten al lloc de producció: **el redisseny no hi és encara**. No utilitzar l’URL de l’Alpicat com si ja activés la nova RPC abans d’instal·lar/publicar.

Després del desplegament: iniciar sessió → obrir l’enllaç → activar el context compartit si cal → marcar convocats locals i visitants disponibles → «Confirma convocatòries i continua» → tocar jugador i Gol/targeta → canviar LOCAL/VISITANT → usar Banqueta per a una targeta general → revisar/corregir incidències → finalitzar i contrastar. Al Salt la prova comença amb marcador propi 0–0 i oficial 8–0. A l’Alpicat, si la plantilla rival no és disponible, continuar sense inventar jugadors i utilitzar «Gol sense jugador identificat». Comprovar «Dades confirmades al servidor»; davant de pendents, mantenir el dispositiu i reintentar.

Per revisar localment amb dades fictícies:

```
npm ci
npm run check
npm test
npm run build
npm run test:browser
```

Les proves serveixen la mateixa pantalla sota `/clubhoquei360/base.html` i no publiquen canvis. Captures locals: `work/base-redesign-{mobile,tablet,desktop}.png`.


## Captures per revisar abans d’autoritzar

Totes utilitzen dades fictícies i escuts de transport de prova, sense persones reals. Els URLs reals dels escuts es verifiquen separadament; aquestes captures mostren el disseny, no una sessió de producció.

- [Preparació dels dos equips](assets/base-preparation.png)
- [Pantalla de partit mòbil](assets/base-mobile.png)
- [Menú inferior de jugador](assets/base-action-sheet.png)
