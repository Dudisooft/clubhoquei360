# ClubHoquei360 · Continuïtat frontend 3A.4

28/10/2026. #32 continua en esborrany, sense fusió amb #31/main, sense publicació ni canvis de producció.

[Informe complet i matriu dels 36 equips a #31](https://github.com/Dudisooft/clubhoquei360/blob/feat/match-mode-access-server/docs/SENIOR_FEDERATION_REVIEW_3A4_2026-10-28.md).

- Catàleg rellegit en només lectura: 36 equips/38 inscripcions, sense duplicats de clau federativa. Proposta 6 senior / 4 junior / 26 youth conservada; no certifica sis franges federatives.
- Rigat: RFEP 3696/3568 OK Lliga masculina, més 3592 i FECAPA 12074/4858 sota un UUID. SIMAR: altre UUID, RFEP 3697/3575 **OK LIGA PLATA SUR**. No intercanviar-los ni fusionar-los pel patrocinador.
- Nacional: 12077/4774; Segona: 12078/4779; Tercera A/B: 12079/12080 a 4781, grups diferents. Equips homònims mantenen identitats separades.
- Sis franges independents pendents: connexió oficial directa CONNECT 403, eina web només recupera carcassa RFEP/índex parcial i bases generals RFEP 2026/27 allotjades a FMP. Ni el nom de divisió ni les bases generals identifiquen la categoria concreta dels sis equips.
- El servidor desactiva també l’UPDATE de proposta de Rigat (abans sustentat en etiqueta interna explícita); sis sènior comentats, 30 altres propostes intactes, revisió i ROLLBACK mantinguts. Cap classificació real modificada.

No canvia cap fitxer funcional frontend, navegador, importació, RLS o RPC. Selecció per ID/competició i permisos operatius vigents. Desconegut denega Avançat ordinari; excepcions root/principal/temporals mantenen les comprovacions del servidor. L’assignació futura de senior només serà metadada revisada, no un permís ni activació automàtica.

Proves afectades de la proposta a #31: **3/3 Node/PGlite PASS** i comprovacions d’identitat/guardes SQL; empremtes productives **23/23 iguals**, només lectura. No es repeteixen les suites de navegador/Auth 3A.3 perquè no canvia aquest codi. L’Auth real local provat a 3A.3 continua sent real i separat de PGlite; no acredita equips federatius reals.

Pendent: font federativa llegible 2026/27 que lligui cada inscripció amb categoria sènior i tanqui la confirmació de primer equip Rigat; revisió humana del baseline/classificacions i autorització expressa per a qualsevol aplicació posterior. Futura competició europea només documentada, sense calendari ni implementació.

**Resultat: identitats i competicions contrastades al catàleg; sis classificacions independents TARONJA — PENDENT.** Cap desplegament autoritzat o executat.
