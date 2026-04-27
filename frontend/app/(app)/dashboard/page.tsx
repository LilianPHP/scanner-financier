'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  formatCurrency, CATEGORY_LABELS, updateCategory,
  getUploadHistory, loadAnalysis,
  type UploadResult, type Transaction, type Subscription, type Insight,
} from '@/lib/api'
import { useCategoryColors } from '@/lib/theme'
import { track } from '@/lib/analytics'
import { DashboardHeader } from '@/components/DashboardHeader'
import { SenzioMark } from '@/components/SenzioMark'

const CADENCE_LABELS: Record<string, string> = {
  weekly: 'hebdo',
  biweekly: 'bi-mensuel',
  monthly: 'mensuel',
  quarterly: 'trimestriel',
  biannual: 'semestriel',
  yearly: 'annuel',
}

// ── Design tokens ────────────────────────────────────────────────────
const C = {
  bg: 'var(--bg-page)', card: 'var(--bg-card)', cardHi: 'var(--bg-card-hi)',
  border: 'var(--border)', borderStrong: 'var(--border-strong)',
  fg: 'var(--fg)', fg2: 'var(--fg-2)', fg3: 'var(--fg-3)', fg4: 'var(--fg-4)',
  accent: '#1D9E75', accentGhost: 'rgba(29,158,117,0.12)', accentGlow: 'rgba(29,158,117,0.35)',
  negative: '#F87171',
}

// ── Number formatting ────────────────────────────────────────────────
const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const fmtEur = (v: number) => `${nf0.format(Math.abs(v))} €`
const fmtSigned = (v: number) => v >= 0 ? `+${nf0.format(v)} €` : `−${nf0.format(Math.abs(v))} €`

// ── Month abbrevs ────────────────────────────────────────────────────
const MONTH_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
function isoToShort(iso: string) {
  const [, m] = iso.split('-')
  return MONTH_SHORT[parseInt(m) - 1] ?? iso
}

// ── Category icons ───────────────────────────────────────────────────
const CAT_ICONS: Record<string, string> = {
  // Clés anglaises (legacy)
  alimentation: '🛒', logement: '🏠', transport: '🚊', loisirs: '🍷',
  abonnements: '📱', salaire: '💰', 'frais bancaires': '🏦', sante: '❤️',
  investissement: '📈', epargne: '🏦', impots: '🏛️', education: '📚',
  voyage: '✈️', vetements: '🛍️', autres: '📦',
  // Clés françaises (bank API)
  Logement: '🏠', Courses: '🛒', Transport: '🚊', Sorties: '🍷',
  Abonnements: '📱', Salaire: '💰', Revenus: '💰', Santé: '❤️',
  Shopping: '🛍️', Investissement: '📈', Épargne: '💰', Impôts: '🏛️',
  Éducation: '📚', Voyage: '✈️', Autre: '📦',
}

// ── useCountUp hook ───────────────────────────────────────────────────
function useCountUp(target: number, dur = 700) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0, startTs = 0, cancelled = false
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)
    const run = (ts: number) => {
      if (cancelled) return
      if (!startTs) startTs = ts
      const p = Math.min(1, (ts - startTs) / dur)
      setV(target * ease(p))
      if (p < 1) raf = requestAnimationFrame(run)
      else setV(target)
    }
    raf = requestAnimationFrame(run)
    return () => { cancelled = true; cancelAnimationFrame(raf) }
  }, [target, dur])
  return v
}

// ── Card ─────────────────────────────────────────────────────────────
function Card({ children, style, onClick }: {
  children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void
}) {
  return (
    <div onClick={onClick} style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 16, cursor: onClick ? 'pointer' : 'default', ...style,
    }}>
      {children}
    </div>
  )
}

function SectionHeading({ title, meta, action }: { title: string; meta?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', color: C.fg }}>
          {title}
        </h3>
        {meta && <span style={{ fontSize: 11, color: C.fg3 }}>{meta}</span>}
      </div>
      {action}
    </div>
  )
}

// ── TopBar ────────────────────────────────────────────────────────────
function TopBar({ initial, onProfile }: { initial: string; onProfile: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <rect x="3" y="17" width="5" height="10" rx="1" fill="white" opacity="0.9"/>
            <rect x="12" y="10" width="5" height="17" rx="1" fill="white"/>
            <rect x="21" y="4" width="5" height="23" rx="1" fill="white" opacity="0.7"/>
          </svg>
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.accent, letterSpacing: '-0.02em' }}>senzio</span>
      </div>
      <button onClick={onProfile} style={{
        border: 0, cursor: 'pointer', width: 32, height: 32, borderRadius: 999,
        background: 'linear-gradient(135deg, #1D9E75, #3B82F6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 600, color: 'white', fontFamily: 'inherit',
      }}>{initial}</button>
    </div>
  )
}

// ── Goal Hero ─────────────────────────────────────────────────────────
type Goal = { id: string; name: string; kind: string; target: number; current: number; months: number; icon: string }

function GoalHero({ goal, onTap }: { goal: Goal; onTap: () => void }) {
  const pct = Math.min(100, (goal.current / goal.target) * 100)
  const current = useCountUp(goal.current)
  const pctVal = useCountUp(pct)
  const width = useCountUp(pct)

  return (
    <div onClick={onTap} style={{ padding: '36px 24px 40px', cursor: 'pointer' }}>
      <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.fg3 }}>
        Objectif en cours · {goal.kind}
      </div>
      <div style={{ marginTop: 10, fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em', color: C.fg }}>
        {goal.icon} {goal.name}
      </div>

      <div style={{ marginTop: 24, display: 'flex', alignItems: 'baseline', gap: 10, fontVariantNumeric: 'tabular-nums' }}>
        <span style={{ fontSize: 'clamp(44px, 12vw, 64px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1, color: C.fg }}>
          {nf0.format(Math.round(current))}
        </span>
        <span style={{ fontSize: 18, color: C.fg3, fontWeight: 500 }}>
          / {nf0.format(goal.target)} €
        </span>
      </div>

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '5px 10px 5px 8px', borderRadius: 999,
          background: C.accentGhost, border: '1px solid rgba(29,158,117,0.25)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: C.accent, boxShadow: `0 0 8px ${C.accent}`, display: 'inline-block' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: C.accent, fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(pctVal)} %
          </span>
        </div>
        <div style={{ fontSize: 12, color: C.fg2 }}>
          {goal.months} mois restants
        </div>
      </div>

      <div style={{ marginTop: 14, height: 10, background: 'var(--track)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          height: '100%', width: `${width}%`,
          background: `linear-gradient(90deg, ${C.accent} 0%, #2BB88A 100%)`,
          borderRadius: 999,
          boxShadow: `0 0 24px ${C.accentGlow}`,
          transition: 'width 0.7s cubic-bezier(0.22,1,0.36,1)',
        }} />
        {[25, 50, 75].map(m => (
          <div key={m} style={{ position: 'absolute', top: 0, bottom: 0, left: `${m}%`, width: 1, background: 'var(--track-strong)' }} />
        ))}
      </div>
    </div>
  )
}

function GoalHeroEmpty({ onCTA }: { onCTA: () => void }) {
  return (
    <div style={{ padding: '40px 24px 44px' }}>
      <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.fg3 }}>Objectifs</div>
      <div style={{ marginTop: 24, fontSize: 'clamp(28px, 7vw, 38px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, color: C.fg }}>
        Définis ton premier<br />objectif.
      </div>
      <p style={{ marginTop: 12, fontSize: 14, color: C.fg2, lineHeight: 1.5, maxWidth: 320 }}>
        Voyage, épargne de sécurité, investir… Une barre qui avance, un rythme, des jalons.
      </p>
      <button onClick={onCTA} style={{
        marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 8,
        fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
        padding: '12px 18px', borderRadius: 12,
        background: C.accent, color: '#062A1E', border: 0, cursor: 'pointer',
        boxShadow: `0 0 24px ${C.accentGlow}`,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        Créer un objectif
      </button>
    </div>
  )
}

// ── KPI Stat (desktop, vertical layout inside Santé du mois card) ─────
function KPIStat({ label, value, color, sub }: { label: string; value: number; color?: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs" style={{ color: C.fg3 }}>{label}{sub && <span className="ml-1.5" style={{ color: C.fg4, fontSize: 10 }}>· {sub}</span>}</span>
      <span style={{
        fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em',
        color: color ?? C.fg, fontVariantNumeric: 'tabular-nums',
      }}>
        {nf0.format(Math.round(Math.abs(value)))} <span style={{ fontSize: 11, color: C.fg3, fontWeight: 500 }}>€</span>
      </span>
    </div>
  )
}

// ── KPI Trio ──────────────────────────────────────────────────────────
function KPICard({ label, value, sub, color }: { label: string; value: number; sub: string; color?: string }) {
  const v = useCountUp(Math.abs(value))
  return (
    <Card style={{ padding: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.fg3 }}>
        {label}
      </div>
      <div style={{ marginTop: 10, fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', color: color ?? C.fg, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {nf0.format(Math.round(v))} <span style={{ fontSize: 13, color: C.fg3, fontWeight: 500 }}>€</span>
      </div>
      <div style={{ fontSize: 11, color: C.fg3, marginTop: 6 }}>{sub}</div>
    </Card>
  )
}

// ── Bar Chart ─────────────────────────────────────────────────────────
type MonthData = { m: string; income: number; expense: number }

function BarChart({ months, height = 140 }: { months: MonthData[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(...months.flatMap(m => [m.income, m.expense]), 1)

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative', display: 'flex', gap: 6, alignItems: 'flex-end', height }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map(g => (
          <div key={g} style={{
            position: 'absolute', left: 0, right: 0,
            bottom: `${g * 100}%`, height: 1,
            background: C.border, pointerEvents: 'none',
          }} />
        ))}
        {months.map((m, i) => {
          const isHover = hover === i
          return (
            <div key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', height: '100%', justifyContent: 'flex-end', position: 'relative' }}
            >
              {isHover && (
                <div style={{
                  position: 'absolute', bottom: height + 8, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
                  background: C.cardHi, border: `1px solid ${C.borderStrong}`, borderRadius: 10,
                  padding: '8px 10px', minWidth: 130, boxShadow: '0 8px 24px -12px rgba(0,0,0,0.6)',
                  pointerEvents: 'none',
                }}>
                  <div style={{ fontSize: 10, color: C.fg3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    {m.m}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ color: C.accent }}>+{nf0.format(m.income)} €</span>
                    <span style={{ color: C.negative }}>−{nf0.format(m.expense)} €</span>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 'calc(100% - 18px)', width: '100%', justifyContent: 'center' }}>
                <div style={{
                  width: '44%', maxWidth: 16, height: `${(m.income / max) * 100}%`,
                  background: C.accent, borderRadius: '4px 4px 0 0',
                  opacity: hover != null && !isHover ? 0.4 : 1,
                  boxShadow: isHover ? `0 0 10px ${C.accentGlow}` : 'none',
                  transition: 'opacity 120ms',
                }} />
                <div style={{
                  width: '44%', maxWidth: 16, height: `${(m.expense / max) * 100}%`,
                  background: C.negative, borderRadius: '4px 4px 0 0',
                  opacity: hover != null && !isHover ? 0.4 : 1,
                  transition: 'opacity 120ms',
                }} />
              </div>
              <div style={{ fontSize: 10, color: isHover ? C.fg : C.fg3, fontWeight: isHover ? 500 : 400, transition: 'color 120ms' }}>
                {m.m}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MonthlyCard({ timeline }: { timeline: MonthData[] }) {
  const [range, setRange] = useState<6 | 12>(6)
  const data = timeline.slice(-range)
  const totalSaved = data.reduce((s, m) => s + (m.income - m.expense), 0)

  return (
    <Card style={{ padding: 16 }}>
      <SectionHeading
        title="Revenus vs dépenses"
        meta={`${data.length} derniers mois`}
        action={
          <div style={{ display: 'flex', gap: 4 }}>
            {([6, 12] as const).map(n => (
              <button key={n} onClick={() => setRange(n)} style={{
                fontFamily: 'inherit', fontSize: 11, fontWeight: 500,
                padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
                background: range === n ? C.accentGhost : 'transparent',
                color: range === n ? C.accent : C.fg3,
                border: `1px solid ${range === n ? 'rgba(29,158,117,0.3)' : C.border}`,
                transition: 'all 120ms',
              }}>{n}M</button>
            ))}
          </div>
        }
      />
      <BarChart months={data} height={140} />
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginTop: 14,
        paddingTop: 12, borderTop: `1px solid ${C.border}`, fontSize: 11,
      }}>
        <span style={{ color: C.fg2, display: 'inline-flex', gap: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: C.accent, display: 'inline-block' }} />Revenus
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: C.negative, display: 'inline-block' }} />Dépenses
          </span>
        </span>
        <span style={{ color: C.fg3, fontVariantNumeric: 'tabular-nums' }}>
          Épargné · <span style={{ color: C.accent, fontWeight: 500 }}>+{nf0.format(totalSaved)} €</span>
        </span>
      </div>
    </Card>
  )
}

// ── Donut ─────────────────────────────────────────────────────────────
type DonutSegment = { key: string; label: string; value: number; color: string }

function Donut({ data, size = 160, picked, onPick }: {
  data: DonutSegment[]; size?: number; picked: string | null; onPick: (k: string | null) => void
}) {
  const [hover, setHover] = useState<string | null>(null)
  const total = data.reduce((s, d) => s + d.value, 0)
  const thickness = 22
  const r = (size - thickness) / 2
  const cx = size / 2; const cy = size / 2
  const circ = 2 * Math.PI * r

  let acc = 0
  const arcs = data.map(d => {
    const start = (acc / total) * circ
    const len = Math.max(0, (d.value / total) * circ - 2)
    acc += d.value
    return { ...d, start, len }
  })

  const active = hover ?? picked
  const pickedSeg = active ? data.find(d => d.key === active) : null

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--track)" strokeWidth={thickness} />
        {arcs.map(a => (
          <circle key={a.key} cx={cx} cy={cy} r={r} fill="none"
            stroke={a.color}
            strokeWidth={active === a.key ? thickness + 4 : thickness}
            strokeDasharray={`${a.len} ${circ - a.len}`}
            strokeDashoffset={-a.start}
            style={{ transition: 'stroke-width 160ms, opacity 160ms', opacity: active && active !== a.key ? 0.25 : 1, cursor: 'pointer' }}
            onMouseEnter={() => setHover(a.key)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onPick(a.key === picked ? null : a.key)}
          />
        ))}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none' }}>
        {pickedSeg ? (
          <>
            <div style={{ fontSize: 9, color: C.fg3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{pickedSeg.label}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: C.fg, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{fmtEur(pickedSeg.value)}</div>
            <div style={{ fontSize: 10, color: C.fg3, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
              {Math.round((pickedSeg.value / total) * 100)} %
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 9, color: C.fg3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Dépenses</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: C.fg, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{fmtEur(total)}</div>
          </>
        )}
      </div>
    </div>
  )
}

function DonutCard({ segments }: { segments: DonutSegment[] }) {
  const [picked, setPicked] = useState<string | null>(null)
  const total = segments.reduce((s, d) => s + d.value, 0)
  return (
    <Card style={{ padding: 16 }}>
      <SectionHeading title="Par catégorie" />
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <Donut data={segments} size={160} picked={picked} onPick={setPicked} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
          {segments.slice(0, 6).map(d => {
            const pct = Math.round((d.value / total) * 100)
            const active = picked === d.key
            return (
              <button key={d.key}
                onClick={() => setPicked(active ? null : d.key)}
                style={{
                  display: 'grid', gridTemplateColumns: '8px 1fr auto auto', gap: 7,
                  alignItems: 'center', padding: '3px 5px', margin: '-3px -5px',
                  borderRadius: 6, cursor: 'pointer',
                  background: active ? 'var(--track)' : 'transparent',
                  border: 'none', fontFamily: 'inherit', textAlign: 'left',
                  opacity: picked && !active ? 0.35 : 1,
                  transition: 'opacity 120ms, background 120ms',
                }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, display: 'inline-block' }} />
                <span style={{ fontSize: 12, color: C.fg2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
                <span style={{ fontSize: 11, color: C.fg3, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                <span style={{ fontSize: 12, color: C.fg, fontVariantNumeric: 'tabular-nums' }}>{fmtEur(d.value)}</span>
              </button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

// ── Insights ──────────────────────────────────────────────────────────
function InsightsCard({ insights }: { insights: Insight[] }) {
  const colors = useCategoryColors()
  if (!insights || insights.length === 0) return null
  return (
    <Card style={{ padding: 16 }}>
      <SectionHeading title="Cette période en bref" />
      <div>
        {insights.map((insight, i) => (
          <InsightRow key={`${insight.id}-${i}`} insight={insight} colors={colors} isFirst={i === 0} />
        ))}
      </div>
    </Card>
  )
}

function InsightRow({ insight, colors, isFirst }: {
  insight: Insight
  colors: Record<string, string>
  isFirst: boolean
}) {
  const view = renderInsight(insight, colors)
  if (!view) return null
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '32px 1fr', gap: 12,
      alignItems: 'flex-start', padding: '12px 0',
      borderTop: isFirst ? 'none' : `1px solid ${C.border}`,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: view.accent + '20', border: `1px solid ${view.accent}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={view.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {view.iconPath}
        </svg>
      </div>
      <div style={{ minWidth: 0, fontSize: 13, lineHeight: 1.45, color: C.fg }}>
        {view.title}
        <div style={{ fontSize: 11, color: C.fg3, marginTop: 2 }}>{view.sub}</div>
      </div>
    </div>
  )
}

function renderInsight(insight: Insight, colors: Record<string, string>):
  | { accent: string; iconPath: React.ReactNode; title: React.ReactNode; sub: string }
  | null
{
  switch (insight.id) {
    case 'top_category': {
      const { category, amount, pct } = insight.data
      const label = CATEGORY_LABELS[category] ?? category
      const accent = colors[category] ?? '#94A3B8'
      return {
        accent,
        iconPath: <><path d="M3 6h18M6 12h12M9 18h6"/></>,
        title: <span>Ta <strong>dépense principale</strong> : <strong style={{ color: accent }}>{label}</strong></span>,
        sub: `${nf0.format(amount)} € · ${pct} % de tes dépenses`,
      }
    }
    case 'vs_previous': {
      const { delta_pct, current, previous, previous_month_label } = insight.data
      const isLower = delta_pct < 0
      const accent = isLower ? '#1D9E75' : '#F87171'
      const month = previous_month_label || 'le mois dernier'
      return {
        accent,
        iconPath: isLower
          ? <><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></>
          : <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>,
        title: (
          <span>
            Tu as dépensé <strong>{Math.abs(delta_pct)} % {isLower ? 'de moins' : 'de plus'}</strong> qu'en {month}
          </span>
        ),
        sub: `${nf0.format(current)} € contre ${nf0.format(previous)} €`,
      }
    }
    case 'savings_pace': {
      const { monthly_avg } = insight.data
      return {
        accent: '#1D9E75',
        iconPath: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
        title: <span>Tu <strong>mets de côté</strong> <strong>{nf0.format(monthly_avg)} €/mois</strong> en moyenne</span>,
        sub: 'sur la période sélectionnée',
      }
    }
    case 'lifestyle': {
      const { kind, amount, pct } = insight.data
      const labels: Record<string, string> = {
        loisirs: 'loisirs',
        voyage: 'voyages',
        loisirs_voyage: 'loisirs & voyages',
      }
      const accent = colors['loisirs'] ?? '#EC4899'
      return {
        accent,
        iconPath: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/>,
        title: <span>Tu dépenses <strong>{pct} %</strong> en {labels[kind] ?? kind}</span>,
        sub: `${nf0.format(amount)} € sur la période`,
      }
    }
  }
  return null
}

// ── Subscriptions ─────────────────────────────────────────────────────
function SubsCard({
  subs,
  onReclassify,
}: {
  subs: Subscription[]
  onReclassify: (label: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [busyLabel, setBusyLabel] = useState<string | null>(null)
  const list = expanded ? subs : subs.slice(0, 4)
  const total = subs.reduce((s, x) => s + x.monthly_cost, 0)
  const totalV = useCountUp(total)

  if (subs.length === 0) return null

  async function handleClick(label: string) {
    setBusyLabel(label)
    try { await onReclassify(label) } finally { setBusyLabel(null) }
  }

  return (
    <Card style={{ padding: 16 }}>
      <SectionHeading title="Abonnements récurrents" meta={`${subs.length} détectés`} />
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em', color: C.fg, fontVariantNumeric: 'tabular-nums', lineHeight: 1.05 }}>
            {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalV)}
            <span style={{ fontSize: 13, color: C.fg3, fontWeight: 500, marginLeft: 4 }}>€/mois</span>
          </div>
          <div style={{ fontSize: 11, color: C.fg3, marginTop: 4 }}>
            soit {nf0.format(total * 12)} €/an
          </div>
        </div>
      </div>
      {list.map((s, i) => (
        <div key={s.label} style={{
          display: 'grid', gridTemplateColumns: '32px minmax(0,1fr) auto',
          gap: 12, alignItems: 'center', padding: '10px 0',
          borderTop: i === 0 ? 'none' : `1px solid ${C.border}`,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: C.accentGhost, border: `1px solid rgba(29,158,117,0.2)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: C.accent,
          }}>
            {s.label.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: C.fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.label}
            </div>
            <div style={{ fontSize: 11, color: C.fg3 }}>
              {s.occurrences}× détecté
              {s.cadence && s.cadence !== 'monthly' ? ` · ${CADENCE_LABELS[s.cadence] ?? s.cadence}` : ''}
            </div>
            {s.needs_recategorize && (
              <button
                onClick={() => handleClick(s.label)}
                disabled={busyLabel === s.label}
                style={{
                  marginTop: 4, padding: 0, background: 'transparent', border: 0, fontFamily: 'inherit',
                  fontSize: 11, color: C.accent, cursor: busyLabel === s.label ? 'default' : 'pointer',
                  textAlign: 'left', opacity: busyLabel === s.label ? 0.6 : 1,
                }}
              >
                {busyLabel === s.label ? 'Reclassement…' : '💡 Pas en Abonnements · reclasser'}
              </button>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.fg, fontVariantNumeric: 'tabular-nums' }}>
              {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(s.monthly_cost)} €
            </div>
            <div style={{ fontSize: 11, color: C.fg3 }}>/mois</div>
          </div>
        </div>
      ))}
      {subs.length > 4 && (
        <button onClick={() => setExpanded(e => !e)} style={{
          marginTop: 8, width: '100%', fontFamily: 'inherit', fontSize: 12,
          color: C.fg2, padding: '8px 0', background: 'transparent', border: 0, cursor: 'pointer',
        }}>
          {expanded ? 'Réduire' : `Voir tous (${subs.length}) →`}
        </button>
      )}
    </Card>
  )
}

// ── Transactions ──────────────────────────────────────────────────────
const CHIPS = [
  { key: null, label: 'Tout' },
  { key: 'alimentation', label: 'Courses' },
  { key: 'transport', label: 'Transport' },
  { key: 'loisirs', label: 'Loisirs' },
  { key: 'abonnements', label: 'Abos' },
  { key: 'logement', label: 'Logement' },
  { key: 'salaire', label: 'Revenus' },
  { key: 'sante', label: 'Santé' },
]

function TxCard({ transactions }: { transactions: Transaction[] }) {
  const [filter, setFilter] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const categoryColors = useCategoryColors()

  const filtered = filter ? transactions.filter(t => t.category === filter) : transactions
  const shown = showAll ? filtered : filtered.slice(0, 12)

  return (
    <Card style={{ padding: 16 }}>
      <SectionHeading title="Transactions récentes" meta={`${filtered.length} opérations`} />

      {/* Chips */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12,
        marginLeft: -16, marginRight: -16, padding: '0 16px 4px',
        scrollbarWidth: 'none',
      }}>
        {CHIPS.map(c => {
          const active = filter === c.key
          return (
            <button key={c.key ?? 'all'} onClick={() => setFilter(c.key)} style={{
              fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
              padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
              background: active ? C.accent : 'var(--track)',
              color: active ? '#062A1E' : C.fg2,
              border: `1px solid ${active ? 'transparent' : C.border}`,
              transition: 'all 120ms',
            }}>{c.label}</button>
          )
        })}
      </div>

      {shown.length === 0 && (
        <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: C.fg3 }}>
          Aucune transaction dans cette catégorie.
        </div>
      )}

      {shown.map((tx, i) => {
        const color = categoryColors[tx.category] ?? '#94A3B8'
        const icon = CAT_ICONS[tx.category] ?? '•'
        const negative = tx.amount < 0
        return (
          <div key={tx.id} style={{
            display: 'grid', gridTemplateColumns: '32px 1fr auto auto',
            gap: 10, alignItems: 'center', padding: '11px 0',
            borderTop: i === 0 ? 'none' : `1px solid ${C.border}`,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: color + '22', border: `1px solid ${color}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13,
            }}>{icon}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tx.label_clean || tx.label_raw}
              </div>
              <div style={{ fontSize: 11, color: C.fg3 }}>
                {CATEGORY_LABELS[tx.category] ?? tx.category}
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.fg3, fontVariantNumeric: 'tabular-nums' }}>
              {new Date(tx.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: negative ? C.fg : C.accent }}>
              {fmtSigned(tx.amount)}
            </div>
          </div>
        )
      })}

      {filtered.length > 12 && (
        <button onClick={() => setShowAll(s => !s)} style={{
          marginTop: 10, width: '100%', fontFamily: 'inherit', fontSize: 13,
          color: C.fg2, padding: '10px 0',
          background: 'transparent', border: `1px solid ${C.border}`,
          borderRadius: 10, cursor: 'pointer', transition: 'all 120ms',
        }}>
          {showAll ? 'Réduire' : `Voir toutes les transactions (${filtered.length}) →`}
        </button>
      )}
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────
type LoadState = 'loading' | 'ready' | 'empty' | 'error'

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<UploadResult | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [goal, setGoal] = useState<Goal | null>(null)
  const [email, setEmail] = useState('')
  const categoryColors = useCategoryColors()

  useEffect(() => {
    let cancelled = false

    // Auth + email + active goal — runs regardless of analysis state
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return
      if (!session) { router.push('/login'); return }
      setEmail(session.user.email ?? '')
      const { data: goals } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
      if (cancelled) return
      if (goals && goals.length > 0) setGoal(goals[0] as Goal)
    })

    // Analysis load: sessionStorage cache → backend history fallback → empty
    async function loadAnalysisFlow() {
      try {
        const raw = sessionStorage.getItem('analysis')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed?.transactions) {
            setData(parsed)
            setLoadState('ready')
            return
          }
        }
      } catch {
        // ignore parse errors, fall through to backend
      }

      try {
        const files = await getUploadHistory()
        if (cancelled) return
        if (!files || files.length === 0) {
          setLoadState('empty')
          return
        }
        const latest = files[0]
        const result = await loadAnalysis(latest.id, latest.filename)
        if (cancelled) return
        try { sessionStorage.setItem('analysis', JSON.stringify(result)) } catch {}
        setData(result)
        setLoadState('ready')
      } catch {
        if (cancelled) return
        setLoadState('error')
      }
    }

    loadAnalysisFlow()
    return () => { cancelled = true }
  }, [router])

  async function handleReclassifySub(label: string) {
    if (!data) return
    const labelLower = label.toLowerCase()
    const tx = data.transactions.find(t => (t.label_clean || '').toLowerCase() === labelLower)
    if (!tx?.id) return
    try {
      await updateCategory(tx.id, 'abonnements', true)
      track('Subscription Recategorized', { label })
      setData(prev => {
        if (!prev) return prev
        const next: UploadResult = {
          ...prev,
          transactions: prev.transactions.map(t =>
            (t.label_clean || '').toLowerCase() === labelLower
              ? { ...t, category: 'abonnements' }
              : t
          ),
          subscriptions: prev.subscriptions?.map(s =>
            s.label.toLowerCase() === labelLower
              ? { ...s, category: 'abonnements', needs_recategorize: false }
              : s
          ),
        }
        try { sessionStorage.setItem('analysis', JSON.stringify(next)) } catch {}
        return next
      })
    } catch {
      // silent — Sentry captures unhandled errors elsewhere
    }
  }

  // Build donut segments from by_category
  const donutData: DonutSegment[] = useMemo(() => {
    if (!data) return []
    return (data.by_category ?? [])
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 7)
      .map(c => ({
        key: c.category,
        label: CATEGORY_LABELS[c.category] ?? c.category,
        value: c.total,
        color: categoryColors[c.category] ?? '#94A3B8',
      }))
  }, [data, categoryColors])

  // Build timeline for bar chart
  const timelineData: MonthData[] = useMemo(() => {
    if (!data) return []
    return (data.timeline ?? []).map(t => ({
      m: isoToShort(t.month),
      income: t.income,
      expense: t.expense,
    }))
  }, [data])

  const initial = email ? email[0].toUpperCase() : '?'

  if (loadState === 'loading') return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${C.accent}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  if (loadState === 'empty') return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, padding: '0 24px' }}>
      <div style={{ maxWidth: 360, width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', marginBottom: 20 }}>
          <SenzioMark size={48} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: C.fg, marginBottom: 8 }}>
          Bienvenue chez Senzio
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: C.fg2, marginBottom: 24 }}>
          Connecte ta première banque pour voir un dashboard de tes finances. Lecture seule, agréé ACPR via Powens.
        </p>
        <button
          onClick={() => router.push('/accounts')}
          style={{
            width: '100%',
            padding: '14px 18px',
            borderRadius: 14,
            background: C.accent,
            color: '#062A1E',
            fontSize: 14,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: `0 0 28px ${C.accentGlow}`,
          }}
        >
          Connecter ma banque
        </button>
      </div>
    </div>
  )

  if (loadState === 'error' || !data) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, padding: '0 24px' }}>
      <div style={{ maxWidth: 360, width: '100%', textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', color: C.fg, marginBottom: 8 }}>
          Impossible de charger ton analyse
        </h1>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: C.fg3, marginBottom: 20 }}>
          Le serveur peut être en train de se réveiller. Réessaie dans un instant.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 20px', borderRadius: 12, background: C.cardHi, color: C.fg,
            fontSize: 13, fontWeight: 500, border: `1px solid ${C.border}`,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Réessayer
        </button>
      </div>
    </div>
  )

  const gap = 12

  return (
    <div style={{ background: C.bg, color: C.fg, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ position: 'relative' }}>

        <DashboardHeader onSync={() => router.push('/accounts')} />

        {/* Hero goal — full width on mobile, 2/3 on desktop (handled by grid below) */}
        <div className="lg:hidden">
          {goal
            ? <GoalHero goal={goal} onTap={() => router.push('/goals')} />
            : <GoalHeroEmpty onCTA={() => router.push('/goals')} />
          }
        </div>

        {/* MOBILE flow: stacked cards, original behaviour.
            NOTE: do NOT use inline display:flex here — it would beat
            Tailwind's `lg:hidden` (display:none) and make this block
            show on desktop too, causing duplicate sections. */}
        <div className="lg:hidden flex flex-col px-4" style={{ gap }}>

          {/* KPI trio */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <KPICard label="Revenus" value={data.summary.income_total} sub="ce mois" color={C.accent} />
            <KPICard label="Dépenses" value={data.summary.expense_total} sub="ce mois" />
            <KPICard
              label="Épargné"
              value={data.summary.cashflow}
              sub="revenus − dép."
              color={data.summary.cashflow >= 0 ? C.accent : C.negative}
            />
          </div>

          {data.insights && data.insights.length > 0 && <InsightsCard insights={data.insights} />}
          {timelineData.length > 0 && <MonthlyCard timeline={timelineData} />}
          {donutData.length > 0 && <DonutCard segments={donutData} />}
          {data.subscriptions && data.subscriptions.length > 0 && <SubsCard subs={data.subscriptions} onReclassify={handleReclassifySub} />}
          <TxCard transactions={data.transactions} />

          <div style={{
            marginTop: 4, paddingTop: 14, borderTop: `1px solid ${C.border}`,
            display: 'flex', justifyContent: 'space-between',
            fontSize: 11, color: C.fg3,
          }}>
            <span>Connexion sécurisée via Powens · agréé ACPR</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {data.summary.transaction_count} opérations
            </span>
          </div>
        </div>

        {/* DESKTOP cockpit: 12-col grid */}
        <div className="hidden lg:grid grid-cols-12 gap-5 px-8 pb-10">
          {/* Row 1 — Goal hero (8 cols) + KPI stack (4 cols) */}
          <div className="col-span-8">
            {goal
              ? <GoalHero goal={goal} onTap={() => router.push('/goals')} />
              : <GoalHeroEmpty onCTA={() => router.push('/goals')} />
            }
          </div>
          <div className="col-span-4 flex flex-col gap-3">
            <div
              className="rounded-2xl px-5 py-5"
              style={{ background: C.card, border: `1px solid ${C.border}` }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: C.fg3 }}>
                Santé du mois
              </p>
              <div className="flex flex-col gap-3">
                <KPIStat label="Revenus" value={data.summary.income_total} color={C.accent} />
                <KPIStat label="Dépenses" value={data.summary.expense_total} />
                <KPIStat
                  label="Épargné"
                  value={data.summary.cashflow}
                  color={data.summary.cashflow >= 0 ? C.accent : C.negative}
                  sub="revenus − dépenses"
                />
              </div>
            </div>
          </div>

          {/* Row 2 — Insights narratifs (full width) */}
          {data.insights && data.insights.length > 0 && (
            <div className="col-span-12">
              <InsightsCard insights={data.insights} />
            </div>
          )}

          {/* Row 3 — Bar chart (7) + Donut (5), each spans full width when alone */}
          {timelineData.length > 0 && (
            <div className={donutData.length > 0 ? 'col-span-7' : 'col-span-12'}>
              <MonthlyCard timeline={timelineData} />
            </div>
          )}
          {donutData.length > 0 && (
            <div className={timelineData.length > 0 ? 'col-span-5' : 'col-span-12'}>
              <DonutCard segments={donutData} />
            </div>
          )}

          {/* Row 3 — Subs (5) + Tx (7) */}
          {data.subscriptions && data.subscriptions.length > 0 && (
            <div className="col-span-5">
              <SubsCard subs={data.subscriptions} onReclassify={handleReclassifySub} />
            </div>
          )}
          <div className={data.subscriptions && data.subscriptions.length > 0 ? 'col-span-7' : 'col-span-12'}>
            <TxCard transactions={data.transactions} />
          </div>

          {/* Footer */}
          <div className="col-span-12 flex justify-between items-center pt-4 mt-2" style={{ borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.fg3 }}>
            <span>Connexion sécurisée via Powens · agréé ACPR</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {data.summary.transaction_count} opérations synchronisées
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
