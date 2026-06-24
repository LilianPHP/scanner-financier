# Suivi review Senzio

Date : 2026-04-27

## Fait en local

- Nettoyage du remote Git local :
  - `origin` ne contient plus de token GitHub personnel.
  - URL actuelle : `https://github.com/LilianPHP/scanner-financier.git`.

- Schéma Supabase aligné avec le code :
  - ajout des champs `amount_original`, `currency`, `subcategory` sur `transactions`;
  - remplacement du schéma attendu par le backend : `user_category_rules` avec `label_pattern`;
  - ajout de `bank_connections` pour Powens;
  - ajout de `user_profiles` pour l'onboarding/profil;
  - ajout de `goals` pour les objectifs;
  - ajout de `rate_limit_events` pour les quotas backend persistants.

- Migration de rattrapage ajoutée :
  - `supabase/migrations/004_schema_hardening.sql`;
  - prévue pour remettre une base existante en cohérence avec le code actuel.

- Open Banking Powens :
  - ajout de la suppression réelle côté fournisseur via `delete_powens_connection`;
  - `DELETE /banks/connections/{conn_id}` révoque maintenant la connexion Powens avant suppression locale;
  - message frontend mis à jour pour indiquer la révocation fournisseur.

- Devise :
  - Senzio est maintenant explicitement limité aux relevés français en EUR;
  - les fichiers non-EUR sont rejetés avec une erreur claire;
  - suppression du fallback dangereux qui pouvait convertir une devise étrangère avec un taux `1.0`.

- Rate limiting :
  - les uploads utilisent maintenant un rate limit persistant via Supabase;
  - fallback mémoire conservé si la table n'est pas encore disponible.

- Sentry / Next.js :
  - ajout de `frontend/instrumentation.ts`;
  - ajout de `onRouterTransitionStart` dans `frontend/instrumentation-client.ts`;
  - les warnings Sentry du build ont été corrigés.

- Documentation et variables d'environnement :
  - variables Powens ajoutées dans `.env.example`;
  - variables Powens ajoutées dans `backend/.env.example`;
  - guide de déploiement mis à jour.

## Vérifications effectuées

- Compilation Python backend :
  - `PYTHONPYCACHEPREFIX=/tmp/senzio-pycache python3 -m compileall backend/app`
  - résultat : OK.

- Build frontend Next.js :
  - `NEXT_TELEMETRY_DISABLED=1 npm run build`
  - résultat : OK.

- Recherche de token GitHub hors `.git` :
  - aucun `ghp_` ou `github_pat_` trouvé dans les fichiers du projet.

## Reste à faire pour que ce soit live

1. Appliquer les migrations Supabase.
   - Sur une base existante, appliquer en priorité :
     - `supabase/migrations/004_schema_hardening.sql`
   - Sur une base neuve, appliquer les migrations dans l'ordre :
     - `001_init.sql`
     - `002_ai_categorization_cache.sql`
     - `003_bank_connections_target_month.sql`
     - `004_schema_hardening.sql`

2. Vérifier les variables Railway backend.
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_JWT_SECRET`
   - `ANTHROPIC_API_KEY`
   - `FRONTEND_URL`
   - `POWENS_DOMAIN`
   - `POWENS_CLIENT_ID`
   - `POWENS_CLIENT_SECRET`

3. Redéployer le backend Railway.

4. Redéployer le frontend Vercel.

5. Tester en production.
   - Connexion utilisateur.
   - Upload d'un relevé EUR.
   - Rejet clair d'un relevé non-EUR.
   - Création/liste/suppression d'une règle de catégorie.
   - Connexion bancaire Powens.
   - Synchronisation bancaire.
   - Révocation bancaire depuis "Mes comptes".
   - Historique d'analyses.
   - Objectifs.
   - Profil/onboarding.

6. Continuer la préparation conformité.
   - Politique de rétention des données bancaires.
   - Journalisation des suppressions/révocations.
   - Export/suppression de compte utilisateur.
   - Texte clair sur le rôle de Powens et la révocation.
   - Revue des logs pour éviter toute donnée bancaire sensible.

## À surveiller

- Le worktree contient aussi des changements non liés à cette passe, notamment des suppressions/renommages de fichiers. Ils n'ont pas été modifiés volontairement pendant cette correction.
- `npm run lint` n'est pas encore exploitable en CI car `next lint` demande une configuration ESLint interactive.
