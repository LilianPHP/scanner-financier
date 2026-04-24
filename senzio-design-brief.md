# Prompt Claude Design — Senzio, prototype dashboard

## Contexte produit

Senzio est une **application web d'analyse de finances personnelles**. Deux voies d'ingestion des données :
1. Connexion bancaire via **Open Banking** (preferred path)
2. **Upload CSV/XLSX** d'un relevé bancaire — **le PDF est explicitement interdit** : l'input file de la page upload ne doit accepter que `.csv` et `.xlsx`, et l'UI ne doit jamais mentionner ou suggérer le PDF (ni texte, ni icône)

L'app catégorise automatiquement les transactions et affiche un dashboard avec KPIs, donut par catégorie, bar chart mensuel revenus/dépenses, détection d'abonnements récurrents, et liste de transactions filtrables.

**Stack** : Next.js 14 + Tailwind CSS.
**Pages existantes** : `/login`, `/upload`, `/accounts`, `/dashboard`.
**Scope de ce prototype** : **uniquement le `/dashboard`**, mais poussé et abouti.

## Cible & promesse

**Persona principal** : jeunes actifs 25-35 ans, fintech-savvy, déjà utilisateurs de Revolut ou N26. Ils comprennent les graphs, aiment la densité propre, attendent un standard UI élevé. Pas besoin d'infantiliser, pas de mascotte, pas de ton "coach bienveillant".

**Promesse centrale** : faire ses comptes sans friction, **comme un jeu motivant**. Le bench de référence pour la mécanique de motivation est Yazio (calories → progress bar) et Uber Eats (objectifs de courses → barre qui se remplit). On transpose ce pattern à la finance : l'utilisateur se fixe un objectif, l'app rend visible et satisfaisant le fait de progresser vers cet objectif.

## Positionnement design

**Un seul angle clair : fintech dark sérieux, avec la gamification injectée dans les micro-moments.**

- **Base structurelle** : Revolut / Bitstack / Ledger — dark mode, dense, pro, rassurant, hiérarchie typographique stricte type Linear.
- **Couche ludique** : micro-animations sur la progress bar du goal, compteurs qui s'animent au chargement, micro-célébrations subtiles sur milestones (10/25/50/75/100%), hover states soignés, easing sur les interactions.
- **Ce qu'on NE veut PAS** : pas de confettis qui spam, pas de mascotte, pas de couleurs pastel, pas de badges RPG criards, pas de ton "bravo !" infantilisant. La gamification se sent, elle ne se crie pas.

**Arbitrage clé sur la densité** :
> **Hero goal ultra aéré (zone Yazio), tout le reste en-dessous densifié (zone fintech).**
> Le bloc hero en haut du dashboard respire, avec un seul chiffre dominant et la progress bar comme héroïne. Dès qu'on scrolle en-dessous, on rentre dans l'univers dense fintech (KPIs trio, bar chart, donut, listes). Cette respiration crée la promesse visuelle dès l'ouverture.

## Design tokens

**Mode** : dark uniquement (pas de toggle light pour ce proto).

**Couleurs**
- Fond page : `#0A0A0A` (quasi-noir anthracite)
- Cards : `#141414` à `#1A1A1A` avec border `rgba(255, 255, 255, 0.06)`
- **Primary (accent vert)** : `#1D9E75` — vert néon désaturé, mature, énergique sans crypto-bro. À utiliser pour : progress bars, KPIs positifs, CTAs principaux, highlights dans les graphs.
- Accent negative (dépenses, chute) : rouge-orange type `#F87171` ou `#FB7185`
- Text primary : `#FAFAFA`
- Text secondary : `rgba(255, 255, 255, 0.6)`
- Text tertiary / muted : `rgba(255, 255, 255, 0.4)`

**Typography**
- Font : Inter ou Geist Sans
- Hiérarchie : gros chiffres pour le hero goal (48-64px), titres section 18-20px semibold, body 14-15px, caption/meta 12-13px.
- Tabular numerals sur tous les montants (`font-variant-numeric: tabular-nums`).

**Shapes & spacing**
- Radius : `rounded-2xl` (16px) sur les cards, `rounded-xl` sur les chips/buttons.
- Shadows : très subtiles ou inexistantes (le dark mode s'appuie sur les borders, pas les ombres).
- Spacing généreux sur le hero, resserré sur les zones denses en-dessous.

## Cœur gamification : le main goal

**Un seul main goal actif à la fois**, qui domine toute l'expérience.

Au setup (pas dans le scope de ce proto, mais à anticiper), l'utilisateur choisit son type de goal parmi :
- Épargner (générique, ex: "Épargne de sécurité 3000€")
- Projet ciblé (ex: "Voyage Japon 5000€")
- Investir (ex: "Portefeuille 10 000€")
- Autre adapté — l'app peut suggérer un type basé sur les flux détectés

Chaque goal a : un **nom**, un **montant cible**, un **montant courant**, un **horizon temporel** (deadline optionnelle), et une **progression** (%).

**Célébrations sur jalons** : à 10%, 25%, 50%, 75%, 100% — un micro-moment visuel (animation de la barre qui pulse, glow autour du pourcentage, micro-toast). **Jamais de confettis full-screen.**

## Dashboard — structure mobile-first, scroll vertical

Format principal : **mobile-first** (viewport ~380-430px), responsive desktop ensuite. Le proto doit être d'abord conçu pour mobile, puis s'étirer proprement en desktop.

### 1. Hero goal (above the fold, aéré)

Bloc hero pleine largeur, hauteur généreuse (~40-50% du viewport mobile).
- Label meta en haut : "Objectif en cours"
- **Nom du goal** (ex: "Voyage Japon 2027") — titre large
- **Progress bar horizontale épaisse** (8-12px), coins arrondis, fond `rgba(255,255,255,0.08)`, remplissage `#1D9E75` avec un léger glow/halo.
- **Chiffre dominant** : `2 340 € / 5 000 €` — le "2 340" doit être énorme (48-64px), le reste plus discret.
- **Pourcentage** : "47 %" avec animation de compteur au chargement.
- **Contexte temps** : "8 mois pour atteindre" ou "À ce rythme : mars 2027".
- **Delta du mois** : micro-stat "+312 € vers ce goal ce mois-ci" en vert.

### 1-bis. Empty state du hero goal

Si l'utilisateur n'a pas encore défini de goal :
- Remplacer le hero par un **CTA plein-largeur** : **"Définir ton premier objectif"**
- Accompagné d'une sous-ligne courte : "Choisis ton projet, on te montre comment y arriver."
- Style : grosse card avec le CTA en vert `#1D9E75`, icône suggestive (target, flag, rocket).
- Le reste du dashboard en-dessous reste visible et fonctionnel.

### 2. Trio KPI du mois (3 cards côte à côte sur mobile serré ou stack sur très petit écran)

Trois petites cards alignées :
- **Revenus** — ex: `3 200 €`, sous-label "ce mois-ci", variation `+4 % vs mois dernier` (vert)
- **Dépenses** — ex: `2 150 €`, variation `-8 % vs mois dernier` (vert car baisse = positif)
- **Épargné** — ex: `1 050 €`, calculé = Revenus − Dépenses, variation vs mois dernier

Chaque card : titre caption en haut, gros chiffre au centre (tabular nums), variation en bas avec flèche ↑ ou ↓.

### 3. Bar chart mensuel revenus vs dépenses

Graph sur les **6 derniers mois** (extensible 12 sur desktop).
- Double barre par mois : revenus (vert `#1D9E75`) et dépenses (rouge-orange) côte à côte.
- L'écart visuel entre les deux = l'épargne (lecture instantanée).
- Tap sur une barre → tooltip avec les chiffres exacts du mois.
- Axe Y discret, grid lines très subtiles.

### 4. Donut chart répartition par catégorie (mois courant)

- Donut, pas un pie (évidement central avec le total affiché au centre : ex "2 150 €" + "Dépenses du mois").
- 5-7 catégories max (Courses, Sorties, Transport, Logement, Abos, Shopping, Autre).
- Palette : variations autour du vert primary + couleurs complémentaires cohérentes dark (pas saturées).
- Légende à droite (desktop) ou en-dessous (mobile) avec montant + %.
- **Interactif** : tap sur un segment de donut → filtre la liste de transactions en bas.

### 5. Bloc abonnements récurrents détectés

Card dédiée "Tes abonnements récurrents" :
- Total mensuel en gros chiffre (ex: `48,70 €/mois`)
- Liste de 3-4 abonnements détectés (Netflix, Spotify, iCloud, salle de sport) avec logo/icône, nom, fréquence, montant.
- CTA secondaire : "Voir tous" ou "Faire le ménage" (ce dernier est plus incitatif sans être agressif).

### 6. Transactions récentes

- **10-15 dernières transactions** affichées.
- Au-dessus : **chips horizontales scrollables** pour filtrer par catégorie : `Tout` · `Courses` · `Sorties` · `Transport` · `Abos` · `Shopping` · ...
  - Chip active : fond vert `#1D9E75` texte sombre.
  - Chip inactive : fond `rgba(255,255,255,0.05)` border subtile.
- Chaque ligne transaction : icône/emoji catégorie · merchant (bold) · catégorie (caption) · date · montant (tabular nums, rouge si négatif, vert si positif).
- CTA bottom : "Voir toutes les transactions" (lien secondaire).

## Do / Don't (garde-fous anti-drift)

**À faire**
- Respiration dans le hero, densité en-dessous.
- Progress bar du goal animée au chargement (de 0 à %target, durée ~800ms, easing out).
- Tabular numerals partout.
- Contraste WCAG AA minimum sur tous les textes et data-viz.
- Micro-interactions soignées (hover, tap feedback).

**À ne pas faire**
- Pas de gradient criard, pas de couleurs pastel.
- Pas de confettis, pas de mascotte, pas de badges RPG.
- Pas de ton "Bravo champion !" — le ton reste factuel et pro, la motivation vient de la visualisation du progrès, pas du copy.
- Pas de mention ou possibilité d'upload PDF nulle part (même si cette page n'est pas dans le scope, la cohérence globale compte).
- Pas de cards blanches sur fond dark — on reste en monochrome dark.

## Deliverable attendu

Un **prototype HTML/Tailwind complet et scrollable** du dashboard mobile-first (avec breakpoint desktop propre), utilisant des données réalistes et cohérentes (un persona fictif avec un goal "Voyage Japon 5000€", des revenus autour de 3200€/mois, des dépenses réparties sur plusieurs catégories, 3-4 abonnements détectés, 12-15 transactions datées).

Inclure :
- L'état nominal (avec goal actif)
- Une variante de l'empty state du hero ("Définir ton premier objectif")
- Les animations CSS sur la progress bar et les compteurs
- Responsive desktop propre (le mobile reste le format de référence, le desktop est une extension, pas une refonte).
