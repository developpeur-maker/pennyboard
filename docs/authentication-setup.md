# Configuration de l'authentification

## 1. Créer la table users dans la base de données

Exécutez le script SQL sur votre base de données Neon :

```sql
-- Table pour stocker les utilisateurs admin
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index sur l'email pour des recherches rapides
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

Ou utilisez le fichier `scripts/create-users-table.sql` directement sur Neon.

## 2. Installer les dépendances

```bash
npm install
```

Les dépendances nécessaires sont :
- `bcryptjs` : pour hasher les mots de passe
- `jsonwebtoken` : pour générer et vérifier les tokens JWT

## 3. Configurer la variable d'environnement JWT_SECRET

Sur Vercel, ajoutez la variable d'environnement :

```
JWT_SECRET=votre-secret-jwt-tres-securise-changez-moi
```

⚠️ **Important** : Utilisez une clé secrète forte et unique en production !

## 4. Créer un utilisateur admin

Exécutez le script pour créer un utilisateur admin :

```bash
node scripts/create-admin-user.js
```

Le script vous demandera :
- Email de l'administrateur
- Mot de passe (sera hashé automatiquement)

## 5. Fonctionnement

- **Page de login** : Accessible à tous, affichée automatiquement si non authentifié
- **Protection des routes** : Toutes les pages (Dashboard, Salaires) sont protégées
- **Token JWT** : Valide 7 jours, stocké dans `localStorage`
- **Déconnexion** : Bouton dans la barre de navigation

## Sécurité

- ✅ Mots de passe hashés avec bcrypt (10 rounds)
- ✅ Tokens JWT signés et expirables
- ✅ Vérification du token à chaque requête
- ✅ Protection des routes côté client et serveur

