# Fase 3A · Matriu d'accés IHC · 2026/27

Inventari real de només lectura del **27/10/2026**: 36 equips presents, sis sèniors, quatre júniors i 26 de base inferior segons la proposta de classificació revisable. Aquesta proposta és configuració pendent de revisió, no una política per ID ni una llista tancada de divisions.

**Estat real:** el catàleg està comprovat; la nova política està provada localment amb usuaris ficticis; la migració/RLS i les 36 classificacions encara **no estan instal·lades**. Producció no té `age_group` informat ni cap `club_membership`; consta un superadministrador habilitat. **Cap permís Auth de producció nou es declara verificat.** No hi ha un compte de coordinador principal per validar-lo realment.

En totes les files, els modes indiquen disponibilitat esportiva **prevista després de revisar/instal·lar el servidor i les metadades**, subjecta als permisos de consulta i registre existents. Administrador de club, coordinador de secció, entrenador i delegat no tenen l'excepció d'Avançat en base inferior. Ni una assignació estadística ni un paràmetre d'URL substitueixen els dos rols privilegiats.

| Categoria | Equip | Competicions del catàleg | Franja proposada | Ordinari | Superadmin | Coordinador principal | Futurs / amb resultat | Contextos Base / fonts vinculades | Estat |
|---|---|---|---|---|---|---|---:|---:|---|
| JÚNIOR | IGUALADA HC C | FECAPA · JÚNIOR OR | junior | Base + Avançat | Base + Avançat | Base + Avançat | 8 / 4 | 0 / 0 | Catàleg verificat; Auth pendent |
| JÚNIOR | IGUALADA HC D | FECAPA · JÚNIOR OR | junior | Base + Avançat | Base + Avançat | Base + Avançat | 7 / 5 | 0 / 0 | Catàleg verificat; Auth pendent |
| JUVENIL | IGUALADA HC E | FECAPA · JUVENIL PLATA | youth | Base | Base + Avançat | Base + Avançat | 9 / 4 | 0 / 0 | Catàleg verificat; Auth pendent |
| ALEVÍ | IGUALADA HC C | FECAPA · ALEVÍ OR | youth | Base | Base + Avançat | Base + Avançat | 8 / 4 | 0 / 0 | Catàleg verificat; Auth pendent |
| BENJAMÍ | IGUALADA HC A | FECAPA · BENJAMÍ OR BARCELONA | youth | Base | Base + Avançat | Base + Avançat | 9 / 5 | 0 / 0 | Catàleg verificat; Auth pendent |
| FEM 11 | IGUALADA HC | FECAPA · FEM 11 OR | youth | Base | Base + Avançat | Base + Avançat | 9 / 4 | 0 / 0 | Catàleg verificat; Auth pendent |
| JUVENIL | IGUALADA HC A | FECAPA · JUVENIL OR | youth | Base | Base + Avançat | Base + Avançat | 7 / 5 | 0 / 0 | Catàleg verificat; Auth pendent |
| INFANTIL | IGUALADA HC F | FECAPA · INFANTIL PLATA | youth | Base | Base + Avançat | Base + Avançat | 8 / 5 | 0 / 0 | Catàleg verificat; Auth pendent |
| TERCERA CATALANA MASCULINA | IGUALADA HC B | FECAPA · TERCERA CATALANA MASCULINA  | senior | Base + Avançat | Base + Avançat | Base + Avançat | 21 / 3 | 0 / 0 | Catàleg verificat; Auth pendent |
| BENJAMÍ | IGUALADA HC B | FECAPA · BENJAMÍ OR BARCELONA | youth | Base | Base + Avançat | Base + Avançat | 9 / 5 | 0 / 0 | Catàleg verificat; Auth pendent |
| ALEVÍ | IGUALADA HC D | FECAPA · ALEVÍ PLATA | youth | Base | Base + Avançat | Base + Avançat | 7 / 5 | 0 / 0 | Catàleg verificat; Auth pendent |
| PREBENJAMI | IGUALADA HC A | FECAPA · PREBENJAMI OR BARCELONA | youth | Base | Base + Avançat | Base + Avançat | 7 / 5 | 0 / 0 | Catàleg verificat; Auth pendent |
| INFANTIL | IGUALADA HC E | FECAPA · INFANTIL OR | youth | Base | Base + Avançat | Base + Avançat | 7 / 5 | 0 / 0 | Catàleg verificat; Auth pendent |
| JUVENIL | IGUALADA HC B | FECAPA · JUVENIL OR | youth | Base | Base + Avançat | Base + Avançat | 9 / 5 | 0 / 0 | Catàleg verificat; Auth pendent |
| INFANTIL | IGUALADA HC D | FECAPA · INFANTIL OR | youth | Base | Base + Avançat | Base + Avançat | 8 / 4 | 1 / 0 | Catàleg verificat; Auth pendent |
| JÚNIOR | IGUALADA HC B | FECAPA · JÚNIOR OR | junior | Base + Avançat | Base + Avançat | Base + Avançat | 8 / 4 | 0 / 0 | Catàleg verificat; Auth pendent |
| ALEVÍ | IGUALADA HC A | FECAPA · ALEVÍ OR | youth | Base | Base + Avançat | Base + Avançat | 7 / 5 | 0 / 0 | Catàleg verificat; Auth pendent |
| PREBENJAMI INICIACIO | IGUALADA HC A | FECAPA · PREBENJAMI INICIACIO BARCELONA | youth | Base | Base + Avançat | Base + Avançat | 9 / 5 | 0 / 0 | Catàleg verificat; Auth pendent |
| FEM 13 | IGUALADA HC | FECAPA · FEM 13 OR | youth | Base | Base + Avançat | Base + Avançat | 16 / 4 | 0 / 0 | Catàleg verificat; Auth pendent |
| PREBENJAMI INICIACIO | IGUALADA HC B | FECAPA · PREBENJAMI INICIACIO BARCELONA | youth | Base | Base + Avançat | Base + Avançat | 8 / 4 | 0 / 0 | Catàleg verificat; Auth pendent |
| SEGONA CATALANA MASCULINA | IGUALADA HC | FECAPA · SEGONA CATALANA MASCULINA | senior | Base + Avançat | Base + Avançat | Base + Avançat | 19 / 5 | 0 / 0 | Catàleg verificat; Auth pendent |
| FEM15 | Igualada HC · FEM15 | FECAPA · FEM 15 OR | youth | Base | Base + Avançat | Base + Avançat | 19 / 5 | 0 / 0 | Catàleg verificat; Auth pendent |
| BENJAMÍ | IGUALADA HC C | FECAPA · BENJAMÍ OR BARCELONA | youth | Base | Base + Avançat | Base + Avançat | 8 / 4 | 0 / 0 | Catàleg verificat; Auth pendent |
| INFANTIL | IGUALADA HC A | FECAPA · INFANTIL OR | youth | Base | Base + Avançat | Base + Avançat | 9 / 5 | 0 / 0 | Catàleg verificat; Auth pendent |
| NACIONAL CATALANA MASCULINA | IGUALADA HC | FECAPA · NACIONAL CATALANA MASCULINA | senior | Base + Avançat | Base + Avançat | Base + Avançat | 25 / 5 | 0 / 0 | Catàleg verificat; Auth pendent |
| JUVENIL | IGUALADA HC C | FECAPA · JUVENIL OR | youth | Base | Base + Avançat | Base + Avançat | 12 / 4 | 0 / 0 | Catàleg verificat; Auth pendent |
| SÈNIOR · primer equip | IGUALADA RIGAT HC | FECAPA · FRIT RAVICH LLIGA CATALANA<br>RFEP · OK LIGA MASCULINA<br>RFEP · SUPERCOPA DE ESPAÑA MASCULINA | senior | Base + Avançat | Base + Avançat | Base + Avançat | 23 / 6 | 0 / 0 | Catàleg verificat; Auth pendent |
| INFANTIL | IGUALADA HC B | FECAPA · INFANTIL OR | youth | Base | Base + Avançat | Base + Avançat | 9 / 5 | 0 / 0 | Catàleg verificat; Auth pendent |
| INFANTIL | IGUALADA HC C | FECAPA · INFANTIL OR | youth | Base | Base + Avançat | Base + Avançat | 9 / 5 | 0 / 0 | Catàleg verificat; Auth pendent |
| BENJAMÍ | IGUALADA HC D | FECAPA · BENJAMÍ PLATA BARCELONA | youth | Base | Base + Avançat | Base + Avançat | 9 / 3 | 0 / 0 | Catàleg verificat; Auth pendent |
| JÚNIOR | IGUALADA HC A | FECAPA · JÚNIOR OR | junior | Base + Avançat | Base + Avançat | Base + Avançat | 9 / 3 | 0 / 0 | Catàleg verificat; Auth pendent |
| ALEVÍ | IGUALADA HC B | FECAPA · ALEVÍ OR | youth | Base | Base + Avançat | Base + Avançat | 9 / 5 | 0 / 0 | Catàleg verificat; Auth pendent |
| TERCERA CATALANA MASCULINA | IGUALADA HC A | FECAPA · TERCERA CATALANA MASCULINA  | senior | Base + Avançat | Base + Avançat | Base + Avançat | 20 / 4 | 0 / 0 | Catàleg verificat; Auth pendent |
| JUVENIL | IGUALADA HC D | FECAPA · JUVENIL OR | youth | Base | Base + Avançat | Base + Avançat | 8 / 4 | 0 / 0 | Catàleg verificat; Auth pendent |
| OK LIGA | SIMAR IGUALADA HC | RFEP · OK LIGA PLATA SUR | senior | Base + Avançat | Base + Avançat | Base + Avançat | 19 / 5 | 0 / 1 | Catàleg verificat; Auth pendent |
| PREBENJAMI | IGUALADA HC B | FECAPA ·  PREBENJAMI PLATA BARCELONA  | youth | Base | Base + Avançat | Base + Avançat | 8 / 5 | 0 / 0 | Catàleg verificat; Auth pendent |

## Comportament comú a tots els equips

- Futur: consulta del calendari sense escriptures; activació explícita només si el servidor la permet. La data futura no denega el mode.
- En curs/disputat: recupera el context i els registres existents sense crear-ne un altre ni desar un rellotge en obrir. Els pendents requereixen recuperació explícita abans de tornar-los a enviar.
- Finalitzat: conserva el tancament oficial. Es pot consultar l'existent; una anàlisi nova separada necessita una acció explícita autoritzada. No es reobre ni modifica l'acta.
- Consulta: no exigeix context operatiu. Registre: exigeix autenticació, categoria/rol vàlids i permisos operatius; l'activació és idempotent. Un context Base existent pot requerir completar explícitament el context estadístic per a Avançat, mantenint el mateix ID i incidències.
- Contextos comptats: només enllaços canònics de catàleg. El recompte no inclou necessàriament tots els històrics o pilots sense aquest enllaç. «Amb resultat» no certifica estat en curs ni tancament formal.

## Absències i límits

FEM9, FEM17, Primera Catalana sènior i equips sèniors femenins no apareixen com a equips diferenciats en aquest inventari. Això **no prova que no existeixin a la federació**. El suport genèric a sènior femení i divisions desconegudes es comprova amb fixtures explícitament fictícies, no amb dades reals inventades.

La matriu no certifica edats/regles de reforços ni modifica la selecció de jugadors de PR #29/#30. No conté noms de jugadors ni credencials. Les proves del frontend simulen només el contracte d'accés; la denegació a nivell de dades es verifica independentment en PostgreSQL/PGlite a la PR de servidor.

[Evidència JSON](match-mode-matrix-20261027.json) · [Informe i guia visual](match-mode-access.md). Consultes reproduïbles a `scripts/inspect-match-mode-catalogue.sql` i `scripts/inspect-match-mode-integrity.sql`.


Integritat real: **12 conjunts comparats, zero canvis** en recomptes/empremtes abans i després de les proves. Inclou 348 incidències oficials/Base, 6 estats oficials, 3 esdeveniments estadístics, 1 sessió, 3 assignacions, membres, jugadors, contextos, calendari, plantilles i equips. No s’han escrit dades de producció. Les empremtes agregades consten al JSON; no s’exporten identitats personals.
