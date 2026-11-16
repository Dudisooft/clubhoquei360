# Assaig de reconciliació dels codis d’acta

La consulta pública i el reconciliador JavaScript proposen una fila
provisional quan coincideixen competició, grup, jornada i equips. Guarda
amb cada proposta el codi de grup obtingut del catàleg i l’evidència de
publicació. Descarta duplicats i revisa tots els casos ambigus.

El fitxer reconcile.sql defineix una funció temporal per a l’assaig amb
PostgreSQL. Pren el club i la temporada interns, la federació i un lot JSON
amb competition, groupId, report, round, home i away. Per defecte torna una
previsualització. Revalida cada identitat dins del catàleg, rebutja un codi
que pertanyi a una altra fila i, quan s’habilita explícitament l’escriptura,
només afegeix el codi a la fila original.

Revisa el lot sobre una restauració aïllada, compara els UUID, les
alineacions i les empremtes operatives, i repeteix-lo per comprovar la
idempotència. La publicació d’actes, convocatòries i esdeveniments es prova
amb la RPC oficial existent després del preflight de permisos. Per a la
prova de producció cal autorització, còpia restaurable i planificació
aturada durant el lot.
