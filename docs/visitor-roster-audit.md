# Incidència de plantilles visitants · 24/10/2026

Branca `fix/visitor-roster-contingency`, base `a5e54e7fd4f1ac2e3a723ef175b34f3850c40d96`. Aplicació estàtica ES Modules, Supabase Auth/PostgreSQL/RLS, Edge Functions FECAPA/RFEP i GitHub Pages; es mantenen els dos modes existents.

## Dades protegides i causes

- Infantil D–Alpicat: context/pilot `8b5cd05a-149e-7e21-73b3-5782994e0d07`, FECAPA 4786, temporada 41, equips 12413/12050. Consulta de només lectura: **8 jugadors i 6 incidències reals**, que no es reescriuen.
- Igualada–Vic: pilot `18fa0a6e-e5c6-487e-8315-5bc371e22cb1`, calendari `51894d05-c323-f3e1-8534-fa79e062c448`, RFEP 3575, temporada 41, equips 3697/3727. Identificador de fitxa oficial nul; no inventar-lo.
- Club de les dues competicions: `a48efe2f-c218-633e-6be6-4ce26e61f5cd`, temporada `94b6c5ab-ecc9-b4a5-4a2a-ad8d5446ff2e`.

L'importador `ihc-sync/parse.ts` limita plantilles als equips propis verificats de l'Igualada. `basic-roster.js` resol equips directes amb `federation_match_teams`, sense entrades dels rivals. La preparació manual de l'Avançat es tanca en iniciar el partit; el Mode Base no ofereix alta provisional. No s'han trobat plantilles verificades de Vic 3727 ni Alpicat 12050.

Les memòries cau general (18 h) i de fitxes (6 h) no creen plantilles absents. Un calendari no acredita convocatòria ni elegibilitat. Es conserva el filtre Infantil aprovat: participació documentada i possibles reforços alevins, sense mostrar tota la categoria.

## Bloqueig de font oficial

L'extractor existent consulta `www.server2.sidgad.es`, absent dels dominis permesos de l'entorn actiu (revisió 126, política restringida aplicada). L'intent anterior documentat retorna CONNECT 403 abans de RFEP. Els portals públics ofereixen només la carcassa dinàmica en aquesta consulta. **No s'han recuperat ni importat jugadors/dorsals autèntics de Vic o Alpicat.** No s'utilitza cap servei intermedi per eludir la política.

## Punt d'integritat (només lectura)

Consulta 2026-10-24T19:54:08.868135Z; MD5 del JSON ordenat per clau primària, sense dades personals ni escriptures de l'agent.

| Grup | Files | Empremta |
|---|---:|---|
| pilot_players | 190 | 9b69de08bf3cd9cc9418094b953315c0 |
| pilot_events | 348 | f15b35ad2f94b23674f5300d0682c0ef |
| pilot_operator_state | 7 | 17778402b757c006d018e260d6fd5005 |
| stats_events | 3 | b9ea918c541ef18425a8c76ce90b10d0 |
| stats_sessions | 1 | ebb70b704b48eda8478e70034785eb62 |

Els usuaris poden continuar treballant; un canvi posterior no implica corrupció. Abans d'importar realment cal verificar l'estat actual.

## Decisions i fase

Contingència comuna dins dels modes existents: alta/correcció durant el partit, UUID estable, procedència manual explícita, revisió optimista i mutacions idempotents. La vinculació exigeix una referència oficial del mateix equip/competició/temporada, mai una coincidència de nom. Corregir plantilla no modifica incidències oficials ni estadístiques. Pendent implementar i provar. Cap migració/frontend nou es publica sense revisió i autorització d'aquest bloc.
