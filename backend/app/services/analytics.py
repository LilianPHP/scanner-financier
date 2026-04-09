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
    Détecte les abonnements récurrents (même libellé, intervalle mensuel).
    """
    from collections import Counter
    import re

    label_counts = Counter()
    label_amounts: Dict[str, List[float]] = defaultdict(list)

    for tx in transactions:
        if tx["amount"] < 0 and tx["category"] == "abonnements":
            key = tx["label_clean"].lower()
            label_counts[key] += 1
            label_amounts[key].append(abs(tx["amount"]))

    subscriptions = []
    for label, count in label_counts.items():
        if count >= 2:
            amounts = label_amounts[label]
            avg_amount = sum(amounts) / len(amounts)
            subscriptions.append({
                "label": label.title(),
                "occurrences": count,
                "monthly_cost": round(avg_amount, 2),
                "annual_cost": round(avg_amount * 12, 2),
            })

    subscriptions.sort(key=lambda x: x["monthly_cost"], reverse=True)
    return subscriptions
