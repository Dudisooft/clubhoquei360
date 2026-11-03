# Fase 3A.13 — Comparativa informativa Supabase Free / Pro

Consulta: **01/11/2026**. Sense contractació, canvi de pla, PITR, compute, projecte o configuració productiva. El projecte constava Free a la consulta verificada 3A.12; no s'ha repetit una auditoria productiva per a aquesta comparativa.

## Fonts oficials i supòsits

- [Preus Supabase](https://supabase.com/pricing), consultats en aquesta fase.
- [Compute i crèdits](https://supabase.com/docs/guides/platform/manage-your-usage/compute).
- [Backups, retenció i PITR](https://supabase.com/docs/guides/platform/backups).
- [Facturació, USD i impostos](https://supabase.com/docs/guides/platform/billing-faq).
- [BCE, canvi EUR/USD](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/eurofxref-graph-usd.en.html): **30/10/2026, 1 EUR = 1,1172 USD**, últim dia hàbil abans d'aquesta consulta. Conversió orientativa **EUR = USD / 1,1172**, no una cotització garantida de targeta ni previsió de canvi anual.

Les xifres anuals són dotze mesos a preus/configuració constants, no una oferta. Supabase factura en USD; el proveïdor de pagament pot aplicar canvi/comissions. Imports en euros sense IVA/impostos ni comissions: el tractament depèn del domicili fiscal, identificació i possible inversió del subjecte passiu. No s'assumeix un IVA del 21% per a qualsevol cas.

## Capacitats i límits

| Aspecte | Free | Pro |
|---|---|---|
| Base anunciada | 0 USD/mes | des de 25 USD/mes per organització |
| Compute | recursos Free compartits, subjectes a límits | facturat per hora/projecte; 10 USD/mes de crèdit de compute per organització |
| Micro / Small | no són recursos Pro contractats | 0,01344 / 0,0206 USD/h, aproximadament 10 / 15 USD/mes a 730 h |
| Base de dades | 500 MB per projecte | 8 GB de disc per projecte; excés 0,125 USD/GB |
| Fitxers Storage | 1 GB | 100 GB; excés 0,0213 USD/GB |
| Egress / cached egress | 5 / 5 GB | 250 / 250 GB; excessos 0,09 / 0,03 USD/GB |
| MAU | 50.000 | 100.000; excés 0,00325 USD/MAU |
| Backups gestionats recuperables | no garantits com als plans de pagament; export independent recomanat | diaris, 7 dies de retenció |
| PITR | no inclòs | complement de pagament; mínim compute Small |
| Inactivitat | pausa després d'una setmana; límit publicat de 2 projectes actius | dimensionament/facturació segons recursos; no extrapolar les condicions Free |
| Suport | comunitari | correu; no presumir SLA contractual específic sense revisar-lo |

Les quotes compartides d'ús i les condicions per projecte/organització s'han de revisar al pressupost real; **8 GB de disc són per projecte**, mentre que compute es cobra per instància i el crèdit és de l'organització. L'API sense límit anunciat de peticions no elimina límits de compute, connexions, trànsit o productes addicionals.

## Què inclou realment la base Pro

Amb un únic projecte Micro actiu tot el mes, el crèdit de 10 USD cobreix aproximadament aquell compute i el total orientatiu és **25 USD/mes** si no hi ha excessos/complements. No són 25 USD més qualsevol infraestructura il·limitada.

Fórmula orientativa: **quota Pro + max(0, suma d'hores × tarifa de compute − crèdit de 10 USD) + excessos + complements + impostos**. A 730 hores, Micro és 9,8112 USD i Small 15,038 USD; els arrodoniments comercials de 10/15 són aproximacions. El crèdit no s'acumula ni es repeteix per club/projecte. Compute no està cobert pel Spend Cap segons la documentació, i cada projecte addicional augmenta aquest cost.

Backups diaris no garanteixen zero pèrdua entre dues còpies. Cal revisar les còpies efectivament presents, la retenció/finestra, els permisos per recuperar i una prova de restauració. Una restauració gestionada pot causar indisponibilitat. Els backups físics no són necessàriament descarregables, i la còpia DB no inclou els objectes físics de Storage, secrets o tota la configuració de serveis.

## Escenaris econòmics

| Escenari orientatiu | USD mensuals | USD anuals | EUR anuals orientatius, sense impostos |
|---|---:|---:|---:|
| 1. Free + backup independent | 0 de plataforma, més custòdia/manteniment | 0 de plataforma, més costos propis | 0 de plataforma; costos de continuïtat pendents de pressupost |
| 2. Pro, un projecte Micro, sense excessos | ~25 | ~300 | ~268,53 € |
| 2b. Pro, dos projectes Micro a la mateixa organització | ~35 | ~420 | ~375,94 € |
| 3. Pro, un projecte Small + PITR 7 dies | ~130 | ~1.560 | ~1.396,35 € |

Escenari 1 no significa backup gratuït en termes reals. Cal valorar suport/segon disc o custòdia, xifrat/claus, manteniment, monitoratge i exercicis de recuperació. No s'han imputat hores o costos d'electricitat/hardware desconeguts com si fossin zero o una tarifa acordada. Pressupost necessari: **emmagatzematge/custòdia + hores de manteniment × cost/hora + proves de recuperació**. El treball d'aquesta fase és una validació local fictícia, no un servei de backup productiu ja mantingut.

Escenari 2b usa el preu aproximat de Micro. Amb 730 h exactes de dues instàncies seria aproximadament 34,62 USD abans d'altres càrrecs, no una tarifa plana de 35. L'estimació anual de la taula usa el valor arrodonit i no promet aquella factura.

Escenari 3: Pro25 + Small~15 − crèdit10 + PITR~100 = **~130 USD/mes**. El complement PITR 7 dies és 0,137 USD/h, aproximadament 100 USD/mes per projecte. Retencions 14/28 dies costen aproximadament 200/400 USD/mes de complement, a més de la resta. No s'atribueix PITR al preu Pro base. Una factura real varia amb hores del mes, recursos i ús.

Quan s'habilita PITR, substitueix el procés de backups diaris per recuperació més granular. El proveïdor documenta un RPO tècnic de fins a dos minuts en les condicions descrites; **no és una garantia demostrada per a ClubHoquei360**, perquè no està habilitat ni s'ha provat la seva recuperació. No elimina el temps de restauració, els efectes de secrets/configuració o els requisits de custòdia.

## Diversos clubs

Compartir un projecte amb RLS i separació correcta no crea per si sol una quota de compute nova per cada club. Cal vigilar volum de dades, concurrència, connexions, fitxers i trànsit. La seguretat entre clubs continua depenent del model d'accés, no del pla de pagament.

Separar un projecte per club pot facilitar aïllament, cicle de recuperació i requisits contractuals, però afegeix compute per instància i, si s'escull, PITR per projecte. Els 10 USD de crèdit són únics per organització, no per club. Escollir aquest model requereix dimensionament i justificació; no s'han creat projectes addicionals.

El pilot amb Igualada HC i CP Manresa és un escenari previst. No es declara Manresa configurada a producció: en les fases anteriors les proves multiclub utilitzen dades fictícies.

## Recomanació proporcional

- **Pilot:** Free només és acceptable per proves prescindibles o amb còpies independents reals, recuperables i sota custòdia demostrada. Ara aquestes garanties productives encara falten: el resultat local xifrat no resol el bloqueig. Pro bàsic és una despesa proporcionada si es vol reduir la gestió del backup diari, però encara exigeix revisar configuració, còpies i recuperació.
- **Primers clubs de pagament:** pressupostar almenys Pro i una còpia independent xifrada fora del mateix domini de fallada; acordar objectius de recuperació i responsabilitats. Allotjar no equival a garantir continuïtat.
- **Dades importants irreconstruïbles:** definir quanta pèrdua és acceptable. Si una còpia diària és insuficient, valorar PITR davant d'un cost mínim orientatiu de ~1.396 €/any sense impostos per un projecte Small. No recomanar-lo automàticament sense aquesta necessitat i pressupost.
- **Creixement:** mesurar càrrega i escalar compute/quotes segons evidència. No vendre el pla base com a capacitat il·limitada ni prometre un cost fix per qualsevol nombre de clubs.

**Cap recomanació és una autorització de compra.** No s'ha canviat el pla, compute, PITR ni configuració. Pro no corregeix les 49 concessions TRUNCATE/dos defaults ni publica les set migracions pendents. [Backup productiu: NO EXECUTAT — PENDENT D'AUTORITZACIÓ](PHASE_3A13_ENCRYPTED_BACKUP_VALIDATION.md).
