const https = require('https')

// Configuration de test
const PAYFIT_API_KEY = process.env.PAYFIT_API_KEY || 'your_payfit_api_key_here'
const PAYFIT_COMPANY_ID = process.env.PAYFIT_COMPANY_ID || 'your_company_id_here'
const BASE_URL = 'https://partner-api.payfit.com'

async function testPayfitAPI() {
  console.log('🧪 Test de l\'API Payfit...\n')
  
  if (!PAYFIT_API_KEY || PAYFIT_API_KEY === 'your_payfit_api_key_here') {
    console.error('❌ PAYFIT_API_KEY non configurée')
    console.log('💡 Ajoutez votre clé API Payfit dans les variables d\'environnement')
    return
  }
  
  if (!PAYFIT_COMPANY_ID || PAYFIT_COMPANY_ID === 'your_company_id_here') {
    console.error('❌ PAYFIT_COMPANY_ID non configurée')
    console.log('💡 Ajoutez votre ID d\'entreprise Payfit dans les variables d\'environnement')
    return
  }

  const url = `${BASE_URL}/companies/${PAYFIT_COMPANY_ID}/collaborators?maxResults=5`
  
  console.log(`📡 URL: ${url}`)
  console.log(`🔑 API Key: ${PAYFIT_API_KEY.substring(0, 10)}...`)
  console.log(`🏢 Company ID: ${PAYFIT_COMPANY_ID}\n`)

  try {
    const response = await makeRequest(url, {
      'Authorization': `Bearer ${PAYFIT_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })

    console.log('✅ Réponse reçue:')
    console.log(`📊 Status: ${response.status}`)
    console.log(`📄 Headers:`, JSON.stringify(response.headers, null, 2))
    console.log(`📋 Body:`, JSON.stringify(response.data, null, 2))

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message)
    if (error.response) {
      console.error(`📊 Status: ${error.response.status}`)
      console.error(`📄 Response:`, error.response.data)
    }
  }
}

function makeRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: headers
    }

    const req = https.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data)
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsedData
          })
        } catch (parseError) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          })
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.end()
  })
}

testPayfitAPI()
