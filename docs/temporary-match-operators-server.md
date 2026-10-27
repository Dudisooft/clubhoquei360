# Fase 3A.1 · autorització temporal d’operadors externs

27/10/2026. Ampliació de la PR #31; frontend independent a la PR #32. **Només desenvolupament i proves locals: cap migració aplicada, cap compte o permís real modificat, cap desplegament.** El cas FEM15 és fictici i la implementació no conté excepcions per noms d’equip o club.

## Model i autoritzadors

La migració additiva `20261027183214_temporary_match_operators.sql`, posterior a `20261027170248_match_mode_access.sql`, crea `match_temporary_operators` i `match_temporary_operator_audit`. Identifica club, temporada a través del context, equip, partit operatiu canònic, UUID d’Auth, mode Advanced, inici/caducitat, accions, costats, jugadors opcionals, permisos fixos, autoritzador i revocació. No insereix membres ni assignacions antigues, ni modifica classificacions esportives.

Només `is_platform_superadmin()` habilitat o `club_memberships.role='general_coordinator'` del mateix club amb `team_id IS NULL` poden concedir/revocar. Administrador de club, coordinador de secció, entrenador i delegat no poden. El superadministrador conserva la seva autoritat de plataforma; un coordinador no travessa clubs. El destinatari ha d’existir a Auth; no es creen comptes ni contrasenyes.

Proposta per defecte: **24 hores**. Inici i final configurables; servidor i constraint imposen dates finites, final posterior a inici i al present, màxim **168 hores**. Estats derivats: programada, activa, caducada o revocada. L’operador no pot allargar ni canviar l’àmbit. Per corregir-lo, l’autoritzador revoca i concedeix una nova autorització.

## Contractes i seguretat

RPC públiques `SECURITY INVOKER`: `match_temporary_grant(p_grant)`, `match_temporary_revoke(p_id)` i `match_temporary_list(p_match DEFAULT NULL)`. Implementacions privades `SECURITY DEFINER`, `search_path=''`, identitat del JWT i comprovacions de servidor. Sense execució anònima; àlies previs privats revocats als clients.

RLS: només SELECT sobre autoritzacions pròpies o del partit administrable; auditoria només per l’autoritzador. No es concedeix DML directe. `list(NULL)` retorna únicament les autoritzacions del compte, sense obrir el catàleg del club. Un UUID o rol inventat a l’URL no aporta permisos. Les accions i jugadors es validen contra el context i les dades del partit; no contra etiquetes del navegador.

La concessió usa UUID de petició i empremta per repetir un ACK perdut sense duplicar. Els àmbits d’acció/costat/jugador no se solapen entre operadors temporals ni amb assignacions existents; una assignació posterior també es comprova. Es conserven els UUID de mutació i les revisions del motor estadístic existent. Escriptures i revocacions comparteixen bloqueig transaccional del partit; les sessions mantenen CAS. Revocar és idempotent i s’audita amb el registre exacte abans/després.

`stats_can_read`, `stats_can_record`, `stats_access`, `stats_write_event`, `stats_save_session` i les capacitats de `match_mode_access` reconeixen l’autorització exacta. L’excepció afegeix lectura, observacions estadístiques live/video i sessió d’anàlisi; no gestió ni validació, referències oficials o assistències fora de l’àmbit. **No s’afegeix a `match_advanced_allowed` ni a les guardes oficials de Base/Avançat.** Així, fins i tot un delegat amb drets Base previs no obté el cronòmetre oficial Avançat mitjançant l’excepció.

Vigència comprovada a cada operació amb temps del servidor. La primera operació nova posterior a la revocació o caducitat es denega amb 42501; no cal cap cron. Les dades legítimes i l’auditoria no s’esborren. L’operador perd la lectura estadística quan aquesta era el seu únic permís, però conserva la metainformació pròpia de caducitat/revocació. Els responsables amb drets independents mantenen la consulta. Els permisos independents que el compte ja tingués es conserven.

## Proves executades i límits

- Node complet: **181/181**, inclou PostgreSQL real local **PGlite**, migracions i RLS sota rol authenticated; 14 proves específiques noves. Últim ajust de guardes repetit: 14/14.
- Chromium servidor: **47/47**, regressions Base, Avançat, reforços, persistència i permisos.
- `npm run check`, `npm run build`: PASS, artefacte estàtic de 35 fitxers; `git diff --check`: PASS.
- Prova conjunta amb el frontend de #32: PGlite + Chromium, FEM15 fictici, coordinador autoritzador, operador sense membres/assignacions addicionals, equip+jugador, vídeo, pausa/reprèn/recarrega, altres URL i acta denegades, revocació i caducitat: PASS, 2 observacions conservades, 0 contextos creats, actes/cronòmetre/assignacions iguals.
- El recorregut original de partit futur, consulta sense escriptures i activació explícita idempotent continua cobert a la prova conjunta de #32.

Les identitats i les dades d’aquests tests són fictícies. No és validació Auth amb comptes reals ni prova de permisos de producció. Incidència de prova corregida: l’assert de client esperava un Error en comptes del resultat estructurat 42501 de Supabase; no era una acceptació d’escriptura. Les 14 proves comproven també RLS, ACL, superadmin deshabilitat, coordinador principal, rols denegats, clubs, límits/dates infinites, manipulació de camps, accions/jugadors, accés d’un delegat Base i preservació de dades.

## Desplegament segur, pendent d’autorització

1. Revisar conjuntament #31/#32, incloses la classificació `teams.age_group` i la proposta de metadades de 3A; no executar-la cegament. Aquesta fase no altera les dades de 36 equips.
2. Amb autorització expressa, instal·lar les migracions de #31 en ordre en un entorn de revisió; comprovar catàleg i context operatiu existent. Consultar un futur no crea context; només l’acció explícita i autoritzada de 3A el prepara. Una autorització temporal exigeix context estadístic preexistent i no n’activa cap.
3. Provar comptes Auth de cada rol en aquest entorn i el recorregut creuat complet, abans de producció. Publicar #32 només amb el servidor compatible. Es manté separació de PR, sense fusió automàtica.
4. Procediment de compte: si no existeix, un administrador amb infraestructura Auth segura fa una invitació/OTP mitjançant Supabase Auth i SMTP verificat; el destinatari verifica el correu i després s’identifica l’UUID d’Auth. No usar contrasenyes conegudes, claus de servei al frontend ni crear membres del club per facilitar l’accés. La PR d’invitacions pendent no s’incorpora en aquesta fase.
5. Autoritzador obre el partit concret → Estadístiques → Assignacions temporals → Accés extern al Mode Avançat. Selecciona UUID verificat, equip, dates i categories/costat; concedeix i comprova la llista. L’operador entra a Partit → Partits amb accés temporal. Revocar des del mateix panell conserva estadístiques i bloqueja operacions noves.

Pendent: revisió de PR/CI, validació visual humana, configuració/invitació Auth quan s’autoritzi i prova real FEM15. No s’ha assignat cap permís al provador ni enviat correus.
