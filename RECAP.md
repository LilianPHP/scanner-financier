# Senzio — Récap projet & feuille de route

> Dernière mise à jour : 9 avril 2026
> Pour reprendre une conversation : donne ce fichier à Claude avec le message "reprends le projet Senzio à partir du RECAP.md"

---

## 1. C'est quoi Senzio ?

Application web d'analyse de relevés bancaires personnels.
L'utilisateur dépose un fichier (CSV, XLSX, PDF) et obtient en 30 secondes :
- KPIs : revenus, dépenses, cashflow, taux d'épargne
- Graphiques : pie chart par catégorie + bar chart mois/mois
- Tableau de transactions recatégorisables
- Détection d'abonnements
- Export XLSX du dashboard
- Historique des analyses passées

**URL production :** https://senzio.app
**Repo GitHub :** https://github.com/LilianPHP/scanner-financier (branche `main`)

---

## 2. Stack technique

| Composant | Technologie | Hébergement |
|-----------|-------------|-------------|
| Frontend | Next.js 14 + Tailwind + Recharts | Vercel |
| Backend | FastAPI (Python 3.13) | Railway |
| Base de données | PostgreSQL via Supabase | Supabase |
| Auth | Supabase Auth (JWT ES256) | Supabase |
| Parsing | pandas + openpyxl + pdfplumber | Railway |
| Devises | API Frankfurter (taux de change) | externe |

**Déploiement :** `git push origin main` → Vercel + Railway déploient automatiquement.

---

## 3. Ce qui est fait et fonctionnel ✅

### Backend
- Upload + parsing CSV / XLSX / PDF
- Parseur XLSX robuste : gère métadonnées, totaux, tableaux secondaires, dates "4 & 5/3/26"
- Catégorisation déterministe par règles mots-clés (pas d'IA)
- Règles personnalisées mémorisables par utilisateur
- Analytics : summary, by_category, timeline, subscriptions
- Multi-devises : AUD, USD, GBP, JPY, CHF… (conversion via Frankfurter)
- Rate limiting (10 uploads/heure par utilisateur)
- Erreurs claires côté frontend (422 au lieu de 500 vide)

### Frontend
| Page | URL | État |
|------|-----|------|
| Landing | / | ✅ |
| Inscription | /signup | ✅ |
| Connexion | /login | ✅ |
| Upload | /upload | ✅ |
| Dashboard | /dashboard | ✅ |
| Historique | /history | ✅ |
| Règles | /regles | ✅ |
| Mentions légales | /mentions-legales | ✅ |
| Confidentialité | /confidentialite | ✅ |

### Features dashboard
- KPIs dynamiques (se recalculent en temps réel si on change une catégorie)
- Pie chart dynamique ✅
- Bar chart mois/mois avec variation % ✅
- Détection épargne/investissement avec bannière de confirmation ✅
- Section abonnements détectés ✅
- Tableau transactions avec recherche + recatégorisation ✅
- Propagation de catégorie (reclasser tous les doublons) ✅
- Mémorisation de règles ("Mémoriser →") ✅
- Export XLSX du dashboard ✅
- Dark mode ✅
- Déconnexion partout ✅

---

## 4. Derniers commits (session avril 2026)

```
64bfb45  fix: favicon public/favicon.svg → graphique en barres
8e8a741  fix: restaurer favicon graphique en barres (ancien favicon)
2afea00  design: logos plus grands + favicon "s" restauré
a578b3b  fix: corrections mineures avant tests utilisateurs
34fa879  fix: supprimer les traces de debug dans l'endpoint upload
d198354  fix: XLSX — filtrage agrégats, tableau secondaire, dates composées
...
```

### Détail des fixes session avril 2026
1. **Parseur XLSX** : gestion dates "4 & 5/3/26", filtrage lignes TOTAL, tableau revenus secondaire, pas de forward-fill
2. **`files.py`** : suppression des `import traceback` de debug
3. **Dashboard export** : `||` au lieu de `??` pour le nom de fichier (fix quand rechargé depuis l'historique)
4. **`loadAnalysis`** : le nom du fichier est maintenant passé depuis l'historique
5. **Signup** : lien "Se connecter" en vert (cohérence charte)
6. **Logos** : agrandis sur toutes les pages (signup/login 46px, landing 40px, upload 36px)
7. **Login** : logo centré seul + "← Retour à l'accueil" en dessous
8. **Favicon** : `public/favicon.svg` = graphique en barres (le bon)

---

## 5. Pour les tests utilisateurs

### Ce qui fonctionne bien
- CSV français (BNP, CA, SG, Boursorama, Revolut, N26, LCL…)
- XLSX budget personnel (testé avec "Suivi budget Australie.xlsx" : 268 transactions)
- Recatégorisation + mémorisation des règles
- Historique + rechargement d'une analyse passée
- Export XLSX

### Limitations connues
- **PDF** : fonctionne si le PDF a une vraie structure de tableau. Les PDFs scannés (images) ne marchent pas. Les montants sans signe "-" apparaissent positifs (limitation pdfplumber).
- **Cold start Railway** : premier upload après inactivité prend 10-20s (message "Le serveur se réveille" affiché automatiquement)
- **Rate limit** : 10 uploads/heure par compte

### Conseil aux testeurs
> Préfère **CSV ou XLSX** en premier choix. Le PDF en dernier recours.
> Si erreur au premier upload → réessaie (cold start Railway).

### Créer un compte test
1. Aller sur https://senzio.app
2. Cliquer "Commencer"
3. Renseigner email + mot de passe (6 car. min)
4. Confirmer l'email reçu
5. Se connecter → uploader un relevé

---

## 6. Ce qui reste à faire

### Priorité haute — avant / pendant les tests
- [ ] **Affiner la catégorisation** : certaines transactions tombent en "Autres" ou "Salaire" par défaut. Ajouter des règles pour Lydia, Paylib, grandes surfaces régionales, opérateurs télécom…
- [ ] **Tester avec des relevés français réels** (BNP, CA, SG, Boursorama) pour détecter des bugs de parsing

### Priorité moyenne — post-tests
- [ ] **IA fallback catégories** : si aucune règle ne matche, envoyer le libellé à Claude (`ANTHROPIC_API_KEY` déjà configurée sur Railway)
- [ ] **Analyse multi-fichiers** : agréger plusieurs mois / comptes dans un même dashboard
- [ ] **Filtres sur le dashboard** : filtrer par mois, catégorie, montant min/max

### Idées futures
- [ ] Export PDF du dashboard (résumé imprimable)
- [ ] Notifications / alertes budget ("Tu as dépassé ton budget loisirs ce mois")
- [ ] Comparaison mois par mois sur l'historique

---

## 7. Architecture fichiers clés

```
scanner-financier/
├── frontend/
│   ├── app/
│   │   ├── page.tsx              # Landing
│   │   ├── login/page.tsx        # Connexion
│   │   ├── signup/page.tsx       # Inscription
│   │   ├── upload/page.tsx       # Upload fichier
│   │   ├── dashboard/page.tsx    # Dashboard principal ⭐
│   │   ├── history/page.tsx      # Historique analyses
│   │   ├── regles/page.tsx       # Règles mémorisées
│   │   └── icon.svg              # Favicon (graphique en barres)
│   ├── components/
│   │   └── SenzioLogo.tsx        # Logo wordmark
│   ├── lib/
│   │   ├── api.ts                # Tous les appels backend ⭐
│   │   └── supabase.ts           # Client Supabase
│   └── public/
│       ├── favicon.svg           # Favicon (graphique en barres)
│       └── logo-glass.svg        # Logo utilisé partout
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── files.py          # POST /files/upload ⭐
│   │   │   ├── transactions.py   # GET/PATCH /transactions
│   │   │   ├── analytics.py      # GET /analytics/{id}/...
│   │   │   └── rules.py          # GET/POST/DELETE /rules
│   │   ├── parsers/
│   │   │   ├── csv_parser.py     # Parser CSV multi-banques
│   │   │   ├── xlsx_parser.py    # Parser XLSX ⭐ (le plus complexe)
│   │   │   └── pdf_parser.py     # Parser PDF (tables + texte)
│   │   └── services/
│   │       ├── normalization.py  # Nettoyage dates/montants ⭐
│   │       ├── categorization.py # Règles de catégorisation
│   │       └── analytics.py      # Calculs KPIs + abonnements
│   └── requirements.txt
│
└── RECAP.md                      # CE FICHIER
```

---

## 8. Variables d'environnement importantes

### Backend (Railway)
```
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
ANTHROPIC_API_KEY=... (configuré, pas encore utilisé)
```

### Frontend (Vercel)
```
NEXT_PUBLIC_BACKEND_URL=https://scanner-financier-production.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## 9. Comment reprendre ce projet dans une nouvelle conversation

1. Donne ce fichier à Claude : "reprends le projet Senzio à partir du RECAP.md"
2. Claude lit ce fichier + les fichiers clés du repo
3. On repart directement sur la prochaine tâche

**Commandes utiles :**
```bash
# Vérifier l'état du repo
cd ~/Desktop/scanner-financier && git log --oneline -10

# Pousser les changements
git push origin main

# Déploiement auto sur Vercel + Railway après le push
```
