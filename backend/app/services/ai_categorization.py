"""
Fallback IA pour les transactions non catégorisées par les règles keyword.
Utilise Claude Haiku 4.5 avec batching, prompt caching et cache Supabase persistant.

Architecture (optimisations coût) :
- Modèle : Claude Haiku 4.5 (3× moins cher que Sonnet, suffisant pour la tâche)
- Prompt caching Anthropic (cache_control) sur le system prompt → 90% off sur le cache hit
- Cache à 2 niveaux :
    1. mémoire (instance Railway) — accès O(1)
    2. table Supabase `ai_categorization_cache` — partagée entre déploiements et instances
- Batch unique : si la réponse JSON est invalide, fallback "autres" (pas N appels)
- Résultat garanti pour chaque label (au pire "autres")
"""
import os
import json
import time
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# Cache mémoire : label normalisé → catégorie. Mise à jour à chaque appel,
# alimenté au démarrage par la table Supabase pour les labels les plus utilisés.
_CACHE: Dict[str, str] = {}
_CACHE_PRELOADED = False

VALID_CATEGORIES = {
    "alimentation", "logement", "transport", "loisirs", "abonnements",
    "salaire", "frais bancaires", "sante", "investissement", "epargne",
    "impots", "autres",
}

# Modèle utilisé pour le fallback. Haiku 4.5 est ~3× moins cher que Sonnet 4.5
# et largement capable pour classer un libellé parmi 12 catégories.
_MODEL = "claude-haiku-4-5"

_SYSTEM_PROMPT = """Tu es un expert en classification de relevés bancaires français.
Tu reçois des libellés de transactions (déjà nettoyés) et tu dois les catégoriser.

CONTEXTE : Banques françaises (Crédit Agricole, BNP, SG, LCL, Boursorama...).
Certains marchands ont des noms anglais (ex: "Childers Pharmacy", "Amazon").

Catégories disponibles — utilise EXACTEMENT ces noms :
- alimentation  : supermarché, épicerie, boulangerie, restaurant, fast-food, livraison repas
- logement      : loyer, électricité (EDF/Engie), eau, gaz, assurance habitation, électroménager, meubles
- transport     : carburant, SNCF/RATP, taxi, VTC (Uber/Bolt), péage, parking, location voiture
- loisirs       : cinéma, concert, musée, sport, fitness, voyage, hôtel, jeux vidéo, shopping (vêtements, high-tech)
- abonnements   : téléphone mobile, internet, streaming (Netflix, Spotify, Disney+), logiciels, presse
- salaire       : salaire, virement employeur, indemnités chômage, allocations CAF, retraite
- frais bancaires : cotisation carte/offre bancaire, agios, commission, frais tenue de compte
- sante         : pharmacie (pharmacy en anglais), médecin, dentiste, opticien, kiné, mutuelle, clinique
- investissement: crypto (Bitstack, Coinbase, Binance...), bourse, ETF, PEA, trading
- epargne       : virement vers livret A, LDDS, PEL, CEL, virement épargne perso
- impots        : impôts sur le revenu, taxes foncières, URSSAF, cotisations sociales, France Travail (débit)
- autres        : virement personnel ambigu, remboursement entre particuliers, vraiment indéterminable

RÈGLES MÉTIER :
1. "pharmacy" ou "pharmacie" → toujours "sante"
2. France Travail / Pôle Emploi en CRÉDIT (+) → "salaire" ; en DÉBIT (-) → "impots"
3. Virement vers soi-même (livret, PEL, CEL) → "epargne"
4. Prélèvement téléphone/internet même si opérateur inconnu → "abonnements"
5. En cas de doute entre deux catégories proches → choisis la plus probable
6. "autres" seulement si vraiment impossible à déterminer

Réponds UNIQUEMENT avec un objet JSON valide sur une seule ligne.
Format exact (respecte les guillemets et virgules) :
{"libellé 1": "catégorie1", "libellé 2": "catégorie2"}
Zéro commentaire. Zéro explication. Juste le JSON."""


def _normalize_key(text: str) -> str:
    """Normalise un libellé pour comparaison : minuscule + espaces normalisés."""
    return " ".join(text.lower().split())


def _extract_json(raw: str) -> Optional[Dict[str, str]]:
    """Extrait un dict JSON depuis une réponse texte, même avec du texte autour."""
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start == -1 or end == 0:
        return None
    candidate = raw[start:end]
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        pass
    try:
        import re
        fixed = re.sub(r",\s*}", "}", candidate)
        fixed = re.sub(r",\s*]", "]", fixed)
        return json.loads(fixed)
    except (json.JSONDecodeError, Exception):
        return None


def _find_category_for_label(label: str, ai_result: Dict[str, str]) -> str:
    """Cherche la catégorie d'un label dans le résultat IA. Tolérant casse/espaces."""
    if label in ai_result:
        return ai_result[label]
    norm_label = _normalize_key(label)
    for key, value in ai_result.items():
        if _normalize_key(key) == norm_label:
            return value
    for key, value in ai_result.items():
        norm_key = _normalize_key(key)
        if len(norm_key) >= 5 and (norm_key in norm_label or norm_label in norm_key):
            return value
    return "autres"


# ── Persistent Supabase cache ────────────────────────────────────────────────
def _supabase_cache_read(labels_normalized: List[str]) -> Dict[str, str]:
    """Lit la table ai_categorization_cache pour les labels demandés."""
    if not labels_normalized:
        return {}
    try:
        from app.db.client import get_supabase
        sb = get_supabase()
        resp = (
            sb.table("ai_categorization_cache")
            .select("label_normalized, category")
            .in_("label_normalized", labels_normalized)
            .execute()
        )
        return {row["label_normalized"]: row["category"] for row in (resp.data or [])}
    except Exception as e:
        logger.warning(f"Cache Supabase read échoué (ignoré) : {e}")
        return {}


def _supabase_cache_write(label_to_category: Dict[str, str]) -> None:
    """Upsert la table ai_categorization_cache avec les nouveaux résultats."""
    if not label_to_category:
        return
    try:
        from app.db.client import get_supabase
        sb = get_supabase()
        rows = [
            {"label_normalized": label, "category": category}
            for label, category in label_to_category.items()
        ]
        sb.table("ai_categorization_cache").upsert(
            rows, on_conflict="label_normalized"
        ).execute()
    except Exception as e:
        logger.warning(f"Cache Supabase write échoué (ignoré) : {e}")


# ── Anthropic call ───────────────────────────────────────────────────────────
def _call_batch(client, labels: List[str]) -> Optional[Dict[str, str]]:
    """
    Appel batch à l'API Claude avec prompt caching.

    `cache_control: ephemeral` sur le system prompt → Anthropic le met en cache
    pendant 5 minutes. Les appels suivants dans cette fenêtre paient 90% moins
    cher pour la portion cachée. Idéal quand plusieurs users syncent en burst.
    """
    labels_text = "\n".join(f'"{l}"' for l in labels)
    message = client.messages.create(
        model=_MODEL,
        max_tokens=2048,
        system=[
            {
                "type": "text",
                "text": _SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{
            "role": "user",
            "content": f"Catégorise ces {len(labels)} libellés bancaires :\n{labels_text}"
        }],
    )
    raw = message.content[0].text.strip()

    # Log usage (incluant cache hits) pour suivre les économies
    try:
        usage = message.usage
        cache_read = getattr(usage, "cache_read_input_tokens", 0)
        cache_create = getattr(usage, "cache_creation_input_tokens", 0)
        logger.info(
            f"Anthropic usage : in={usage.input_tokens} out={usage.output_tokens} "
            f"cache_read={cache_read} cache_create={cache_create}"
        )
    except Exception:
        pass

    return _extract_json(raw)


# ── Public API ───────────────────────────────────────────────────────────────
def categorize_with_ai(labels: List[str]) -> Dict[str, str]:
    """
    Catégorise une liste de libellés via Claude.

    Stratégie :
    - Cache mémoire d'abord (O(1))
    - Cache Supabase ensuite (batched read)
    - Pour le résiduel : 1 appel batch Claude Haiku avec prompt caching
    - Si le batch foire → tous les labels résiduels → "autres" (pas N appels)
    - Cache mémoire + Supabase mis à jour avec les nouveaux résultats

    Garantit une entrée pour chaque label (au pire "autres").
    """
    if not labels:
        return {}

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY non configurée — fallback IA désactivé")
        return {l: "autres" for l in labels}

    # 1) Mémoire
    results: Dict[str, str] = {}
    misses_norm: List[str] = []
    label_for_norm: Dict[str, str] = {}  # norm → original (un seul gardé en cas de doublon)

    for label in labels:
        norm = _normalize_key(label)
        if norm in _CACHE:
            results[label] = _CACHE[norm]
        else:
            misses_norm.append(norm)
            label_for_norm[norm] = label

    if not misses_norm:
        return results

    # 2) Cache Supabase (1 requête pour tous les misses)
    db_hits = _supabase_cache_read(list(set(misses_norm)))
    still_missing: List[str] = []
    for norm in misses_norm:
        if norm in db_hits:
            cat = db_hits[norm]
            _CACHE[norm] = cat
            results[label_for_norm[norm]] = cat
        else:
            still_missing.append(norm)

    if not still_missing:
        logger.info(f"IA fallback : 100% cache hit ({len(labels)} labels)")
        return results

    # Dédup les labels à classifier (mêmes norms = un seul appel)
    to_classify_norms = list(dict.fromkeys(still_missing))
    to_classify_labels = [label_for_norm[n] for n in to_classify_norms]

    # 3) Appel Claude (1 batch, retry léger sur erreur réseau)
    import anthropic
    client = anthropic.Anthropic(api_key=api_key)
    ai_result: Optional[Dict[str, str]] = None
    MAX_ATTEMPTS = 2  # 1 retry seulement, on ne veut pas exploser le coût
    for attempt in range(MAX_ATTEMPTS):
        try:
            ai_result = _call_batch(client, to_classify_labels)
            if ai_result is not None:
                break
            logger.warning(f"Réponse JSON invalide (tentative {attempt + 1}/{MAX_ATTEMPTS})")
        except Exception as e:
            logger.error(f"Erreur API (tentative {attempt + 1}/{MAX_ATTEMPTS}) : {e}")
        if attempt < MAX_ATTEMPTS - 1:
            time.sleep(1)

    # 4) Si le batch a échoué → on attribue "autres" sans relancer N appels coûteux
    if ai_result is None:
        logger.warning(
            f"Batch IA échoué — {len(to_classify_labels)} labels marqués 'autres' "
            "(évite la facture des appels individuels)"
        )
        ai_result = {l: "autres" for l in to_classify_labels}

    # Map labels → catégories validées + alimente les caches
    new_for_db: Dict[str, str] = {}
    for label in to_classify_labels:
        category = _find_category_for_label(label, ai_result)
        validated = category if category in VALID_CATEGORIES else "autres"
        norm = _normalize_key(label)
        _CACHE[norm] = validated
        new_for_db[norm] = validated
        results[label] = validated

    # 5) Persister en Supabase (best-effort, n'interrompt pas la réponse)
    _supabase_cache_write(new_for_db)

    logger.info(
        f"IA fallback : {len(labels)} labels → {len(results) - len(to_classify_labels)} "
        f"depuis cache, {len(to_classify_labels)} via Claude (1 appel)"
    )
    return results
