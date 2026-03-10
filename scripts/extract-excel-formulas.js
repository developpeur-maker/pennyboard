/**
 * Extrait la structure, les formules et les valeurs d'un fichier Excel (.xlsx).
 * Usage: node scripts/extract-excel-formulas.js "chemin/vers/fichier.xlsx"
 * 
 * Le fichier Excel peut être dans Downloads ou copié dans le dossier du projet.
 * Le résultat est écrit dans scripts/excel-structure.txt (lisible pour analyse).
 */

const fs = require('fs')
const path = require('path')

let XLSX
try {
  XLSX = require('xlsx')
} catch (e) {
  console.error('❌ Il faut installer le package xlsx : npm install xlsx')
  process.exit(1)
}

const excelPath = process.argv[2]
if (!excelPath) {
  console.log('Usage: node scripts/extract-excel-formulas.js "chemin/vers/fichier.xlsx"')
  console.log('Exemple: node scripts/extract-excel-formulas.js "C:\\Users\\dimo-\\Downloads\\_FINAL_JOHN_TABLEAU_EXCEL.xlsx"')
  process.exit(1)
}

const resolvedPath = path.resolve(excelPath)
if (!fs.existsSync(resolvedPath)) {
  console.error('❌ Fichier introuvable:', resolvedPath)
  process.exit(1)
}

function cellToString(cell) {
  if (!cell) return ''
  const formula = cell.f
  const value = cell.v
  const type = cell.t
  if (formula) return `[FORMULE] ${formula}  →  (valeur: ${value})`
  if (value !== undefined && value !== '') return `[VALEUR] ${value}`
  return ''
}

function sheetToText(ws, sheetName) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  const lines = []
  lines.push('')
  lines.push('========== FEUILLE: ' + sheetName + ' ==========')
  lines.push('Plage: ' + (ws['!ref'] || 'A1'))
  lines.push('')

  for (let R = range.s.r; R <= range.e.r; R++) {
    const rowCells = []
    for (let C = range.s.c; C <= range.e.c; C++) {
      const ref = XLSX.utils.encode_cell({ r: R, c: C })
      const cell = ws[ref]
      const str = cellToString(cell)
      if (str) rowCells.push(`${ref}: ${str}`)
    }
    if (rowCells.length > 0) {
      lines.push('--- Ligne ' + (R + 1) + ' ---')
      lines.push(rowCells.join('\n'))
      lines.push('')
    }
  }
  return lines.join('\n')
}

try {
  const workbook = XLSX.readFile(resolvedPath, { cellFormula: true, cellStyles: false })
  const outLines = []
  outLines.push('# Structure Excel: ' + path.basename(resolvedPath))
  outLines.push('# Généré par extract-excel-formulas.js')
  outLines.push('')

  workbook.SheetNames.forEach((name) => {
    const sheet = workbook.Sheets[name]
    outLines.push(sheetToText(sheet, name))
  })

  const outputPath = path.join(__dirname, 'excel-structure.txt')
  fs.writeFileSync(outputPath, outLines.join('\n'), 'utf8')
  console.log('✅ Fichier généré:', outputPath)
  console.log('   Tu peux l’ouvrir et le laisser dans le projet pour que je l’analyse.')
} catch (err) {
  console.error('❌ Erreur:', err.message)
  process.exit(1)
}
