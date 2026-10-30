# Fase 3A.8 · Revocacions TRUNCATE en staging

30/10/2026. EN CURS. Branca audit/truncate-remediation-staging-3a8 des de a46c872; main/#31/#32/#33 preservats. Sense escriptures productives, fusió o desplegament.

Paquet mínim ops/truncate-3a8: inventari49, preflight,49 revocacions explícites exclusives de TRUNCATE, pas separat de2 defaults postgres/public i verificació només lectura. Guards amb acknowledgement, identitat/owner/beneficiaris/grantors, conjunt complet49o0 i privilegi efectiu; derivenSTOP si drift/parcialitats. No toca supabase_admin ni assumeix que l’autoritat de propietari hagi de desaparèixer.

Staging dedicat clubhoquei360-3a8-local, PostgreSQL17.11 ambpostgres no-super, native GoTrue/PostgREST, xarxa interna i credencials locals noves. Còpia de seguretat local3A.6 validada per SHA, dades fictícies i8 comptes ficticis; ACL/defaults rellevants reconstruïts de metadades READONLY verificades, no dades productives. Perfil/transport/etiquetes/sentinel comprovats abans d’escriptures. Docker no publica ports dels contenidors interns; SQL és Dockerexec a127.0.0.1:5432, API/web són proxies locals. No es presenta tot Supabase Cloud com a clonat.

Bloc core PASS: [evidència](evidence/remediation-3a8-core.json), [diff49](evidence/remediation-3a8-acl-diff.json), [preflight](evidence/remediation-3a8-preflight-before.json). Backup recuperat,77 conjunts, metadades lògiques/ACL, rolpostgres no-super, només49 ACL retirades i2 defaults en pas separat. Altres permisos, rols, RLS, funcions, ownership i files invariants. Segona aplicació idempotent i49 denegacions directes repetides. Restauració d’estatlegacy en còpia nova, reaplicació i49 denegacions crítiques PASS. Primitives SQL de desplegament provades sense superusuari; cap autoritat administrativa eliminada.

Incident de fixture:12defaults reconstruïts inicialment en lloc de20 (faltaven8 entrades explícites de l’owner); precondició va aturar el segon pas, sense canvis parcials. Intent i snapshot conservats privats; completades les20 entrades verificades i repetit el bloc. Canvis de noms físics dels catàlegs de DB s’exclouen de la comparació entre còpies, sense ometre privilegis o dades. No s’ha relaxat el paquet per amagar desviacions.

9blocs API/Auth reals PASS. Pendents suites finals Node/Chromium,6blocs navegador real,A–H,ModeBasegols/targetes reals i recàrrega,consulta/selector,validaciópostfuncional,runbookfinal/veredicte. Les49concessions continuen presents a producció; l’èxit local no les resol allí.
