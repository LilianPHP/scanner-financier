# Review UI/UX Senzio

Date : 2026-04-27

## Résumé

Senzio a déjà une base visuelle solide : identité cohérente, mobile-first crédible, contraste globalement correct, navigation simple, et un ton produit plutôt rassurant. L'app donne une impression premium et calme, ce qui est une bonne direction pour de la finance personnelle.

Le principal risque UI/UX n'est pas l'esthétique brute. C'est la confiance : pour une app bancaire, certains flows doivent être plus explicites, plus vérifiables, et moins "magiques". L'utilisateur doit toujours comprendre ce qui est connecté, ce qui est lu, ce qui est stocké, ce qui est révoqué, et ce qui reste dans Senzio après révocation.

Score actuel estimé : 7/10.

Objectif recommandé avant prod sérieuse : 8.5/10, surtout via confiance, conformité, empty states, cohérence navigation, et accessibilité.

## Méthode

- Lecture ciblée du code UI Next.js.
- Vérification du build frontend.
- Inspection navigateur relancée via le navigateur intégré Codex sur `http://127.0.0.1:3000`.
- Tentative Computer Use sur Google Chrome : toujours bloquée côté outil par `Computer Use permissions are not granted`, malgré l'autorisation annoncée côté macOS. L'inspection effective a donc été faite avec le navigateur intégré Codex.
- Captures visuelles inspectées pour :
  - landing;
  - signup;
  - login;
  - onboarding slides 1, 2 et 3;
  - redirections client-side des routes protégées non authentifiées.
- Audit des écrans et composants principaux :
  - landing;
  - login/signup;
  - onboarding;
  - comptes/Powens;
  - dashboard;
  - transactions;
  - budgets;
  - objectifs;
  - profil;
  - règles;
  - navigation mobile/desktop;
  - design tokens globaux.

Limite restante : les écrans authentifiés n'ont pas été parcourus avec une vraie session Supabase/Powens. Leur review reste fondée sur code + structure. Les écrans publics et le comportement de redirection ont bien été vérifiés dans le navigateur.

## Constats Navigateur

- La landing est visuellement propre, lisible, et le CTA principal est visible sans scroll sur mobile.
- Le choix de lumière par défaut rend l'interface plus accessible et moins anxiogène qu'un dark mode forcé.
- Les écrans signup/login sont très calmes et professionnels, avec une bonne hiérarchie.
- L'onboarding est fluide et cohérent visuellement sur les trois slides.
- Le focus clavier est bien visible : après clic, le bouton actif affiche un contour net.
- Les routes protégées redirigent bien vers `/login` sans session, mais la redirection est client-side : pendant un court instant, le shell/nav app peut apparaître avant la bascule.
- L'onboarding confirme une faiblesse déjà notée : il explique Powens, mais ne fait pas encore un vrai récapitulatif de consentement avant le passage vers les comptes.
- La landing reste très conceptuelle : elle vend bien la promesse, mais ne montre toujours pas le produit concret.

## Dark/Light Mode Et Couleurs

Le mode clair est celui observé dans le navigateur lors de l'inspection. Il rend Senzio plus accessible et plus rassurant que le dark mode par défaut pour un produit bancaire grand public. Le dark mode reste cohérent avec l'identité premium, mais il faut vérifier que l'utilisateur peut choisir et que le choix est bien mémorisé.

Point important : les variables `--cat-*` sont définies seulement dans `:root`, donc optimisées surtout pour fond sombre. Elles ne sont pas redéfinies dans `.light`. Plusieurs couleurs de catégories deviennent trop faibles sur fond clair quand elles sont utilisées comme texte, badge ou micro-label.

Contrastes mesurés approximatifs sur fond clair `#F4F4F0` :

- `--cat-abonnements #06B6D4` : 2.20:1.
- `--cat-transport #F59E0B` : 1.95:1.
- `--cat-sante #F87171` : 2.51:1.
- `--cat-revenus #22C55E` : 2.07:1.
- `--cat-courses #1D9E75` : 3.07:1.

Recommandation :
- ajouter des variantes `.light --cat-*` plus foncées pour les usages texte;
- conserver les couleurs actuelles pour fonds, graphes ou pastilles non textuelles;
- idéalement séparer les tokens :
  - `--cat-transport-bg`;
  - `--cat-transport-fg`;
  - `--cat-transport-border`.

Impact : les graphes peuvent rester jolis, mais les libellés colorés et badges doivent passer WCAG AA quand ils portent de l'information.

Fichier concerné :
- `frontend/app/globals.css`

## Abonnements Détectés

La `SubsCard` du dashboard a clairement progressé. Elle donne une valeur mensuelle, une projection annuelle, limite l'affichage à 4 lignes avant expansion, affiche la cadence quand elle n'est pas mensuelle, et propose une action de recatégorisation quand `needs_recategorize` est présent.

Points positifs :
- le total mensuel + annuel est très utile et immédiatement compréhensible;
- la limitation à 4 abonnements évite d'écraser le dashboard;
- l'action "Pas en Abonnements · reclasser" est une bonne idée pour corriger les faux positifs;
- l'état `Reclassement…` est prévu.

Points à améliorer :
- le bouton de reclassification utilise une ampoule emoji, moins sérieux dans un contexte finance;
- le texte "Pas en Abonnements" est utile mais pourrait être plus clair : "Ce n'est pas un abonnement";
- l'action n'explique pas si elle modifie une transaction, plusieurs transactions, ou une règle future;
- les abonnements détectés mériteraient un état "voir les transactions liées";
- la cadence devrait être visible même pour mensuel si cela renforce la compréhension, par exemple "mensuel · 2 fois détecté".

Recommandation :
- garder la carte;
- remplacer l'emoji par une petite icône;
- ajouter un microtexte : "Détection automatique, à confirmer";
- ajouter une action secondaire "Voir les opérations".

Fichier concerné :
- `frontend/app/(app)/dashboard/page.tsx`

## Performance Perçue Et Bundle

Build relancé : OK.

Le build signale toutefois :

```text
ESLint must be installed in order to run during builds: npm install --save-dev eslint
```

Ce n'est pas bloquant pour le build, mais c'est une dette qualité.

Tailles observées dans `next build` :

- First Load JS partagé : 197 kB.
- `/` : 201 kB.
- `/dashboard` : 262 kB.
- `/transactions` : 259 kB.
- `/accounts` : 258 kB.
- `/signup` : 260 kB.
- `/login` : 259 kB.

Lecture UX :
- 197 kB partagé est correct mais un peu élevé pour une app mobile-first.
- Les routes app autour de 258-262 kB restent acceptables, mais à surveiller sur mobile 4G.
- La landing à 201 kB pourrait être plus légère puisqu'elle n'a pas besoin de charger autant d'interface app.

Points LCP/perf perçue :
- la landing n'a pas d'image lourde, donc le LCP est probablement le gros H1;
- les blobs décoratifs CSS ne devraient pas bloquer le LCP, mais peuvent coûter en peinture sur mobile;
- `transition: background 200ms, color 200ms` sur `body` est joli, mais à vérifier au changement de thème;
- le dashboard utilise beaucoup de composants client et animations `useCountUp`, donc la perf perçue dépendra surtout de l'hydratation et du nombre de cartes.

Recommandation :
- installer/configurer ESLint pour que le build soit réellement complet;
- mesurer Lighthouse mobile en production ou preview Vercel;
- mesurer au minimum :
  - LCP;
  - INP;
  - CLS;
  - JS total chargé sur `/`;
  - JS total chargé sur `/dashboard`;
- envisager un découpage plus strict entre routes marketing/auth et routes app;
- charger `recharts` uniquement sur les écrans qui en ont besoin si ce n'est pas déjà tree-shaké.

Objectifs raisonnables :
- LCP mobile landing : < 2.5s.
- CLS : < 0.1.
- INP : < 200ms.
- First Load JS landing : viser < 170 kB à terme.

## Points forts

- Direction visuelle claire : noir profond, vert confiance, cartes sobres, peu de bruit.
- Le mobile-first est assumé et pertinent pour une app de finances personnelles.
- La landing pose vite les trois bénéfices : connecter, comprendre, atteindre ses objectifs.
- Les éléments de confiance Powens / lecture seule / identifiants sont déjà présents à plusieurs endroits.
- Les états loading existent sur plusieurs écrans.
- Les interactions principales ont des états visuels : disabled, loading, toast, active tab.
- Le design system global a des tokens lisibles dans `globals.css`.
- Navigation desktop et mobile séparées proprement.
- Focus visible global prévu via `:focus-visible`.
- `prefers-reduced-motion` est déjà pris en compte.

## P0 - À corriger avant prod

### 1. Navigation mobile incomplète

Le menu mobile ne contient pas `Comptes`, alors que la connexion bancaire est le coeur du produit. Sur desktop, `Comptes` existe dans la sidebar, mais pas dans `BottomNav`.

Impact : un utilisateur mobile peut avoir du mal à revenir au flow bancaire après onboarding ou dashboard.

Recommandation :
- remplacer l'onglet `Budgets` ou `Profil` par `Comptes`, ou ajouter une action centrale "Comptes";
- garder `Profil` accessible depuis l'avatar/header.

Fichier concerné :
- `frontend/components/BottomNav.tsx`

### 2. Flow de révocation encore trop léger côté UX

Le texte de confirmation indique maintenant une vraie révocation fournisseur, c'est bien. Mais pour une app bancaire, un simple `confirm()` navigateur est trop faible.

Impact : manque de confiance et de traçabilité perçue sur une action sensible.

Recommandation :
- remplacer `confirm()` par une modale dédiée Senzio;
- afficher :
  - banque concernée;
  - "l'accès bancaire sera révoqué chez Powens";
  - "les analyses déjà générées restent dans Senzio";
  - option claire pour supprimer aussi les analyses liées, si la politique produit le permet;
  - état de succès distinct "Accès révoqué".

Fichier concerné :
- `frontend/app/(app)/accounts/page.tsx`

### 3. Dashboard dépend trop d'une analyse en sessionStorage

Le dashboard redirige vers `/accounts` si `sessionStorage.analysis` est absent. Pour une app finance sérieuse, l'utilisateur s'attend à retrouver ses dernières analyses après reconnexion, refresh, changement d'appareil ou expiration de session.

Impact : sensation de fragilité, perte de contexte, confiance réduite.

Recommandation :
- charger la dernière analyse depuis l'historique backend/Supabase si `sessionStorage` est vide;
- afficher un état vide orienté action : "Connecter une banque" ou "Voir l'historique";
- ne pas faire dépendre l'écran principal uniquement d'un état navigateur volatile.

Fichier concerné :
- `frontend/app/(app)/dashboard/page.tsx`

### 4. Page règles hors design system principal

`/regles` utilise encore un style Tailwind gris/blanc différent du système Senzio (`bg-[#f5f5f2]`, `dark:bg-[#111110]`, etc.). Elle semble appartenir à une version antérieure.

Impact : rupture de marque, surtout pour une fonction de personnalisation importante.

Recommandation :
- la migrer vers `TabHeader`, `PageShell`, tokens `var(--bg-card)`, `var(--fg-*)`;
- ajouter un accès clair depuis Transactions ou Profil.

Fichier concerné :
- `frontend/app/regles/page.tsx`

## P1 - À améliorer vite

### 5. Landing : bonne, mais pas assez concrète produit

La landing est propre, mais elle ne montre pas vraiment le produit. Pour une app finance, l'utilisateur veut voir ce qu'il obtient après connexion : dashboard, catégories, objectifs, score, lecture seule.

Recommandation :
- ajouter un aperçu produit code-native en dessous du hero;
- montrer un mini-dashboard réaliste avec chiffres anonymisés;
- ajouter une section "Ce que Senzio ne fait pas" :
  - ne voit pas tes identifiants;
  - ne peut pas faire de virement;
  - ne donne pas de conseil financier personnalisé réglementé.

Fichier concerné :
- `frontend/app/(auth)/page.tsx`

### 6. Onboarding trop linéaire et pas assez consentement

L'onboarding explique Powens et la confidentialité, mais le consentement est encore implicite. Le bouton "Commencer" envoie vers `/accounts` sans récapitulatif clair du périmètre.

Recommandation :
- ajouter une slide ou un bloc final "Avant de connecter ta banque";
- préciser :
  - accès lecture seule;
  - durée de synchronisation;
  - révocation possible;
  - données stockées par Senzio;
  - lien vers confidentialité.

Fichier concerné :
- `frontend/app/(auth)/onboarding/page.tsx`

### 7. Le PIN donne une promesse de sécurité ambiguë

Le login/signup affiche un `PinScreen`, mais il faut vérifier si ce PIN protège réellement des données locales ou s'il est surtout cosmétique.

Impact : risque de fausse impression de sécurité.

Recommandation :
- si le PIN n'est pas un vrai verrou local robuste, le présenter comme "code d'accès rapide" plutôt que sécurité forte;
- expliquer que la sécurité principale reste Supabase/Auth + Powens;
- éviter toute formulation qui ferait croire à un chiffrement local si ce n'est pas le cas.

Fichiers concernés :
- `frontend/app/(auth)/login/page.tsx`
- `frontend/app/(auth)/signup/page.tsx`
- `frontend/components/PinScreen.tsx`

### 8. Transactions : pouvoir d'action fort, pédagogie insuffisante

La recatégorisation avec propagation est utile, mais elle doit être très claire : combien de transactions vont être modifiées, selon quelle règle, et comment revenir en arrière.

Recommandation :
- dans le picker catégorie, expliquer "appliquer aux libellés identiques";
- afficher le nombre estimé avant validation si possible;
- proposer une action "annuler" dans le toast;
- ajouter une entrée "Règles mémorisées".

Fichier concerné :
- `frontend/app/(app)/transactions/page.tsx`

### 9. Budgets : aujourd'hui ce sont des suggestions, pas de vrais budgets

La page Budgets calcule des enveloppes à partir des dépenses observées. C'est utile, mais le mot "budget" laisse entendre que l'utilisateur peut définir/modifier des limites.

Recommandation :
- renommer temporairement en "Enveloppes" ou "Repères";
- ou ajouter l'édition des budgets;
- afficher la source : "estimé depuis tes dépenses du mois".

Fichier concerné :
- `frontend/app/(app)/budgets/page.tsx`

### 10. Objectifs : bon emotional design, mais attention au sérieux finance

Les objectifs sont engageants et mobiles. Quelques textes sont très app-like ("goal", "récompenses criardes") et peuvent casser le ton pro.

Recommandation :
- remplacer "goal" par "objectif";
- rendre les projections plus prudentes : "estimation à ce rythme";
- éviter les promesses comportementales trop fortes.

Fichier concerné :
- `frontend/app/(app)/goals/[id]/page.tsx`

## P2 - Polish et cohérence

### 11. Réduire les emojis dans les surfaces sérieuses

Les emojis donnent de la chaleur, mais il y en a beaucoup dans les écrans financiers : banque, objectifs, catégories, empty states, succès.

Recommandation :
- garder quelques emojis pour onboarding/objectifs;
- remplacer les surfaces bancaires par des icônes SVG cohérentes;
- éviter les emojis dans les actions de révocation/suppression.

### 12. Harmoniser les libellés de navigation

Mobile :
- `Accueil`
- `Tx`
- `Budgets`
- `Objectifs`
- `Profil`

Desktop :
- `Dashboard`
- `Transactions`
- `Budgets`
- `Objectifs`
- `Comptes`
- `Profil`

Recommandation :
- remplacer `Tx` par `Transactions`;
- aligner `Accueil` vs `Dashboard`;
- ajouter `Comptes` sur mobile.

### 13. Améliorer les états vides

Les états vides existent mais peuvent être plus orientés workflow.

Recommandation :
- Dashboard vide : connecter une banque + importer un relevé;
- Transactions vide : sélectionner un autre mois ou synchroniser;
- Budgets vide : expliquer qu'ils apparaissent après analyse;
- Règles vide : expliquer comment créer une règle depuis une transaction.

### 14. Ajouter des textes de microcopy sur les erreurs

Certaines erreurs disent seulement "Erreur — réessaie". Pour de la finance, il faut dire si :
- la banque synchronise encore;
- l'accès est expiré;
- Powens est indisponible;
- la session Senzio a expiré;
- le fichier n'est pas supporté.

### 15. Standardiser les boutons dangereux

Suppression règle, déconnexion, révocation banque, suppression objectif : ces actions devraient partager un composant visuel et textuel commun.

Recommandation :
- couleur rouge uniquement pour danger réel;
- modale dédiée pour suppression/révocation;
- toast de succès + action secondaire si récupérable.

## Accessibilité

Points positifs :
- focus visible global;
- `aria-label` présent sur certains boutons icônes;
- contrastes globaux plutôt corrects;
- motion réduite prise en compte.

Points à vérifier/corriger :
- les liens de la bottom nav n'ont pas de `aria-current`;
- plusieurs boutons icônes devraient avoir un `aria-label` plus descriptif;
- les emojis ne doivent pas être les seuls porteurs d'information;
- les listes horizontales de mois doivent rester utilisables clavier;
- les modales/sheets doivent piéger le focus si elles existent;
- les toasts devraient être annoncés via `aria-live`.

## Confiance et conformité UX

À ajouter avant une mise en prod sérieuse :

- Une page ou section "Sécurité" claire :
  - Powens agréé ACPR;
  - lecture seule;
  - pas d'accès aux identifiants bancaires;
  - révocation;
  - stockage des transactions;
  - suppression/export.

- Une distinction claire :
  - analyse de finances personnelles;
  - pas de conseil en investissement personnalisé;
  - pas d'exécution d'opérations bancaires.

- Un parcours "Supprimer mes données" :
  - visible dans Profil;
  - confirmation sérieuse;
  - explique ce qui est supprimé côté Senzio et côté Powens.

- Un parcours "Exporter mes données".

## Priorité recommandée

1. Ajouter `Comptes` dans la bottom nav mobile.
2. Remplacer le `confirm()` de révocation par une vraie modale.
3. Charger le dashboard depuis l'historique si `sessionStorage` est vide.
4. Refaire `/regles` dans le design system Senzio.
5. Ajouter une section sécurité/confiance plus explicite sur onboarding + profil.
6. Clarifier Budgets : estimations vs budgets définis par l'utilisateur.
7. Ajouter `aria-live`, `aria-current`, et labels d'icônes manquants.

## Validation navigateur à faire

Desktop :
- 1440x900 : landing, signup, accounts, dashboard, transactions, budgets, goals, profile.
- Vérifier sidebar, largeur de contenu, densité, scroll, états hover/focus.

Mobile :
- 390x844 : landing, signup, onboarding, accounts, dashboard, transactions, budgets, goals.
- Vérifier bottom nav, safe area, pas de texte tronqué, CTA visibles, cartes non trop hautes.

Flows :
- signup email;
- onboarding complet;
- connexion Powens;
- callback Powens syncing;
- sync bancaire;
- révocation bancaire;
- recatégorisation transaction;
- création/suppression objectif;
- empty states sans analyse.

## Verdict

La direction UI est bonne et mérite d'être conservée : sobre, mobile, premium, pas trop "banque traditionnelle". Le gros travail restant est moins graphique que product UX : rendre chaque action sensible explicite, traçable et rassurante.

Pour Senzio, la confiance est l'interface.
