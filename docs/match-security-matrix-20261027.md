> Actualització 3A.4: [matriu i fonts actuals](SENIOR_FEDERATION_REVIEW_3A4_2026-10-28.md). Els sis sèniors queden pendents de prova independent i amb SQL desactivat; 6/4/26 continua sent proposta. Auth real local completada a 3A.3, sense certificar dades federatives reals. El contingut següent conserva el checkpoint 3A.2.

# Matriu final 3A.2 · IHC 2026/27

36 equips i 38 inscripcions del catàleg real rellegits en només lectura. Coincideixen ID, club, temporada i categoria amb la proposta. **6 senior, 4 junior i 26 youth són propostes; no estan aplicades.** 31 equips tenen una categoria d’edat explícita al catàleg; cinc propostes sènior només disposen de divisió i queden pendents d’evidència independent. `verification_status=verified` certifica l’estat d’importació, no aprova la franja.

Les fonts federatives directes han retornat CONNECT 403. No es declara una nova verificació web de temporada ni la completesa federativa del club. FEM9/FEM17, sèniors femenins i Primera Catalana sènior no apareixen en aquest inventari. SIMAR consta a **OK LIGA PLATA SUR, 3575**, no a OK LIGA MASCULINA 3568 (Rigat); no es canvien noms o inscripcions per adaptar-los al relat anterior.

Modes de la taula: política prevista després de revisar metadades, sempre subjecta als permisos operatius. Ara no hi ha `age_group` a producció. **Desconegut → Base, sense Avançat ordinari.** L’operador temporal manté el Base que ja tingués i només obté Avançat al partit/termini autoritzat. Un rol visual no concedeix res.

En tots els equips: futur/disputat consultable amb permís, sense escriure; el registre exigeix context existent o activació explícita autoritzada i assignació estadística. Finalitzats conserven el tancament i exigeixen anàlisi separada quan correspongui. Superadmin habilitat i coordinador principal de club tenen excepció esportiva; això no inventa convocatòries ni assignacions. Auth real pendent en totes les files.

| Equip / categoria | Competicions | Franja proposta | Ordinari | Superadmin / principal | Calendari / contextos | Evidència d’edat |
|---|---|---|---|---|---:|---|
| IGUALADA HC C · JÚNIOR | FECAPA 4782 · JÚNIOR OR | junior | Base + Avançat | Base + Avançat | 12 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC D · JÚNIOR | FECAPA 4782 · JÚNIOR OR | junior | Base + Avançat | Base + Avançat | 12 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC E · JUVENIL | FECAPA 4785 · JUVENIL PLATA | youth | Base | Base + Avançat | 13 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC C · ALEVÍ | FECAPA 4789 · ALEVÍ OR | youth | Base | Base + Avançat | 12 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC A · BENJAMÍ | FECAPA 4810 · BENJAMÍ OR BARCELONA | youth | Base | Base + Avançat | 14 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC · FEM 11 | FECAPA 4806 · FEM 11 OR | youth | Base | Base + Avançat | 13 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC A · JUVENIL | FECAPA 4784 · JUVENIL OR | youth | Base | Base + Avançat | 12 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC F · INFANTIL | FECAPA 4787 · INFANTIL PLATA | youth | Base | Base + Avançat | 13 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC B · TERCERA CATALANA MASCULINA | FECAPA 4781 · TERCERA CATALANA MASCULINA | senior | Base (Avançat pendent de franja) | Base + Avançat | 24 / 0 | PENDENT · només divisió; SQL desactivat |
| IGUALADA HC B · BENJAMÍ | FECAPA 4810 · BENJAMÍ OR BARCELONA | youth | Base | Base + Avançat | 14 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC D · ALEVÍ | FECAPA 4790 · ALEVÍ PLATA | youth | Base | Base + Avançat | 12 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC A · PREBENJAMI | FECAPA 4813 · PREBENJAMI OR BARCELONA | youth | Base | Base + Avançat | 12 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC E · INFANTIL | FECAPA 4786 · INFANTIL OR | youth | Base | Base + Avançat | 12 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC B · JUVENIL | FECAPA 4784 · JUVENIL OR | youth | Base | Base + Avançat | 14 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC D · INFANTIL | FECAPA 4786 · INFANTIL OR | youth | Base | Base + Avançat | 12 / 1 | Categoria explícita · revisió humana pendent |
| IGUALADA HC B · JÚNIOR | FECAPA 4782 · JÚNIOR OR | junior | Base + Avançat | Base + Avançat | 12 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC A · ALEVÍ | FECAPA 4789 · ALEVÍ OR | youth | Base | Base + Avançat | 12 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC A · PREBENJAMI INICIACIO | FECAPA 4816 · PREBENJAMI INICIACIO BARCELONA | youth | Base | Base + Avançat | 14 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC · FEM 13 | FECAPA 4804 · FEM 13 OR | youth | Base | Base + Avançat | 20 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC B · PREBENJAMI INICIACIO | FECAPA 4816 · PREBENJAMI INICIACIO BARCELONA | youth | Base | Base + Avançat | 12 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC · SEGONA CATALANA MASCULINA | FECAPA 4779 · SEGONA CATALANA MASCULINA | senior | Base (Avançat pendent de franja) | Base + Avançat | 24 / 0 | PENDENT · només divisió; SQL desactivat |
| Igualada HC · FEM15 · FEM15 | FECAPA 4802 · FEM 15 OR | youth | Base | Base + Avançat | 24 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC C · BENJAMÍ | FECAPA 4810 · BENJAMÍ OR BARCELONA | youth | Base | Base + Avançat | 12 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC A · INFANTIL | FECAPA 4786 · INFANTIL OR | youth | Base | Base + Avançat | 14 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC · NACIONAL CATALANA MASCULINA | FECAPA 4774 · NACIONAL CATALANA MASCULINA | senior | Base (Avançat pendent de franja) | Base + Avançat | 30 / 0 | PENDENT · només divisió; SQL desactivat |
| IGUALADA HC C · JUVENIL | FECAPA 4784 · JUVENIL OR | youth | Base | Base + Avançat | 16 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA RIGAT HC · SÈNIOR · primer equip | RFEP 3568 · OK LIGA MASCULINA; RFEP 3592 · SUPERCOPA DE ESPAÑA MASCULINA; FECAPA 4858 · FRIT RAVICH LLIGA CATALANA | senior | Base + Avançat | Base + Avançat | 32 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC B · INFANTIL | FECAPA 4786 · INFANTIL OR | youth | Base | Base + Avançat | 14 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC C · INFANTIL | FECAPA 4786 · INFANTIL OR | youth | Base | Base + Avançat | 14 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC D · BENJAMÍ | FECAPA 4811 · BENJAMÍ PLATA BARCELONA | youth | Base | Base + Avançat | 12 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC A · JÚNIOR | FECAPA 4782 · JÚNIOR OR | junior | Base + Avançat | Base + Avançat | 12 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC B · ALEVÍ | FECAPA 4789 · ALEVÍ OR | youth | Base | Base + Avançat | 14 / 0 | Categoria explícita · revisió humana pendent |
| IGUALADA HC A · TERCERA CATALANA MASCULINA | FECAPA 4781 · TERCERA CATALANA MASCULINA | senior | Base (Avançat pendent de franja) | Base + Avançat | 24 / 0 | PENDENT · només divisió; SQL desactivat |
| IGUALADA HC D · JUVENIL | FECAPA 4784 · JUVENIL OR | youth | Base | Base + Avançat | 12 / 0 | Categoria explícita · revisió humana pendent |
| SIMAR IGUALADA HC · OK LIGA | RFEP 3575 · OK LIGA PLATA SUR | senior | Base (Avançat pendent de franja) | Base + Avançat | 26 / 0 | PENDENT · només divisió; SQL desactivat |
| IGUALADA HC B · PREBENJAMI | FECAPA 4814 · PREBENJAMI PLATA BARCELONA | youth | Base | Base + Avançat | 13 / 0 | Categoria explícita · revisió humana pendent |

Els cinc sèniors pendents són SIMAR, Nacional Catalana, Segona Catalana i Tercera Catalana A/B. Els seus UPDATE queden comentats a `prepare-reviewed-age-groups.sql`. La resta d’UPDATE exigeixen revisió explícita i el script acaba en ROLLBACK, provat localment. Cal evidència d’edat independent abans d’habilitar aquests cinc equips com a sènior; no s’utilitza una llista de divisions dins de RLS.

La matriu de 3A es conserva com a antecedent. Aquesta és la precisió d’evidència de 3A.2 i preval sobre qualsevol lectura de «catàleg verificat» com a validació Auth o aprovació de metadades.
