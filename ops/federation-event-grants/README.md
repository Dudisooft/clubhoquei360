# Permisos del registre d’incidències oficials

La RPC existent de commit d’actes s’executa amb els permisos del caller.
El rol de servei pot invocar-la, però li falten els permisos de lectura i
inserció a la taula d’incidències oficials. El commit complet es reverteix
quan la inserció falla.

## Posada en servei i recuperació

1. Obtenir l’autorització específica, pausar la planificació i verificar la
   restauració de la còpia en un entorn separat amb PostgreSQL compatible.
2. Comprovar la definició de la RPC, els ACL i RLS. Comparar les empremtes
   dels registres operatius i oficials abans de la prova. Verificar en un
   assaig aïllat que el rol de servei pot desar la mateixa acta dues vegades
   i que un client autenticat continua sense poder executar la RPC.
3. Aplicar apply.sql només si la configuració coincideix amb la verificada.
   El script falla si els permisos de servei o de client han canviat.
4. En cas d’incidència, pausar la planificació i executar revert.sql només
   si apply.sql ha introduït aquests dos permisos a partir de l’estat
   verificat. La revocació és independent de les dades. Si una importació
   ja les ha modificat, comparar les empremtes i restaurar només les files
   afectades amb el procediment de recuperació aprovat.
