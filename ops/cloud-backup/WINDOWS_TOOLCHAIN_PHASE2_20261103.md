# Fase2 · eines Windows, 03/11/2026

Equip destinatari: **DESKTOP-FHG96HG**. Destí privat **D:\ClubHoquei360\Backups**, verificat segons la comunicació del responsable. Aquesta fase no autoritza exportar producció, generar claus productives, modificar Supabase o publicar PR#35.

## Abast executat i bloqueig

L'executor accessible continua sent el contenidor Linux3d837bbf7dd8, sense PowerShell, muntatgeD:, connector d'execució al PC, VPN o accés TCP privat. No s'ha instal·lat ni executat cap eina al sobretaula. La verificació comunicada del directori no s'ha contradit ni presentat com una comprovació feta des d'aquest contenidor.

S'han identificat les fonts oficials i descarregat/verificat **només al workspace Linux** un ZIP Windows d'age. L'arxiu queda a work/windows-tools ignorat per Git, mode0600, directori0700. No hi ha executables, claus o paquets binaris al commit.

## Fonts i verificacions

| Eina | Font | Estat |
| --- | --- | --- |
| PostgreSQL17.11 Windows | postgresql.org/download/windows → EDB/download-postgresql-binaries | Pàgina oficial confirma ZIP sense instal·lador i versió17.11. No s'ha recuperat l'arxiu concret ni un hash/signatura del paquet; verificació binària pendent |
| age1.3.2 Windows amd64 | Release oficial FiloSottile/age a GitHub | ZIP descarregat, SHA256 igual al digest oficial de l'asset; integritat ZIP i capçalera PE x64 comprovades. No executat a Windows |
| age-keygen1.3.2 Windows amd64 | Mateix ZIP oficial | Exe present i hash enregistrat; no executat i cap clau generada |
| age ARM64 | Mateixa release oficial | Asset/digest disponibles, però arquitectura del sobretaula encara no comprovada per aquest executor; no s'instal·la x64 assumint-la |

ZIP age-v1.3.2-windows-amd64.zip,20250704bytes:

`f48d8f8f9ebe903ab5027ed067652f2cc1db94bc206976430133b905dcd8e8c7`

Hashes dels membres verificats contra el ZIP que coincideix amb el digest:

- age.exe: `2821a4ed191da07372acd302e5f6feae7a7985e285e1417765ebe74025af45f0`.
- age-keygen.exe: `1549c7049be32695594bedd09bbd352a94b6013a9d5c43364f3c6cd7a09ab61c`.

El hash acredita coincidència amb l'asset de la release servit pel canal GitHub, no una verificació independent de signatura del productor. Hi ha fitxers Sigsum.proof i instruccions oficials de verificació; **Sigsum i Authenticode no s'han verificat** en aquesta execució. No es presenten com a superades. No s'ha instal·lat Go ni eines addicionals només per obtenir un verd.

La lectura HTML directa d'EDB ha retornat HTTP403; el visor web ha permès confirmar la pàgina oficial. No s'ha atribuït la causa ni eludit la restricció. No s'ha endevinat una URL de ZIP o checksum ni usat un mirror desconegut.

## Preparació local autoritzada, quan existeixi l'accés real

1. Confirmar COMPUTERNAME=DESKTOP-FHG96HG i arquitectura. Reutilitzar la comprovació privada deD: i revalidar només permisos necessaris a les carpetes d'eines/temporals. No canviar ACL de directoris existents sense inspecció d'impacte; cap fitxer o clau existent es pot sobreescriure.
2. Preferir eines existents legítimes que compleixin les versions. Si falten, preparar una carpeta versionada nova per a binaris portables, sense PATH global, serveis, pgAdmin o StackBuilder. Obtenir PostgreSQL17 del ZIP d'EDB enllaçat pel projecte; conservar les DLL/fitxers de suport i llicències exigits. No executar un instal·lador complet per obtenir tres clients.
3. Abans d'executar, comprovar hash publicat o signatura Authenticode i cadena/editor dels paquets PostgreSQL disponibles. Un hash calculat localment sense referència no prova procedència. Si falta una garantia suficient, aturar aquella instal·lació. Per age, verificar el ZIP i els dos membres contra els hashes anteriors; no instal·lar els plugins que no calen per X25519.
4. Comprovar per ruta absoluta psql,pg_dump,pg_restore --version i age/age-keygen --version, sense connexió SQL. PostgreSQL17.11 és l'objectiu que coincideix amb Cloud; no declarar la versió instal·lada a partir del nom del ZIP. Registrar només versions/estat, no secrets o dades personals.
5. Si hi ha DLL/runtime absent, manca de permisos, elevació administrativa o un canvi de sistema necessari, **informar abans d'executar-lo**. No instal·lar Visual C++, Docker o WSL preventivament; no rebaixar controls de Windows/antivirus o política d'execució.
6. Proves age en un directori nou UUID privat: fitxer amb text FICTICI, parell de claus de prova, recipient UTF8 correcte, encrypt/decrypt amb fitxers -o nous i comparació SHA256 del plaintext. No usar pipelines binàries d'un shell sense qualificar-les. Cap contrasenya o clau a argv/log/xat.
7. Recuperació només fictícia: segon parell de prova en carpeta separada, escrow xifrat de la primera identitat, recuperació a un fitxer nou i desxifrat de la còpia fictícia amb la clau recuperada. No esborreu l'original per simular pèrdua: es pot excloure explícitament del procés de recuperació. No anomenar aquestes dues carpetes custòdia física independent ni claus productives.

## Restauració fictícia sense servei permanent

**Sí, PostgreSQL admet un clúster temporal iniciat amb initdb i pg_ctl start i aturat amb pg_ctl stop, sense pg_ctl register.** La possibilitat està documentada; no s'ha executat al sobretaula.

Qualificació prevista: mateix binari17 verificat, directori nou privat i dades inventades, cap reutilització de clúster existent, port local lliure escollit després de consultar-lo, listen_addresses=127.0.0.1 i autenticació SCRAM amb credencial exclusivament fictícia per fitxer privat. No servei de Windows, inici automàtic, Docker, WSL, obertura de firewall o vinculació a0.0.0.0.

El procés fill ha d'ignorar perfils productius: entorn libpq separat, host/port/db/user locals explícits i psql -X per no carregar .psqlrc. Verificar identitat del servidor abans de DDL. Usar pg_restore --exit-on-error --single-transaction només sobre el clúster fictici, comparar esquema/dades/FK/RLS i aturar el procés exacte per directori amb pg_ctl; no aturar serveis o processos aliens.

El PostgreSQL portable genèric permet aquesta prova SQL, però no acredita el baseline complet de Supabase ni totes les seves extensions/Auth. No es confon una restauració fictícia amb una còpia Cloud real recuperable. Cap ordre d'aquesta secció s'ha executat a Windows.

## Connexió futura SQL/TLS

Es conserva pg_service.conf.example: host directe o session pooler5432 verificat al Dashboard, sslmode=verify-full i CA legítima, servei de lectura i credencials només en fitxer privat amb ACL Windows. No usar service_role com a contrasenya SQL, transaction pooler6543, sslmode=disable, credencials en URL/argv o valors productius en aquesta fase. No s'ha provat una connexió productiva ni llegit un secret per preparar-ho.

## Resultat

VERIFICAT: fonts oficials, integritat del ZIP age Windowsx64 i hashes dels seus dos executables; paquets documentats sense instal·lador permanent. PENDENT: accés al sobretaula, arquitectura, paquet PostgreSQL/hash o signatura, execució/versions locals, ACL i totes les proves Windows. No s'han repetit proves Linux per presentar-les com a Windows. Cap canvi productiu, servei permanent, exportació, clau productiva o compra.

Fonts: [PostgreSQL Windows](https://www.postgresql.org/download/windows/), [EDB ZIP](https://www.enterprisedb.com/download-postgresql-binaries), [age1.3.2](https://github.com/FiloSottile/age/releases/tag/v1.3.2), [Sigsum](https://github.com/FiloSottile/age/blob/v1.3.2/SIGSUM.md), [initdb17](https://www.postgresql.org/docs/17/app-initdb.html), [pg_ctl17](https://www.postgresql.org/docs/17/app-pg-ctl.html).
