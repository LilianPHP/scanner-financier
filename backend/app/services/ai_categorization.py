"""
Fallback IA pour les transactions non catégorisées par les règles keyword.
Utilise Claude pour classifier par batch avec cache en mémoire.

Architecture :
- Les labels "autres" sont envoyés en batch à Claude.
- 3 tentatives avec backoff exponentiel (1s, 2s, 4s).
- Si le batch échoue 3 fois, on tente label par label.
- Matching insensible à la casse et aux espaces superflus.
- Cache module-level : même label = pas de 2ème appel API.
- Garantit une réponse pour chaque label (au pire "autres").
"""
import os
import json
import time
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# Cache : label normalisé → catégorie (durée de vie = instance Railway)
_CACHE: Dict[str, str] = {}

VALID_CATEGORIES = {
    "alimentation", "logement", "transport", "loisirs", "abonnements",
    "salaire", "frais bancaires", "sante", "investissement", "epargne",
    "impots", "autres",
}

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
    # Cherche { ... }
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start == -1 or end == 0:
        return None
    candidate = raw[start:end]
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        pass
    # Essaie de corriger les virgules trailing courantes
    try:
        import re
        fixed = re.sub(r",\s*}", "}", candidate)
        fixed = re.sub(r",\s*]", "]", fixed)
        return json.loads(fixed)
    except (json.JSONDecodeError, Exception):
        return None


def _find_category_for_label(label: str, ai_result: Dict[str, str]) -> str:
    """
    Cherche la catégorie d'un label dans le résultat IA.
    Tolérant sur la casse et les espaces.
    """
    # 1. Correspondance exacte
    if label in ai_result:
        return ai_result[label]

    norm_label = _normalize_key(label)

    # 2. Correspondance normalisée
    for key, value in ai_result.items():
        if _normalize_key(key) == norm_label:
            return value

    # 3. Correspondance partielle (le label IA contient ou est contenu dans le label)
    for key, value in ai_result.items():
        norm_key = _normalize_key(key)
        if len(norm_key) >= 5 and (norm_key in norm_label or norm_label in norm_key):
            return value

    return "autres"


def _call_batch(client, labels: List[str]) -> Optional[Dict[str, str]]:
    """Appel batch à l'API Claude. Retourne None si la réponse n'est pas parseable."""
    labels_text = "\n".join(f'"{l}"' for l in labels)
    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=2048,
        system=_SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": f"Catégorise ces {len(labels)} libellés bancaires :\n{labels_text}"
        }],
    )
    raw = message.content[0].text.strip()
    return _extract_json(raw)


def _classify_individually(client, labels: List[str]) -> Dict[str, str]:
    """
    Dernier recours : classe chaque label un par un.
    Appelé uniquement si toutes les tentatives batch ont échoué.
    """
    results = {}
    for label in labels:
        try:
            message = client.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=64,
                system=_SYSTEM_PROMPT,
                messages=[{
                    "role": "user",
                    "content": (
                        f'Catégorise ce libellé bancaire. '
                        f'Réponds avec exactement ce JSON (un seul libellé) : '
                        f'{{"{label}": "catégorie"}}'
                    )
                }],
            )
            raw = message.content[0].text.strip()
            extracted = _extract_json(raw)
            if extracted:
                category = next(iter(extracted.values()), "autres")
                results[label] = category if category in VALID_CATEGORIES else "autres"
            else:
                results[label] = "autres"
        except Exception as e:
            logger.error(f"Erreur classification individuelle '{label[:60]}' : {e}")
            results[label] = "autres"
    return results


def categorize_with_ai(labels: List[str]) -> Dict[str, str]:
    """
    Catégorise une liste de libellés via Claude.

    - Vérifie le cache en premier.
    - Appel batch avec 3 tentatives + backoff exponentiel.
    - Si le batch échoue 3 fois → classification label par label.
    - Garantit une entrée dans le résultat pour chaque label.

    Args:
        labels: liste de libellés à catégoriser (idéalement label_clean)

    Returns:
        dict {label: catégorie} — complet, toujours une réponse par label
    """
    if not labels:
        return {}

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY non configurée — fallback IA désactivé")
        return {l: "autres" for l in labels}

    import anthropic
    client = anthropic.Anthropic(api_key=api_key)

    # Séparer cache hits vs à classer
    results: Dict[str, str] = {}
    to_classify: List[str] = []

    for label in labels:
        norm = _normalize_key(label)
        if norm in _CACHE:
            results[label] = _CACHE[norm]
        else:
            to_classify.append(label)

    if not to_classify:
        logger.debug(f"IA fallback : {len(results)} depuis cache")
        return results

    # Batch avec retry
    MAX_ATTEMPTS = 3
    ai_result: Optional[Dict[str, str]] = None

    for attempt in range(MAX_ATTEMPTS):
        try:
            ai_result = _call_batch(client, to_classify)
            if ai_result is not None:
                logger.info(
                    f"IA fallback batch OK ({len(ai_result)}/{len(to_classify)} libellés, "
                    f"tentative {attempt + 1})"
                )
                break
            logger.warning(f"Réponse JSON invalide (tentative {attempt + 1}/{MAX_ATTEMPTS})")
        except Exception as e:
            logger.error(f"Erreur API (tentative {attempt + 1}/{MAX_ATTEMPTS}) : {e}")

        if attempt < MAX_ATTEMPTS - 1:
            wait = 2 ** attempt  # 1s, 2s
            logger.info(f"Retry dans {wait}s...")
            time.sleep(wait)

    # Si batch totalement échoué → label par label
    if ai_result is None:
        logger.warning(f"Batch échoué — passage en mode individuel ({len(to_classify)} labels)")
        ai_result = _classify_individually(client, to_classify)

    # Mapper résultats + alimenter le cache
    for label in to_classify:
        category = _find_category_for_label(label, ai_result)
        validated = category if category in VALID_CATEGORIES else "autres"
        _CACHE[_normalize_key(label)] = validated
        results[label] = validated

    logger.info(
        f"IA fallback terminé : {sum(1 for v in results.values() if v != 'autres')}/"
        f"{len(labels)} catégorisés (hors 'autres')"
    )
    return results
