import formidable from 'formidable';
import fs from 'fs';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const form = formidable({ maxFileSize: 10 * 1024 * 1024 });
    const [, files] = await form.parse(req);
    const file = files.file?.[0];
    if (!file) return res.status(400).json({ error: 'Aucun fichier reçu' });

    const ext = file.originalFilename?.split('.').pop().toLowerCase();
    const buf = fs.readFileSync(file.filepath);
    let rawText = '';

    if (ext === 'pdf') {
      // Dynamically import pdf-parse to avoid ESM issues
      const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
      const data = await pdfParse(buf);
      rawText = data.text;
    } else if (ext === 'xls' || ext === 'xlsx') {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(buf, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rawText = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
    } else {
      rawText = buf.toString('latin1');
    }

    if (!rawText.trim()) return res.status(400).json({ error: 'Fichier vide ou illisible' });

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `Tu es un parser de relevés bancaires. Voici le contenu brut:\n\`\`\`\n${rawText.slice(0, 12000)}\n\`\`\`\nExtrais TOUTES les transactions. Pour chaque transaction retourne:\n- date: YYYY-MM-DD\n- label: libellé nettoyé\n- amount: nombre (négatif=débit, positif=crédit)\n- category: alimentation|logement|transport|loisirs|abonnements|salaire|frais bancaires|santé|autres\nRéponds UNIQUEMENT JSON sans markdown:\n{"transactions":[{"date":"YYYY-MM-DD","label":"...","amount":0.00,"category":"..."}]}`
        }]
      })
    });

    if (!claudeRes.ok) throw new Error('Erreur Claude: ' + claudeRes.status);
    const claudeData = await claudeRes.json();
    const text = claudeData.content.map(b => b.text || '').join('');
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    res.status(200).json({ transactions: parsed.transactions || [] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}