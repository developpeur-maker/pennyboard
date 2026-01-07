// Script pour générer une clé JWT secrète aléatoire
const crypto = require('crypto')

// Générer une clé aléatoire de 64 caractères
const secret = crypto.randomBytes(32).toString('hex')

console.log('\n🔐 Clé JWT secrète générée :\n')
console.log(secret)
console.log('\n📋 Copiez cette valeur et ajoutez-la comme variable d\'environnement JWT_SECRET sur Vercel\n')

