import React, { useState, useMemo } from 'react'
import { DollarSign, Users, Calendar, RefreshCw, TrendingUp, Gift, X, ArrowUp, ArrowDown, Search } from 'lucide-react'
import { usePayfitSalaries } from '../hooks/usePayfitSalaries'

// Configuration des tags avec leurs couleurs
const TAG_CONFIG: Record<string, { color: string; bgColor: string }> = {
  'Tech - Paris': { color: '#062B16', bgColor: '#E8F5E9' },
  'Tech - Marseille': { color: '#062B16', bgColor: '#E8F5E9' },
  'Tech - Nice': { color: '#062B16', bgColor: '#E8F5E9' },
  'Tech - Nimes': { color: '#062B16', bgColor: '#E8F5E9' },
  'Tech - Montpellier': { color: '#062B16', bgColor: '#E8F5E9' },
  'Tech - Lyon': { color: '#062B16', bgColor: '#E8F5E9' },
  'Tech - Strasbourg': { color: '#062B16', bgColor: '#E8F5E9' },
  'Tech - Lille': { color: '#062B16', bgColor: '#E8F5E9' },
  'Tech - Nantes': { color: '#062B16', bgColor: '#E8F5E9' },
  'Tech - Toulouse': { color: '#062B16', bgColor: '#E8F5E9' },
  'Tech - Bordeaux': { color: '#062B16', bgColor: '#E8F5E9' },
  'RH': { color: '#800080', bgColor: '#F3E5F5' },
  'Opti': { color: '#B8860B', bgColor: '#FFF8DC' },
  'Market&Dev': { color: '#FF5000', bgColor: '#FFE0CC' },
  'Support technique': { color: '#787878', bgColor: '#E0E0E0' },
  'Commercial': { color: '#FF0000', bgColor: '#FFEBEE' },
  'Comptabilité': { color: '#0000FF', bgColor: '#E3F2FD' }
}

// Listes des employés par tag (UNIQUEMENT pour les données historiques)
// Pour les mois futurs, les tags seront récupérés directement via l'API (champ `tag` dans les données)
const EMPLOYEES_BY_TAG: Record<string, string[]> = {
  'Comptabilité': [
    'Lilou Raja', 'Charles Lorin', 'Enola Enjelvin', 'Arina Georgiyeva', 'Ian SIGUIER', 
    'Laura ADAM', 'Marilyne Ly', 'Lucie Mirabile', 'Jonathan LAMPER', 'Hélène GEORGET'
  ],
  'RH': [
    'Olga Julien-Pannie', 'Nawal BELOUALI', 'Claudia MATTERA', 'Aurélie GAILLARD'
  ],
  'Support technique': [
    'Romain Baldassarre', 'Louca ANTONIOLLI', 'Laurent Belchi', 'Romeo Fayaud', 
    'Caitline LAMBOLEY', 'Larry BOULANGER', 'Amélie MOREAU'
  ],
  'Opti': [
    'Yéléna Cordin', 'Abdelkhaliq DIDAH', 'Marine Bramand', 'Jade Piochelle', 
    'Kim Abbruzzese', 'Jade PLANAS', 'Pauline LE GUILLOU'
  ],
  'Market&Dev': [
    'François Kulczak', 'WIAME Papin', 'Saad Lahlou', 'Caroline Sola', 
    'Corentin Sarkissian', 'Nicolas Martinez White', 'Manon Fabra', 'Karine ATTOLOU', 
    'Fabien Chodaton', 'Winona Iuhasz', 'Julie LE TRAOU', 'Maurice DIOUF', 
    'Younes Khalfi', 'Damien RENNEVILLE', 'Gabriel Nuel', 'Marion Wilhelm', 
    'O\'Bryan MIEZAN', 'Naomi Coulaud', 'Thibaut Bissuel', 'Claire BOISMENU', 
    'Marine SZCZEPANIAK', 'Raphael daumas', 'Jaad SEKKAL', 'Annabel CREVAUX - VIDAL', 
    'Naomi COULAUD', 'Gigi BERNAD', 'Raphael DEFLANDRE', 'Thibault FAYOL', 
    'Inès IKAR', 'Romane WETTERWALD', 'Walid Selmani', 'Samia EL OMARI', 
    'Tom ARNAUD BERGER', 'Ikram MESLOUHI'
  ],
  'Commercial': [
    'TEDDY MUNOZ DE LA NAVA', 'Ambre Deligny', 'Floriane Mermoud', 'valérie LAUNE', 
    'Amine Guellati', 'Mounir Harchaoui', 'Tom Le Louédec', 'Marceau DI COSTANZO', 
    'Cédric Weishaar', 'Kevin Sousa', 'Romane Vallaud', 'Robin Merlo', 
    'Théophile Lequeux', 'Bastien Bosviel', 'Egor PEREDERIY', 'David Zerbib', 
    'Aimeric Mir', 'Sacha DOBERVA', 'Térence TAAFFET OGANDAGA', 'Tom Vea', 
    'Tifany Oussal', 'Clément JAUBERT', 'Michel Pesant', 'Laurie AUDDINO', 
    'Adrien BISSET', 'Azedine LEBBAD', 'Miriam Marty', 'Nathan CATANIA', 
    'Sharon elbaz', 'Romane MESLIN', 'PAUL Grieneisen', 'Circée Cabayot', 
    'Laurine Tourasse', 'Ethella Bettahar-Ripert', 'Célia Turgot', 'Kily JACKSON', 
    'Matheo JIMENEZ', 'Clement Lennuyeux', 'Paul Bigot', 'Talia-noor Thahouly', 
    'Louis TEICHNER', 'Svetlana Sokolova', 'Octhave JOSSERAND', 'Robin Pina', 
    'Matheo Jimenez', 'Nathan BOURBON', 'Luc BUENO', 'Lou NAVARRO', 
    'Nicolas SCHNEIDER', 'Carla SIBILLIN', 'Célia BONFIGLIO', 'François LOPEZ', 
    'Laurine MONTEL', 'Isabelle Tchesnokov', 'Jade FOUCHER', 'Chloé Gazagne', 
    'Christopher MICHEL', 'Julien GEBALA', 'Sarah LAVALY', 'Kamilia BENASR', 
    'Cloé GAVE', 'Cherazade RAMDANI', 'Sana KASSEM', 'Noe RIBEIRO', 
    'Estelle Kozlow', 'David LILLO', 'Sully FABULAS', 'Julie DUGUE', 
    'Hiba MISSAOUI', 'Coline ETOURNEAUD', 'Théo PLAZAS', 'Arnaud CHAMPEIL', 
    'Marina BROSOLO', 'Cédric CÉCÉ', 'Alexia COSTA', 'Sheilcy NEOCEL', 
    'Luna COUTEAU', 'Fabien BERTRAND', 'Lucas DANTIN', 'Zéphir DUBERT', 
    'Victor ANTECH', 'Maxime TURION', 'Aurélien GRAZIANO', 'Stéphane MARKOVIC', 
    'Jordane REBOUL', 'Anaïs BENI', 'Lucas BAJEOT', 'Kevin VANNIER'
  ],
  'Tech - Paris': [
    'Yannick MBOMA', 'Nassim Bidouche', 'Léo PAYAN', 'Mohamed Berete', 
    'Guillaume FATOUX', 'Faycal Zerizer', 'Nathan Jurado', 'Clément BUISINE', 
    'Steeve JEAN-PHILIPPE', 'John RAKOTONDRABAO', 'Océane DIOT', 'Enzo SAYIN', 
    'Léo MOLITES', 'Yves GRANVILLE', 'Mounir MAROUANE', 'Christopher PITA', 
    'David EPINEAUX', 'Olivier Corsin', 'Jaouad NELSON', 'Lionel THOMASSET', 
    'Florian VIVES', 'Maxime LEROY', 'Idriss TCHINI', 'Danny FIDANZA', 
    'Sofiane ZEKRI', 'Sofiane KHELFAOUI', 'Romain GUEHO', 'Pascal CABELEIRA', 
    'Aziz AOURAGH', 'Jérémie JOURNAUX', 'Ariles MERAD'
  ],
  'Tech - Marseille': [
    'Jules Freulard', 'Elie Dahan', 'José GARCIA CUERDA', 'Christophe MARCHAL', 
    'Eric Loviny', 'Lucille GRIFFAY'
  ],
  'Tech - Nice': [
    'KEVIN COURTEAUX', 'Anis Fekih', 'Arnaud BOUSSIDAN'
  ],
  'Tech - Nimes': [
    'BENJAMIN BERNARD', 'JEAN-LAURENT GUELTON', 'Sarah Hecketsweiler', 
    'Alexandre Ellul-Renuy', 'Servane GENTILHOMME', 'Pierre-Louis VILLA', 
    'Antoine Fauvet', 'Mickael ERB', 'Nicolas MAGERE', 'Rémi NAUDET', 
    'Morgan Lorrain', 'Corentin BANIA', 'Yohann LAILLIER-JARDÉ', 
    'Sébastien SOUYRIS'
  ],
  'Tech - Montpellier': [
    'CAROLE TOULORGE', 'Grégoire DE RICARD', 'Sylvain COHERGNE', 'Ilan TEICHNER', 
    'Jonathan Pichon', 'Robin Zeni', 'Arnaud Larregain', 'Laurent Marty', 
    'Sylvain Gomes', 'Nicolas FABRE', 'Mathieu TABOULOT'
  ],
  'Tech - Lyon': [
    'Simon ZERBIB', 'Pascal ALLAMELOU', 'Martial Macari', 'Khalil BOUKLOUCHE', 
    'Radwane FARADJI', 'Pierre SIONG', 'Romain CINIER', 'Lydiane CAND', 
    'Osman KIZILKAYA', 'Maxime PELLIER', 'Téo DOUBLIER'
  ],
  'Tech - Strasbourg': [
    'Brice GRETHA', 'Grégory LAMBING', 'Onur SONMEZ', 'Abdeltife GARTI'
  ],
  'Tech - Lille': [
    'Sabry Ouadada', 'Stéphane MABIALA', 'BAPTISTE BAUET'
  ],
  'Tech - Nantes': [
    'Simon Benezra Simon', 'Fabien PRÉVOT', 'Jérôme BENHAMOU', 'Mickael FIGUIERES', 
    'Jérôme SAUVAGE', 'Simon PACAUD', 'Maxime LE BRIS'
  ],
  'Tech - Toulouse': [
    'Jacques de Castelnau', 'Fabien BETEILLE', 'Julien Colinet', 'Alexandre SIMONOT', 
    'Yanisse Chekireb', 'Armend Letaj', 'Olivier MIRAT'
  ],
  'Tech - Bordeaux': [
    'Christophe Metzger', 'Cyril Cedileau', 'Theo Termessant', 'Amel TOUATI PINSOLLE', 
    'Samir BONHUR', 'Lucas MEZERETTE', 'François LASRET', 'Fabrice STECIUK'
  ]
}

// Fonction pour normaliser un nom (enlever accents, espaces multiples, etc.)
const normalizeName = (name: string): string => {
  return name
    .toUpperCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
    .replace(/\s+/g, ' ') // Remplacer les espaces multiples par un seul
}

// Fonction pour déterminer le tag d'un employé
// Priorité : 1) Tag de l'API (pour les données futures), 2) Structure codée en dur (pour les données historiques)
const getEmployeeTag = (employee: { employeeName: string; tag?: string | null }): string | null => {
  // 1. Si l'API fournit un tag, l'utiliser en priorité (pour les mois futurs)
  if (employee.tag) {
    return employee.tag
  }
  
  // 2. Sinon, utiliser la structure codée en dur (pour les données historiques)
  const normalizedName = normalizeName(employee.employeeName)
  
  // Parcourir tous les tags pour trouver celui de l'employé
  for (const [tag, employees] of Object.entries(EMPLOYEES_BY_TAG)) {
    if (employees.some(name => normalizeName(name) === normalizedName)) {
      return tag
    }
  }
  
  return null
}

type SortColumn = 'name' | 'salaryPaid' | 'totalPrimes' | 'totalContributions' | 'totalGrossCost' | 'team'
type SortOrder = 'asc' | 'desc'

const Salaries: React.FC = () => {
  // Obtenir le mois en cours par défaut
  const getCurrentMonth = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() + 1
    const monthFormatted = month.toString().padStart(2, '0')
    return `${year}-${monthFormatted}`
  }

  // Générer les années disponibles (2021 → année actuelle)
  const generateAvailableYears = () => {
    const years = []
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const startYear = 2021

    for (let year = currentYear; year >= startYear; year--) {
      years.push({
        value: year.toString(),
        label: `Exercice ${year}`
      })
    }

    return years
  }

  // Générer les mois d'une année spécifique
  const generateMonthsForYear = (year: string) => {
    const months = []
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]

    for (let month = 1; month <= 12; month++) {
      const monthFormatted = month.toString().padStart(2, '0')
      const monthKey = `${year}-${monthFormatted}`

      months.push({
        value: monthKey,
        label: `${monthNames[month - 1]} ${year}`
      })
    }

    return months
  }

  const currentMonth = getCurrentMonth()
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(() => {
    const [year] = currentMonth.split('-')
    return year
  })
  const [selectedEmployee, setSelectedEmployee] = useState<{ name: string; operations: any[] } | null>(null)
  const [sortColumn, setSortColumn] = useState<SortColumn>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [searchQuery, setSearchQuery] = useState('')
  // Initialiser les filtres de tags (tous activés par défaut)
  const [tagFilters, setTagFilters] = useState<Record<string, boolean>>(() => {
    const filters: Record<string, boolean> = {}
    Object.keys(EMPLOYEES_BY_TAG).forEach(tag => {
      filters[tag] = true
    })
    return filters
  })

  // Déterminer si on affiche l'année complète ou un mois spécifique
  // Si selectedMonth se termine par "-00", c'est "Exercice complet"
  const isFullYear = selectedMonth.endsWith('-00')
  const actualSelectedMonth = isFullYear ? undefined : selectedMonth

  const { employees, loading, error, lastSyncDate, refetch } = usePayfitSalaries(actualSelectedMonth, isFullYear ? selectedYear : undefined)

  // Fonction de filtrage et tri
  const filteredAndSortedEmployees = useMemo(() => {
    if (!employees || employees.length === 0) return []

    // Filtrer par tag
    let filtered = employees.filter(employee => {
      const tag = getEmployeeTag(employee)
      if (tag) {
        return tagFilters[tag] === true
      }
      // Si l'employé n'a pas de tag défini, on l'inclut si au moins un filtre est actif
      return Object.values(tagFilters).some(active => active === true)
    })

    // Filtrer par recherche textuelle
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(employee => 
        employee.employeeName.toLowerCase().includes(query)
      )
    }

    // Trier les résultats filtrés
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortColumn) {
        case 'name':
          aValue = a.employeeName || ''
          bValue = b.employeeName || ''
          break
        case 'salaryPaid':
          aValue = a.salaryPaid || 0
          bValue = b.salaryPaid || 0
          break
        case 'totalPrimes':
          aValue = a.totalPrimes || 0
          bValue = b.totalPrimes || 0
          break
        case 'totalContributions':
          aValue = a.totalContributions || 0
          bValue = b.totalContributions || 0
          break
        case 'totalGrossCost':
          aValue = a.totalGrossCost || 0
          bValue = b.totalGrossCost || 0
          break
        case 'team':
          aValue = getEmployeeTag(a) || ''
          bValue = getEmployeeTag(b) || ''
          break
        default:
          return 0
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue, 'fr', { sensitivity: 'base' })
          : bValue.localeCompare(aValue, 'fr', { sensitivity: 'base' })
      } else {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
      }
    })

    return sorted
  }, [employees, sortColumn, sortOrder, searchQuery, tagFilters])

  // Calculer les totaux filtrés pour les cards
  const filteredTotals = useMemo(() => {
    if (!filteredAndSortedEmployees || filteredAndSortedEmployees.length === 0) {
      return {
        totalSalaryPaid: 0,
        totalPrimes: 0,
        totalContributions: 0,
        totalGrossCost: 0
      }
    }

    return filteredAndSortedEmployees.reduce((acc, employee) => ({
      totalSalaryPaid: acc.totalSalaryPaid + (employee.salaryPaid || 0),
      totalPrimes: acc.totalPrimes + (employee.totalPrimes || 0),
      totalContributions: acc.totalContributions + (employee.totalContributions || 0),
      totalGrossCost: acc.totalGrossCost + (employee.totalGrossCost || 0)
    }), {
      totalSalaryPaid: 0,
      totalPrimes: 0,
      totalContributions: 0,
      totalGrossCost: 0
    })
  }, [filteredAndSortedEmployees])

  // Fonction pour gérer le clic sur un en-tête de colonne
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Inverser l'ordre si on clique sur la même colonne
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // Nouvelle colonne, commencer par asc
      setSortColumn(column)
      setSortOrder('asc')
    }
  }

  // Fonction pour tout cocher
  const handleSelectAll = () => {
    const allSelected: Record<string, boolean> = {}
    Object.keys(EMPLOYEES_BY_TAG).forEach(tag => {
      allSelected[tag] = true
    })
    setTagFilters(allSelected)
  }

  // Fonction pour tout décocher
  const handleDeselectAll = () => {
    const allDeselected: Record<string, boolean> = {}
    Object.keys(EMPLOYEES_BY_TAG).forEach(tag => {
      allDeselected[tag] = false
    })
    setTagFilters(allDeselected)
  }
  
  // État pour la synchronisation
  const [isSyncing, setIsSyncing] = useState(false)
  const [isFullPayfitSyncing, setIsFullPayfitSyncing] = useState(false)

  // Fonction de synchronisation manuelle
  const handleManualSync = async () => {
    try {
      setIsSyncing(true)
      console.log('🔄 Début de la synchronisation Payfit...')
      
      const response = await fetch('/api/sync-payfit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'pennyboard_secret_key_2025'
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Synchronisation réussie:', result)
        
        // Actualiser les données après synchronisation
        await refetch()
        
        alert('✅ Synchronisation réussie ! Les données ont été mises à jour.')
      } else {
        const error = await response.json()
        console.error('❌ Erreur de synchronisation:', error)
        alert(`❌ Erreur de synchronisation: ${error.error || 'Erreur inconnue'}\n\nDétails: ${error.details || 'Aucun détail'}`)
      }
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation:', error)
      alert('❌ Erreur lors de la synchronisation. Veuillez réessayer.')
    } finally {
      setIsSyncing(false)
    }
  }

  // Fonction de synchronisation complète Payfit (tous les mois depuis 2021)
  const handleFullPayfitSync = async () => {
    if (!confirm('⚠️ Attention : Cette synchronisation Payfit va mettre à jour TOUS les mois depuis 2021. Cela peut prendre beaucoup de temps et être rate limited. Continuer ?')) {
      return
    }

    setIsFullPayfitSyncing(true)
    try {
      console.log('🔄 Début de la synchronisation complète Payfit...')
      
      const response = await fetch('/api/sync-payfit-full', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'pennyboard_secret_key_2025'
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Synchronisation complète Payfit réussie:', result)
        
        // Actualiser les données après synchronisation
        await refetch()
        
        alert(`✅ Synchronisation complète Payfit réussie !\n\n${result.summary?.total || 0} mois synchronisés\n${result.summary?.success || 0} succès, ${result.summary?.errors || 0} erreurs\nDurée: ${Math.round((result.summary?.duration_ms || 0) / 1000)} secondes`)
      } else {
        const error = await response.json()
        console.error('❌ Erreur de synchronisation complète Payfit:', error)
        alert(`❌ Erreur de synchronisation complète Payfit: ${error.error || 'Erreur inconnue'}\n\nDétails: ${error.details || 'Aucun détail'}\nType: ${error.type || 'Inconnu'}`)
      }
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation complète Payfit:', error)
      alert('❌ Erreur lors de la synchronisation complète Payfit. Veuillez réessayer.')
    } finally {
      setIsFullPayfitSyncing(false)
    }
  }

  // Formater les montants
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Utiliser les totaux filtrés pour les cards
  const totalSalaryPaid = filteredTotals.totalSalaryPaid
  const totalPrimes = filteredTotals.totalPrimes
  const totalContributions = filteredTotals.totalContributions
  const totalGrossCost = filteredTotals.totalGrossCost

  // Pourcentages par rapport au total brut global (s'ajustent avec les filtres exercice / mois / tags)
  const totalForPercent = totalGrossCost > 0 ? totalGrossCost : 1
  const percentSalary = Math.round((totalSalaryPaid / totalForPercent) * 1000) / 10
  const percentPrimes = Math.round((totalPrimes / totalForPercent) * 1000) / 10
  const percentContributions = Math.round((totalContributions / totalForPercent) * 1000) / 10
  const percentTotal = totalGrossCost > 0 ? 100 : 0

  // Formater la période affichée
  const formatPeriod = () => {
    if (isFullYear) {
      return `exercice ${selectedYear}`
    } else {
      const [year, month] = selectedMonth.split('-')
      const monthNames = [
        'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
      ]
      const monthName = monthNames[parseInt(month) - 1]
      return `${monthName} ${year}`
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement des données de salaires...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">Erreur de chargement</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold font-poppins text-gray-900">
            Salaires et cotisations
          </h1>
          <p className="text-gray-600 font-inter mt-2 text-lg">
            Détail des salaires et cotisations par collaborateur
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Sélecteurs de période */}
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-600" />
            
            {/* Sélecteur à deux niveaux : Année puis Mois */}
            <div className="flex items-center gap-2">
              {/* Sélecteur d'année */}
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value)
                  // Réinitialiser le mois sélectionné quand on change d'année
                  setSelectedMonth(`${e.target.value}-01`)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-medium"
              >
                {generateAvailableYears().map((year) => (
                  <option key={year.value} value={year.value}>
                    {year.label}
                  </option>
                ))}
              </select>

              {/* Sélecteur de mois ou année complète */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-medium"
              >
                <option value={`${selectedYear}-00`}>Exercice complet</option>
                {generateMonthsForYear(selectedYear).map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Indicateur de synchronisation */}
      <div className={`border rounded-lg p-3 ${lastSyncDate ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {lastSyncDate ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-700">Dernière synchronisation : {new Date(lastSyncDate).toLocaleString('fr-FR')}</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-yellow-700">Aucune synchronisation récente</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSync}
              disabled={isSyncing || isFullPayfitSyncing}
              className={`flex items-center gap-2 px-3 py-1 text-white text-xs rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                lastSyncDate 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-yellow-600 hover:bg-yellow-700'
              }`}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Synchronisation...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  Synchroniser l'API Payfit
                </>
              )}
            </button>
            <button
              onClick={handleFullPayfitSync}
              disabled={isSyncing || isFullPayfitSyncing}
              className={`flex items-center gap-2 px-3 py-1 text-white text-xs rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-orange-600 hover:bg-orange-700`}
              title="Synchronisation complète Payfit de tous les mois depuis 2021 (temporaire - peut être rate limited)"
            >
              {isFullPayfitSyncing ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Sync Payfit complète...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  Sync Payfit complète (Admin - ne pas cliquer)
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Salaire du mois</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalSalaryPaid)}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                ({percentSalary} %)
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Primes totales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalPrimes)}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                ({percentPrimes} %)
              </p>
            </div>
            <Gift className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cotisations totales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalContributions)}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                ({percentContributions} %)
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total brut global</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalGrossCost)}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                ({percentTotal} %)
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Liste des collaborateurs */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Détail par collaborateur - {formatPeriod()}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {filteredAndSortedEmployees.length} collaborateur{filteredAndSortedEmployees.length > 1 ? 's' : ''} trouvé{filteredAndSortedEmployees.length > 1 ? 's' : ''}
            </p>
          </div>
          
          {/* Filtres par tag */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Filtrer par tag :</span>
            {Object.keys(EMPLOYEES_BY_TAG).map(tag => {
              const config = TAG_CONFIG[tag]
              const isActive = tagFilters[tag] === true
              return (
                <button
                  key={tag}
                  onClick={() => setTagFilters(prev => ({ ...prev, [tag]: !prev[tag] }))}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={isActive ? {
                    backgroundColor: config.bgColor,
                    color: config.color,
                    border: `2px solid ${config.color}`
                  } : {
                    backgroundColor: '#F3F4F6',
                    color: '#6B7280'
                  }}
                >
                  {tag}
                </button>
              )
            })}
          </div>

          {/* Boutons tout cocher / tout décocher */}
          <div className="flex items-center gap-2 mt-3 mb-4">
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tout cocher
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Tout décocher
            </button>
          </div>

          {/* Champ de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un collaborateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
            />
          </div>
        </div>

        {employees.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucune donnée de salaire trouvée pour cette période</p>
          </div>
        ) : filteredAndSortedEmployees.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun collaborateur trouvé pour "{searchQuery}"</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Collaborateur
                      {sortColumn === 'name' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('team')}
                  >
                    <div className="flex items-center gap-2">
                      Équipe
                      {sortColumn === 'team' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('salaryPaid')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Salaire du mois
                      {sortColumn === 'salaryPaid' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('totalPrimes')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Primes
                      {sortColumn === 'totalPrimes' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('totalContributions')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Cotisations
                      {sortColumn === 'totalContributions' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('totalGrossCost')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Total brut
                      {sortColumn === 'totalGrossCost' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedEmployees.map((employee, index) => {
                  const tag = getEmployeeTag(employee)
                  const tagConfig = tag ? TAG_CONFIG[tag] : null
                  return (
                  <tr 
                    key={`${employee.employeeName}-${index}`} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedEmployee({ name: employee.employeeName, operations: employee.operations || [] })}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {employee.employeeName}
                      </div>
                      {employee.contractId && employee.contractId !== 'unknown' && (
                        <div className="text-xs text-gray-500">
                          Contrat: {employee.contractId.substring(0, 8)}...
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tag && tagConfig && (
                        <span 
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: tagConfig.bgColor,
                            color: tagConfig.color
                          }}
                        >
                          {tag}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(employee.salaryPaid || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(employee.totalPrimes || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(employee.totalContributions || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                      {formatCurrency(employee.totalGrossCost || 0)}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    Total
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {/* Colonne équipe vide dans le footer */}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                    {formatCurrency(totalSalaryPaid)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                    {formatCurrency(totalPrimes)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                    {formatCurrency(totalContributions)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                    {formatCurrency(totalGrossCost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal de détail des comptes d'un employé */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setSelectedEmployee(null)}
          />
          
          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Détail des comptes</h2>
                  <p className="text-sm text-gray-600">{selectedEmployee.name} - {formatPeriod()}</p>
                </div>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              {/* Content */}
              <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                {selectedEmployee.operations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Aucune opération disponible pour cet employé
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedEmployee.operations.map((operation: any, index: number) => {
                      const amount = Math.abs(operation.debit || operation.credit || 0)
                      const accountName = operation.accountName || 'Compte inconnu'
                      const accountId = operation.accountId || ''
                      
                      // Nommer le compte 6580000 comme "Pourboires et autres"
                      const displayName = accountId === '6580000' ? 'Pourboires et autres' : accountName
                      
                      return (
                        <div 
                          key={index}
                          className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {displayName}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Compte {accountId}
                            </div>
                            {operation.operationDate && (
                              <div className="text-xs text-gray-400 mt-1">
                                {new Date(operation.operationDate).toLocaleDateString('fr-FR')}
                              </div>
                            )}
                          </div>
                          <div className="font-semibold text-lg text-gray-900">
                            {formatCurrency(amount)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">Total des opérations</span>
                  <span className="font-bold text-xl text-gray-900">
                    {formatCurrency(
                      selectedEmployee.operations.reduce((sum: number, op: any) => 
                        sum + Math.abs(op.debit || op.credit || 0), 0
                      )
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Salaries

