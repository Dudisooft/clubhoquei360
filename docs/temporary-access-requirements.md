# CLUBHOQUEI360 — MODIFICACIÓ PRIORITÀRIA DEL SISTEMA D'ACCESSOS EXTERNS

## OBJECTIU

Modifica les instruccions i el desenvolupament actual del mòdul d'estadístiques de ClubHoquei360.

**Queda anul·lada la petició anterior de crear comptes personals per als provadors externs.**

Substitueix-la per un sistema d'invitacions temporals per correu electrònic, gestionat exclusivament pel superoperador de l'aplicació.

Aquesta instrucció té prioritat sobre qualsevol especificació anterior incompatible relativa a comptes personals, registre públic o alta d'usuaris externs.

Mantén intactes els comptes i permisos interns existents dels clubs.

## 1. AUDITORIA PRÈVIA

Abans de modificar el codi:

1. Examina el sistema actual d'autenticació, autorització i gestió de rols.
2. Identifica qualsevol desenvolupament iniciat per crear comptes personals per a provadors externs.
3. Revisa les taules i polítiques de seguretat de Supabase.
4. Comprova si ja existeix un rol de superoperador global.
5. Reutilitza els mecanismes de seguretat existents sempre que sigui possible.

No eliminis dades ni usuaris existents sense autorització.

No pressuposis que una interfície oculta és suficient per protegir funcions administratives.

## 2. ACCÉS EXCLUSIU DEL SUPEROPERADOR

Afegeix un botó administratiu:

**«Accessos temporals»**

Aquest botó només ha de ser visible per al meu usuari, identificat mitjançant un rol global de superoperador validat al servidor.

No concedeixis aquest privilegi simplement perquè un correu electrònic coincideixi amb una cadena escrita al frontend.

Si el superoperador no està identificat de manera segura, prepara la configuració necessària i documenta el pas pendent. No assignis permisos privilegiats arbitràriament.

Els administradors de club no podran gestionar aquestes invitacions en aquesta primera versió.

## 3. PANTALLA D'INVITACIONS

Implementa una pantalla que permeti introduir:

### Correu electrònic

- Correu de la persona convidada.
- Validació del format.
- Prevenció d'invitacions duplicades actives incompatibles.

### Club vinculat

- Selector dels clubs existents a ClubHoquei360.
- Vinculació obligatòria a un únic club per invitació.
- Prohibició d'accedir a dades d'altres clubs.

### Equip vinculat (opcional)

- Selector d'equips del club.
- Possibilitat de limitar l'accés a un únic equip.
- Si no se selecciona equip, aplicar l'abast del club segons els permisos concedits.

### Tipus d'accés

Permet seleccionar permisos predefinits:

**Analista d'estadístiques**
- Consultar partits i estadístiques dins del seu abast.
- Introduir estadístiques en els partits autoritzats.
- Corregir les seves anotacions segons les regles del sistema.
- Sense permisos per modificar dades oficials, usuaris ni configuració del club.

**Consulta**
- Visualitzar partits i estadístiques autoritzades.
- Sense capacitat d'edició.

**Registre limitat**
- Registrar dades estadístiques únicament als partits autoritzats.
- Sense permisos administratius.

Implementa aquests permisos mitjançant comprovacions reals al servidor i polítiques d'accés a les dades.

### Durada de la prova

Permet seleccionar:

- 24 hores.
- 7 dies.
- 30 dies.
- Data i hora de caducitat personalitzades.

La caducitat s'ha d'aplicar al servidor, no només a la interfície.

## 4. GENERACIÓ I ENVIAMENT D'INVITACIONS

Incorpora l'acció:

**«Genera invitació»**

El sistema ha de:

1. Crear una invitació vinculada al correu destinatari.
2. Registrar el club, l'equip opcional, els permisos i la caducitat.
3. Generar un enllaç segur, aleatori, de curta validesa i d'un sol ús per a l'acceptació.
4. Permetre enviar la invitació per correu electrònic si existeix un servei configurat.
5. Si no existeix servei d'enviament, permetre copiar l'enllaç de manera segura, sense afirmar que s'ha enviat un correu.
6. Exigir una verificació del control del correu destinatari abans d'activar l'accés.

No implementis un enllaç reutilitzable que concedeixi accés directament a qualsevol persona que el posseeixi.

El convidat no haurà de crear una contrasenya ni completar un registre personal tradicional.

Es pot utilitzar una identitat tècnica mínima gestionada per Supabase Auth, com una autenticació sense contrasenya, si és necessària per garantir la seguretat. Aquesta identitat no equival a oferir un sistema de comptes personals públics.

## 5. GESTIÓ D'INVITACIONS

Mostra una taula amb:

- Correu del convidat.
- Club.
- Equip autoritzat.
- Tipus d'accés.
- Data de creació.
- Data de caducitat.
- Estat de la invitació.
- Últim accés, si està disponible.

Estats mínims:

- Pendent.
- Activa.
- Caducada.
- Revocada.

Accions del superoperador:

- Revocar immediatament.
- Modificar permisos.
- Modificar la caducitat.
- Reenviar una invitació quan sigui segur i necessari.

Qualsevol canvi de permisos s'ha d'aplicar al servidor i quedar registrat.

## 6. SEGURETAT I AÏLLAMENT

Requisits obligatoris:

- Verificació del rol de superoperador al servidor.
- Polítiques RLS de Supabase adequades.
- Separació estricta de dades entre clubs.
- Limitació d'accés per equip i tipus de permís.
- Caducitat i revocació efectives, també en sessions actives.
- Tokens d'invitació no emmagatzemats en text pla.
- Protecció contra ús repetit i intents massius.
- Registre d'auditoria de creació, acceptació, modificació i revocació.
- Cap exposició de claus privades o credencials administratives al navegador.

## 7. INTEGRACIÓ AMB ESTADÍSTIQUES

El sistema ha de permetre, per exemple, convidar un analista extern per registrar estadístiques dels partits de FEM15 de l'Igualada Hoquei Club.

Aquest analista:

- No és entrenador ni coordinador.
- No obté permisos generals d'administració.
- Només accedeix a les dades expressament autoritzades.
- Pot treballar amb el mode d'estadístiques en directe o diferit segons els permisos assignats.
- Perd l'accés quan caduca o es revoca la invitació.

No alteris la capa oficial del partit ni el sistema de registre d'estadístiques ja aprovat.

## 8. COMPATIBILITAT I DESENVOLUPAMENT

Aquesta modificació s'ha d'integrar al desenvolupament actual del mòdul d'estadístiques.

No iniciïs una reestructuració general del sistema d'usuaris.

No implementis encara la delegació de la gestió d'invitacions als administradors dels clubs. Deixa l'arquitectura preparada per a una ampliació futura, sense activar-la.

Mantén la compatibilitat amb el mode bàsic de partit i la resta de funcionalitats existents.

## 9. PROVES

Executa proves per verificar:

- Un usuari normal no pot accedir a la pantalla administrativa.
- Un administrador de club tampoc no pot crear invitacions.
- El superoperador pot generar-les.
- Una invitació només es pot acceptar després de verificar el correu destinatari.
- Un convidat no pot accedir a un altre club o equip.
- Els permisos de consulta impedeixen modificar dades.
- La caducitat bloqueja l'accés.
- La revocació bloqueja l'accés immediatament.
- Els enllaços consumits no es poden reutilitzar.
- No hi ha regressions en les estadístiques ni en els permisos interns.

## 10. EXECUCIÓ I INFORME

Treballa autònomament, aprofitant la feina ja realitzada.

Actualitza el registre de progrés del projecte.

Si existeixen migracions o secrets pendents de configurar, documenta'ls i no afirmis que la funcionalitat està operativa fins que s'hagin verificat.

No publiquis a producció sense autorització.

En acabar, informa de:

1. Funcionalitats implementades.
2. Sistema d'autenticació utilitzat.
3. Permisos disponibles.
4. Estat de l'enviament de correus.
5. Proves superades.
6. Configuracions pendents.
7. Instruccions per generar la primera invitació.

**RESULTAT ESPERAT:** una única pantalla administrativa, exclusiva del superoperador, per convidar temporalment persones externes a un club o equip concret, amb permisos configurables, caducitat i revocació, sense crear un sistema públic de comptes personals.