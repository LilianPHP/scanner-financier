"""
Calcul des statistiques financières à partir des transactions normalisées.
"""
from collections import defaultdict
from typing import List, Dict, Any


def compute_summary(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calcule les KPIs principaux.
    """
    total_income = sum(tx["amount"] for tx in transactions if tx["amount"] > 0)
    total_expense = sum(abs(tx["amount"]) for tx in transactions if tx["amount"] < 0)

    cashflow = total_income - total_expense
    savings_rate = (cashflow / total_income * 100) if total_income > 0 else 0

    return {
        "income_total": round(total_income, 2),
        "expense_total": round(total_expense, 2),
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
