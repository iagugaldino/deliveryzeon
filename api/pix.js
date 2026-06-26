// api/pix.js — Vercel Serverless Function
// Variáveis de ambiente (configure no painel da Vercel > Settings > Environment Variables):
//   WINNER_CLIENT_ID     = c6a9679e-7418-4285-94a5-cbf7c93de5bd
//   WINNER_CLIENT_SECRET = 98245994ac5b74ee22b53e40f4d695989aa0e5698bbb6766a7bd1b85bd2a1818

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const CLIENT_ID     = process.env.WINNER_CLIENT_ID;
  const CLIENT_SECRET = process.env.WINNER_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ error: 'Credenciais não configuradas nas env vars da Vercel.' });
  }

  // ─── GET /api/pix?txn=TXN_xxx → consulta status ───────────────
  if (req.method === 'GET') {
    const { txn } = req.query;
    if (!txn) return res.status(400).json({ error: 'txn obrigatório' });

    try {
      const r = await fetch(
        `https://api.winnerpayy.com.br/api/dashboard/transactions/${txn}`,
        {
          headers: {
            'X-Client-Id':     CLIENT_ID,
            'X-Client-Secret': CLIENT_SECRET,
          },
        }
      );
      const data = await r.json();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ─── POST /api/pix → criar cobrança ──────────────────────────
  if (req.method === 'POST') {
    const { amount, customer, external_id, description } = req.body;

    if (!amount || !customer) {
      return res.status(400).json({ error: 'amount e customer são obrigatórios' });
    }

    const body = {
      amount,
      description: description || 'Pedido Zé Delivery',
      postbackUrl: `https://deliveryzeon.vercel.app/api/webhook`,
      external_id: external_id || `ZE-${Date.now()}`,
      include_qr_image: true,
      product_name: 'Bebidas Zé Delivery',
      customer,
      metadata: {
        order_id: external_id,
        product: { name: 'Pedido Zé Delivery' },
      },
    };

    try {
      const r = await fetch('https://api.winnerpayy.com.br/api/financial/receber-pix', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'X-Client-Id':   CLIENT_ID,
          'X-Client-Secret': CLIENT_SECRET,
        },
        body: JSON.stringify(body),
      });

      const data = await r.json();
      return res.status(r.status).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
