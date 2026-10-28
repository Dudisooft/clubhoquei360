# ClubHoquei360 · Fase 3A.4 · Verificació federativa sènior

Consulta: 28/10/2026. PR #31 servidor i #32 frontend, separades i en esborrany. No migracions, metadades, comptes, permisos o dades esportives productives modificats.

## Resultat i abast

**Verificació independent de les sis franges: PENDENT per evidència insuficient.** S’han resolt les identitats del catàleg i la competició de SIMAR; no s’han convertit aquests resultats en una aprovació federativa d’edat.

Catàleg actual rellegit en només lectura: **36 UUID d’equip, 38 inscripcions**, sense duplicat de la clau federació/competició/equip extern. Proposta conservada **6 senior / 4 junior / 26 youth**; és un inventari de candidats, no sis verificacions federatives. No s’ha afegit, eliminat o fusionat cap equip. No es declara complet l’inventari de tots els equips federats del club.

L’Igualada Rigat està vinculat internament al primer equip, l’OK Lliga masculina 3568 i l’ID RFEP 3696. La participació a la Supercopa 2026/27 és corroborada parcialment per l’índex oficial; la confirmació federativa directa que tanqui franja/condició de primer equip no ha estat recuperable. SIMAR figura separadament a **OK LIGA PLATA SUR 3575, RFEP 3697**. No són dos patrocinadors que hàgim fusionat pel nom: consten UUID, equips federatius i competicions diferenciats. Aquesta constatació és sobre les inscripcions; no determina cap equivalència entre federacions fora dels enllaços importats existents.

## Taula de les sis inscripcions principals

Tots corresponen a Igualada Hoquei Club, UUID club `a48efe2f-c218-633e-6be6-4ce26e61f5cd`, temporada interna `94b6c5ab-ecc9-b4a5-4a2a-ad8d5446ff2e`, etiqueta 2026/27; temporada externa importada 41. IDs de club de la font importada: FECAPA 252 / RFEP 69. Són espais d’identificadors diferents.

| Equip del catàleg / nom federatiu importat | Competició | Federació | Categoria verificada | Evidència | Estat |
|---|---|---|---|---|---|
| IGUALADA RIGAT HC | OK LIGA MASCULINA (3568) | RFEP | Sènior/primer equip al catàleg; verificació independent pendent | [Font associada](https://hockeypatines.fep.es/league/3568); equip 3696, importació rellegida | TARONJA — PENDENT |
| SIMAR IGUALADA HC | OK LIGA PLATA SUR (3575) | RFEP | Sènior proposat; franja independent pendent | [Font associada](https://hockeypatines.fep.es/league/3575); equip 3697, importació rellegida | TARONJA — PENDENT |
| IGUALADA HC | NACIONAL CATALANA MASCULINA (4774) | FECAPA | Sènior proposat; franja independent pendent | [Font associada](https://www.hoqueipatins.fecapa.cat/league/4774); equip 12077, importació rellegida | TARONJA — PENDENT |
| IGUALADA HC | SEGONA CATALANA MASCULINA (4779) | FECAPA | Sènior proposat; franja independent pendent | [Font associada](https://www.hoqueipatins.fecapa.cat/league/4779); equip 12078, importació rellegida | TARONJA — PENDENT |
| IGUALADA HC A | TERCERA CATALANA MASCULINA (4781) | FECAPA | Sènior proposat; franja independent pendent | [Font associada](https://www.hoqueipatins.fecapa.cat/league/4781); equip 12079, importació rellegida | TARONJA — PENDENT |
| IGUALADA HC B | TERCERA CATALANA MASCULINA (4781) | FECAPA | Sènior proposat; franja independent pendent | [Font associada](https://www.hoqueipatins.fecapa.cat/league/4781); equip 12080, importació rellegida | TARONJA — PENDENT |

No es marca VERD perquè no hi ha una prova primària llegible suficient de cada franja/inscripció. No s’ha demostrat cap duplicat o classificació esportiva falsa que justifiqui VERMELL. Hi ha una imprecisió de descripció: l’etiqueta interna genèrica «OK LIGA» de SIMAR i relats anteriors no distingeixen Plata Sud. La competició estructurada sí que és 3575; no s’ha corregit cap dada productiva ni s’ha declarat erroni el resultat d’un partit.

## Traçabilitat i confiança per equip

| Equip / competició principal | UUID intern | ID d’inscripció intern | Equip extern | Confiança identitat / franja |
|---|---|---|---|---|
| IGUALADA RIGAT HC · 3568 | `c7b496b0-2d68-d6ae-5f80-70928f35e903` | `2cd391cf-4fb5-8f00-872e-58390955722c` | 3696 | Alta dins del catàleg / insuficient per aprovació independent |
| SIMAR IGUALADA HC · 3575 | `f9eed270-6221-42dc-7ac4-3df490ad65db` | `3f0368be-a87a-f1a4-66f0-3705f3ab4e7a` | 3697 | Alta dins del catàleg / insuficient per aprovació independent |
| IGUALADA HC · 4774 | `c31eddb5-389e-9487-544d-6bd974e2869b` | `1139e3e0-7fa4-4e29-9659-8afa088bb644` | 12077 | Alta dins del catàleg / insuficient per aprovació independent |
| IGUALADA HC · 4779 | `ad2bbfdd-9b11-c0e2-b335-a0b60b6c68ab` | `40cb96ff-e62f-9735-0198-bfbd3207a642` | 12078 | Alta dins del catàleg / insuficient per aprovació independent |
| IGUALADA HC A · 4781 | `f46aafd6-0ccb-a3df-14ed-5abafb4109d3` | `caae119c-b785-1cb4-0008-92c2326cd40e` | 12079 | Alta dins del catàleg / insuficient per aprovació independent |
| IGUALADA HC B · 4781 | `666ba825-830b-4136-b3da-2cb7c5f5ae14` | `1c01a36a-6ca9-d91d-3f85-96c75ded91d8` | 12080 | Alta dins del catàleg / insuficient per aprovació independent |

Rigat té tres inscripcions sota el mateix UUID: RFEP 3568 i 3592 comparteixen equip extern 3696; FECAPA 4858 té equip extern 12074. Compta **un equip i tres inscripcions**, no tres equips. SIMAR té un altre UUID amb RFEP 3697/3575. Tercera A i B comparteixen competició 4781, però tenen equips externs 12079 i 12080 i grups 4944 i 4943 respectivament. Nacional i Segona tenen el mateix nom curt però IDs 12077/4774 i 12078/4779 diferents. No s’ha deduït cap identitat només a partir de noms.

La memòria importada de les classificacions de Tercera inclou blocs A i B dins del raw_data de cada inscripció. Per això les files de classificació contingudes al JSON no s’han usat com a identificador ni per fusionar-les. Els camps estructurats d’equip/grup sí que estan diferenciats. Cap canvi d’importació forma part d’aquesta fase.

## Fonts consultades i què acrediten

[Manifest de fonts](evidence/senior-sources-3a4-20261028.json), [consulta del catàleg sanejada](evidence/senior-catalogue-3a4-20261028.json).

- Connexió directa des de l’executor: RFEP/FECAPA/SIDGAD responen CONNECT 403; la política vigent 140 no inclou aquests dominis. No s’ha intentat evitar el proxy o canviar la política.
- Eina de cerca web: les pàgines RFEP 3568/3575/3592 amb www només renderitzen una carcassa amb menú de temporades i un peu 2016/17. Aquest menú **no prova** que la inscripció oberta correspongui a 2026/27. L’índex de 3592 sí mostrava Supercopa 2026/27 amb Rigat: corroboració parcial, no fitxa d’edat.
- FECAPA 4774/4779/4781 i portal fcpatinatge: no recuperables de manera útil. Les cerques exactes de circulars de 2026/27 no han aportat el document necessari. No s’infereix que no existeixi.
- [Bases RFEP 2026/2027, allotjades per la Federació Madrilenya](https://fmp.es/wp-content/uploads/2026/08/Bases-temp-2026-27-ok.pdf), enllaçades al seu [índex federatiu](https://fmp.es/reglamentos-patinaje/): 54 pàgines llegides, pàgines 4, 7, 14 i 22 rellevants. Diferencien llicència d’edat i equip; admeten júniors en sèniors sense canviar-ne la categoria. Regulen per separat OK Lliga i Plata. **No identifiquen les sis inscripcions investigades ni certifiquen per si soles la franja de cadascuna.**
- Circular FCP de 2025/26 trobada i descartada com a prova definitiva per a 2026/27. Fonts periodístiques i agregadors es van consultar com a pistes, sense utilitzar-los per activar metadades.

No s’han recollit dates de naixement, llicències personals ni plantilles de jugadors. El nivell sènior d’un equip no es determina comprovant que tots els jugadors siguin majors d’una edat.

## Proposta SQL i compatibilitat

`docs/match-age-group-review-20261027.json` manté 36 IDs i els grups proposats; afegeix el resultat 3A.4 a les sis files. `apply_approved=false` a totes. Els altres 30 equips no canvien de proposta, categoria, nom, club o temporada.

`scripts/prepare-reviewed-age-groups.sql` segueix sent una proposta, fora de les migracions. **Sis UPDATE sènior comentats** amb traçabilitat a l’informe, inclòs Rigat. Abans Rigat era executable dins del dry-run perquè tenia «SÈNIOR · primer equip» intern explícit; el criteri independent de 3A.4 no queda satisfet amb aquesta etiqueta. Això afegeix un pendent documental, **no canvia Rigat a júnior/inferior ni aplica cap dada real**. Les 30 altres propostes continuen protegides per revisió i ROLLBACK final; no s’autoaproven.

Cada proposta conserva UUID, club, temporada, categoria exacta i `age_group is null`. No hi ha cap lookup per patrocinador o whitelist de divisions. Els noms es documenten, no són claus de selecció.

No canvien RLS, RPC, frontend, imports o migracions. Quan s’aprovi amb evidència `age_group=senior`, Base i Avançat continuaran depenent del permís operatiu; una classificació no crea membres, contextos, convocatòries ni estadístiques. Desconegut continua sense Avançat ordinari; excepcions privilegiades i permisos temporals es mantenen al servidor. La selecció usa competició i ID d’equip; Rigat i SIMAR no s’intercanvien. Resultats de seguretat/Auth 3A.2/3A.3 continuen vigents per al codi immutable; no s’han repetit aquestes auditories.

## Matriu completa de 36 equips

Propostes, no classificacions productives ni certificació federativa de completesa. C = explícita al catàleg pendent de revisió humana; P = franja independent pendent 3A.4. Els 30 no sèniors es conserven sense canvi.

| UUID | Equip | Categoria original | Proposta | Evidència |
|---|---|---|---|---|
| `020cf94a-ab92-f435-2fbd-9db438c2a120` | IGUALADA HC C | JÚNIOR | junior | C |
| `11aead52-9c21-3425-01d4-4b6915b0b8aa` | IGUALADA HC D | JÚNIOR | junior | C |
| `174df2fc-5530-f172-e535-cce1f2455da8` | IGUALADA HC E | JUVENIL | youth | C |
| `2c6f30c0-2345-4ab0-6416-2c4eb1213926` | IGUALADA HC C | ALEVÍ | youth | C |
| `35d785ae-cd8b-b174-8f4c-8831fbd784fa` | IGUALADA HC A | BENJAMÍ | youth | C |
| `3b3f6fb5-bbc5-7467-5d3f-320be8003686` | IGUALADA HC | FEM 11 | youth | C |
| `3b838f5f-8fe2-715b-616c-754178055007` | IGUALADA HC A | JUVENIL | youth | C |
| `4357e8e7-30d2-a17b-f1eb-4e8a7d6afe5f` | IGUALADA HC F | INFANTIL | youth | C |
| `666ba825-830b-4136-b3da-2cb7c5f5ae14` | IGUALADA HC B | TERCERA CATALANA MASCULINA | senior | P |
| `6b8545db-eb77-186e-2f91-dc9ca19ec5ef` | IGUALADA HC B | BENJAMÍ | youth | C |
| `75a038d4-cbc6-4da3-989c-1ef894e8ec1d` | IGUALADA HC D | ALEVÍ | youth | C |
| `793a0cd7-eae9-e5c6-c76e-0fb429a337cb` | IGUALADA HC A | PREBENJAMI | youth | C |
| `7e8a22b1-39ec-d5e9-df00-121fa4b28aac` | IGUALADA HC E | INFANTIL | youth | C |
| `8142727e-2bfd-d9a7-5ca6-d47b68fa48a0` | IGUALADA HC B | JUVENIL | youth | C |
| `85b5541c-0c5b-ee6d-a23f-368a8cd38fae` | IGUALADA HC D | INFANTIL | youth | C |
| `8cfde442-be75-321d-ac5c-cff4f95b7a38` | IGUALADA HC B | JÚNIOR | junior | C |
| `9385f410-c5ec-6de6-796a-738371a91b30` | IGUALADA HC A | ALEVÍ | youth | C |
| `978e00aa-648c-98f1-6a7b-fbdd603eba30` | IGUALADA HC A | PREBENJAMI INICIACIO | youth | C |
| `9f268c67-ea26-ec18-c445-512b3829c772` | IGUALADA HC | FEM 13 | youth | C |
| `a6496b1a-9b8c-67e3-6f52-9aa6e2ef21ce` | IGUALADA HC B | PREBENJAMI INICIACIO | youth | C |
| `ad2bbfdd-9b11-c0e2-b335-a0b60b6c68ab` | IGUALADA HC | SEGONA CATALANA MASCULINA | senior | P |
| `b2641ae4-d1e3-c98f-0c89-72a074e3c151` | Igualada HC · FEM15 | FEM15 | youth | C |
| `c0febd5f-96b6-c734-5d33-c6d7bb5e8958` | IGUALADA HC C | BENJAMÍ | youth | C |
| `c2d46fe9-9573-ea1d-84f1-3ba80b104c27` | IGUALADA HC A | INFANTIL | youth | C |
| `c31eddb5-389e-9487-544d-6bd974e2869b` | IGUALADA HC | NACIONAL CATALANA MASCULINA | senior | P |
| `c726e180-1364-eabb-97d5-4eda236a3312` | IGUALADA HC C | JUVENIL | youth | C |
| `c7b496b0-2d68-d6ae-5f80-70928f35e903` | IGUALADA RIGAT HC | SÈNIOR · primer equip | senior | P |
| `cc90b135-b53d-2227-648d-07d242e571a4` | IGUALADA HC B | INFANTIL | youth | C |
| `d624830b-8b79-2c97-f052-a88788a8a523` | IGUALADA HC C | INFANTIL | youth | C |
| `db4c3453-dbfe-b91b-cc27-20c215e3f5e8` | IGUALADA HC D | BENJAMÍ | youth | C |
| `dba1679b-4688-a3b9-0f3c-8ac52aa4bf48` | IGUALADA HC A | JÚNIOR | junior | C |
| `f1aaac4e-13fd-a8fa-0df9-c87414d5e929` | IGUALADA HC B | ALEVÍ | youth | C |
| `f46aafd6-0ccb-a3df-14ed-5abafb4109d3` | IGUALADA HC A | TERCERA CATALANA MASCULINA | senior | P |
| `f7c79aa2-5f04-712c-5124-92c965baa492` | IGUALADA HC D | JUVENIL | youth | C |
| `f9eed270-6221-42dc-7ac4-3df490ad65db` | SIMAR IGUALADA HC | OK LIGA | senior | P |
| `fb6c48ff-e7b4-6983-d6cf-4068e7bd1f83` | IGUALADA HC B | PREBENJAMI | youth | C |

## Proves i protecció de dades

- Prova afectada `node --test tests/match-migration-audit.test.mjs`: **3/3 PASS**, inclou negativa sense revisió, preview local de 30 propostes, sis sèniors intactes i rollback amb zero classificacions persistides. PGlite aïllat; cap execució de la proposta sobre producció.
- Identitats i metadades de la consulta contrastades amb la proposta: 36 UUID iguals, 38 claus federatives úniques, vuit inscripcions dels sis candidats; noms/categories/clubs/temporades preservats. Resultats estructurats a l’evidència de validació.
- Empremtes agregades de producció en transaccions READ ONLY abans/després; **23/23 conjunts iguals**, resultats a `evidence/senior-preservation-3a4-20261028.json`. No s’han exportat comptes o dades personals. Els canvis d’importadors independents, si n’hi hagués, no s’atribuirien a aquesta fase.
- CI servidor [40722934357](https://github.com/Dudisooft/clubhoquei360/actions/runs/40722934357) al commit `a90b4225840f5216858c0f04ef58353e5a0c1252`: success **191 Node / 47 Chromium**. Frontend [40722934022](https://github.com/Dudisooft/clubhoquei360/actions/runs/40722934022) al commit `fec558477d72ae9d7e1d80e7899b5a2b714a714f`: success **158 Node / 67 Chromium**, integració habitual inclosa. Logs comprovats, zero fallades/omissions. Els checkpoints posteriors només documenten els resultats; evidència `senior-ci-3a4-20261028.json`. Les evidències locals s’associen al SHA256 de proposta/SQL/test. No s’afirma Auth real nou ni una nova prova de navegador: el runtime i les regles no han canviat.

## Pendent i represa

1. Recuperar una inscripció o document federatiu de **2026/27** que vinculi cada equip concret amb la categoria sènior; per Rigat, confirmar també primer equip i correspondència RFEP 3696/3568. Les consultes de divisió o temporades anteriors soles no tanquen aquest punt.
2. Calen fonts oficials accessibles o còpies oficials verificables. Per la via de l’executor, habilitar els hosts RFEP/FECAPA i, si la font ho requereix, SIDGAD/portal FCP; no s’ha fet aquesta modificació des d’aquí. No calen claus o comptes personals per llegir calendaris públics.
3. Amb evidència suficient, associar-la a cada UUID, preparar només la fila acreditada i executar el dry-run/regressió afectada local. Revisió humana de tota la proposta abans d’una futura aplicació expressament autoritzada.

FECAPA continua per competicions catalanes i RFEP per estatals. Futura ampliació europea: requerirà federació/font, ID de competició/temporada i una nova inscripció vinculada al mateix UUID del primer equip quan hi hagi evidència real; sense clonar l’equip, inventar participacions o ampliar permisos. **No implementada ni necessària per activar les competicions actuals.**

**Tancament 3A.4: comprovacions disponibles completades; classificacions independents pendents. Sense fusió, desplegament o operació mutativa de producció.**
