const https = require('https')

// Configuration
const PAYFIT_API_KEY = 'customer-j4wcp0ZcsRjdMZ9SMhPpYRUUtfj+1NRJJV4e7XHgv3A='
const PAYFIT_COMPANY_ID = '5e1de57f310efaf2eb652228'

async function testPayfitAccounting() {
  console.log('🧪 Test de l\'API Payfit Accounting-v2...\n')
  
  const url = `https://partner-api.payfit.com/companies/${PAYFIT_COMPANY_ID}/accounting-v2?date=202412`
  
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

    // Analyser les données retournées
    if (response.data) {
      console.log('\n📊 Analyse des données:')
      console.log(`📈 Nombre d'éléments: ${Object.keys(response.data).length}`)
      
      // Lister les clés disponibles
      console.log('🔑 Clés disponibles:')
      Object.keys(response.data).forEach(key => {
        console.log(`  - ${key}`)
      })
    }

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

testPayfitAccounting()
