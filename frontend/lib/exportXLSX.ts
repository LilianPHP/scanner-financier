import type { Transaction } from './api'

/* ─── Palette ─────────────────────────────────────────── */
const C = {
  green:      '1D9E75',
  darkGreen:  '0A3D2E',
  lightGreen: 'E8F5EF',
  red:        'DC2626',
  lightRed:   'FEF2F2',
  gray:       'F5F5F3',
  white:      'FFFFFF',
  black:      '111110',
  amber:      'D97706',
  border:     'E5E7EB',
  altRow:     'F9FAFB',
}

/* ─── Style helpers ────────────────────────────────────── */
function bd(rgb = C.border) {
  const s = { style: 'thin', color: { rgb } }
  return { top: s, bottom: s, left: s, right: s }
}

const S = {
  title: {
    fill: { fgColor: { rgb: C.green } },
    font: { bold: true, sz: 14, color: { rgb: C.white }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'middle' },
  },
  section: {
    fill: { fgColor: { rgb: C.darkGreen } },
    font: { bold: true, sz: 10, color: { rgb: C.white }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'middle' },
  },
  header: {
    fill: { fgColor: { rgb: C.green } },
    font: { bold: true, sz: 10, color: { rgb: C.white }, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: bd(C.green),
  },
  label: {
    fill: { fgColor: { rgb: C.gray } },
    font: { bold: true, sz: 10, color: { rgb: C.black }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: bd(),
  },
  value: {
    font: { sz: 10, color: { rgb: C.black }, name: 'Calibri' },
    alignment: { horizontal: 'right', vertical: 'middle' },
    border: bd(),
  },
  greenVal: {
    fill: { fgColor: { rgb: C.lightGreen } },
    font: { bold: true, sz: 10, color: { rgb: C.green }, name: 'Calibri' },
    alignment: { horizontal: 'right', vertical: 'middle' },
    border: bd(C.green),
  },
  redVal: {
    fill: { fgColor: { rgb: C.lightRed } },
    font: { bold: true, sz: 10, color: { rgb: C.red }, name: 'Calibri' },
    alignment: { horizontal: 'right', vertical: 'middle' },
    border: bd(C.red),
  },
  amberVal: {
    font: { bold: true, sz: 10, color: { rgb: C.amber }, name: 'Calibri' },
    alignment: { horizontal: 'right', vertical: 'middle' },
    border: bd(),
  },
  normal: {
    font: { sz: 10, color: { rgb: C.black }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: bd(),
  },
  normalR: {
    font: { sz: 10, color: { rgb: C.black }, name: 'Calibri' },
    alignment: { horizontal: 'right', vertical: 'middle' },
    border: bd(),
  },
  normalAlt: {
    fill: { fgColor: { rgb: C.altRow } },
    font: { sz: 10, color: { rgb: C.black }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: bd(),
  },
  normalRAlt: {
    fill: { fgColor: { rgb: C.altRow } },
    font: { sz: 10, color: { rgb: C.black }, name: 'Calibri' },
    alignment: { horizontal: 'right', vertical: 'middle' },
    border: bd(),
  },
  total: {
    fill: { fgColor: { rgb: C.lightGreen } },
    font: { bold: true, sz: 10, color: { rgb: C.darkGreen }, name: 'Calibri' },
    alignment: { horizontal: 'right', vertical: 'middle' },
    border: bd(C.green),
  },
  totalL: {
    fill: { fgColor: { rgb: C.lightGreen } },
    font: { bold: true, sz: 10, color: { rgb: C.darkGreen }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: bd(C.green),
  },
  bar: {
    font: { sz: 9, color: { rgb: C.green }, name: 'Courier New' },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: bd(),
  },
  barAlt: {
    fill: { fgColor: { rgb: C.altRow } },
    font: { sz: 9, color: { rgb: C.green }, name: 'Courier New' },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: bd(),
  },
  creditAmt: {
    font: { sz: 10, color: { rgb: C.green }, name: 'Calibri' },
    alignment: { horizontal: 'right', vertical: 'middle' },
    border: bd(),
  },
  debitAmt: {
    font: { sz: 10, color: { rgb: C.red }, name: 'Calibri' },
    alignment: { horizontal: 'right', vertical: 'middle' },
    border: bd(),
  },
  creditBadge: {
    fill: { fgColor: { rgb: C.lightGreen } },
    font: { sz: 10, color: { rgb: C.green }, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: bd(),
  },
  debitBadge: {
    fill: { fgColor: { rgb: C.lightRed } },
    font: { sz: 10, color: { rgb: C.red }, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: bd(),
  },
  empty: {},
}

/* ─── Cell factory ─────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cl(v: string | number, s: Record<string, unknown> = {}, t?: string): Record<string, unknown> {
  return { v, t: t ?? (typeof v === 'number' ? 'n' : 's'), s }
}

/* ─── Worksheet builder ─────────────────────────────────── */
function buildWs(
  rows: Array<Array<Record<string, unknown> | null>>,
  colWidths: number[],
  rowHeights?: number[],
): Record<string, unknown> {
  const ws: Record<string, unknown> = {}
  let maxR = 0
  let maxC = 0

  rows.forEach((row, r) => {
    maxR = r
    row.forEach((cell, c) => {
      if (cell === null) return
      maxC = Math.max(maxC, c)
      const col = c < 26
        ? String.fromCharCode(65 + c)
        : String.fromCharCode(64 + Math.floor(c / 26)) + String.fromCharCode(65 + (c % 26))
      ws[`${col}${r + 1}`] = cell
    })
  })

  const endCol = maxC < 26
    ? String.fromCharCode(65 + maxC)
    : String.fromCharCode(64 + Math.floor(maxC / 26)) + String.fromCharCode(65 + (maxC % 26))

  ws['!ref'] = `A1:${endCol}${maxR + 1}`
  ws['!cols'] = colWidths.map(w => ({ wch: w }))
  if (rowHeights) {
    ws['!rows'] = rowHeights.map(h => ({ hpt: h }))
  }
  return ws
}

/* ─── ASCII progress bar ────────────────────────────────── */
function bar(pct: number, w = 20) {
  const f = Math.round(Math.max(0, Math.min(100, pct)) / 100 * w)
  return '█'.repeat(f) + '░'.repeat(w - f)
}

/* ─── Currency formatter ─────────────────────────────────── */
function eur(n: number) {
  return n.toFixed(2).replace('.', ',') + ' €'
}

/* ─── Export data interface ─────────────────────────────── */
export interface ExportData {
  filename: string
  transactions: Transaction[]
  liveStats: { income: number; expense: number; cashflow: number; savingsRate: number }
  pieData: Array<{ name: string; category: string; value: number }>
  liveTimeline: Array<{
    month: string
    income: number
    expense: number
    expenseChange: number | null
    incomeChange: number | null
  }>
  liveSubscriptions: Array<{
    label: string
    monthly_cost: number
    annual_cost: number
    occurrences: number
  }>
  CATEGORY_LABELS: Record<string, string>
}

/* ─── Main export function ──────────────────────────────── */
export async function exportXLSX(d: ExportData) {
  // Dynamic import — client only, avoids SSR issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const XLSX = (await import('xlsx-js-style')) as any

  const dates = d.transactions.map(tx => tx.date).sort()
  const period = dates.length ? `${dates[0]} → ${dates[dates.length - 1]}` : ''
  const baseName = d.filename?.replace(/\.[^.]+$/, '') ?? 'export'

  /* ── Sheet 1 : Résumé ──────────────────────────────────── */
  const s1: Array<Array<Record<string, unknown> | null>> = []

  s1.push([cl('RAPPORT SENZIO', S.title), null, null])
  s1.push([cl('', S.empty), null, null])
  s1.push([cl('Fichier analysé', S.label), cl(d.filename, S.value), null])
  s1.push([cl('Période', S.label), cl(period, S.value), null])
  s1.push([cl('', S.empty), null, null])
  s1.push([cl('INDICATEURS CLÉS', S.section), null, null])

  const cfStyle = d.liveStats.cashflow >= 0 ? S.greenVal : S.redVal
  const srStyle = d.liveStats.savingsRate >= 10 ? S.greenVal : d.liveStats.savingsRate >= 0 ? S.amberVal : S.redVal

  s1.push([cl('Revenus totaux', S.label), cl(eur(d.liveStats.income), S.greenVal), null])
  s1.push([cl('Dépenses totales', S.label), cl(eur(d.liveStats.expense), S.redVal), null])
  s1.push([cl('Cash flow', S.label), cl(eur(d.liveStats.cashflow), cfStyle), null])
  s1.push([cl("Taux d'épargne", S.label), cl(Math.max(0, Math.round(d.liveStats.savingsRate)) + ' %', srStyle), null])

  if (d.liveSubscriptions.length > 0) {
    const totalAbo = d.liveSubscriptions.reduce((sum, a) => sum + a.monthly_cost, 0)
    s1.push([cl('', S.empty), null, null])
    s1.push([cl('ABONNEMENTS', S.section), null, null])
    s1.push([cl('Total mensuel', S.label), cl(eur(totalAbo), S.redVal), null])
    s1.push([cl('Total annuel projeté', S.label), cl(eur(totalAbo * 12), S.redVal), null])
  }

  const ws1 = buildWs(s1, [28, 22, 4],
    s1.map((_, i) => i === 0 ? 30 : 22))

  /* ── Sheet 2 : Catégories ──────────────────────────────── */
  const s2: Array<Array<Record<string, unknown> | null>> = []
  s2.push([cl('DÉPENSES PAR CATÉGORIE', S.title), null, null, null])
  s2.push([cl('', S.empty), null, null, null])
  s2.push([
    cl('Catégorie', S.header),
    cl('Montant (€)', S.header),
    cl('Part', S.header),
    cl('Répartition', S.header),
  ])

  const totalDep = d.liveStats.expense || 1
  d.pieData.forEach((cat, i) => {
    const pct = Math.round(cat.value / totalDep * 100)
    const alt = i % 2 === 1
    s2.push([
      cl(cat.name, alt ? S.normalAlt : S.normal),
      cl(eur(cat.value), alt ? S.normalRAlt : S.normalR),
      cl(pct + ' %', alt ? S.normalRAlt : S.normalR),
      cl(bar(pct), alt ? S.barAlt : S.bar),
    ])
  })
  s2.push([cl('TOTAL', S.totalL), cl(eur(d.liveStats.expense), S.total), cl('100 %', S.total), cl('', S.total)])

  const ws2 = buildWs(s2, [22, 16, 10, 24],
    s2.map((_, i) => i === 0 ? 28 : 20))

  /* ── Sheet 3 : Mensuel ─────────────────────────────────── */
  const s3: Array<Array<Record<string, unknown> | null>> = []
  s3.push([cl('ÉVOLUTION MENSUELLE', S.title), null, null, null, null])
  s3.push([cl('', S.empty), null, null, null, null])
  s3.push([
    cl('Mois', S.header),
    cl('Revenus (€)', S.header),
    cl('Dépenses (€)', S.header),
    cl('Cash flow (€)', S.header),
    cl('Var. dépenses', S.header),
  ])

  d.liveTimeline.forEach((m, i) => {
    const alt = i % 2 === 1
    const cf = m.income - m.expense
    const cfS = cf >= 0 ? S.creditAmt : S.debitAmt
    let varStr = '—'
    let varS: Record<string, unknown> = alt ? S.normalRAlt : S.normalR
    if (m.expenseChange !== null) {
      varStr = (m.expenseChange > 0 ? '+' : '') + m.expenseChange + ' %'
      varS = m.expenseChange > 0 ? S.debitAmt : S.creditAmt
    }
    s3.push([
      cl(m.month, alt ? S.normalAlt : S.normal),
      cl(eur(m.income), alt ? S.normalRAlt : S.normalR),
      cl(eur(m.expense), alt ? S.normalRAlt : S.normalR),
      cl(eur(cf), cfS),
      cl(varStr, varS),
    ])
  })

  const ws3 = buildWs(s3, [12, 16, 16, 16, 14],
    s3.map((_, i) => i === 0 ? 28 : 20))

  /* ── Sheet 4 : Abonnements ─────────────────────────────── */
  const s4: Array<Array<Record<string, unknown> | null>> = []

  if (d.liveSubscriptions.length > 0) {
    s4.push([cl('ABONNEMENTS DÉTECTÉS', S.title), null, null, null])
    s4.push([cl('', S.empty), null, null, null])
    s4.push([
      cl('Service', S.header),
      cl('Mensuel (€)', S.header),
      cl('Annuel (€)', S.header),
      cl('Occurrences', S.header),
    ])
    d.liveSubscriptions.forEach((sub, i) => {
      const alt = i % 2 === 1
      s4.push([
        cl(sub.label, alt ? S.normalAlt : S.normal),
        cl(eur(sub.monthly_cost), S.redVal),
        cl(eur(sub.annual_cost), S.redVal),
        cl(sub.occurrences, alt ? S.normalRAlt : S.normalR),
      ])
    })
    const totalAbo = d.liveSubscriptions.reduce((sum, s) => sum + s.monthly_cost, 0)
    s4.push([cl('TOTAL', S.totalL), cl(eur(totalAbo), S.total), cl(eur(totalAbo * 12), S.total), cl('', S.total)])
  } else {
    s4.push([cl('Aucun abonnement détecté', S.normal)])
  }

  const ws4 = buildWs(s4, [28, 16, 16, 14],
    s4.map((_, i) => i === 0 ? 28 : 20))

  /* ── Sheet 5 : Transactions ────────────────────────────── */
  const s5: Array<Array<Record<string, unknown> | null>> = []
  s5.push([cl('TOUTES LES TRANSACTIONS', S.title), null, null, null, null])
  s5.push([cl('', S.empty), null, null, null, null])
  s5.push([
    cl('Date', S.header),
    cl('Description', S.header),
    cl('Catégorie', S.header),
    cl('Type', S.header),
    cl('Montant (€)', S.header),
  ])

  const sorted = [...d.transactions].sort((a, b) => a.date.localeCompare(b.date))
  sorted.forEach((tx, i) => {
    const alt = i % 2 === 1
    const isCredit = tx.amount >= 0
    s5.push([
      cl(tx.date, alt ? S.normalAlt : S.normal),
      cl(tx.label_clean, alt ? S.normalAlt : S.normal),
      cl(d.CATEGORY_LABELS[tx.category] ?? tx.category, alt ? S.normalAlt : S.normal),
      cl(isCredit ? 'Crédit' : 'Débit', isCredit ? S.creditBadge : S.debitBadge),
      cl(eur(tx.amount), isCredit ? S.creditAmt : S.debitAmt),
    ])
  })

  const ws5 = buildWs(s5, [12, 38, 20, 10, 16],
    s5.map((_, i) => i === 0 ? 28 : 20))

  /* ── Workbook ───────────────────────────────────────────── */
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws1, 'Résumé')
  XLSX.utils.book_append_sheet(wb, ws2, 'Catégories')
  XLSX.utils.book_append_sheet(wb, ws3, 'Mensuel')
  XLSX.utils.book_append_sheet(wb, ws4, 'Abonnements')
  XLSX.utils.book_append_sheet(wb, ws5, 'Transactions')

  const buffer: ArrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rapport-${baseName}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
