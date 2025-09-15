const fetch = require('node-fetch');

const PENNYLANE_API_KEY = process.env.VITE_PENNYLANE_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!PENNYLANE_API_KEY) {
    console.error('❌ PENNYLANE_API_KEY is not set.');
    return res.status(500).json({ error: 'API key not configured.' });
  }

  const { entryId } = req.query;

  if (!entryId) {
    return res.status(400).json({ error: 'entryId parameter is required' });
  }

  try {
    console.log(`🔍 Fetching details for ledger entry ${entryId}...`);
    
    const baseUrl = 'https://app.pennylane.com/api/external/v2';
    const endpoint = `/ledger_entries/${entryId}`;
    const url = `${baseUrl}${endpoint}`;
    
    console.log(`📡 URL: ${url}`);
    
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
      console.log(`❌ Error: ${errorText}`);
      return res.status(response.status).json({
        error: 'Pennylane API Error',
        status: response.status,
        message: errorText,
        url: url
      });
    }

    const data = await response.json();
    console.log(`✅ Entry details received for ${entryId}`);
    
    return res.status(200).json({
      success: true,
      message: 'Ledger entry details fetched successfully',
      entry_id: entryId,
      raw_data: data
    });

  } catch (error) {
    console.error('❌ Error fetching ledger entry details:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      stack: error.stack
    });
  }
}
