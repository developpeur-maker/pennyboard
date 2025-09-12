# PennyBoard - Dashboard DIMO DIAGNOSTIC

Un dashboard moderne et élégant pour visualiser les données comptables de DIMO DIAGNOSTIC via l'API Pennylane.

## 🎨 Identité Visuelle

- **Couleurs principales :**
  - Bleu foncé (#1E3A8A) - Confiance, finance
  - Turquoise (#14B8A6) - Technologie moderne
  - Gris clair (#F3F4F6) - Arrière-plans, neutralité
  - Vert clair (#22C55E) - Croissance, valeurs positives

- **Typographie :**
  - Titres/Logo : Poppins Bold
  - Interface/Texte : Inter Regular

## 🚀 Technologies Utilisées

- **React 18** avec TypeScript
- **Vite** pour le build et le développement
- **TailwindCSS** pour le styling
- **Recharts** pour les graphiques
- **Lucide React** pour les icônes
- **shadcn/ui** pour les composants

## 📦 Installation

1. Assurez-vous d'avoir Node.js installé (version 18+)
2. Installez les dépendances :
   ```bash
   npm install
   ```

3. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```

4. Ouvrez votre navigateur sur `http://localhost:5173`

## 🏗️ Structure du Projet

```
src/
├── components/          # Composants réutilisables
│   ├── ui/             # Composants UI de base
│   ├── Sidebar.tsx     # Navigation latérale
│   ├── KPICard.tsx     # Cartes de métriques
│   └── ChartCard.tsx   # Conteneurs de graphiques
├── pages/              # Pages de l'application
│   └── Dashboard.tsx   # Page principale du dashboard
├── lib/                # Utilitaires
└── assets/             # Ressources statiques
```

## 📊 Fonctionnalités

- **Dashboard principal** avec KPIs clés
- **Graphiques interactifs** (ligne, barres, camembert)
- **Navigation latérale** avec menu moderne
- **Design responsive** adapté à tous les écrans
- **Interface en français** pour DIMO DIAGNOSTIC

## 🔧 Scripts Disponibles

- `npm run dev` - Lance le serveur de développement
- `npm run build` - Construit l'application pour la production
- `npm run preview` - Prévisualise la build de production
- `npm run lint` - Vérifie le code avec ESLint

## 🎯 Prochaines Étapes

- Intégration avec l'API Pennylane
- Ajout des pages Rapports, Dépenses, Revenus
- Authentification utilisateur
- Export des données
- Notifications en temps réel

## 📝 Licence

© 2024 DIMO DIAGNOSTIC - Tous droits réservés

