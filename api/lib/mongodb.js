/**
 * Client MongoDB en lecture seule (pipedrive).
 * Connexion mise en cache pour Vercel serverless.
 */
const { MongoClient } = require('mongodb')

let cachedClient = null
let cachedDb = null

/**
 * Retourne la base "pipedrive". Ne fait jamais d'écriture.
 * @returns {Promise<import('mongodb').Db>}
 */
async function getDb() {
  if (cachedDb) return cachedDb

  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI n’est pas définie')
  }

  const client = await MongoClient.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000
  })

  cachedClient = client
  cachedDb = client.db('pipedrive')
  return cachedDb
}

/**
 * Collection deals (pipedrive.deals).
 * @returns {Promise<import('mongodb').Collection>}
 */
async function getDealsCollection() {
  const db = await getDb()
  return db.collection('deals')
}

module.exports = { getDb, getDealsCollection }
