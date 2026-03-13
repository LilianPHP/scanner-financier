# Scanner Financier — Contexte projet pour Claude

> Ce fichier est la **source de vérité** pour toute collaboration sur ce projet.
> Lire ce fichier en priorité avant toute action.

---

## Promesse produit

> Dépose ton relevé bancaire et découvre instantanément où part ton argent.

Scanner Financier est une application web qui permet à un utilisateur d'analyser rapidement un relevé bancaire — pas un ERP, pas un logiciel de comptabilité complet.

Pipeline :
```
Upload relevé → Parsing → Catégorisation → Dashboard financier
```

Aucune connexion bancaire requise. L'utilisateur comprend ses finances en moins de 30 secondes.

---

## État actuel du projet (mars 2026)

- [x] Architecture et structure créées
- [x] Backend FastAPI complet (parsers CSV/XLSX/PDF, services, endpoints REST)
- [x] Frontend Next.js complet (landing, auth Supabase, upload, dashboard)
- [x] Migration SQL Supabase prête (`supabase/migrations/001_init.sql`)
- [ ] **Prochaine étape** : créer le projet Supabase + déployer (voir `docs/GUIDE_DEPLOIEMENT.md`)

L'ancien prototype est conservé dans `legacy/` pour référence.

---

## Product Overview (EN)

---

# User Promise

"Upload your bank statement and instantly see where your money goes."

The system should automatically provide:

- income summary
- expense breakdown
- spending categories
- recurring expenses
- subscriptions
- savings potential
- financial insights

No bank connection is required.

The user only uploads a file.

---

# Supported File Types

Initial MVP must support:

- CSV
- XLS
- XLSX

PDF support may be added later.

---

# Core Features

## User Authentication

Users must be able to:

- create an account
- login
- logout
- access their own financial data

Each user has:

- uploaded files
- parsed transactions
- analysis results

---

## File Upload

Users can upload a bank statement.

Supported formats:

- CSV
- Excel

Frontend must support:

- drag and drop
- file validation
- upload progress indicator

---

## Transaction Parsing

The system extracts transactions from the file.

Fields required:

- date
- label
- amount
- optional balance

Different banks may use different formats.

The parsing layer must normalize all formats.

---

## Transaction Normalization

All transactions must follow the same structure internally.

Example format:

{
date: "2026-03-01",
label_raw: "CB CARREFOUR CITY PARIS",
label_clean: "carrefour city",
amount: -23.90,
direction: "debit",
category: "food",
merchant: "carrefour",
confidence_score: 0.94
}

---

## Automatic Categorization

The system should categorize transactions automatically.

Example categories:

- food
- rent
- transport
- subscriptions
- salary
- internal transfer
- bank fees
- health
- entertainment

Categorization should first rely on deterministic rules.

Example:

netflix → subscription  
spotify → subscription  
uber → transport  
carrefour → food

The user must be able to correct categories manually.

User corrections should create rules for future classification.

---

## Financial Dashboard

The dashboard should display:

### KPIs

- total income
- total expenses
- net cashflow
- savings rate

### Visualizations

- spending by category
- monthly spending trend
- recurring expenses
- detected subscriptions

### Transactions Table

Table must include:

date | label | category | amount

Users must be able to edit the category.

---

# Architecture

The project must follow this architecture.

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
PostgreSQL (Supabase)

↓

File Storage  
Supabase Storage or S3

↓

Optional AI  
LLM for ambiguous categorization

---

# Frontend

Framework:

Next.js

Responsibilities:

- authentication
- file upload
- dashboard UI
- transaction editing
- visualization charts

The frontend must not contain business logic.

The frontend only communicates with the backend API.

---

# Backend

Framework:

FastAPI (Python)

Responsibilities:

- receive uploaded files
- parse files
- normalize transactions
- categorize transactions
- calculate analytics
- store results in database
- return data to frontend

All financial logic must exist in the backend.

---

# Data Processing

Library:

pandas

Used for:

- reading CSV files
- reading Excel files
- cleaning datasets
- normalizing columns
- detecting debit/credit
- grouping transactions
- calculating statistics

---

# Database

Database:

PostgreSQL via Supabase

Tables required:

users  
uploaded_files  
transactions  
analysis_results  
user_rules

---

# File Storage

Uploaded files should be stored in:

Supabase Storage

Files may optionally be deleted after processing.

---

# Optional AI Layer

AI should only be used when deterministic rules fail.

Examples:

unknown merchant name  
ambiguous category

The system can query a language model for category suggestions.

AI must not replace deterministic parsing.

---

# Parsing Pipeline

Upload file  
↓  
Store file  
↓  
Parse transactions  
↓  
Normalize transactions  
↓  
Categorize transactions  
↓  
Compute analytics  
↓  
Store results  
↓  
Return dashboard

---

# Recommended Repository Structure

scanner-financier/

frontend/
Next.js application

backend/
FastAPI application

docs/
architecture documentation

README.md

.env.example

---

# Backend Structure

backend/app/

main.py

api/
routes

parsers/

services/

models/

schemas/

utils/

repositories/

---

# Database Schema

users
id
email
created_at

uploaded_files
id
user_id
filename
file_type
storage_path
created_at

transactions
id
user_id
file_id
date
label_raw
label_clean
amount
direction
category
merchant

analysis_results
id
file_id
income_total
expense_total
cashflow
savings_rate

user_rules
id
user_id
pattern
category

---

# API Endpoints

Auth

POST /auth/signup  
POST /auth/login  
GET /auth/me

Files

POST /files/upload  
GET /files

Transactions

GET /transactions/{file_id}  
PATCH /transactions/{transaction_id}

Analytics

GET /analytics/{file_id}/summary  
GET /analytics/{file_id}/categories  
GET /analytics/{file_id}/timeline

---

# Development Roadmap

Phase 1

Basic architecture

- frontend
- backend
- file upload

Phase 2

Parsing pipeline

- CSV parser
- Excel parser
- normalization

Phase 3

Categorization

- rule-based system

Phase 4

Dashboard

- KPIs
- charts
- transactions table

Phase 5

User accounts

- authentication
- user data isolation

Phase 6

Persistence

- database storage
- history of analyses

Phase 7

Advanced features

- subscription detection
- financial insights
- optional AI classification

---

# Project Philosophy

The project must remain:

simple  
fast  
easy to use  
maintainable  

It must not become a complex accounting ERP.

The goal is a **financial scanner**.

---

# Rules for Claude

Claude must follow these rules when generating code.

Respect the architecture.

Frontend = Next.js

Backend = FastAPI

Data processing = pandas

Database = PostgreSQL

Do not place business logic in the frontend.

Prefer deterministic algorithms over AI.

Avoid overengineering.

Build the MVP incrementally.

Always prioritize simplicity.

---

# Current State

The project already has:

- an initial frontend prototype
- a dashboard prototype
- a first integration with Claude API
- a first version of financial analysis logic in JavaScript

The goal is now to **migrate toward the target architecture**.

Business logic should move from frontend JavaScript to the FastAPI backend.

---

# Long-Term Vision

Possible future features:

- multi-account analysis
- financial forecasting
- automated savings recommendations
- budgeting assistant
- financial scoring

These features are not required for the MVP.