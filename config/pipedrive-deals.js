/**
 * IDs des champs personnalisés Pipedrive pour la collection deals (custom_fields).
 * Utilisés pour filtrer et projeter les données depuis MongoDB.
 */
module.exports = {
  CUSTOM_FIELD_IDS: {
    DIAGNOSTIQUEUR: '7621b26d5149ac69b3d6d411b1caf903ad55b97f',
    DATE_RDV: '2571d99d263367a41272d463b1f691bcc3281780',
    TEMPS_INTERVENTION: 'f6fd171e5b395779f565b2e36d52a3d137fa197c',
    ZONE: 'a7a2dfdc6246d32ba063d2f104af2187293cfe19',
    DIAGNOSTICS_REALISES: 'efc9fa52de8efb81ccc4da57022910eed5a9a636',
    NUMERO_FACTURE: 'f7ad550479181c48a0ad993571ac840cc18da222'
  },
  /** Champs custom dont la valeur est un INTEGER à mapper via l’URL d’options */
  INTEGER_FIELD_IDS: [
    '7621b26d5149ac69b3d6d411b1caf903ad55b97f', // Diagnostiqueur
    'a7a2dfdc6246d32ba063d2f104af2187293cfe19', // Zone
    'efc9fa52de8efb81ccc4da57022910eed5a9a636'  // Diagnostics réalisés
  ]
  // Temps d'intervention : STRING, pas de mapping
}
