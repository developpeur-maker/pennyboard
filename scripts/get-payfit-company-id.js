const https = require('https')

// Configuration
const PAYFIT_API_KEY = process.env.PAYFIT_API_KEY || 'customer-j4wcp0ZcsRjdMZ9SMhPpYRUUtfj+1NRJJV4e7XHgv3A='

async function getPayfitCompanyId() {
  console.log('🔍 Récupération du Company ID Payfit...\n')
  
  if (!PAYFIT_API_KEY || PAYFIT_API_KEY === 'YOUR-API-KEY') {
    console.error('❌ PAYFIT_API_KEY non configurée')
    console.log('💡 Ajoutez votre clé API Payfit dans les variables d\'environnement')
    console.log('💡 Ou modifiez directement la variable PAYFIT_API_KEY dans ce script')
    return
  }

  const url = 'https://oauth.payfit.com/introspect'
  const data = JSON.stringify({
    token: PAYFIT_API_KEY
  })

  console.log(`📡 URL: ${url}`)
  console.log(`🔑 API Key: ${PAYFIT_API_KEY.substring(0, 10)}...`)
  console.log(`📋 Body: ${data}\n`)

  try {
    const response = await makeRequest(url, {
      'Authorization': `Bearer ${PAYFIT_API_KEY}`,
      'Content-Type': 'application/json'
    }, data)

    console.log('✅ Réponse reçue:')
    console.log(`📊 Status: ${response.status}`)
    console.log(`📄 Response:`, JSON.stringify(response.data, null, 2))

    if (response.data && response.data.company_id) {
      console.log('\n🎉 Company ID trouvé !')
      console.log(`🏢 Company ID: ${response.data.company_id}`)
      console.log('\n📋 Variables d\'environnement à ajouter sur Vercel:')
      console.log(`PAYFIT_API_KEY=${PAYFIT_API_KEY}`)
      console.log(`PAYFIT_COMPANY_ID=${response.data.company_id}`)
    } else {
      console.log('\n⚠️ Company ID non trouvé dans la réponse')
      console.log('Vérifiez que votre clé API est correcte')
    }

  } catch (error) {
    console.error('❌ Erreur lors de la récupération:', error.message)
    if (error.response) {
      console.error(`📊 Status: ${error.response.status}`)
      console.error(`📄 Response:`, error.response.data)
    }
  }
}

function makeRequest(url, headers = {}, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': data ? Buffer.byteLength(data) : 0
      }
    }

    const req = https.request(options, (res) => {
      let responseData = ''
      
      res.on('data', (chunk) => {
        responseData += chunk
      })
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData)
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsedData
          })
        } catch (parseError) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData
          })
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    if (data) {
      req.write(data)
    }
    
    req.end()
  })
}

getPayfitCompanyId()
