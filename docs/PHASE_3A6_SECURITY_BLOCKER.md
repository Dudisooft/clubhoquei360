# Fase 3A.6 · bloqueig de permisos de plataforma

29/10/2026. Lectura de metadades productives, sense canvis remots.

La revocació versionada a `20261029040738_revoke_client_truncate.sql` elimina els 49 GRANT TRUNCATE existents dels clients i els defaults de `postgres`. Comprovat a staging amb l’esquema aplicatiu capturat, PostgreSQL 17.11, GoTrue i PostgREST reals; suite servidor 195 Node i CI 47 Chromium PASS al codi `60d7d1b159e710ca226adad628dc7bf8b9c5059b` ([CI](https://github.com/Dudisooft/clubhoquei360/actions/runs/40816276462)). La prova SET ROLE no representa una petició JWT ni demostra un endpoint de SQL arbitrari; demostra el privilegi SQL incompatible amb confiar en RLS per protegir aquestes taules.

La comprovació addicional revela defaults TRUNCATE de **dos propietaris** a producció: `postgres` i `supabase_admin`, per a `anon` i `authenticated`. El rol disponible és `postgres`, sense superusuari ni pertinença a `supabase_admin`. La migració no intenta alterar aquest propietari de plataforma ni elevar privilegis. El seu default continua pendent: no presentar l’hardening local com una correcció completa de la plataforma.

**NO APTE PER A PUBLICACIÓ** mentre aquest bloqueig sigui obert. Un responsable autoritzat amb capacitat sobre el propietari de plataforma ha de revisar i retirar el default insegur mitjançant un mecanisme admès per Supabase; si no és possible, obtenir una resolució de plataforma abans de publicar. No executar cap SQL d’escriptura d’aquesta fase a producció. `scripts/preflight-client-table-privileges.sql` ha de retornar zero files per a taules **i tots els propietaris** abans de donar per superada la porta final de publicació. Els GRANT existents continuen pendents de la futura instal·lació autoritzada de la migració; no s’han revocat a producció.

Integració completa i evidències: `docs/PHASE_3A6_INTEGRATION_REPORT.md` a la branca `audit/integration-3a6`. El predecessor aplicatiu es reconstrueix exactament per estructura capturada; plataforma, defaults d’altres propietaris, vault/cron/net i configuració Auth no es clonen. Backup local restaurat en una altra base, 76 empremtes de taula coincidents; no acredita recuperació productiva.

PR #31/#32/#33 continuen separades i en esborrany. Les sis classificacions continuen com a propostes no aprovades. Sense fusió, desplegament, comptes o dades productives modificats.
