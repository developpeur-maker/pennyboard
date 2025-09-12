const PENNYLANE_API_KEY = process.env.VITE_PENNYLANE_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ledgerEntryId } = req.query;

  if (!ledgerEntryId) {
    return res.status(400).json({ error: 'ledgerEntryId is required' });
  }

  try {
    console.log(`🔍 Test des lignes de l'écriture comptable ${ledgerEntryId}...`);
    
    const baseUrl = 'https://app.pennylane.com/api/external/v2';
    const endpoint = `/ledger_entries/${ledgerEntryId}/lines`;
    const url = `${baseUrl}${endpoint}`;
    
    console.log(`📡 URL: ${url}`);
    console.log(`🔑 API Key: ${PENNYLANE_API_KEY ? 'Présente' : 'Manquante'}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PENNYLANE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Erreur: ${errorText}`);
      return res.status(response.status).json({
        error: 'Erreur API Pennylane',
        status: response.status,
        message: errorText,
        url: url
      });
    }

    const data = await response.json();
    console.log(`✅ Données reçues: ${JSON.stringify(data, null, 2)}`);
    
    // Analyser la structure des données
    const analysis = {
      ledger_entry_id: ledgerEntryId,
      total_lines: Array.isArray(data) ? data.length : (data.data ? data.data.length : 0),
      structure: data,
      sample_line: Array.isArray(data) ? data[0] : (data.data ? data.data[0] : null),
      has_pagination: data.pagination ? true : false,
      pagination_info: data.pagination || null
    };

    return res.status(200).json({
      success: true,
      message: `Test réussi des lignes de l'écriture ${ledgerEntryId}`,
      analysis: analysis,
      raw_data: data
    });

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    return res.status(500).json({
      error: 'Erreur interne',
      message: error.message,
      stack: error.stack
    });
  }
}
