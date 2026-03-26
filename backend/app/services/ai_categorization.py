"""
Fallback IA pour les transactions non catégorisées par les règles.
Utilise Claude claude-3-5-haiku pour classifier par batch avec cache en mémoire.

Stratégie :
- Seuls les débits (amount < 0) tombés en "autres" sont envoyés à l'IA.
- Un cache module-level évite les appels répétés pour les mêmes libellés.
- En cas d'erreur (API key absente, timeout, JSON invalide), on garde "autres".
"""
import os
import json
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)

# Cache en mémoire : label_raw → catégorie (durée de vie = instance Railway)
_CACHE: Dict[str, str] = {}

VALID_CATEGORIES = {
    "alimentation", "logement", "transport", "loisirs", "abonnements",
    "salaire", "frais bancaires", "sante", "investissement", "epargne",
    "impots", "autres",
}

_SYSTEM_PROMPT = """Tu es un expert en analyse de relevés bancaires français.
Tu reçois des libellés de transactions bancaires et tu dois les catégoriser.

Catégories disponibles :
- alimentation : courses alimentaires, restaurants, livraison repas
- logement : loyer, charges, électricité, eau, assurance habitation, ameublement
- transport : carburant, transports en commun, taxi, péage, parking
- loisirs : cinéma, sport, voyage, hôtel, shopping, jeux vidéo
- abonnements : téléphone, internet, streaming, logiciels
- salaire : salaire, revenus professionnels, allocations
- frais bancaires : cotisations carte, agios, commissions
- sante : pharmacie, médecin, mutuelle, dentiste
- investissement : crypto, bourse, placements financiers
- epargne : virements épargne, livret A, PEL, CEL
- impots : impôts, taxes, URSSAF, cotisations sociales
- autres : aucune catégorie ne correspond clairement

Réponds UNIQUEMENT avec un objet JSON valide.
Format : {"libellé exact": "catégorie", ...}
Ne commente pas. Ne justifie pas. Juste le JSON."""


def categorize_with_ai(labels: List[str]) -> Dict[str, str]:
    """
    Catégorise une liste de libellés via Claude (batch).

    Args:
        labels: liste de label_raw à catégoriser

    Returns:
        dict {label_raw: catégorie} — partiel si certains échouent
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY non configurée — fallback IA désactivé")
        return {}

    # Séparer ce qui est déjà en cache vs à classifier
    cached = {l: _CACHE[l] for l in labels if l in _CACHE}
    to_classify = list(dict.fromkeys(l for l in labels if l not in _CACHE))

    if not to_classify:
        return cached

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        labels_text = "\n".join(f'"{l}"' for l in to_classify)
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1024,
            system=_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Catégorise ces libellés bancaires :\n{labels_text}",
                }
            ],
        )

        raw = message.content[0].text.strip()

        # Extraire le JSON même si Claude ajoute du texte autour
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start == -1 or end == 0:
            logger.error(f"Réponse Claude non parseable : {raw[:300]}")
            return cached

        result: Dict[str, str] = json.loads(raw[start:end])

        # Valider les catégories et mettre en cache
        for label, category in result.items():
            validated = category if category in VALID_CATEGORIES else "autres"
            _CACHE[label] = validated

        logger.info(f"IA fallback : {len(result)}/{len(to_classify)} libellés catégorisés")
        return {**cached, **{l: _CACHE.get(l, "autres") for l in to_classify}}

    except Exception as e:
        logger.error(f"Erreur IA fallback : {e}")
        return cached
