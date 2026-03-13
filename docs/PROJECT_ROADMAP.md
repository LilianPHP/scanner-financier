# Scanner Financier — Roadmap Technique

Ce document explique à Claude **quoi développer dans quel ordre**.

Le projet suit une logique **MVP progressif**.

Objectif : construire un produit fonctionnel rapidement sans complexité inutile.

---

# Architecture cible

Frontend  
Next.js

↓

Backend  
FastAPI

↓

Data processing  
pandas

↓

Database  
PostgreSQL via Supabase

↓

Storage  
Supabase Storage

↓

IA (optionnelle)

---

# État actuel du projet

Le projet possède déjà :

- un prototype frontend
- une logique d’analyse en JavaScript
- un dashboard simple
- une intégration Claude API

Cependant l'architecture finale doit migrer vers :

Next.js + FastAPI + pandas + Supabase

Le parsing et l'analyse doivent être **déplacés côté backend**.

---

# Priorité globale

1. Stabiliser l'architecture
2. Mettre le parsing côté backend
3. Ajouter les comptes utilisateurs
4. Ajouter la base de données
5. Construire le dashboard complet

---

# Étape 1 — Structurer le projet

Créer la structure suivante :

scanner-financier/

frontend/
Next.js app

backend/
FastAPI app

docs/

README.md

.env.example

---

# Étape 2 — Frontend minimal

Créer un frontend Next.js simple.

Pages nécessaires :

/login  
/signup  
/upload  
/dashboard  

Fonctions frontend :

- upload fichier
- appel API backend
- affichage résultats

---

# Étape 3 — Backend FastAPI

Créer un backend minimal.

Structure :

backend/app/

main.py

api/
upload.py
analytics.py

parsers/
csv_parser.py
xlsx_parser.py

services/
normalization_service.py
categorization_service.py
analytics_service.py

---

# Étape 4 — Upload fichier

Créer endpoint :

POST /files/upload

Le backend doit :

1. recevoir le fichier
2. le sauvegarder temporairement
3. déclencher parsing
4. renvoyer les transactions

---

# Étape 5 — Parsing avec pandas

Créer pipeline :

1. lire fichier
2. détecter colonnes
3. nettoyer données
4. normaliser format

Fonction principale :

parse_transactions(file)

Sortie :

liste de transactions normalisées

---

# Étape 6 — Catégorisation

Créer service :

categorization_service.py

Logique :

matching mots-clés

Exemple :

netflix → abonnement  
uber → transport  
carrefour → alimentation  

Fallback :

category = "autre"

---

# Étape 7 — Analytics

Créer analytics_service.py

Calculer :

revenus total  
dépenses total  
cashflow  
taux d’épargne  

Agrégations :

dépenses par catégorie  
dépenses mensuelles  

---

# Étape 8 — Dashboard frontend

Le dashboard doit afficher :

KPI cards :

revenus  
dépenses  
cashflow  
épargne

Charts :

pie chart catégories  
bar chart mensuel

Table :

liste transactions

---

# Étape 9 — Auth utilisateur

Ajouter auth via Supabase.

Fonctions :

signup  
login  
logout  

Chaque utilisateur doit avoir :

ses transactions  
ses fichiers  

---

# Étape 10 — Base de données

Créer tables :

users  
uploaded_files  
transactions  
analysis_results  

Les transactions doivent être stockées.

---

# Étape 11 — Historique des analyses

Ajouter page :

/history

Afficher :

liste fichiers uploadés  
date analyse  
résumé rapide

---

# Étape 12 — Corrections utilisateur

Permettre :

changer catégorie transaction

Créer endpoint :

PATCH /transactions/{id}

---

# Étape 13 — Détection abonnements

Créer logique simple :

transactions récurrentes
même libellé
intervalle mensuel

---

# Étape 14 — IA (optionnelle)

IA utilisée uniquement pour :

catégories ambiguës

Exemple :

transaction inconnue

LLM propose catégorie probable.

---

# Pipeline final

Upload fichier  
↓  
Parsing pandas  
↓  
Normalisation  
↓  
Catégorisation  
↓  
Analytics  
↓  
Sauvegarde DB  
↓  
Dashboard

---

# Règles pour Claude

Toujours respecter :

Frontend → Next.js  
Backend → FastAPI  
Data → pandas  
DB → PostgreSQL  

---

# Éviter

- logique métier dans le frontend
- complexité inutile
- microservices
- dépendances lourdes
- IA pour parsing

---

# Priorité produit

Le MVP doit être :

simple  
rapide  
clair  

Un utilisateur doit comprendre son budget **en 30 secondes**.

---

# Vision long terme

Extensions possibles :

- analyse multi comptes
- prévision financière
- scoring financier
- recommandations d'épargne
- comparaison budgets

Mais ces fonctionnalités ne sont **pas prioritaires pour le MVP**.