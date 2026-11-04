# Backups PostgreSQL xifrats — fase 3A.13

**Només fixtures.** Cap URL PostgreSQL, connexió de producció, planificador o opció per saltar les guardes. L'exportació real necessita un transport/manifest de cobertura revisat i autorització diferenciada.

Prerequisits: Python 3.11+, Docker al socket local, imatge oficial PG17 fixada al codi, age/age-keygen verificats de l'upstream. Calen directoris privats fora de Git, propietari actual, mode0700; arxius0600. El banc local esperat és Linux `/workspace/private`. D: i Windows no s'han validat.

Reproducció en aquest workspace:

```bash
python tests/backup/validate.py
python tests/backup/cli.py
python scripts/backup/manager.py --config /workspace/private/ch360-keys-3a13/config.json --help
```

El primer test provisiona exclusivament contenidors amb xarxa none/zero ports i dades fictícies. La configuració es crea fora del repo. En una màquina nova cal verificar age i rutes abans de començar; cap binari, dump o clau es recupera de Git.

Ordres del gestor, sempre amb `--config` privat:

- `init-key`: crea identitat/recipient sense sobreescriure ni imprimir secrets.
- `backup --source ch360_bk13_src`: llegeix la DB fictícia i publica un nou `bk-UUID.age` atòmicament.
- `verify FILE`: autentica/desxifra en memòria i valida el catàleg pg_restore; no implica restore provat.
- `audit FILE`: afegeix els rebuts coincidents de restauració.
- `restore FILE --target ch360_bk13_<destí_buit>`: comprova destí independent, restaura transaccionalment i compara snapshot complet; escriu un rebut privat si tot coincideix.
- `escrow-key`: xifra la identitat principal per al recipient de recuperació ja preparat. La clau de recuperació s'ha de custodiar separadament; aquí només s'ha provat separació lògica al mateix host.
- `recover-key FILE --output RUTA_PRIVADA_NOVA`: recupera la identitat sense sobreescriptura ni impressió.
- `cleanup`: pla dry-run, 14dies/almenys3 per defecte; `--apply` és explícit i només per a còpies autenticades amb una supervivent restaurada. Cap programació ni activació recurrent.

La memòria està limitada a128MiB/sortida/paquet; no es creen dumps temporals en clar. La identitat privada té el seu fitxer protegit, no un argument de contrasenya. El SO/swap i la custòdia física encara requereixen garanties per a producció.

La prova que cancel·la la restauració ho fa contra un backend fictici; no utilitzar-la en cap servei extern. Els destins del test són efímers/tmpfs i es poden tornar a crear amb dades fictícies. No és un procediment de rollback productiu.

Informe: [validació i límits](../../docs/PHASE_3A13_ENCRYPTED_BACKUP_VALIDATION.md). Preus: [Free/Pro](../../docs/PHASE_3A13_SUPABASE_PLAN_COMPARISON.md).
