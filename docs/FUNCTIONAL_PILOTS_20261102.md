# Execució funcional — 02/11/2026

## 1. Què funciona

Demostració local executable a `http://127.0.0.1:4180`: connector RFEP real, importació de document oficial FECAPA, selecció d'equips/partits, convocatòria amb el format de #34, rellotge i registre fictici persistent. Reutilitza parser federatiu, accions, agregats, rellotge i generador de convocatòries existents; cap fusió de #31–#34.

Fonts reals consultades: RFEP, 182 partits de 3575; FECAPA, 300 partits de 4802. SIMAR–Noia **35574, 14/11/2026 20:30, Les Comes**; SIMAR–Vic **35559, 24/10/2026, 1–1**, acta amb 10 jugadors per costat i porters verificats. FEM15 Or: **Vicio PHC Sant Cugat–Igualada HC, 07/11/2026 16:15**, equip 12419, diferent d'Igualada Femení HCP A. Pista FEM15 no publicada al document: pendent; no inventada.

272 proves Node PASS (inclouen regressions SQL/PGlite, clubs/partits/permisos, connector i IndexedDB); comprovació estàtica PASS; build estàtic de 41 fitxers, excloent el laboratori. Després de l'últim ajust de l'adaptador i del bootstrap, 18 proves específiques connector/API reexecutades PASS. Navegador integrat: registre local, recàrrega amb rellotge 02:05, sincronització única, consulta d'entrenador sense escriptura, acta real, còpia exacta del missatge i amplades 390/820/1440 sense desbordament.

## 2. Què es pot provar

Obrir la demostració al mateix portàtil. Seleccionar RFEP o FEM15; triar partit, registrar accions fictícies o generar la convocatòria. El mode «només aquest dispositiu» conserva accions a IndexedDB i les sincronitza després amb la base local persistent PGlite, per club i partit. Accés fictici d'una hora; denegació servidor de permisos creuats/caducats i escriptures d'entrenador. No és Auth productiu ni sincronització entre ordinadors.

## 3. Què continua bloquejat

FECAPA respon 403 al transport Node: no eludit; s'ofereix la darrera importació oficial datada, amb marca de dada anterior. La font s'havia recuperat amb HTTP 200 mitjançant el client HTTP ordinari del portàtil. L'accés a alineacions de menors no s'ha habilitat al laboratori; només jugadors ficticis. No s'ha creat el compte/accessos reals d'Oriol ni s'han publicat canvis. La sessió RFEP pública es descobreix al portal; cap credencial incrustada o publicada.

Chromium automatitzat no arrenca per Crashpad; cinc casos Playwright preparats però no superats. La verificació visual real s'ha fet amb el navegador integrat, sense desactivar el sandbox. Arrencada en fred sense xarxa, vídeo incrustat i sincronització real entre dispositius no acreditats. Publicació productiva continua bloquejada per backup recuperable i revisió de seguretat pendents.

## 4. Següent resultat funcional

Integrar l'adaptador RFEP verificat al flux federatiu existent i preparar el pilot FEM15 autenticat, reutilitzant els permisos de #31/#32. Aplicació productiva només després de desbloquejar les condicions de seguretat i obtenir autorització diferenciada. Mentrestant, el director ja pot provar els tres fluxos al laboratori aïllat.
