# Fase 3A.7 · Auditoria de privilegis Supabase

29/10/2026. EN CURS, checkpoint de diagnòstic. Cap escriptura de permisos, rols o dades esportives, local ni productiva, executada en aquesta fase.

Fonts exactes: main e009f4d, #31 3cce758, #32 b76afcd, #33 7434ea5; punt de partida conjunt 11e8bfc. Branca documental/auditoria audit/supabase-privileges-3a7. Les PR continuen separades i no fusionades.

Inventari actual verificat [JSON](evidence/privileges-3a7-inventory.json), [consulta READ ONLY](../scripts/audit-privileges-3a7-readonly.sql): 49 ACL explícites TRUNCATE, 27 taules public; 22 anon, 27 authenticated. Totes de postgres, grantor postgres, RLS activa. Cap entrada correspon al propietari; no són 49 vulnerabilitats independents. Default ACL separat, procedència històrica de cada GRANT no demostrable només amb catàlegs.

[Rutes API](evidence/privileges-3a7-api-routes.json): 27 GET select=*&limit=0 sense dades retornades, SELECT anònim denegat42501. No demostra un endpoint TRUNCATE. [Esquema privat](evidence/privileges-3a7-private-schema.json): Accept-Profile app_private denegat406; public i graphql_public exposats. OpenAPI arrel demana clau secreta, no utilitzada. Cap intent d’esquivar-ho.

Staging 3A.6 conserva dues restauracions íntegres, una amb49 ACL i una amb0, inspectables sense repetir TRUNCATE/REVOKE. Fonts oficials i revisió de funcions en curs. 67 funcions aplicatives sense canvi respecte 3A.6, placeholder GraphQL separat; no confondre un event trigger d’activació RLS amb una RPC SQL destructiva.

Pendents: completar semàntica de rols/propietat/defaults, comprovació de vies indirectes i claus/Edge Functions, proves negatives no destructives, proposta mínima, esborrany Support sense enviar, conclusions i relació amb veredicte 3A.6. No certificar explotació ni resolució productiva abans de tancar aquestes comprovacions.
