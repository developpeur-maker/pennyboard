// Configuration Payfit
const PAYFIT_CONFIG = {
  // URL de base de l'API Payfit
  BASE_URL: 'https://partner-api.payfit.com',
  
  // Endpoints disponibles
  ENDPOINTS: {
    // Récupérer les collaborateurs d'une entreprise
    COLLABORATORS: '/companies/{companyId}/collaborators'
  },
  
  // Paramètres par défaut pour les requêtes
  DEFAULT_PARAMS: {
    maxResults: 10,
    includeInProgressContracts: false
  },
  
  // Limites de l'API
  LIMITS: {
    MAX_RESULTS: 50,
    DEFAULT_RESULTS: 10
  }
}

module.exports = PAYFIT_CONFIG
