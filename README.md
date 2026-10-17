# ClubHoquei360

Aplicació interna de gestió esportiva d’hoquei patins, en català, amb frontend estàtic per a GitHub Pages i dades compartides a Supabase. El registre oficial operatiu, les dades federatives i l’anàlisi estadística es mantenen en capes separades.

- [Continuïtat i instrucció de represa](docs/CODEX_PROGRESS.md)
- [Auditoria del mòdul d’estadístiques](docs/statistics-audit.md)
- [Operació, recuperació i pilot FEM15](docs/statistics-operations.md)
- [Informe de lliurament i estat de verificació](docs/statistics-delivery.md)
- [Posada en servei i verificacions de producció](docs/statistics-deployment.md)

```sh
npm ci
npm run check
npm test
npm run build
npm run test:browser
```

La compilació genera `work/site`. Les proves de navegador utilitzen dades fictícies i PostgreSQL local; no creen comptes ni esdeveniments de prova a producció. Vegeu la guia d’operació per a Chromium i la posada en servei autoritzada.
