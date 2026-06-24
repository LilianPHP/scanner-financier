# Skill : Audit de site — Scanner Financier

## Contexte projet

**Scanner Financier** est une app web d'analyse financière personnelle.
- **URL prod** : https://scanner-financier-app.vercel.app/
- **URL locale** : http://localhost:3001
- **Stack** : Next.js 14 + Tailwind CSS (frontend) · FastAPI (backend) · Supabase (auth + DB)
- **Pages** : `/` (landing) · `/login` · `/signup` · `/upload` · `/dashboard` · `/history`
- **Utilisateur cible** : particulier français, 25-45 ans, veut comprendre son budget rapidement
- **Promesse** : analyser son relevé bancaire en 30 secondes, sans connexion bancaire

## Pages à auditer

| Page | URL locale | Description |
|------|-----------|-------------|
| Landing | http://localhost:3001/ | Page d'accueil publique |
| Login | http://localhost:3001/login | Connexion |
| Signup | http://localhost:3001/signup | Inscription |
| Upload | http://localhost:3001/upload | Dépôt du relevé |
| Dashboard | http://localhost:3001/dashboard | Résultats de l'analyse |
| History | http://localhost:3001/history | Historique des analyses |

## Critères d'évaluation (chacun noté sur 10)

| Critère | Description |
|---------|-------------|
| **Design visuel** | Cohérence des couleurs, typographie, espacement, hiérarchie visuelle |
| **Ergonomie / UX** | Facilité d'utilisation, clarté des actions, feedback utilisateur |
| **Contenu** | Clarté du message, pertinence des textes, call-to-action |
| **Responsive** | Rendu mobile (375px), tablette (768px), desktop (1280px) |
| **Performance perçue** | Vitesse de chargement, fluidité des transitions |
| **Confiance / Crédibilité** | Éléments rassurants, mentions légales, sécurité visible |

---

## Workflow d'audit

### Étape 1 — Ouvrir l'URL

Navigue vers l'URL demandée (par défaut : http://localhost:3001/).
Si aucune URL n'est précisée, audite toutes les pages listées ci-dessus.

### Étape 2 — Captures d'écran

Pour chaque page :
1. Prends une capture d'écran desktop (largeur par défaut)
2. Si possible, prends une capture mobile (resize à 375px)
3. Stocke les captures pour les inclure dans le rapport

### Étape 3 — Analyse

Pour chaque page capturée, évalue :
- **Design** : cohérence visuelle, palette de couleurs (#f5f5f2 fond, #1D9E75 vert, #E24B4A rouge, #378ADD bleu), typographie, whitespace
- **Ergonomie** : est-ce que l'action principale est évidente ? Y a-t-il des friction points ?
- **Contenu** : les textes sont-ils clairs pour un non-expert ? Les CTAs sont-ils incitatifs ?
- **Responsive** : est-ce que la mise en page tient sur mobile ?
- **Performance perçue** : y a-t-il des états de chargement ? Des animations ?
- **Confiance** : est-ce que l'utilisateur se sent en sécurité pour uploader ses données bancaires ?

### Étape 4 — Notation

Attribue une note de 0 à 10 pour chaque critère, avec une justification courte.
Calcule la moyenne globale.

### Étape 5 — Génère le rapport HTML

Crée un fichier `/tmp/audit-scanner-financier.html` avec :

```
Structure du rapport :
├── En-tête : titre, date, URL auditée, score global (badge coloré)
├── Captures d'écran (si disponibles)
├── Tableau des scores (critère · note /10 · commentaire)
├── Section "3 Points forts" (icône ✅)
├── Section "3 Points à améliorer" (icône ⚠️)
└── Section "Recommandations concrètes" (liste priorisée avec effort estimé)
```

**Style du rapport** :
- Fond blanc, police system-ui
- Score global : vert si ≥ 7, orange si 5-7, rouge si < 5
- Tableau avec barres de progression colorées pour chaque note
- Recommandations avec badge priorité : 🔴 Critique · 🟡 Moyen · 🟢 Amélioration

### Étape 6 — Ouvrir dans le preview

Démarre un serveur preview sur le fichier HTML généré et affiche-le.
Utilise `preview_start` avec le fichier comme serveur statique si possible,
sinon ouvre-le directement dans le navigateur via `navigate`.

---

## Exemple d'appel

```
/audit-site                          → audit la landing (localhost:3001)
/audit-site https://mon-site.com     → audit une URL spécifique
/audit-site all                      → audit toutes les pages du projet
```

---

## Notes spécifiques au projet

- Le dashboard nécessite une session active → si non connecté, auditer la landing + login + signup
- Les couleurs brand : vert `#1D9E75` · rouge `#E24B4A` · bleu `#378ADD` · fond `#f5f5f2`
- Le point de friction principal connu : l'utilisateur doit faire confiance à l'app pour uploader ses données bancaires → la page upload doit être rassurante
- Mobile : priorité au dashboard (les utilisateurs vérifieront leur budget sur mobile)
- Comparer avec la version déployée (Vercel) vs locale si les deux sont accessibles
