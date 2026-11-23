# Preparació al sobretaula · decisió definitiva 03/11/2026

Destinació principal aprovada: **ordinador de sobretaula, D:\ClubHoquei360\Backups**. Substitueix el portàtil. No s'autoritza una exportació productiva ni restaurar dades reals.

Actualització del responsable per a Fase2: equip **DESKTOP-FHG96HG** i destinació privada ja verificada segons la seva comunicació. Les comprovacions no fetes des d'aquest executor que consten més avall són històriques; no neguen aquella verificació local. [Eines Windows i estat Fase2](WINDOWS_TOOLCHAIN_PHASE2_20261103.md).

## Resultat comprovat en aquesta execució

L'únic executor disponible és Linux al núvol, /workspace. No hi ha muntatgeD:, /mnt/d o /media/d; tampoc un executor Windows/PowerShell, connexió remota al sobretaula, VPN o grants TCP privats configurats. La disponibilitat de GitHub i del repositori no implica accés al disc del sobretaula.

| Requisit del sobretaula | Estat |
| --- | --- |
| Espai i salut de D: | No verificables des d'aquest executor |
| Sistema de fitxers i ACL privades | No verificats |
| D:\ClubHoquei360\Backups | No s'ha creat ni modificat |
| PostgreSQL17,pg_dump,pg_restore,psql,age | Instal·lació al sobretaula no verificada |
| Connexió SQL/TLS Supabase del sobretaula | No verificada; requisits conservats al RUNBOOK |
| Segon suport físic i custòdia separada | No identificats ni acreditats |
| Restauració fictícia al sobretaula | No executada |

No s'han presentat els22GiB del workspace Linux com a espai lliure de D: ni les seves eines com a instal·lacions Windows. No s'ha creat una carpeta amb un nom semblant a D: dins de Linux. Les proves anteriors fictícies continuen vàlides només per a l'entorn on es van executar.

## Represa en un executor amb accés local al sobretaula

L'autorització per a la preparació ja existeix; no cal tornar-la a demanar. Primer comprovar la identitat de l'equip i l'existència de D:. Si no és el sobretaula real, aturar-se, sense rutes de substitució.

1. Consultar Get-Volume -DriveLetter D i el disc físic associat amb Get-Partition/Get-Disk: espai, format, salut, estat d'escriptura i correspondència amb el suport real. No executar reparacions, format, xifratge del volum o canvis de partició. La reserva orientativa del runbook és1GiB per a la mida actual, més eines/restore i marge; recalcular abans de dades reals.
2. Comprovar que la ruta no està dins de Git, que no és una redirecció/junction inesperada i que el suport permet permisos privats verificables. Si la carpeta ja existeix, inventari i ACL només de lectura: no eliminar fitxers ni substituir ACL sense revisar-ne l'impacte. Si és nova, crear-la amb accés restringit al propietari i comptes administratius locals necessaris, i comprovar permisos efectius. Una carpeta a D: no és privada pel simple nom.
3. Localitzar i verificar les versions reals de PostgreSQL17,pg_dump,pg_restore,psql,age i age-keygen. No instal·lar ni contractar components per donar-los per disponibles. Qualificar el camí d'execució Windows/WSL/Docker amb proves fictícies; les guardes Linux del motor existent no es poden donar per equivalents a ACL Windows.
4. Mantenir els requisits SQL/TLS ja preparats: host i usuari del Dashboard, connexió directa o session pooler5432, verificació TLS, perfils de credencials privats. No llegir/exportar dades productives, invocar importadors o canviar Supabase. No posar contrasenyes en ordres, logs o xat.
5. Enumerar suports connectats amb lectures del sistema i comprovar que la segona còpia correspon a un **altre suport físic** autoritzat. Una altra carpeta o partició del mateix disc no acredita independència. No usar un núvol o suport aliè sense autorització.
6. Definir la custòdia de claus fora de la carpeta de còpies i una recuperació independent. No generar una clau productiva només en aquest workspace efímer ni donar dues carpetes del mateix disc per custòdia independent. Les claus fictícies no són claus productives.
7. Verificar un destí de restauració separat, sense connexions productives, sortida exterior, correus, webhooks o planificadors. PostgreSQL17 genèric no acredita les extensions/esquemes gestionats de Supabase; conservar les portes de compatibilitat del RUNBOOK.
8. Executar únicament proves amb dades fictícies: xifratge, integritat, recuperació de clau, restauració, permisos i preservació dels fitxers existents. No reutilitzar automàticament una pipeline binària escrita per Bash en un shell Windows sense qualificar-la. No eliminar ni sobreescriure còpies, configuracions o claus existents.

## Bloqueig i límit

Falta un executor amb accés **efectiu** al sobretaula i D:. No és falta d'autorització del responsable: la preparació local ja està autoritzada, però l'accés tècnic no existeix aquí. La represa ha de fer-se en aquell entorn o amb una connexió segura realment configurada; no s'han obert ports ni instal·lat serveis remots.

**Backup productiu no executat ni completat.** L'autorització posterior d'exportació/restore reals segueix pendent. PR#35,main,Supabase,permisos/migracions i Pages no s'han modificat.
