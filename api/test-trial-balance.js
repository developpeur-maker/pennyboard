const PENNYLANE_API_KEY = process.env.VITE_PENNYLANE_API_KEY;

export default async function handler(req, res) {
  // Headers de sécurité
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Test de l\'endpoint trial_balance v2...');
    
    // Validation et sanitisation des paramètres
    const validateDate = (dateStr) => {
      if (!dateStr) return false;
      const regex = /^\d{4}-\d{2}-\d{2}$/;
      if (!regex.test(dateStr)) return false;
      const date = new Date(dateStr);
      return date instanceof Date && !isNaN(date);
    };
    
    const validateInteger = (value, min = 1, max = 1000) => {
      const num = parseInt(value);
      return !isNaN(num) && num >= min && num <= max ? num : null;
    };
    
    // Récupérer et valider les paramètres
    const periodStart = req.query.period_start || '2025-09-01';
    const periodEnd = req.query.period_end || '2025-09-30';
    
    // Validation des dates
    if (!validateDate(periodStart) || !validateDate(periodEnd)) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        message: 'Les dates doivent être au format YYYY-MM-DD'
      });
    }
    
    // Validation de la logique des dates
    if (new Date(periodStart) > new Date(periodEnd)) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        message: 'La date de début doit être antérieure à la date de fin'
      });
    }
    
    const page = validateInteger(req.query.page, 1, 1000) || 1;
    const perPage = validateInteger(req.query.per_page, 1, 1000) || 1000;
    const isAuxiliary = req.query.is_auxiliary === 'false' ? false : true;
    
    const baseUrl = 'https://app.pennylane.com/api/external/v2';
    
    // Construire les paramètres de requête de manière sécurisée selon la documentation
    const params = new URLSearchParams({
      period_start: periodStart,
      period_end: periodEnd,
      is_auxiliary: isAuxiliary.toString(),
      page: page.toString(),
      per_page: perPage.toString()
    });
    
    const url = `${baseUrl}/trial_balance?${params.toString()}`;
    
    // Masquer l'URL complète pour la sécurité (ne pas exposer les paramètres complets)
    console.log(`📡 Endpoint: /trial_balance`);
    console.log(`🔑 API Key: ${PENNYLANE_API_KEY ? '✓ Configurée' : '✗ Manquante'}`);
    console.log(`📅 Période: ${periodStart} à ${periodEnd}`);
    console.log(`🔧 Paramètres: page=${page}, per_page=${perPage}, is_auxiliary=${isAuxiliary}`);
    
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
    
    // Analyser la structure des données selon la documentation
    const analysis = {
      total_accounts: data.items ? data.items.length : 0,
      structure: data,
      sample_account: data.items ? data.items[0] : null,
      pagination: {
        total_pages: data.total_pages || 0,
        current_page: data.current_page || 0,
        total_items: data.total_items || 0,
        per_page: data.per_page || 0
      },
      // Analyser les comptes par classe
      comptes_7: [],
      comptes_6: [],
      comptes_5: [],
      comptes_4: [],
      comptes_3: [],
      comptes_2: [],
      comptes_1: []
    };

    // Analyser les comptes par classe comptable selon la structure de la documentation
    const accounts = data.items || [];
    accounts.forEach(account => {
      const code = account.number || account.formatted_number || '';
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
      message: 'Test réussi de l\'endpoint trial_balance v2',
      analysis: analysis,
      raw_data: data
    });

  } catch (error) {
    // Ne pas exposer les détails techniques en production
    console.error('❌ Erreur lors du test:', {
      message: error.message,
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    });
    
    return res.status(500).json({
      error: 'Erreur interne du serveur',
      message: 'Une erreur inattendue s\'est produite. Veuillez réessayer plus tard.',
      timestamp: new Date().toISOString()
    });
  }
}
