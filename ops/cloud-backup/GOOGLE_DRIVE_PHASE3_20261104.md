# Fase 3 · segona custòdia a Google Drive · 04/11/2026

Revisats RUNBOOK.md, DESKTOP_D_PREPARATION.md i WINDOWS_TOOLCHAIN_PHASE2_20261103.md. Les proves Windows de la fase 2 consten com a superades en el resultat posterior aportat pel responsable. No s'han repetit. Aquesta sessió executa Linux al núvol i no té accés verificat a DESKTOP-FHG96HG ni a D:.

## Drive

S'ha creat ClubHoquei360 a l'arrel de My Drive amb les subcarpetes Backups xifrats i Verificacions. La lectura posterior de les tres carpetes confirma shared=false i un únic permís de tipus user i rol owner, corresponent al compte habitual aprovat. No hi ha permisos per a tercers ni accés públic. No s'han modificat permisos. La captura disponible indica 13,01 GB de 15 GB ocupats i uns 1,99 GB lliures. La quota actual no s'ha pogut verificar amb el connector disponible.

## Prova fictícia pendent

No s'ha generat ni transferit cap arxiu. Pujada, descàrrega, SHA-256 i recuperació independents pendents. No s'ha acreditat cap limitació de fidelitat binària perquè encara no s'ha executat la transferència.

1. Al sobretaula, verificar host, ACL del directori de prova i quota actual al compte aprovat. Crear un directori privat únic fora de qualsevol sincronització. Amb les eines portables ja verificades, generar una identitat exclusivament fictícia i xifrar un fitxer de text inventat amb age. Registrar mida, SHA-256 del text i del ciphertext amb Get-FileHash -Algorithm SHA256.
2. Pujar únicament el fitxer .age amb nom únic a Backups xifrats. Confirmar permís exclusiu del propietari i descarregar els bytes originals a un directori temporal privat i separat.
3. Comparar el SHA-256 descarregat amb el registrat. Aïllar el directori original del procés de recuperació, sense esborrar-lo. Recuperar només amb el fitxer descarregat i la identitat fictícia disponible per la via de recuperació. Comprovar sortida correcta d'age i SHA-256 del text recuperat.
4. Registrar data, versions, mida, hashes, ubicació lògica i estat de cada pas, sense identitats ni secrets. Si l'eina converteix els bytes o no ofereix una descàrrega binària verificable, aturar i registrar l'error.

## Retenció i verificacions

Proposta inicial del runbook: 14 dies i almenys tres grups complets, amb una restauració verificada. Amb la xifra orientativa actual, reservar almenys 1 GB per al compte i limitar inicialment el projecte a 900 MB, reduint el pressupost si la quota real és inferior. Abans de cada pujada comprovar la quota i la mida total del grup, inclòs el manifest xifrat. Si tres grups no hi caben, escalar la decisió de capacitat o destí. Sense neteja automàtica ni sobreescriptures. Verificar tots els hashes del grup després de descarregar-lo, autenticar el desxifrat complet i provar la restauració en un entorn aïllat. PostgreSQL genèric només acredita la prova SQL. Cal validar separadament el baseline Supabase, les extensions, Auth i Storage, inclosos els objectes si formen part de l'abast.

## Custòdia de claus

El responsable ha de designar el custodi titular, el suplent i els suports. Proposta: identitat operativa en un gestor segur o suport xifrat fora de D: i de Drive. Custodiar-ne una còpia xifrada en un segon suport físic desconnectat i en una altra ubicació, amb el factor de recuperació separat del suport. Documentar accés, responsables i rotació sense valors secrets. Provar primer amb identitats fictícies i fer un simulacre de recuperació amb el suplent, partint només de la segona custòdia. En una fase futura autoritzada, verificar la recuperació de la identitat productiva abans de confiar-li cap còpia. Git només conté el procediment i evidències sense secrets.

Fase 3 parcial. Sense exportació productiva, claus productives, canvis a Supabase, compres ni canvis a PR #35. La prova pendent requereix execució al sobretaula i lectura de quota real al Drive habitual.
