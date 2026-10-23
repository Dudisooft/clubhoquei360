# Configurar el correu per a la prova d’accessos temporals

El responsable ha demanat aquesta guia i ha autoritzat una bústia pròpia per a la prova. L’adreça queda a la conversa; no cal versionar dades personals. No s’ha enviat cap correu ni creat cap compte/invitació persistent.

Backend ja instal·lat: migració `20261023213604`, Edge Function `temporary-access` v1. No repetir la instal·lació. Frontend pendent de publicar fins a verificar configuració i correu real. L’autorització de publicació condicionada ja existeix.

## 1. Preparar Gmail per a la prova

Si ja disposes d’un servei SMTP del club, pots usar-ne les dades a l’apartat següent. Per a la prova amb un Gmail propi, no cal contractar un servei nou:

1. Entra al compte de Google que utilitzaràs com a remitent i obre [Seguretat](https://myaccount.google.com/security).
2. Activa la **verificació en dos passos**, si encara no està activada.
3. Obre [Contrasenyes d’aplicació](https://myaccount.google.com/apppasswords), identifica-la com a `ClubHoquei360` i genera-la. La contrasenya d’aplicació és diferent de la contrasenya habitual de Gmail.
4. Introdueix aquesta contrasenya només al camp SMTP segur del panell de Supabase. No l’enviïs al xat, no la posis al repositori ni en captures.

Si Google no ofereix contrasenyes d’aplicació per a aquest compte, indica aquesta circumstància; no utilitzis la contrasenya habitual ni desactivis la verificació en dos passos. [Ajuda oficial de Google](https://support.google.com/accounts/answer/185833).

## 2. Configurar Supabase Auth

Obre [Authentication → SMTP Settings del projecte](https://supabase.com/dashboard/project/oevprbchlhyglhvopnvy/auth/smtp), activa **Custom SMTP** i desa:

| Camp | Valor per al Gmail de prova |
| --- | --- |
| Sender email / From | El Gmail propi configurat com a remitent |
| Sender name | `ClubHoquei360` |
| Host | `smtp.gmail.com` |
| Port | `587` |
| Username | L’adreça Gmail completa del remitent |
| Password | La contrasenya d’aplicació de Google |

El servei SMTP per defecte de Supabase limita els destinataris als membres de l’organització; no serveix per donar per provat l’accés d’externs. No afegeixis provadors com a membres de l’organització de Supabase per evitar aquesta limitació. [Documentació oficial SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## 3. Incloure el codi als correus

Obre [Authentication → Email Templates](https://supabase.com/dashboard/project/oevprbchlhyglhvopnvy/auth/templates). Afegeix al cos de les plantilles **Magic Link** i **Confirm signup** una línia com aquesta:

```html
<p>El teu codi d’accés a ClubHoquei360 és: <strong>{{ .Token }}</strong></p>
```

Conserva el contingut/enllaços existents, especialment `{{ .ConfirmationURL }}`, per mantenir els fluxos interns. El codi es verifica a la pantalla convidada amb `verifyOtp(type: email)`. Mantén la confirmació de correu activada i no activis cap formulari ni registre públic nou. Revisa també els límits i la caducitat OTP; una caducitat curta com deu minuts és suficient per a la prova. [Documentació oficial OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless#with-otp).

## 4. Confirmar configuració i fer la prova controlada

Quan SMTP i plantilles estiguin desats, respon **SMTP CONFIGURAT**. No enviïs credencials. No cal crear Oriol, Ventu ni comptes temporals manualment.

La continuació comprovarà la configuració amb el responsable i prepararà la prova real amb la bústia pròpia que ja ha autoritzat. No activar anticipadament `TEMPORARY_ACCESS_OTP_READY`: es farà després de verificar la configuració del servei, com a part de la prova controlada. El secret es gestiona a [Edge Functions → Secrets](https://supabase.com/dashboard/project/oevprbchlhyglhvopnvy/functions/secrets). No llegir ni compartir sessions, JWT o contrasenyes. Els missatges OTP els introdueix el propietari de la bústia a la interfície de prova; no cal enviar-los al xat.

La prova ha de distingir: acceptació SMTP, recepció real a la bústia i verificació correcta del codi. Després comprovar destinatari, consum únic, consulta/registre segons perfil i revocació. No atribuir a Auth real les proves anteriors amb claims SQL o transport local fictici.

L’SMTP d’invitacions de l’Edge Function és opcional. Es pot conservar la còpia de l’enllaç i verificar igualment el correu amb Supabase Auth, sense duplicar ara credencials a `TEMPORARY_SMTP_*`. Aquesta còpia no dona accés sense verificar la bústia.

Només després de superar les comprovacions es fusionarà la PR #11 i es verificarà la publicació Pages. L’autorització ja s’ha concedit; no tornar-la a demanar. Si falta algun pas extern, conservar aquest checkpoint i continuar des d’aquell pas amb **CONTINUA CLUBHOQUEI360**.
