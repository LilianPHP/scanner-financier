# Senzio (ex-Scanner Financier) — Récap complet du projet

> Export généré le **25 avril 2026** · 112 commits depuis le démarrage
> Repo : https://github.com/LilianPHP/scanner-financier
> Prod : https://senzio.app

---

## 📋 En une phrase

App web personnelle d'analyse de finances : connexion bancaire Open Banking (Powens), catégorisation automatique, dashboard, budgets, objectifs d'épargne. Stack Next.js + FastAPI + Supabase, déployée sur Vercel + Railway.

---

## 🏗️ Stack technique

| Couche | Tech | Hébergeur |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind | Vercel — `senzio.app` |
| Backend | FastAPI (Python) | Railway |
| Auth | Supabase Auth (JWT) + Google OAuth | Supabase |
| DB | Supabase Postgres | Supabase |
| Open Banking | Powens (agréé ACPR) | — |
| Monitoring | Sentry (errors) + Plausible (analytics privacy-first) | — |
| AI fallback | Claude Sonnet 4.5 pour catégorisation des transactions inconnues | Anthropic |

---

## 🗓️ Timeline par phase

### Phase 0 — Bootstrap (Initial commit)
- Architecture Next.js + FastAPI + Supabase mise en place
- Upload de relevés (CSV/XLSX/PDF) avec parsing déterministe

### Phase 1 — Parsers robustes (mars 2026)
- Parser CSV : auto-détection ligne d'en-tête (formats Crédit Agricole)
- Parser XLSX : support feuilles multiples, lignes-totaux, dates plages
- Parser PDF : positions de mots, regex montants stricts, 3ᵉ passe texte brut
- Support banques anglaises (Revolut, dates EN, AU$/USD/GBP/JPY/CHF)

### Phase 2 — Dashboard & analyse (mars 2026)
- Dashboard avec KPIs (revenus, dépenses, cashflow)
- Graphiques camembert + barres mensuelles
- Catégorisation déterministe (règles mots-clés)
- Page `/history` avec liste des analyses passées
- Détection abonnements récurrents

### Phase 3 — Catégorisation avancée (mars 2026)
- **35 sous-catégories** dérivées (Logement → Loyer/EDF/Assurance habitation…)
- Choix interactif de catégorie par l'utilisateur, sauvegarde en DB
- Profil utilisateur avec onboarding (catégories conditionnelles selon situation : étudiant, voyageur…)
- **Fallback IA** : Claude Sonnet 4.5 pour les transactions non matchées par les règles
- Règles personnalisées sauvegardées (`/regles`)

### Phase 4 — Polish & UX (mars 2026)
- Dark mode complet sur toutes les pages
- Indicateur force du mot de passe + show/hide
- Score de santé financière 0–100
- Alertes budget dynamiques
- Variations mois sur mois (badges +X% / -X%)
- Export CSV + XLSX stylisé (5 sections structurées)
- Pages mentions légales + politique de confidentialité
- Multi-devises (EUR/USD/AUD/GBP/JPY/CHF…)
- Onboarding accordéon "Comment obtenir mon relevé"

### Phase 5 — Sécurité & monitoring (mars 2026)
- Validation JWT Supabase côté backend (ES256 via JWKS)
- CORS verrouillé sur `senzio.app` + Vercel previews
- Sentry (errors frontend + backend)
- Plausible analytics (sans cookies)
- Bouton feedback Tally
- Renommage **Scanner Financier → Senzio** + nouveau logo SVG glass/solid

### Phase 6 — Open Banking M2 (avril 2026)
- **Connexion bancaire Powens** (agréé ACPR, 250+ banques, lecture seule)
- Sélecteur d'historique (1m / 3m / 6m / 12m / 24m, garanti 3m PSD2)
- Gestion sync en cours, retry depuis page Accounts
- Callback rapide (<10s) avec sync séparé en arrière-plan

### Phase 7 — Refonte UI/UX dark fintech (24 avril 2026)
- **Refonte design complète** : passage à un look dark fintech inspiré apps mobiles iOS
- Route groups Next.js : `(app)` (avec BottomNav) / `(auth)` (sans)
- BottomNav 5 onglets : Accueil / Tx / Budgets / Objectifs / Profil
- Suppression OAuth Apple (Google uniquement)
- **Pages créées** :
  - `/transactions` — liste filtrable avec chips catégories + recherche
  - `/budgets` — enveloppes par catégorie + barres de progression
  - `/goals/[id]` — détail objectif avec milestones 25/50/75/100%
  - `/goals/new` — wizard 3 étapes (type → nom+montant → durée+rythme)
  - Refonte `/profile` (sections Compte / Banques / Préférences / Données / Aide)
- Nouveau design system : tokens CSS, palette catégories Tailwind dark-friendly
- **Suppression de tout l'upload de fichier** : data 100% Powens
  - `/upload` et `/history` redirigent vers `/accounts` et `/transactions`
- Footer landing : "Connexion sécurisée via Powens · agréé ACPR"

### Phase 8 — Standardisation des layouts (24-25 avril 2026)
- Layout du HTML prototype `Senzio App _standalone_.html` appliqué
- Tentative `maxWidth: 1024` puis retour pleine largeur (bords noirs trop visibles)
- **Composants partagés** créés :
  - `<PageShell>` — wrapper 520px centré (toutes les pages app/auth)
  - `<TabHeader>` — eyebrow vert + H1 top-left + avatar (pages onglets)
  - `<SubHeader>` — ← / titre centré / avatar (sous-pages)
  - `<Avatar>` — auto-fetch initiale Supabase
- Headers unifiés sur toutes les pages :
  - Tab pages : *Vue d'ensemble · Accueil*, *Mouvement · Transactions*, *Ce mois-ci · Budgets*, *Épargne · Objectifs*, *Mon compte · Profil*
  - Sub-pages : back arrow + titre centré
- BottomNav également centrée à 520px

### Phase 9 — Filtre par mois (25 avril 2026, en cours)
- Page Transactions : sélecteur de mois avec chevrons + chips horizontaux
- Tout est scopé au mois sélectionné (KPIs, recherche, catégories, liste)
- Compteur "X transactions · Avr 2026" au-dessus de la liste
- Défaut = mois le plus récent
- 🔜 Application du même filtre sur la page Budgets (en cours)

---

## 🎨 Design system (état actuel)

### Tokens CSS (`globals.css`)
```css
--bg-page: #0A0A0A           /* fond principal */
--bg-card: #111111           /* cartes */
--bg-card-hi: #181818        /* hover/élevé */
--border: rgba(255,255,255,0.07)
--fg: #F5F5F5                /* texte principal */
--fg-2: rgba(255,255,255,0.7)
--fg-3: rgba(255,255,255,0.5)
--fg-4: rgba(255,255,255,0.3)
```

### Couleurs catégories (Tailwind dark-friendly)
- Logement `#3B82F6` 🏠
- Courses `#1D9E75` 🛒
- Abonnements `#06B6D4` 📱
- Transport `#F59E0B` 🚊
- Shopping `#8B5CF6` 🛍️
- Sorties `#EC4899` 🍷
- Santé `#F87171` ❤️
- Revenus/Salaire `#22C55E` 💰
- Autre `#6B7280` 📦

### Couleur accent
- Vert Senzio `#1D9E75` (boutons, eyebrows, indicateurs positifs)

---

## 🗂️ Structure des routes

```
app/
├── (auth)/              # pas de bottom nav
│   ├── page.tsx         # landing "Tes finances, sans trackers, sans banques."
│   ├── login/
│   ├── signup/
│   ├── mentions-legales/
│   └── confidentialite/
├── (app)/               # avec bottom nav, contenu centré 520px
│   ├── layout.tsx       # PageShell + BottomNav
│   ├── dashboard/       # Accueil — KPIs + graphiques
│   ├── transactions/    # liste + filtre mois + recherche
│   ├── budgets/         # enveloppes par catégorie
│   ├── goals/
│   │   ├── page.tsx     # liste objectifs
│   │   ├── new/         # wizard 3 étapes
│   │   └── [id]/        # détail avec milestones
│   ├── profile/         # paramètres + déconnexion
│   └── accounts/        # connexion Powens
├── upload/              # → redirect /accounts
└── history/             # → redirect /transactions
```

---

## ✅ Ce qui marche en prod

- Inscription / connexion (email + Google OAuth)
- Connexion bancaire via Powens (250+ banques FR)
- Synchronisation transactions (1m → 24m)
- Catégorisation auto (règles + fallback IA Claude)
- Sous-catégories granulaires éditables
- Dashboard KPIs + graphiques
- Liste transactions filtrable par mois
- Page Budgets (factor x1.0 à x4.0 selon catégorie)
- Création/suivi objectifs d'épargne (Supabase `goals`)
- Multi-devises
- Dark mode (par défaut, light mode disponible)
- Mentions légales + RGPD
- Monitoring Sentry + Plausible

---

## 🔜 Ce qui reste / améliorations possibles

### Court terme
- Filtre par mois sur la page Budgets (cohérence avec Transactions)
- Filtre par mois sur le Dashboard
- Cohérence du sélecteur de mois entre toutes les pages (état partagé ?)

### Moyen terme
- Notifications push (via Web Push API) sur dépassement budget
- Code PIN à l'ouverture (déjà préparé via `PinScreen.tsx`)
- Export PDF du rapport mensuel
- Comparaison N-1 (mois courant vs même mois année précédente)
- Détection automatique d'abonnements à résilier (Sorties + Abonnements > seuil)

### Long terme
- App mobile native (React Native ?) — design déjà adapté mobile
- Multi-comptes bancaires (déjà partiellement prêt côté Powens)
- Coaching IA conversationnel (Claude) pour conseils budgétaires

---

## 🧱 Décisions techniques importantes

1. **Pas de Cron côté backend** : la sync Powens est triggered par l'utilisateur via le bouton refresh dans `/accounts`
2. **Stockage analyse en `sessionStorage`** : pas en DB, recalculé à chaque connexion bancaire
3. **JWT validation Supabase** : ES256 via JWKS côté FastAPI (pas via `sb.auth.get_user()` pour éviter les appels réseau)
4. **CORS regex** : `senzio\.app|.*\.vercel\.app|localhost:\d+` côté FastAPI
5. **Catégorisation déterministe d'abord** (règles mots-clés en DB), **IA en fallback** uniquement pour les inconnus
6. **Push depuis le terminal local** : la VM Cowork n'a pas accès réseau pour `git push`, Lilian pousse depuis son Mac
7. **520px centré sur fond pleine largeur** : look "app mobile sur fond infini" pour desktop, sans s'étirer

---

## 📜 Historique commits clés

| Date | Commit | Description |
|---|---|---|
| 2026-03-22 | `38ac6e9` | Initial commit — architecture |
| 2026-03-25 | `bdbfa1d` | Fallback IA Claude Haiku |
| 2026-03-26 | `c396712` | 35 sous-catégories granulaires |
| 2026-03-27 | `a2a131e` | Rename Scanner Financier → Senzio |
| 2026-03-27 | `0691dc9` | Multi-devises |
| 2026-03-27 | `a559a2e` | Validation JWT côté backend |
| 2026-04-09 | `abe3bb9` | Sentry monitoring |
| 2026-04-23 | `bf6838e` | **Connexion Powens M2** (Open Banking) |
| 2026-04-24 | `a8aee91` | **Refonte design dark fintech** |
| 2026-04-24 | `8f467ee` | Pages Transactions / Budgets / Goals créées |
| 2026-04-24 | `eb1a61a` | Suppression upload, data 100% bank API |
| 2026-04-25 | `298f416` | **Standardisation layouts** (PageShell, TabHeader, SubHeader) |
| 2026-04-25 | `16ae373` | **Filtre par mois sur Transactions** |

---

*Document généré pour faciliter la reprise du projet ou un export vers un autre outil (Notion, Linear, README).*
