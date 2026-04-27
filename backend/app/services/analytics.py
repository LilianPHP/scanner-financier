"""
Calcul des statistiques financières à partir des transactions normalisées.
"""
from collections import defaultdict
from typing import List, Dict, Any


SAVINGS_CATEGORIES = {"epargne", "investissement"}


def compute_summary(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calcule les KPIs principaux.
    Distingue les dépenses réelles des transferts épargne/investissement.
    """
    total_income = sum(tx["amount"] for tx in transactions if tx["amount"] > 0)
    total_expense = sum(abs(tx["amount"]) for tx in transactions if tx["amount"] < 0)

    # Montant mis de côté (épargne + investissement) — argent préservé, pas dépensé
    savings_out = sum(
        abs(tx["amount"]) for tx in transactions
        if tx["amount"] < 0 and tx.get("category") in SAVINGS_CATEGORIES
    )
    real_expense = total_expense - savings_out

    cashflow = total_income - total_expense
    savings_rate = (cashflow / total_income * 100) if total_income > 0 else 0

    return {
        "income_total": round(total_income, 2),
        "expense_total": round(total_expense, 2),
        "real_expense_total": round(real_expense, 2),
        "savings_out": round(savings_out, 2),
        "cashflow": round(cashflow, 2),
        "savings_rate": round(savings_rate, 1),
        "transaction_count": len(transactions),
    }


def compute_by_category(transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Agrège les dépenses par catégorie.
    """
    by_cat: Dict[str, float] = defaultdict(float)

    for tx in transactions:
        if tx["amount"] < 0:
            by_cat[tx["category"]] += abs(tx["amount"])

    result = [
        {"category": cat, "total": round(total, 2)}
        for cat, total in by_cat.items()
    ]
    result.sort(key=lambda x: x["total"], reverse=True)

    return result


def compute_monthly_timeline(transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Calcule revenus et dépenses par mois (YYYY-MM).
    """
    monthly: Dict[str, Dict[str, float]] = defaultdict(lambda: {"income": 0.0, "expense": 0.0})

    for tx in transactions:
        date_str = tx.get("date", "")
        if len(date_str) >= 7:
            month_key = date_str[:7]  # "YYYY-MM"
            if tx["amount"] > 0:
                monthly[month_key]["income"] += tx["amount"]
            else:
                monthly[month_key]["expense"] += abs(tx["amount"])

    result = [
        {
            "month": month,
            "income": round(data["income"], 2),
            "expense": round(data["expense"], 2),
            "cashflow": round(data["income"] - data["expense"], 2),
        }
        for month, data in sorted(monthly.items())
    ]

    return result


def compute_score(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calcule un score de santé financière de 0 à 100.

    Composantes :
    - Cashflow positif      (0-35 pts)
    - Taux d'épargne        (0-35 pts)
    - Épargne/Investissement (0-20 pts)
    - Diversification       (0-10 pts)

    Retourne le score, le détail des composantes et un libellé (Critique / À améliorer / Bien / Excellent).
    """
    summary = compute_summary(transactions)
    income = summary["income_total"]
    cashflow = summary["cashflow"]
    savings_rate = summary["savings_rate"]
    savings_out = summary["savings_out"]

    # 1. Cashflow (0-35 pts) : cashflow positif = bien
    if income <= 0:
        cashflow_score = 0.0
    elif cashflow >= 0:
        cashflow_score = min(cashflow / income * 35, 35)
    else:
        # Pénalité proportionnelle au déficit
        cashflow_score = max(0, 35 + (cashflow / income) * 35)

    # 2. Taux d'épargne (0-35 pts) : 20% = max
    savings_rate_score = min(abs(savings_rate) / 20 * 35, 35) if income > 0 else 0

    # 3. Épargne / Investissement (0-20 pts)
    has_epargne = any(
        tx["amount"] < 0 and tx.get("category") == "epargne"
        for tx in transactions
    )
    has_invest = any(
        tx["amount"] < 0 and tx.get("category") == "investissement"
        for tx in transactions
    )
    invest_score = (10 if has_epargne else 0) + (10 if has_invest else 0)

    # 4. Diversification (0-10 pts) : aucune catégorie > 60% des dépenses réelles
    by_cat = compute_by_category(transactions)
    real_expense = summary["real_expense_total"]
    max_cat_pct = 0.0
    if real_expense > 0 and by_cat:
        max_cat_pct = max(c["total"] for c in by_cat) / real_expense * 100
    diversification_score = 10 if max_cat_pct <= 60 else max(0, 10 - (max_cat_pct - 60) / 10)

    total = round(cashflow_score + savings_rate_score + invest_score + diversification_score)
    total = max(0, min(100, total))

    if total >= 80:
        label = "Excellent"
        color = "green"
    elif total >= 60:
        label = "Bien"
        color = "lime"
    elif total >= 40:
        label = "À améliorer"
        color = "orange"
    else:
        label = "Critique"
        color = "red"

    return {
        "score": total,
        "label": label,
        "color": color,
        "details": {
            "cashflow": round(cashflow_score, 1),
            "savings_rate": round(savings_rate_score, 1),
            "investment": invest_score,
            "diversification": round(diversification_score, 1),
        },
    }


def detect_subscriptions(transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Détecte les abonnements récurrents par CADENCE + STABILITÉ DU MONTANT,
    indépendamment de la catégorie. Permet de repérer les abonnements
    qui ont été mal classés (ex : Spotify catégorisé "loisirs").

    Cadences détectées : weekly, biweekly, monthly, quarterly, biannual, yearly.
    Tous les montants sont normalisés en équivalent mensuel.
    """
    from collections import Counter
    from datetime import datetime
    from statistics import median, mean, pstdev

    # Cadence ranges (in days) → monthly multiplier
    CADENCES = [
        ("weekly",     6,   8,   30 / 7),
        ("biweekly",   13,  16,  30 / 14),
        ("monthly",    25,  35,  1.0),
        ("quarterly",  85,  95,  1 / 3),
        ("biannual",   170, 195, 1 / 6),
        ("yearly",     350, 380, 1 / 12),
    ]
    AMOUNT_TOLERANCE = 0.20  # stdev/mean must be ≤ 20%

    # Group outgoing transactions by normalized label
    groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for tx in transactions:
        if tx.get("amount", 0) >= 0:
            continue
        label = (tx.get("label_clean") or "").strip()
        date = tx.get("date")
        if not label or not date:
            continue
        groups[label.lower()].append({
            "date": date,
            "amount": abs(float(tx["amount"])),
            "category": tx.get("category") or "autres",
            "label": label,
        })

    subscriptions: List[Dict[str, Any]] = []
    for items in groups.values():
        if len(items) < 2:
            continue

        items.sort(key=lambda x: x["date"])
        try:
            dates = [datetime.strptime(it["date"], "%Y-%m-%d") for it in items]
        except (ValueError, TypeError):
            continue

        intervals = [(dates[i] - dates[i - 1]).days for i in range(1, len(dates))]
        if not intervals:
            continue

        med = median(intervals)
        cadence_match = next(
            ((name, mult) for name, lo, hi, mult in CADENCES if lo <= med <= hi),
            None,
        )
        if not cadence_match:
            continue
        cadence_name, multiplier = cadence_match

        amounts = [it["amount"] for it in items]
        avg = mean(amounts)
        if avg <= 0:
            continue
        stdev = pstdev(amounts) if len(amounts) > 1 else 0.0
        if stdev / avg > AMOUNT_TOLERANCE:
            continue

        cat_counter = Counter(it["category"] for it in items)
        dominant_category = cat_counter.most_common(1)[0][0]
        monthly = avg * multiplier

        subscriptions.append({
            "label": items[0]["label"].title(),
            "occurrences": len(items),
            "cadence": cadence_name,
            "monthly_cost": round(monthly, 2),
            "annual_cost": round(monthly * 12, 2),
            "category": dominant_category,
            "needs_recategorize": dominant_category != "abonnements",
        })

    subscriptions.sort(key=lambda x: x["monthly_cost"], reverse=True)
    return subscriptions


# ─────────────────────────────────────────────────────────────────────────
# Insights — narratifs pour le dashboard
# ─────────────────────────────────────────────────────────────────────────

_MONTH_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']


def _month_label(key: str) -> str:
    """YYYY-MM → 'mars' style label (lowercase, sans année)."""
    if not key or len(key) < 7:
        return ""
    try:
        idx = int(key.split("-")[1]) - 1
        return _MONTH_FR[idx].lower()
    except (ValueError, IndexError):
        return ""


def compute_insights(
    transactions: List[Dict[str, Any]],
    timeline: List[Dict[str, Any]] | None = None,
) -> List[Dict[str, Any]]:
    """
    Génère 3-5 insights narratifs. Le frontend formate la copy.

    Format de retour :
        [{ "id": str, "data": dict }, ...]

    Ids possibles :
        - top_category    (toujours, si dépenses > 0)
        - vs_previous     (≥ 2 mois de timeline, écart ≥ 5%)
        - savings_pace    (cashflow positif, ≥ 50€/mois)
        - lifestyle       (loisirs + voyage > 5% des dépenses)
    """
    insights: List[Dict[str, Any]] = []

    expenses = [tx for tx in transactions if tx.get("amount", 0) < 0]
    incomes = [tx for tx in transactions if tx.get("amount", 0) > 0]

    total_expense = sum(abs(tx["amount"]) for tx in expenses)
    total_income = sum(tx["amount"] for tx in incomes)

    # By category (dépenses réelles, hors épargne/investissement)
    by_cat: Dict[str, float] = defaultdict(float)
    for tx in expenses:
        cat = tx.get("category") or "autres"
        if cat in SAVINGS_CATEGORIES:
            continue
        by_cat[cat] += abs(tx["amount"])

    real_expense = sum(by_cat.values())

    # ── 1. Top expense category ────────────────────────────────────────
    if by_cat and real_expense > 0:
        top_cat, top_amount = max(by_cat.items(), key=lambda x: x[1])
        pct = top_amount / real_expense * 100
        insights.append({
            "id": "top_category",
            "data": {
                "category": top_cat,
                "amount": round(top_amount, 0),
                "pct": round(pct),
            },
        })

    # ── 2. Vs mois précédent (≥ 2 mois timeline + écart ≥ 5%) ──────────
    if timeline and len(timeline) >= 2:
        sorted_tl = sorted(timeline, key=lambda t: t.get("month") or "")
        cur = sorted_tl[-1]
        prev = sorted_tl[-2]
        cur_exp = float(cur.get("expense", 0))
        prev_exp = float(prev.get("expense", 0))
        if prev_exp > 0:
            delta_pct = (cur_exp - prev_exp) / prev_exp * 100
            if abs(delta_pct) >= 5:
                insights.append({
                    "id": "vs_previous",
                    "data": {
                        "delta_pct": round(delta_pct),
                        "current": round(cur_exp, 0),
                        "previous": round(prev_exp, 0),
                        "previous_month_label": _month_label(prev.get("month", "")),
                    },
                })

    # ── 3. Rythme d'épargne (cashflow positif) ─────────────────────────
    cashflow = total_income - total_expense
    if total_income > 0 and cashflow > 0:
        n_months = max(len(timeline) if timeline else 1, 1)
        per_month = cashflow / n_months
        if per_month >= 50:
            insights.append({
                "id": "savings_pace",
                "data": {
                    "monthly_avg": round(per_month, 0),
                    "n_months": n_months,
                },
            })

    # ── 4. Lifestyle (loisirs + voyage) ────────────────────────────────
    loisirs = by_cat.get("loisirs", 0)
    voyage = by_cat.get("voyage", 0)
    lifestyle_total = loisirs + voyage
    if lifestyle_total > 0 and real_expense > 0:
        pct = lifestyle_total / real_expense * 100
        if pct >= 5:
            if loisirs > 0 and voyage > 0:
                kind = "loisirs_voyage"
            elif voyage > 0:
                kind = "voyage"
            else:
                kind = "loisirs"
            insights.append({
                "id": "lifestyle",
                "data": {
                    "kind": kind,
                    "amount": round(lifestyle_total, 0),
                    "pct": round(pct),
                },
            })

    return insights
