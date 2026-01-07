const { Pool } = require('pg')
const bcrypt = require('bcryptjs')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

async function createAdminUser() {
  try {
    console.log('🔐 Création d\'un utilisateur admin\n')

    // Vérifier si l'URL de connexion est disponible
    let connectionString = process.env.POSTGRES_URL || process.env.NEON_URL
    
    if (!connectionString) {
      console.log('⚠️  Aucune variable d\'environnement POSTGRES_URL ou NEON_URL trouvée.')
      console.log('📝 Veuillez fournir l\'URL de connexion à votre base de données Neon.')
      console.log('   (Copiez uniquement la partie postgresql://... sans les guillemets ni "psql")\n')
      let rawInput = await question('URL de connexion Neon: ')
      
      if (!rawInput) {
        console.error('❌ URL de connexion requise')
        process.exit(1)
      }

      // Nettoyer l'URL : enlever les guillemets, le préfixe "psql", et les espaces
      connectionString = rawInput
        .trim()
        .replace(/^psql\s+['"]?/, '') // Enlever "psql " au début
        .replace(/['"]$/, '') // Enlever les guillemets à la fin
        .replace(/^['"]/, '') // Enlever les guillemets au début
        .trim()

      // Vérifier que l'URL commence bien par postgresql://
      if (!connectionString.startsWith('postgresql://')) {
        console.error('❌ L\'URL doit commencer par "postgresql://"')
        console.error(`   URL reçue: ${connectionString.substring(0, 50)}...`)
        process.exit(1)
      }
    }

    // Demander les informations
    const email = await question('Email: ')
    const password = await question('Mot de passe: ')

    if (!email || !password) {
      console.error('❌ Email et mot de passe requis')
      process.exit(1)
    }

    // Hasher le mot de passe
    console.log('\n🔒 Hachage du mot de passe...')
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Connexion à la base de données
    console.log('🔌 Connexion à la base de données...')
    const pool = new Pool({
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    })

    const client = await pool.connect()

    try {
      // Vérifier si la table users existe
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        )
      `)

      if (!tableCheck.rows[0].exists) {
        console.error('\n❌ La table "users" n\'existe pas dans la base de données.')
        console.error('   Veuillez d\'abord exécuter le script SQL create-users-table.sql sur Neon.')
        process.exit(1)
      }

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase().trim()]
      )

      if (existingUser.rows.length > 0) {
        console.error('❌ Un utilisateur avec cet email existe déjà')
        process.exit(1)
      }

      // Insérer le nouvel utilisateur
      const result = await client.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
        [email.toLowerCase().trim(), passwordHash]
      )

      console.log('\n✅ Utilisateur admin créé avec succès!')
      console.log(`   ID: ${result.rows[0].id}`)
      console.log(`   Email: ${result.rows[0].email}`)
    } finally {
      client.release()
      await pool.end()
    }
  } catch (error) {
    console.error('\n❌ Erreur lors de la création de l\'utilisateur:', error.message)
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error('\n💡 Suggestions:')
      console.error('   1. Vérifiez que l\'URL de connexion Neon est correcte')
      console.error('   2. Assurez-vous d\'avoir copié uniquement la partie "postgresql://..."')
      console.error('   3. Vérifiez votre connexion internet')
      console.error('   4. Vérifiez que la base de données Neon est accessible')
    } else if (error.message.includes('getaddrinfo')) {
      console.error('\n💡 L\'URL de connexion semble incorrecte.')
      console.error('   Format attendu: postgresql://user:password@host/database?sslmode=require')
      console.error('   Assurez-vous d\'avoir copié uniquement l\'URL, sans "psql" ni guillemets')
    }
    
    process.exit(1)
  } finally {
    rl.close()
  }
}

createAdminUser()

