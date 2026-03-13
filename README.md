# Scanner Financier

> Dépose ton relevé bancaire et découvre instantanément où part ton argent.

Application web d'analyse financière personnelle — upload CSV/XLS/XLSX/PDF → dashboard automatique.

---

## Structure

```
scanner-financier/
├── frontend/          ← Next.js → déployer sur Vercel
├── backend/           ← FastAPI (Python) → déployer sur Railway
├── supabase/          ← migrations SQL → exécuter dans Supabase
├── docs/              ← documentation
│   ├── CLAUDE_CONTEXT.md     ← contexte projet complet pour Claude
│   ├── PROJECT_ROADMAP.md    ← feuille de route
│   └── GUIDE_DEPLOIEMENT.md  ← guide de déploiement pas-à-pas
└── legacy/            ← ancien prototype HTML/JS (référence uniquement)
```

## Démarrage rapide

Voir [`docs/GUIDE_DEPLOIEMENT.md`](docs/GUIDE_DEPLOIEMENT.md) pour les instructions complètes.

En résumé :
1. Créer un projet Supabase + exécuter `supabase/migrations/001_init.sql`
2. Déployer `backend/` sur Railway
3. Déployer `frontend/` sur Vercel
4. Configurer les variables d'environnement (voir `.env.example`)

## Stack

- **Frontend** : Next.js 14, TypeScript, Tailwind CSS, Supabase Auth
- **Backend** : FastAPI, pandas, pdfplumber, supabase-py
- **Base de données** : PostgreSQL via Supabase
- **Déploiement** : Vercel (frontend) + Railway (backend)
