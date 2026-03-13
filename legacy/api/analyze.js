export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  const prompt = `Tu es un expert en analyse de relevés bancaires français.

Voici un relevé bancaire brut :
${text.slice(0, 12000)}

Extrais TOUTES les transactions et retourne UNIQUEMENT un JSON valide (sans markdown, sans explication) de la forme :
{"transactions": [{"date": "YYYY-MM-DD", "label": "libellé nettoyé", "amount": montant_numerique, "category": "catégorie"}]}

Règles de catégorisation STRICTES :
- "salaire" : tout virement entrant de France Travail, Pôle Emploi, employeur, ARE, indemnités
- "investissement" : Bitstack, crypto, bourse, trading, PEA, CTO, tout achat crypto ou actions
- "épargne" : virements émis vers soi-même (ex: "VIREMENT EMIS WEB M. [NOM]"), livret A, PEL, CEL
- "impôts" : France Travail prélèvement, impôts, taxes, cotisations sociales obligatoires, URSSAF
- "abonnements" : Free, Orange, SFR, Bouygues, Netflix, Spotify, Amazon Prime, Disney+, tout abonnement mensuel
- "alimentation" : supermarchés, restaurants, boulangeries, Uber Eats, Deliveroo
- "transport" : Uber, taxi, SNCF, RATP, Navigo, carburant, péage, parking
- "logement" : loyer, EDF, GDF, eau, assurance habitation, charges copropriété
- "santé" : pharmacie, médecin, dentiste, mutuelle, hôpital, Childers Pharmacy
- "loisirs" : sport, cinéma, jeux, voyages, hôtels
- "frais bancaires" : cotisation carte, commission, frais de tenue de compte, agios
- "autres" : UNIQUEMENT si vraiment aucune autre catégorie ne convient

Règles importantes :
- Les montants négatifs = dépenses, positifs = revenus
- Nettoie les libellés (supprime les codes internes, numéros de carte X9518, etc.)
- Ne mets JAMAIS Bitstack en "autres" — c'est toujours "investissement"
- Ne mets JAMAIS un virement émis vers le titulaire du compte en "autres" — c'est "épargne"
- Ne mets JAMAIS France Travail prélèvement en "autres" — c'est "impôts"`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    const clean = content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
