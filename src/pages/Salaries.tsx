import React, { useState, useMemo } from 'react'
import { DollarSign, Users, Calendar, RefreshCw, TrendingUp, Gift, X, ArrowUp, ArrowDown, Search } from 'lucide-react'
import { usePayfitSalaries } from '../hooks/usePayfitSalaries'

// Listes des employés par équipe
const DIAGNOSTIQUEURS = [
  'BENJAMIN BERNARD', 'CAROLE TOULORGE', 'JEAN-LAURENT GUELTON', 'Sarah Hecketsweiler', 'Alexandre Ellul-Renuy', 
  'Servane GENTILHOMME', 'Jules Freulard', 'Jacques de Castelnau', 'Grégoire DE RICARD', 'Brice Gretha', 
  'Sylvain COHERGNE', 'Fabien BETEILLE', 'Ilan TEICHNER', 'Christophe Metzger', 'Elie Dahan', 'Simon ZERBIB', 
  'Yanis Lacroix', 'Jonathan Pichon', 'Robin Zeni', 'José GARCIA CUERDA', 'Cyril Cedileau', 'Julien Colinet', 
  'Arnaud Larregain', 'Alexandre SIMONOT', 'Theo Termessant', 'Pierre-Louis VILLA', 'Antoine Fauvet', 
  'Laurent Marty', 'Yannick MBOMA', 'Nassim Bidouche', 'Mickael ERB', 'KEVIN COURTEAUX', 'Nicolas MAGERE', 
  'Yanisse Chekireb', 'Louca ANTONIOLLI', 'Pascal ALLAMELOU', 'Léo PAYAN', 'Mohamed Berete', 'Simon Benezra Simon', 
  'Rémi NAUDET', 'Sylvain Gomes', 'Nicolas Fabre', 'Armend Letaj', 'Sabry Ouadada', 'Brice GRETHA', 
  'Guillaume FATOUX', 'Amel TOUATI PINSOLLE', 'Christophe MARCHAL', 'Anis Fekih', 'Martial Macari', 
  'Faycal Zerizer', 'Morgan Lorrain', 'Nathan Jurado', 'Corentin BANIA', 'Samir BONHUR', 'Eric Loviny', 
  'Clément BUISINE', 'Steeve JEAN-PHILIPPE', 'Guillaume Lavigne', 'Stéphane MABIALA', 'Laurent Belchi', 
  'Nicolas FABRE', 'Lucas MEZERETTE', 'Khalil BOUKLOUCHE', 'Grégory LAMBING', 'Radwane FARADJI', 
  'John RAKOTONDRABAO', 'Olivier MIRAT', 'Fabien PRÉVOT', 'Onur SONMEZ', 'Jérôme BENHAMOU', 'Pierre SIONG', 
  'Océane DIOT', 'Mickael FIGUIERES', 'Romain CINIER', 'Arnaud BOUSSIDAN', 'Lydiane CAND', 'Enzo SAYIN', 
  'Mathieu TABOULOT', 'Léo MOLITES', 'Yves GRANVILLE', 'BAPTISTE BAUET', 'Mounir MAROUANE', 'François LASRET', 
  'Osman KIZILKAYA', 'Abdeltife GARTI', 'Maxime LE BRIS', 'Christopher PITA', 'David EPINEAUX', 
  'Olivier Corsin', 'Jaouad NELSON', 'Lionel THOMASSET', 'Florian VIVES', 'Maxime LEROY', 'Maxime PELLIER', 
  'Idriss TCHINI', 'Danny FIDANZA', 'Lucille GRIFFAY', 'Sofiane ZEKRI', 'Sofiane KHELFAOUI', 'Romain GUEHO', 
  'Jérôme SAUVAGE', 'Yohann LAILLIER-JARDÉ', 'Pascal CABELEIRA', 'Aziz AOURAGH', 'Téo DOUBLIER', 
  'Sébastien SOUYRIS', 'Fabrice STECIUK', 'Jérémie JOURNAUX', 'Ariles MERAD', 'Simon PACAUD'
].map(name => name.toUpperCase().trim())

const BUREAUX = [
  'TEDDY MUNOZ DE LA NAVA', 'LOUIS LORIN', 'Romain Baldassarre', 'Ambre Deligny', 'François Kulczak', 
  'WIAME Papin', 'Floriane Mermoud', 'Saad Lahlou', 'valérie LAUNE', 'Caroline Sola', 'Amine Guellati', 
  'Mounir Harchaoui', 'Lilou Raja', 'Tom Le Louédec', 'Marceau DI COSTANZO', 'Charles Lorin', 
  'Cédric Weishaar', 'Kevin Sousa', 'Yéléna Cordin', 'Romane Vallaud', 'Corentin Sarkissian', 
  'Enola Enjelvin', 'Nicolas Martinez White', 'Manon Fabra', 'Robin Merlo', 'Théophile Lequeux', 
  'Karine ATTOLOU', 'Bastien Bosviel', 'Egor PEREDERIY', 'Fabien Chodaton', 'Winona Iuhasz', 
  'David Zerbib', 'Aimeric Mir', 'Julie LE TRAOU', 'Maurice DIOUF', 'Sacha DOBERVA', 
  'Térence TAAFFET OGANDAGA', 'Younes Khalfi', 'Tom Vea', 'Tifany Oussal', 'Matthieu CREPIN', 
  'Clément JAUBERT', 'Damien RENNEVILLE', 'Gabriel Nuel', 'Marion Wilhelm', 'Arina Georgiyeva', 
  'Michel Pesant', 'O\'Bryan MIEZAN', 'Naomi Coulaud', 'Laurie AUDDINO', 'Abdelkhaliq DIDAH', 
  'Adrien BISSET', 'Azedine LEBBAD', 'Miriam Marty', 'Nathan CATANIA', 'Thibaut Bissuel', 
  'Sharon elbaz', 'Olga Julien-Pannie', 'Romane MESLIN', 'Marine Bramand', 'PAUL Grieneisen', 
  'Ian SIGUIER', 'Claire BOISMENU', 'Circée Cabayot', 'Laurine Tourasse', 'Ethella Bettahar-Ripert', 
  'Laura ADAM', 'Célia Turgot', 'Kily JACKSON', 'Marine SZCZEPANIAK', 'Raphael daumas', 'Jaad SEKKAL', 
  'Matheo JIMENEZ', 'Clement Lennuyeux', 'Marilyne Ly', 'Paul Bigot', 'Romeo Fayaud', 
  'Talia-noor Thahouly', 'Louis TEICHNER', 'Nawal BELOUALI', 'Svetlana Sokolova', 'Octhave JOSSERAND', 
  'Robin Pina', 'Lucie Mirabile', 'Annabel CREVAUX - VIDAL', 'Jade Piochelle', 'Matheo Jimenez', 
  'Nathan BOURBON', 'Naomi COULAUD', 'Luc BUENO', 'Gigi BERNAD', 'Lou NAVARRO', 'Raphael DEFLANDRE', 
  'Nicolas SCHNEIDER', 'Thibault FAYOL', 'Caitline LAMBOLEY', 'Inès IKAR', 'Romane WETTERWALD', 
  'Walid Selmani', 'Samia EL OMARI', 'Carla SIBILLIN', 'Tom ARNAUD BERGER', 'Claudia MATTERA', 
  'Célia BONFIGLIO', 'François LOPEZ', 'Ikram MESLOUHI', 'Laurine MONTEL', 'Aurélie GAILLARD', 
  'Isabelle Tchesnokov', 'Jade FOUCHER', 'Chloé Gazagne', 'Christopher MICHEL', 'Julien GEBALA', 
  'Kim Abbruzzese', 'Jonathan LAMPER', 'Larry BOULANGER', 'Jade PLANAS', 'Sarah LAVALY', 
  'Kamilia BENASR', 'Cloé GAVE', 'Cherazade RAMDANI', 'Sana KASSEM', 'Noe RIBEIRO', 'Estelle Kozlow', 
  'David LILLO', 'Sully FABULAS', 'Julie DUGUE', 'Hiba MISSAOUI', 'Coline ETOURNEAUD', 
  'Pauline LE GUILLOU', 'Théo PLAZAS', 'Arnaud CHAMPEIL', 'Hélène GEORGET', 'Marina BROSOLO', 
  'Cédric CÉCÉ', 'Alexia COSTA', 'Amélie MOREAU', 'Sheilcy NEOCEL', 'Luna COUTEAU', 'Fabien BERTRAND', 
  'Lucas DANTIN', 'Zéphir DUBERT', 'Victor ANTECH', 'Maxime TURION', 'Aurélien GRAZIANO', 
  'Stéphane MARKOVIC', 'Jordane REBOUL', 'Anaïs BENI', 'Lucas BAJEOT', 'Kevin VANNIER'
].map(name => name.toUpperCase().trim())

// Fonction pour normaliser un nom (enlever accents, espaces multiples, etc.)
const normalizeName = (name: string): string => {
  return name
    .toUpperCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
    .replace(/\s+/g, ' ') // Remplacer les espaces multiples par un seul
}

// Fonction pour déterminer l'équipe d'un employé
const getEmployeeTeam = (employeeName: string): 'Bureau' | 'Diagnostiqueur' | null => {
  const normalizedName = normalizeName(employeeName)
  
  if (DIAGNOSTIQUEURS.some(name => normalizeName(name) === normalizedName)) {
    return 'Diagnostiqueur'
  }
  
  if (BUREAUX.some(name => normalizeName(name) === normalizedName)) {
    return 'Bureau'
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
  const [teamFilters, setTeamFilters] = useState({
    diagnostiqueur: true,
    bureau: true
  })

  // Déterminer si on affiche l'année complète ou un mois spécifique
  // Si selectedMonth se termine par "-00", c'est "Exercice complet"
  const isFullYear = selectedMonth.endsWith('-00')
  const actualSelectedMonth = isFullYear ? undefined : selectedMonth

  const { employees, loading, error, lastSyncDate, refetch } = usePayfitSalaries(actualSelectedMonth, isFullYear ? selectedYear : undefined)

  // Fonction de filtrage et tri
  const filteredAndSortedEmployees = useMemo(() => {
    if (!employees || employees.length === 0) return []

    // Filtrer par équipe
    let filtered = employees.filter(employee => {
      const team = getEmployeeTeam(employee.employeeName)
      if (team === 'Diagnostiqueur') {
        return teamFilters.diagnostiqueur
      } else if (team === 'Bureau') {
        return teamFilters.bureau
      }
      // Si l'employé n'a pas d'équipe définie, on l'inclut si au moins un filtre est actif
      return teamFilters.diagnostiqueur || teamFilters.bureau
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
          aValue = getEmployeeTeam(a.employeeName) || ''
          bValue = getEmployeeTeam(b.employeeName) || ''
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
  }, [employees, sortColumn, sortOrder, searchQuery, teamFilters])

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
          
          {/* Filtres par équipe */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-medium text-gray-700">Filtrer par équipe :</span>
            <button
              onClick={() => setTeamFilters(prev => ({ ...prev, diagnostiqueur: !prev.diagnostiqueur }))}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                teamFilters.diagnostiqueur
                  ? 'bg-yellow-100 text-yellow-800 ring-2 ring-yellow-500'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              Diagnostiqueur
            </button>
            <button
              onClick={() => setTeamFilters(prev => ({ ...prev, bureau: !prev.bureau }))}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                teamFilters.bureau
                  ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-500'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              Bureau
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
                  const team = getEmployeeTeam(employee.employeeName)
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
                      {team && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          team === 'Bureau' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {team}
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

