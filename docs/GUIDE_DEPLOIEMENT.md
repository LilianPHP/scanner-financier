# Guide de déploiement — Scanner Financier

Architecture : Next.js (Vercel) + FastAPI (Railway) + Supabase

---

## Étape 1 — Créer le projet Supabase (5 min)

1. Va sur [supabase.com](https://supabase.com) → **New project**
2. Donne-lui un nom : `scanner-financier`
3. Choisis une région Europe (Frankfurt)
4. Attends la création (~1 min)

### Récupérer les clés API

Dans ton projet Supabase → **Settings → API** :
- `Project URL` → c'est ton `SUPABASE_URL`
- `anon public` → c'est ton `SUPABASE_ANON_KEY`
- `service_role secret` → c'est ton `SUPABASE_SERVICE_KEY`

### Créer les tables

Dans Supabase → **SQL Editor** → colle le contenu de `supabase/migrations/001_init.sql` → **Run**

---

## Étape 2 — Déployer le backend sur Railway (10 min)

1. Va sur [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
2. Connecte ton repo GitHub (push ton code d'abord si nécessaire)
3. Sélectionne le dossier `backend/` comme **Root Directory**
4. Railway détecte automatiquement Python via le `Procfile`

### Variables d'environnement Railway

Dans ton service Railway → **Variables** → ajouter :

```
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
POWENS_DOMAIN=senzio-sandbox
POWENS_CLIENT_ID=...
POWENS_CLIENT_SECRET=...
FRONTEND_URL=https://scanner-financier.vercel.app
```

5. Railway génère une URL publique, ex : `https://scanner-financier-api.railway.app`

---

## Étape 3 — Déployer le frontend sur Vercel (5 min)

1. Va sur [vercel.com](https://vercel.com) → **New Project**
2. Importe ton repo GitHub
3. Configure le **Root Directory** sur `frontend/`
4. Framework : **Next.js** (auto-détecté)

### Variables d'environnement Vercel

Dans ton projet Vercel → **Settings → Environment Variables** :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_BACKEND_URL=https://scanner-financier-api.railway.app
```

5. **Redeploy** après avoir ajouté les variables

---

## Étape 4 — Configurer l'auth Supabase (2 min)

Dans Supabase → **Authentication → URL Configuration** :

- **Site URL** : `https://scanner-financier.vercel.app`
- **Redirect URLs** : `https://scanner-financier.vercel.app/**`

---

## Tester en local

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # ou venv\Scripts\activate sur Windows
pip install -r requirements.txt
cp .env.example .env  # puis remplir les valeurs
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local  # puis remplir les valeurs
npm run dev
```

Ouvre http://localhost:3000

---

## Structure du projet

```
scanner-financier/
├── frontend/              ← Next.js → Vercel
│   ├── app/
│   │   ├── page.tsx       ← Landing page
│   │   ├── login/         ← Connexion
│   │   ├── signup/        ← Inscription
│   │   ├── upload/        ← Upload du relevé
│   │   └── dashboard/     ← Dashboard d'analyse
│   └── lib/
│       ├── supabase.ts    ← Client Supabase
│       └── api.ts         ← Appels backend + helpers
│
├── backend/               ← FastAPI → Railway
│   └── app/
│       ├── main.py        ← Entrée FastAPI
│       ├── api/           ← Endpoints REST
│       ├── parsers/       ← CSV, XLSX, PDF
│       └── services/      ← Normalisation, catégorisation, analytics
│
├── supabase/
│   └── migrations/        ← SQL à exécuter dans Supabase
│
└── docs/
    └── GUIDE_DEPLOIEMENT.md
```
