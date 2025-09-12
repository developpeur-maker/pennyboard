const PENNYLANE_API_KEY = process.env.VITE_PENNYLANE_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Test de l\'endpoint ledger_accounts v2...');
    
    const baseUrl = 'https://app.pennylane.com/api/external/v2';
    const endpoint = '/ledger_accounts';
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
      total_accounts: Array.isArray(data) ? data.length : (data.data ? data.data.length : 0),
      structure: data,
      sample_account: Array.isArray(data) ? data[0] : (data.data ? data.data[0] : null),
      has_pagination: data.pagination ? true : false,
      pagination_info: data.pagination || null,
      // Analyser les comptes par classe
      comptes_7: [],
      comptes_6: [],
      comptes_5: [],
      comptes_4: [],
      comptes_3: [],
      comptes_2: [],
      comptes_1: []
    };

    // Analyser les comptes par classe comptable
    const accounts = Array.isArray(data) ? data : (data.data || []);
    accounts.forEach(account => {
      const code = account.code || account.account_code || '';
      const firstDigit = code.charAt(0);
      
      if (firstDigit === '7') analysis.comptes_7.push(account);
      else if (firstDigit === '6') analysis.comptes_6.push(account);
      else if (firstDigit === '5') analysis.comptes_5.push(account);
      else if (firstDigit === '4') analysis.comptes_4.push(account);
      else if (firstDigit === '3') analysis.comptes_3.push(account);
      else if (firstDigit === '2') analysis.comptes_2.push(account);
      else if (firstDigit === '1') analysis.comptes_1.push(account);
    });

    return res.status(200).json({
      success: true,
      message: 'Test réussi de l\'endpoint ledger_accounts v2',
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
