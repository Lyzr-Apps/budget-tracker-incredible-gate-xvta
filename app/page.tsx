'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import type { AIAgentResponse } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
// progress and tabs available if needed
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
// separator available if needed
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
// dialog available if needed
import { Switch } from '@/components/ui/switch'
import { FiPlus, FiDollarSign, FiTrendingUp, FiTrendingDown, FiBarChart2, FiSend, FiTrash2, FiEdit2, FiCheck, FiAlertTriangle, FiTarget, FiCalendar, FiMessageSquare, FiGrid, FiStar, FiClock } from 'react-icons/fi'

// ─────────────────────────────── CONSTANTS ───────────────────────────────

const EXPENSE_LOGGER_AGENT_ID = '699fd39d4151f92a8b61c6a0'
const BUDGET_ANALYST_AGENT_ID = '699fd39de1d115fae61853ad'

const THEME_VARS = {
  '--background': '0 0% 99%',
  '--foreground': '30 5% 15%',
  '--card': '0 0% 100%',
  '--card-foreground': '30 5% 15%',
  '--primary': '40 30% 45%',
  '--primary-foreground': '0 0% 100%',
  '--secondary': '30 10% 95%',
  '--secondary-foreground': '30 5% 15%',
  '--accent': '40 40% 50%',
  '--accent-foreground': '30 5% 15%',
  '--muted': '30 8% 92%',
  '--muted-foreground': '30 5% 50%',
  '--destructive': '0 50% 45%',
  '--destructive-foreground': '0 0% 100%',
  '--border': '30 10% 88%',
  '--ring': '40 30% 45%',
  '--radius': '0rem',
} as React.CSSProperties


const DEFAULT_BUDGETS: CategoryBudget[] = [
  { category: 'Food', budget: 500 },
  { category: 'Transport', budget: 200 },
  { category: 'Shopping', budget: 300 },
  { category: 'Bills', budget: 400 },
  { category: 'Entertainment', budget: 200 },
  { category: 'Health', budget: 150 },
  { category: 'Education', budget: 100 },
  { category: 'Travel', budget: 300 },
  { category: 'Subscriptions', budget: 100 },
  { category: 'Other', budget: 150 },
]

const CHART_COLORS = [
  'hsl(40,30%,45%)',
  'hsl(30,20%,35%)',
  'hsl(200,15%,45%)',
  'hsl(0,0%,60%)',
  'hsl(30,10%,70%)',
  'hsl(40,40%,50%)',
  'hsl(20,25%,40%)',
  'hsl(180,15%,50%)',
  'hsl(0,0%,45%)',
  'hsl(30,15%,55%)',
]

const SAMPLE_EXPENSES: Expense[] = [
  { id: 's1', amount: 45.50, currency: '$', category: 'Food', date: '2026-02-24', notes: 'Grocery shopping at Whole Foods', createdAt: '2026-02-24T10:00:00Z' },
  { id: 's2', amount: 12.00, currency: '$', category: 'Transport', date: '2026-02-23', notes: 'Uber ride to downtown', createdAt: '2026-02-23T14:00:00Z' },
  { id: 's3', amount: 89.99, currency: '$', category: 'Shopping', date: '2026-02-22', notes: 'New running shoes', createdAt: '2026-02-22T16:00:00Z' },
  { id: 's4', amount: 150.00, currency: '$', category: 'Bills', date: '2026-02-20', notes: 'Electric bill payment', createdAt: '2026-02-20T09:00:00Z' },
  { id: 's5', amount: 32.00, currency: '$', category: 'Entertainment', date: '2026-02-19', notes: 'Movie tickets and popcorn', createdAt: '2026-02-19T19:00:00Z' },
  { id: 's6', amount: 75.00, currency: '$', category: 'Health', date: '2026-02-18', notes: 'Monthly gym membership', createdAt: '2026-02-18T08:00:00Z' },
  { id: 's7', amount: 28.50, currency: '$', category: 'Food', date: '2026-02-17', notes: 'Dinner at Italian restaurant', createdAt: '2026-02-17T20:00:00Z' },
  { id: 's8', amount: 15.99, currency: '$', category: 'Subscriptions', date: '2026-02-15', notes: 'Netflix monthly subscription', createdAt: '2026-02-15T00:00:00Z' },
]

// ─────────────────────────────── TYPES ───────────────────────────────

interface Expense {
  id: string
  amount: number
  currency: string
  category: string
  date: string
  notes: string
  createdAt: string
}

interface CategoryBudget {
  category: string
  budget: number
}

interface ParsedExpense {
  amount: number
  currency: string
  category: string
  date: string
  notes: string
  confidence: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  parsedExpense?: ParsedExpense | null
  timestamp: string
}

interface AnalysisResult {
  total_spent: number
  total_budget: number
  budget_utilization_percent: number
  category_breakdown: Array<{
    category: string
    spent: number
    budget: number
    gap: number
    utilization_percent: number
    status: string
  }>
  overspending_areas: Array<{
    category: string
    overspend_amount: number
    severity: string
  }>
  recommendations: Array<{
    title: string
    description: string
    potential_savings: string
    priority: string
  }>
  monthly_summary: string
}

// ─────────────────────────────── HELPERS ───────────────────────────────

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getTodayDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function formatMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-')
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const monthIndex = parseInt(month, 10) - 1
  return `${monthNames[monthIndex] ?? 'Unknown'} ${year}`
}

function getMonthOptions(): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    options.push({ value: val, label: formatMonthLabel(val) })
  }
  return options
}

function getCategoryColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length] ?? 'hsl(0,0%,60%)'
}

function getUtilizationColor(percent: number): string {
  if (percent < 70) return 'hsl(140, 40%, 45%)'
  if (percent < 90) return 'hsl(40, 60%, 50%)'
  return 'hsl(0, 50%, 45%)'
}


function getSeverityVariant(severity: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const s = (severity ?? '').toLowerCase()
  if (s === 'high') return 'destructive'
  if (s === 'medium') return 'default'
  return 'secondary'
}

function getPriorityVariant(priority: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const p = (priority ?? '').toLowerCase()
  if (p === 'high') return 'destructive'
  if (p === 'medium') return 'default'
  return 'outline'
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const item = localStorage.getItem(key)
    if (item) return JSON.parse(item) as T
  } catch {}
  return fallback
}

function saveToStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

function parseAgentResult(result: AIAgentResponse): Record<string, unknown> | null {
  let parsed = result?.response?.result
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed) } catch { return null }
  }
  if (!parsed && result?.raw_response) {
    try { parsed = JSON.parse(result.raw_response) } catch { return null }
  }
  if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
  return null
}

// ─────────────────────────────── MARKDOWN ───────────────────────────────

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">{part}</strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  )
}

function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-serif font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-serif font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-serif font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm leading-relaxed">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm leading-relaxed">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm leading-relaxed">{formatInline(line)}</p>
      })}
    </div>
  )
}

// ─────────────────────────────── ERROR BOUNDARY ───────────────────────────────

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-serif font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 text-sm font-sans tracking-wider"
              style={{ background: 'hsl(40,30%,45%)', color: 'white' }}
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─────────────────────────────── COMPONENTS ───────────────────────────────

function StatCard({ icon, label, value, trend, trendUp }: {
  icon: React.ReactNode
  label: string
  value: string
  trend?: string
  trendUp?: boolean
}) {
  return (
    <Card className="rounded-none border" style={{ borderColor: 'hsl(30,10%,88%)' }}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-sans tracking-wider uppercase" style={{ color: 'hsl(30,5%,50%)' }}>{label}</p>
            <p className="text-2xl font-serif font-light" style={{ color: 'hsl(30,5%,15%)' }}>{value}</p>
          </div>
          <div className="p-2" style={{ color: 'hsl(40,30%,45%)' }}>{icon}</div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1 text-xs font-sans">
            {trendUp ? <FiTrendingUp size={12} style={{ color: 'hsl(140,40%,45%)' }} /> : <FiTrendingDown size={12} style={{ color: 'hsl(0,50%,45%)' }} />}
            <span style={{ color: trendUp ? 'hsl(140,40%,45%)' : 'hsl(0,50%,45%)' }}>{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ExpenseRow({ expense, onDelete }: { expense: Expense; onDelete?: (id: string) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'hsl(30,10%,93%)' }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-serif text-base font-light" style={{ color: 'hsl(30,5%,15%)' }}>
            {expense.currency}{expense.amount.toFixed(2)}
          </span>
          <Badge variant="outline" className="rounded-none text-xs font-sans tracking-wider" style={{ borderColor: 'hsl(40,30%,45%)', color: 'hsl(40,30%,45%)' }}>
            {expense.category}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'hsl(30,5%,50%)' }}>
          <FiCalendar size={10} />
          <span className="font-sans">{expense.date}</span>
          {expense.notes && (
            <>
              <span className="mx-1">|</span>
              <span className="font-sans truncate max-w-[200px]">{expense.notes}</span>
            </>
          )}
        </div>
      </div>
      {onDelete && (
        <Button variant="ghost" size="sm" onClick={() => onDelete(expense.id)} className="rounded-none ml-2 h-8 w-8 p-0" style={{ color: 'hsl(0,50%,45%)' }}>
          <FiTrash2 size={14} />
        </Button>
      )}
    </div>
  )
}

function CategoryBar({ category, spent, budget, color, index }: {
  category: string
  spent: number
  budget: number
  color: string
  index: number
}) {
  const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
  const overPercent = budget > 0 ? (spent / budget) * 100 : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-sans tracking-wider uppercase" style={{ color: 'hsl(30,5%,50%)' }}>{category}</span>
        <span className="text-xs font-sans" style={{ color: 'hsl(30,5%,50%)' }}>
          ${spent.toFixed(0)} / ${budget.toFixed(0)}
        </span>
      </div>
      <div className="h-2 w-full" style={{ background: 'hsl(30,8%,92%)' }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${percent}%`,
            background: getUtilizationColor(overPercent),
          }}
        />
      </div>
    </div>
  )
}

function AgentStatusPanel({ activeAgentId }: { activeAgentId: string | null }) {
  const agents = [
    { id: EXPENSE_LOGGER_AGENT_ID, name: 'Expense Logger', purpose: 'Parses natural language expense entries' },
    { id: BUDGET_ANALYST_AGENT_ID, name: 'Budget Analyst', purpose: 'Analyzes spending and gives recommendations' },
  ]
  return (
    <Card className="rounded-none border" style={{ borderColor: 'hsl(30,10%,88%)' }}>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-xs font-sans tracking-wider uppercase" style={{ color: 'hsl(30,5%,50%)' }}>AI Agents</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2">
        {agents.map((agent) => (
          <div key={agent.id} className="flex items-center gap-2">
            <div
              className="w-2 h-2 flex-shrink-0"
              style={{
                borderRadius: '50%',
                background: activeAgentId === agent.id ? 'hsl(140,50%,45%)' : 'hsl(30,8%,80%)',
                boxShadow: activeAgentId === agent.id ? '0 0 6px hsl(140,50%,45%)' : 'none',
              }}
            />
            <div className="min-w-0">
              <p className="text-xs font-sans font-medium" style={{ color: 'hsl(30,5%,15%)' }}>{agent.name}</p>
              <p className="text-xs font-sans truncate" style={{ color: 'hsl(30,5%,60%)' }}>{agent.purpose}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────── MAIN PAGE ───────────────────────────────

export default function Page() {
  // ── State ──
  const [activeTab, setActiveTab] = useState<'dashboard' | 'log' | 'budgets' | 'reports'>('dashboard')
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [budgets, setBudgets] = useState<CategoryBudget[]>([])
  const [mounted, setMounted] = useState(false)
  const [sampleData, setSampleData] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Log Expense state
  const [logMode, setLogMode] = useState<'chat' | 'quick'>('chat')
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [pendingExpense, setPendingExpense] = useState<ParsedExpense | null>(null)
  const [quickForm, setQuickForm] = useState({ amount: '', category: 'Food', date: '', notes: '' })
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  // Budget state
  const [budgetEdits, setBudgetEdits] = useState<Record<string, string>>({})
  const [newCategory, setNewCategory] = useState('')
  const [budgetSaveStatus, setBudgetSaveStatus] = useState<string | null>(null)

  // Analysis state
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // ── Init ──
  useEffect(() => {
    setMounted(true)
    setSelectedMonth(getCurrentMonth())
    setQuickForm((prev) => ({ ...prev, date: getTodayDate() }))
    const storedExpenses = loadFromStorage<Expense[]>('budgetwise_expenses', [])
    const storedBudgets = loadFromStorage<CategoryBudget[]>('budgetwise_budgets', DEFAULT_BUDGETS)
    setExpenses(storedExpenses)
    setBudgets(storedBudgets.length > 0 ? storedBudgets : DEFAULT_BUDGETS)
  }, [])

  // ── Derived data ──
  const displayExpenses = useMemo(() => {
    const source = sampleData ? [...SAMPLE_EXPENSES, ...expenses] : expenses
    if (!selectedMonth) return source
    return source.filter((e) => e.date.startsWith(selectedMonth))
  }, [expenses, sampleData, selectedMonth])

  const totalSpent = useMemo(() => {
    return displayExpenses.reduce((sum, e) => sum + e.amount, 0)
  }, [displayExpenses])

  const totalBudget = useMemo(() => {
    return budgets.reduce((sum, b) => sum + b.budget, 0)
  }, [budgets])

  const remaining = totalBudget - totalSpent

  const categorySpending = useMemo(() => {
    const map: Record<string, number> = {}
    displayExpenses.forEach((e) => {
      map[e.category] = (map[e.category] ?? 0) + e.amount
    })
    return map
  }, [displayExpenses])

  const topCategory = useMemo(() => {
    let maxCat = ''
    let maxAmt = 0
    Object.entries(categorySpending).forEach(([cat, amt]) => {
      if (amt > maxAmt) {
        maxCat = cat
        maxAmt = amt
      }
    })
    return { category: maxCat || 'N/A', amount: maxAmt }
  }, [categorySpending])

  const sortedExpenses = useMemo(() => {
    return [...displayExpenses].sort((a, b) => b.date.localeCompare(a.date))
  }, [displayExpenses])

  // ── Expense helpers ──
  const addExpense = useCallback((expense: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExp: Expense = {
      ...expense,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }
    setExpenses((prev) => {
      const updated = [...prev, newExp]
      saveToStorage('budgetwise_expenses', updated)
      return updated
    })
    setSaveStatus({ type: 'success', message: `Expense of ${expense.currency}${expense.amount.toFixed(2)} saved to ${expense.category}` })
    setTimeout(() => setSaveStatus(null), 3000)
  }, [])

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => {
      const updated = prev.filter((e) => e.id !== id)
      saveToStorage('budgetwise_expenses', updated)
      return updated
    })
  }, [])

  // ── Chat handler ──
  const handleChatSend = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date().toISOString(),
    }
    setChatMessages((prev) => [...prev, userMsg])
    setChatInput('')
    setChatLoading(true)
    setActiveAgentId(EXPENSE_LOGGER_AGENT_ID)

    try {
      const result = await callAIAgent(userMsg.content, EXPENSE_LOGGER_AGENT_ID)
      let parsed: ParsedExpense | null = null

      if (result.success) {
        const data = parseAgentResult(result)
        if (data) {
          parsed = {
            amount: typeof data.amount === 'number' ? data.amount : parseFloat(String(data.amount ?? '0')),
            currency: String(data.currency ?? '$'),
            category: String(data.category ?? 'Other'),
            date: String(data.date ?? getTodayDate()),
            notes: String(data.notes ?? ''),
            confidence: String(data.confidence ?? 'medium'),
          }
          setPendingExpense(parsed)
        }
      }

      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: parsed
          ? `I parsed your expense: ${parsed.currency}${parsed.amount.toFixed(2)} for ${parsed.category} on ${parsed.date}. ${parsed.notes ? `Notes: ${parsed.notes}` : ''} (Confidence: ${parsed.confidence})`
          : result?.error ?? 'I could not parse that expense. Please try again with details like amount, category, and date.',
        parsedExpense: parsed,
        timestamp: new Date().toISOString(),
      }
      setChatMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      const errMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'Something went wrong while processing your expense. Please try again.',
        timestamp: new Date().toISOString(),
      }
      setChatMessages((prev) => [...prev, errMsg])
    } finally {
      setChatLoading(false)
      setActiveAgentId(null)
    }
  }, [chatInput, chatLoading])

  // ── Quick add handler ──
  const handleQuickAdd = useCallback(() => {
    const amount = parseFloat(quickForm.amount)
    if (isNaN(amount) || amount <= 0) {
      setSaveStatus({ type: 'error', message: 'Please enter a valid amount' })
      setTimeout(() => setSaveStatus(null), 3000)
      return
    }
    addExpense({
      amount,
      currency: '$',
      category: quickForm.category,
      date: quickForm.date || getTodayDate(),
      notes: quickForm.notes,
    })
    setQuickForm({ amount: '', category: 'Food', date: getTodayDate(), notes: '' })
  }, [quickForm, addExpense])

  // ── Save pending expense from chat ──
  const savePendingExpense = useCallback(() => {
    if (!pendingExpense) return
    addExpense({
      amount: pendingExpense.amount,
      currency: pendingExpense.currency,
      category: pendingExpense.category,
      date: pendingExpense.date,
      notes: pendingExpense.notes,
    })
    setPendingExpense(null)
  }, [pendingExpense, addExpense])

  // ── Budget handlers ──
  const saveBudgets = useCallback(() => {
    const updated = budgets.map((b) => {
      const editVal = budgetEdits[b.category]
      if (editVal !== undefined) {
        const num = parseFloat(editVal)
        return { ...b, budget: isNaN(num) ? b.budget : num }
      }
      return b
    })
    setBudgets(updated)
    saveToStorage('budgetwise_budgets', updated)
    setBudgetEdits({})
    setBudgetSaveStatus('Budgets saved successfully')
    setTimeout(() => setBudgetSaveStatus(null), 3000)
  }, [budgets, budgetEdits])

  const addCategoryBudget = useCallback(() => {
    if (!newCategory.trim()) return
    const exists = budgets.some((b) => b.category.toLowerCase() === newCategory.trim().toLowerCase())
    if (exists) {
      setBudgetSaveStatus('Category already exists')
      setTimeout(() => setBudgetSaveStatus(null), 3000)
      return
    }
    const updated = [...budgets, { category: newCategory.trim(), budget: 100 }]
    setBudgets(updated)
    saveToStorage('budgetwise_budgets', updated)
    setNewCategory('')
  }, [newCategory, budgets])

  const deleteBudgetCategory = useCallback((category: string) => {
    const updated = budgets.filter((b) => b.category !== category)
    setBudgets(updated)
    saveToStorage('budgetwise_budgets', updated)
  }, [budgets])

  // ── Analysis handler ──
  const runAnalysis = useCallback(async () => {
    if (analysisLoading) return
    setAnalysisLoading(true)
    setAnalysisError(null)
    setActiveAgentId(BUDGET_ANALYST_AGENT_ID)

    const expList = displayExpenses.map((e) => `- ${e.category}: ${e.currency}${e.amount.toFixed(2)} on ${e.date} (${e.notes || 'no notes'})`).join('\n')
    const budList = budgets.map((b) => `- ${b.category}: $${b.budget}`).join('\n')

    const contextMessage = `Analyze my spending for ${formatMonthLabel(selectedMonth || getCurrentMonth())}.

My expenses:
${expList || '- No expenses logged yet'}

My budgets:
${budList}

Total spent: $${totalSpent.toFixed(2)}
Total budget: $${totalBudget.toFixed(2)}

Please analyze my spending, identify overspending areas, and give me recommendations.`

    try {
      const result = await callAIAgent(contextMessage, BUDGET_ANALYST_AGENT_ID)
      if (result.success) {
        const data = parseAgentResult(result)
        if (data) {
          setAnalysisResult({
            total_spent: typeof data.total_spent === 'number' ? data.total_spent : totalSpent,
            total_budget: typeof data.total_budget === 'number' ? data.total_budget : totalBudget,
            budget_utilization_percent: typeof data.budget_utilization_percent === 'number' ? data.budget_utilization_percent : (totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0),
            category_breakdown: Array.isArray(data.category_breakdown) ? data.category_breakdown as AnalysisResult['category_breakdown'] : [],
            overspending_areas: Array.isArray(data.overspending_areas) ? data.overspending_areas as AnalysisResult['overspending_areas'] : [],
            recommendations: Array.isArray(data.recommendations) ? data.recommendations as AnalysisResult['recommendations'] : [],
            monthly_summary: typeof data.monthly_summary === 'string' ? data.monthly_summary : '',
          })
        } else {
          setAnalysisError('Could not parse analysis results. Please try again.')
        }
      } else {
        setAnalysisError(result?.error ?? 'Analysis failed. Please try again.')
      }
    } catch {
      setAnalysisError('Network error during analysis. Please try again.')
    } finally {
      setAnalysisLoading(false)
      setActiveAgentId(null)
    }
  }, [displayExpenses, budgets, selectedMonth, totalSpent, totalBudget, analysisLoading])

  // ── Auto-scroll chat ──
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages])

  // ── Month options ──
  const monthOptions = useMemo(() => getMonthOptions(), [])

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ ...THEME_VARS, background: 'hsl(0,0%,99%)' }}>
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-48 rounded-none" />
          <Skeleton className="h-4 w-full rounded-none" />
          <Skeleton className="h-4 w-3/4 rounded-none" />
        </div>
      </div>
    )
  }

  // ─────────────────── TAB: DASHBOARD ───────────────────

  function DashboardTab() {
    return (
      <div className="space-y-6 pb-4">
        {/* Month Selector */}
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-light tracking-wider" style={{ color: 'hsl(30,5%,15%)' }}>
            {formatMonthLabel(selectedMonth || getCurrentMonth())}
          </h2>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px] rounded-none border font-sans text-xs tracking-wider" style={{ borderColor: 'hsl(30,10%,88%)' }}>
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="rounded-none font-sans text-xs">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={<FiDollarSign size={20} />}
            label="Total Spent"
            value={`$${totalSpent.toFixed(2)}`}
            trend={totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(0)}% of budget` : undefined}
            trendUp={false}
          />
          <StatCard
            icon={remaining >= 0 ? <FiTrendingUp size={20} /> : <FiTrendingDown size={20} />}
            label="Remaining"
            value={`$${Math.abs(remaining).toFixed(2)}`}
            trend={remaining < 0 ? 'Over budget' : 'Under budget'}
            trendUp={remaining >= 0}
          />
          <StatCard
            icon={<FiStar size={20} />}
            label="Top Category"
            value={topCategory.category}
            trend={topCategory.amount > 0 ? `$${topCategory.amount.toFixed(2)}` : undefined}
            trendUp={false}
          />
        </div>

        {/* Category Distribution */}
        {displayExpenses.length > 0 && (
          <Card className="rounded-none border" style={{ borderColor: 'hsl(30,10%,88%)' }}>
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-sm font-light tracking-wider uppercase" style={{ color: 'hsl(30,5%,50%)' }}>
                Category Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {budgets.map((b, idx) => {
                const spent = categorySpending[b.category] ?? 0
                if (spent === 0 && !sampleData) return null
                return (
                  <CategoryBar
                    key={b.category}
                    category={b.category}
                    spent={spent}
                    budget={b.budget}
                    color={getCategoryColor(idx)}
                    index={idx}
                  />
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Recent Expenses */}
        <Card className="rounded-none border" style={{ borderColor: 'hsl(30,10%,88%)' }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-sm font-light tracking-wider uppercase" style={{ color: 'hsl(30,5%,50%)' }}>
                Recent Expenses
              </CardTitle>
              <Badge variant="outline" className="rounded-none font-sans text-xs" style={{ borderColor: 'hsl(40,30%,45%)', color: 'hsl(40,30%,45%)' }}>
                {displayExpenses.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {sortedExpenses.length === 0 ? (
              <div className="py-8 text-center">
                <FiPlus size={24} className="mx-auto mb-3" style={{ color: 'hsl(30,8%,80%)' }} />
                <p className="text-sm font-sans" style={{ color: 'hsl(30,5%,50%)' }}>No expenses logged yet.</p>
                <p className="text-xs font-sans mt-1" style={{ color: 'hsl(30,5%,65%)' }}>Start by adding your first expense.</p>
                <Button
                  variant="outline"
                  className="mt-4 rounded-none font-sans text-xs tracking-wider"
                  style={{ borderColor: 'hsl(40,30%,45%)', color: 'hsl(40,30%,45%)' }}
                  onClick={() => setActiveTab('log')}
                >
                  <FiPlus size={14} className="mr-2" /> Add Expense
                </Button>
              </div>
            ) : (
              <ScrollArea className="max-h-[280px]">
                {sortedExpenses.slice(0, 10).map((exp) => (
                  <ExpenseRow key={exp.id} expense={exp} onDelete={deleteExpense} />
                ))}
                {sortedExpenses.length > 10 && (
                  <p className="text-xs font-sans text-center py-2" style={{ color: 'hsl(30,5%,50%)' }}>
                    +{sortedExpenses.length - 10} more expenses
                  </p>
                )}
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Analyze CTA */}
        {displayExpenses.length > 0 && (
          <Button
            className="w-full rounded-none font-sans text-xs tracking-wider py-6"
            style={{ background: 'hsl(40,30%,45%)', color: 'white' }}
            onClick={() => {
              setActiveTab('reports')
              runAnalysis()
            }}
          >
            <FiBarChart2 size={16} className="mr-2" /> Analyze Spending
          </Button>
        )}

        {/* Agent Status */}
        <AgentStatusPanel activeAgentId={activeAgentId} />
      </div>
    )
  }

  // ─────────────────── TAB: LOG EXPENSE ───────────────────

  function LogExpenseTab() {
    return (
      <div className="space-y-4 pb-4">
        <h2 className="font-serif text-xl font-light tracking-wider" style={{ color: 'hsl(30,5%,15%)' }}>
          Log Expense
        </h2>

        {/* Mode Toggle */}
        <div className="flex border" style={{ borderColor: 'hsl(30,10%,88%)' }}>
          <button
            className="flex-1 py-2.5 text-xs font-sans tracking-wider transition-colors"
            style={{
              background: logMode === 'chat' ? 'hsl(40,30%,45%)' : 'transparent',
              color: logMode === 'chat' ? 'white' : 'hsl(30,5%,50%)',
            }}
            onClick={() => setLogMode('chat')}
          >
            <FiMessageSquare size={14} className="inline mr-2" />Chat Mode
          </button>
          <button
            className="flex-1 py-2.5 text-xs font-sans tracking-wider transition-colors"
            style={{
              background: logMode === 'quick' ? 'hsl(40,30%,45%)' : 'transparent',
              color: logMode === 'quick' ? 'white' : 'hsl(30,5%,50%)',
            }}
            onClick={() => setLogMode('quick')}
          >
            <FiEdit2 size={14} className="inline mr-2" />Quick Add
          </button>
        </div>

        {/* Status Message */}
        {saveStatus && (
          <div
            className="flex items-center gap-2 p-3 text-xs font-sans border"
            style={{
              borderColor: saveStatus.type === 'success' ? 'hsl(140,40%,45%)' : 'hsl(0,50%,45%)',
              background: saveStatus.type === 'success' ? 'hsl(140,40%,95%)' : 'hsl(0,50%,95%)',
              color: saveStatus.type === 'success' ? 'hsl(140,40%,30%)' : 'hsl(0,50%,35%)',
            }}
          >
            {saveStatus.type === 'success' ? <FiCheck size={14} /> : <FiAlertTriangle size={14} />}
            {saveStatus.message}
          </div>
        )}

        {logMode === 'chat' ? (
          <Card className="rounded-none border" style={{ borderColor: 'hsl(30,10%,88%)' }}>
            <CardContent className="p-0">
              {/* Chat Messages */}
              <div ref={chatScrollRef} className="h-[340px] overflow-y-auto p-4 space-y-3" style={{ background: 'hsl(30,10%,97%)' }}>
                {chatMessages.length === 0 && !chatLoading && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <FiMessageSquare size={28} style={{ color: 'hsl(30,8%,80%)' }} />
                    <p className="text-sm font-sans mt-3" style={{ color: 'hsl(30,5%,50%)' }}>
                      Describe your expense in natural language
                    </p>
                    <p className="text-xs font-sans mt-1" style={{ color: 'hsl(30,5%,65%)' }}>
                      e.g., "Spent $45 on groceries yesterday"
                    </p>
                  </div>
                )}
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className="max-w-[80%] p-3 text-sm font-sans leading-relaxed"
                      style={{
                        background: msg.role === 'user' ? 'hsl(40,30%,45%)' : 'white',
                        color: msg.role === 'user' ? 'white' : 'hsl(30,5%,15%)',
                        border: msg.role === 'assistant' ? '1px solid hsl(30,10%,88%)' : 'none',
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="p-3 space-y-2" style={{ background: 'white', border: '1px solid hsl(30,10%,88%)' }}>
                      <Skeleton className="h-3 w-32 rounded-none" />
                      <Skeleton className="h-3 w-24 rounded-none" />
                    </div>
                  </div>
                )}
              </div>

              {/* Pending Expense Confirmation */}
              {pendingExpense && (
                <div className="p-4 border-t" style={{ borderColor: 'hsl(30,10%,88%)', background: 'hsl(40,30%,97%)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-sans tracking-wider uppercase" style={{ color: 'hsl(40,30%,45%)' }}>
                      Parsed Expense
                    </span>
                    <Badge
                      variant={pendingExpense.confidence === 'high' ? 'default' : pendingExpense.confidence === 'medium' ? 'secondary' : 'outline'}
                      className="rounded-none text-xs font-sans"
                    >
                      {pendingExpense.confidence} confidence
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-sans mb-3">
                    <div><span style={{ color: 'hsl(30,5%,50%)' }}>Amount:</span> <strong>{pendingExpense.currency}{pendingExpense.amount.toFixed(2)}</strong></div>
                    <div><span style={{ color: 'hsl(30,5%,50%)' }}>Category:</span> <strong>{pendingExpense.category}</strong></div>
                    <div><span style={{ color: 'hsl(30,5%,50%)' }}>Date:</span> <strong>{pendingExpense.date}</strong></div>
                    <div><span style={{ color: 'hsl(30,5%,50%)' }}>Notes:</span> <strong>{pendingExpense.notes || 'None'}</strong></div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 rounded-none font-sans text-xs tracking-wider"
                      style={{ background: 'hsl(40,30%,45%)', color: 'white' }}
                      onClick={savePendingExpense}
                    >
                      <FiCheck size={14} className="mr-1" /> Save Expense
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-none font-sans text-xs tracking-wider"
                      style={{ borderColor: 'hsl(30,10%,88%)' }}
                      onClick={() => setPendingExpense(null)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              )}

              {/* Chat Input */}
              <div className="p-3 border-t flex gap-2" style={{ borderColor: 'hsl(30,10%,88%)' }}>
                <Input
                  className="rounded-none flex-1 font-sans text-sm"
                  style={{ borderColor: 'hsl(30,10%,88%)' }}
                  placeholder="Describe your expense..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleChatSend()
                    }
                  }}
                  disabled={chatLoading}
                />
                <Button
                  className="rounded-none"
                  style={{ background: 'hsl(40,30%,45%)', color: 'white' }}
                  onClick={handleChatSend}
                  disabled={chatLoading || !chatInput.trim()}
                >
                  <FiSend size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-none border" style={{ borderColor: 'hsl(30,10%,88%)' }}>
            <CardContent className="p-5 space-y-4">
              <div>
                <Label className="text-xs font-sans tracking-wider uppercase" style={{ color: 'hsl(30,5%,50%)' }}>Amount</Label>
                <div className="flex items-center mt-1">
                  <span className="px-3 py-2 text-sm font-sans border border-r-0" style={{ borderColor: 'hsl(30,10%,88%)', background: 'hsl(30,10%,95%)', color: 'hsl(30,5%,50%)' }}>$</span>
                  <Input
                    type="number"
                    className="rounded-none font-sans"
                    style={{ borderColor: 'hsl(30,10%,88%)' }}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={quickForm.amount}
                    onChange={(e) => setQuickForm((prev) => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-sans tracking-wider uppercase" style={{ color: 'hsl(30,5%,50%)' }}>Category</Label>
                <Select value={quickForm.category} onValueChange={(val) => setQuickForm((prev) => ({ ...prev, category: val }))}>
                  <SelectTrigger className="rounded-none mt-1 font-sans text-sm" style={{ borderColor: 'hsl(30,10%,88%)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    {budgets.map((b) => (
                      <SelectItem key={b.category} value={b.category} className="rounded-none font-sans text-sm">{b.category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-sans tracking-wider uppercase" style={{ color: 'hsl(30,5%,50%)' }}>Date</Label>
                <Input
                  type="date"
                  className="rounded-none mt-1 font-sans"
                  style={{ borderColor: 'hsl(30,10%,88%)' }}
                  value={quickForm.date}
                  onChange={(e) => setQuickForm((prev) => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div>
                <Label className="text-xs font-sans tracking-wider uppercase" style={{ color: 'hsl(30,5%,50%)' }}>Notes</Label>
                <Textarea
                  className="rounded-none mt-1 font-sans text-sm"
                  style={{ borderColor: 'hsl(30,10%,88%)' }}
                  placeholder="Optional notes..."
                  rows={3}
                  value={quickForm.notes}
                  onChange={(e) => setQuickForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <Button
                className="w-full rounded-none font-sans text-xs tracking-wider py-5"
                style={{ background: 'hsl(40,30%,45%)', color: 'white' }}
                onClick={handleQuickAdd}
              >
                <FiPlus size={16} className="mr-2" /> Save Expense
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // ─────────────────── TAB: BUDGETS ───────────────────

  function BudgetsTab() {
    return (
      <div className="space-y-4 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-light tracking-wider" style={{ color: 'hsl(30,5%,15%)' }}>
            Monthly Budgets
          </h2>
          <div className="text-right">
            <p className="text-xs font-sans tracking-wider uppercase" style={{ color: 'hsl(30,5%,50%)' }}>Total Budget</p>
            <p className="font-serif text-lg font-light" style={{ color: 'hsl(40,30%,45%)' }}>${totalBudget.toFixed(0)}</p>
          </div>
        </div>

        {budgetSaveStatus && (
          <div
            className="flex items-center gap-2 p-3 text-xs font-sans border"
            style={{
              borderColor: 'hsl(140,40%,45%)',
              background: 'hsl(140,40%,95%)',
              color: 'hsl(140,40%,30%)',
            }}
          >
            <FiCheck size={14} />
            {budgetSaveStatus}
          </div>
        )}

        <Card className="rounded-none border" style={{ borderColor: 'hsl(30,10%,88%)' }}>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[400px]">
              {budgets.map((b) => {
                const spent = categorySpending[b.category] ?? 0
                const utilPercent = b.budget > 0 ? (spent / b.budget) * 100 : 0
                const editValue = budgetEdits[b.category]
                return (
                  <div key={b.category} className="p-4 border-b" style={{ borderColor: 'hsl(30,10%,93%)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-sans font-medium" style={{ color: 'hsl(30,5%,15%)' }}>{b.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-sans" style={{ color: 'hsl(30,5%,50%)' }}>$</span>
                        <Input
                          type="number"
                          className="w-20 h-7 rounded-none font-sans text-sm text-right"
                          style={{ borderColor: 'hsl(30,10%,88%)' }}
                          value={editValue !== undefined ? editValue : String(b.budget)}
                          onChange={(e) => setBudgetEdits((prev) => ({ ...prev, [b.category]: e.target.value }))}
                          min="0"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-none"
                          style={{ color: 'hsl(0,50%,45%)' }}
                          onClick={() => deleteBudgetCategory(b.category)}
                        >
                          <FiTrash2 size={12} />
                        </Button>
                      </div>
                    </div>
                    <div className="h-1.5 w-full" style={{ background: 'hsl(30,8%,92%)' }}>
                      <div
                        className="h-full transition-all duration-300"
                        style={{ width: `${Math.min(utilPercent, 100)}%`, background: getUtilizationColor(utilPercent) }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-sans" style={{ color: 'hsl(30,5%,60%)' }}>
                        ${spent.toFixed(0)} spent
                      </span>
                      <span className="text-xs font-sans" style={{ color: getUtilizationColor(utilPercent) }}>
                        {utilPercent.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Add Category */}
        <div className="flex gap-2">
          <Input
            className="rounded-none font-sans text-sm flex-1"
            style={{ borderColor: 'hsl(30,10%,88%)' }}
            placeholder="New category name..."
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addCategoryBudget()
            }}
          />
          <Button
            variant="outline"
            className="rounded-none font-sans text-xs tracking-wider"
            style={{ borderColor: 'hsl(40,30%,45%)', color: 'hsl(40,30%,45%)' }}
            onClick={addCategoryBudget}
          >
            <FiPlus size={14} className="mr-1" /> Add
          </Button>
        </div>

        <Button
          className="w-full rounded-none font-sans text-xs tracking-wider py-5"
          style={{ background: 'hsl(40,30%,45%)', color: 'white' }}
          onClick={saveBudgets}
        >
          <FiCheck size={16} className="mr-2" /> Save Budgets
        </Button>
      </div>
    )
  }

  // ─────────────────── TAB: REPORTS ───────────────────

  function ReportsTab() {
    return (
      <div className="space-y-5 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-light tracking-wider" style={{ color: 'hsl(30,5%,15%)' }}>
            Reports & Analysis
          </h2>
          <Badge variant="outline" className="rounded-none font-sans text-xs" style={{ borderColor: 'hsl(40,30%,45%)', color: 'hsl(40,30%,45%)' }}>
            {formatMonthLabel(selectedMonth || getCurrentMonth())}
          </Badge>
        </div>

        <Button
          className="w-full rounded-none font-sans text-xs tracking-wider py-5"
          style={{ background: 'hsl(40,30%,45%)', color: 'white' }}
          onClick={runAnalysis}
          disabled={analysisLoading}
        >
          {analysisLoading ? (
            <>
              <FiClock size={16} className="mr-2 animate-spin" /> Analyzing...
            </>
          ) : (
            <>
              <FiBarChart2 size={16} className="mr-2" /> Analyze Spending
            </>
          )}
        </Button>

        {/* Error */}
        {analysisError && (
          <div className="flex items-center gap-2 p-3 text-xs font-sans border" style={{ borderColor: 'hsl(0,50%,45%)', background: 'hsl(0,50%,95%)', color: 'hsl(0,50%,35%)' }}>
            <FiAlertTriangle size={14} />
            {analysisError}
          </div>
        )}

        {/* Loading Skeleton */}
        {analysisLoading && (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-none" />
            <Skeleton className="h-40 w-full rounded-none" />
            <Skeleton className="h-32 w-full rounded-none" />
          </div>
        )}

        {/* Empty State */}
        {!analysisResult && !analysisLoading && !analysisError && (
          <Card className="rounded-none border" style={{ borderColor: 'hsl(30,10%,88%)' }}>
            <CardContent className="py-12 text-center">
              <FiBarChart2 size={32} className="mx-auto mb-4" style={{ color: 'hsl(30,8%,80%)' }} />
              <p className="text-sm font-sans" style={{ color: 'hsl(30,5%,50%)' }}>
                No analysis yet
              </p>
              <p className="text-xs font-sans mt-1" style={{ color: 'hsl(30,5%,65%)' }}>
                Click Analyze Spending to get started
              </p>
            </CardContent>
          </Card>
        )}

        {/* Analysis Results */}
        {analysisResult && !analysisLoading && (
          <div className="space-y-5">
            {/* Utilization Overview */}
            <Card className="rounded-none border" style={{ borderColor: 'hsl(30,10%,88%)' }}>
              <CardHeader className="pb-2">
                <CardTitle className="font-serif text-sm font-light tracking-wider uppercase" style={{ color: 'hsl(30,5%,50%)' }}>
                  Budget Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4 mb-3">
                  <span className="font-serif text-3xl font-light" style={{ color: getUtilizationColor(analysisResult.budget_utilization_percent) }}>
                    {analysisResult.budget_utilization_percent.toFixed(1)}%
                  </span>
                  <span className="text-xs font-sans pb-1" style={{ color: 'hsl(30,5%,50%)' }}>
                    ${analysisResult.total_spent.toFixed(2)} of ${analysisResult.total_budget.toFixed(2)}
                  </span>
                </div>
                <div className="h-3 w-full" style={{ background: 'hsl(30,8%,92%)' }}>
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${Math.min(analysisResult.budget_utilization_percent, 100)}%`,
                      background: getUtilizationColor(analysisResult.budget_utilization_percent),
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Monthly Summary */}
            {analysisResult.monthly_summary && (
              <Card className="rounded-none border" style={{ borderColor: 'hsl(30,10%,88%)' }}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-serif text-sm font-light tracking-wider uppercase" style={{ color: 'hsl(30,5%,50%)' }}>
                    Monthly Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="font-sans" style={{ color: 'hsl(30,5%,25%)' }}>
                  {renderMarkdown(analysisResult.monthly_summary)}
                </CardContent>
              </Card>
            )}

            {/* Category Breakdown */}
            {Array.isArray(analysisResult.category_breakdown) && analysisResult.category_breakdown.length > 0 && (
              <Card className="rounded-none border" style={{ borderColor: 'hsl(30,10%,88%)' }}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-serif text-sm font-light tracking-wider uppercase" style={{ color: 'hsl(30,5%,50%)' }}>
                    Budget vs Actual
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analysisResult.category_breakdown.map((item, idx) => {
                    const statusColor = (item?.status ?? '').toLowerCase().includes('over')
                      ? 'hsl(0,50%,45%)'
                      : (item?.status ?? '').toLowerCase().includes('near')
                        ? 'hsl(40,60%,50%)'
                        : 'hsl(140,40%,45%)'
                    const utilPct = typeof item?.utilization_percent === 'number' ? item.utilization_percent : 0
                    return (
                      <div key={item?.category ?? idx} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-sans font-medium" style={{ color: 'hsl(30,5%,15%)' }}>
                              {item?.category ?? 'Unknown'}
                            </span>
                            <Badge variant="outline" className="rounded-none text-xs font-sans" style={{ borderColor: statusColor, color: statusColor }}>
                              {item?.status ?? ''}
                            </Badge>
                          </div>
                          <span className="text-xs font-sans" style={{ color: 'hsl(30,5%,50%)' }}>
                            ${typeof item?.spent === 'number' ? item.spent.toFixed(0) : 0} / ${typeof item?.budget === 'number' ? item.budget.toFixed(0) : 0}
                          </span>
                        </div>
                        <div className="h-2 w-full" style={{ background: 'hsl(30,8%,92%)' }}>
                          <div className="h-full transition-all duration-300" style={{ width: `${Math.min(utilPct, 100)}%`, background: statusColor }} />
                        </div>
                        {typeof item?.gap === 'number' && item.gap !== 0 && (
                          <p className="text-xs font-sans" style={{ color: item.gap < 0 ? 'hsl(0,50%,45%)' : 'hsl(140,40%,45%)' }}>
                            {item.gap < 0 ? `$${Math.abs(item.gap).toFixed(0)} over budget` : `$${item.gap.toFixed(0)} under budget`}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {/* Overspending Areas */}
            {Array.isArray(analysisResult.overspending_areas) && analysisResult.overspending_areas.length > 0 && (
              <Card className="rounded-none border" style={{ borderColor: 'hsl(0,50%,85%)' }}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-serif text-sm font-light tracking-wider uppercase flex items-center gap-2" style={{ color: 'hsl(0,50%,45%)' }}>
                    <FiAlertTriangle size={14} /> Overspending Areas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analysisResult.overspending_areas.map((area, idx) => (
                    <div key={area?.category ?? idx} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'hsl(30,10%,93%)' }}>
                      <div>
                        <span className="text-sm font-sans font-medium" style={{ color: 'hsl(30,5%,15%)' }}>
                          {area?.category ?? 'Unknown'}
                        </span>
                        <p className="text-xs font-sans" style={{ color: 'hsl(0,50%,45%)' }}>
                          ${typeof area?.overspend_amount === 'number' ? area.overspend_amount.toFixed(2) : 0} over
                        </p>
                      </div>
                      <Badge variant={getSeverityVariant(area?.severity ?? '')} className="rounded-none text-xs font-sans tracking-wider">
                        {area?.severity ?? 'unknown'}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {Array.isArray(analysisResult.recommendations) && analysisResult.recommendations.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-serif text-sm font-light tracking-wider uppercase" style={{ color: 'hsl(30,5%,50%)' }}>
                  Recommendations
                </h3>
                {analysisResult.recommendations.map((rec, idx) => (
                  <Card key={rec?.title ?? idx} className="rounded-none border" style={{ borderColor: 'hsl(30,10%,88%)' }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-sans text-sm font-medium" style={{ color: 'hsl(30,5%,15%)' }}>
                          {rec?.title ?? 'Recommendation'}
                        </h4>
                        <Badge variant={getPriorityVariant(rec?.priority ?? '')} className="rounded-none text-xs font-sans tracking-wider ml-2 flex-shrink-0">
                          {rec?.priority ?? 'medium'}
                        </Badge>
                      </div>
                      <p className="text-xs font-sans leading-relaxed mb-2" style={{ color: 'hsl(30,5%,40%)' }}>
                        {rec?.description ?? ''}
                      </p>
                      {rec?.potential_savings && (
                        <div className="flex items-center gap-1 text-xs font-sans" style={{ color: 'hsl(140,40%,40%)' }}>
                          <FiDollarSign size={12} />
                          <span>Potential savings: {rec.potential_savings}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Agent Status */}
        <AgentStatusPanel activeAgentId={activeAgentId} />
      </div>
    )
  }

  // ─────────────────── RENDER ───────────────────

  return (
    <ErrorBoundary>
      <div style={THEME_VARS} className="min-h-screen font-sans" >
        <div className="min-h-screen" style={{ background: 'hsl(0,0%,99%)', color: 'hsl(30,5%,15%)' }}>
          {/* Header */}
          <header className="border-b px-4 py-4" style={{ borderColor: 'hsl(30,10%,88%)', background: 'white' }}>
            <div className="max-w-lg mx-auto flex items-center justify-between">
              <div>
                <h1 className="font-serif text-lg font-light tracking-wider" style={{ color: 'hsl(30,5%,15%)' }}>
                  BudgetWise
                </h1>
                <p className="text-xs font-sans tracking-wider" style={{ color: 'hsl(30,5%,55%)' }}>
                  Monthly Budget Tracker
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs font-sans" style={{ color: 'hsl(30,5%,55%)' }}>Sample Data</Label>
                <Switch
                  checked={sampleData}
                  onCheckedChange={setSampleData}
                  className="data-[state=checked]:bg-[hsl(40,30%,45%)]"
                />
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="max-w-lg mx-auto px-4 pt-5 pb-24">
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'log' && <LogExpenseTab />}
            {activeTab === 'budgets' && <BudgetsTab />}
            {activeTab === 'reports' && <ReportsTab />}
          </main>

          {/* Floating Add Button */}
          {activeTab === 'dashboard' && (
            <button
              className="fixed z-40 flex items-center justify-center w-12 h-12 shadow-lg transition-transform hover:scale-105"
              style={{
                bottom: '80px',
                right: '20px',
                background: 'hsl(40,30%,45%)',
                color: 'white',
              }}
              onClick={() => setActiveTab('log')}
              aria-label="Add expense"
            >
              <FiPlus size={22} />
            </button>
          )}

          {/* Bottom Navigation */}
          <nav className="fixed bottom-0 left-0 right-0 z-50 border-t" style={{ borderColor: 'hsl(30,10%,88%)', background: 'white' }}>
            <div className="max-w-lg mx-auto flex">
              {([
                { key: 'dashboard' as const, icon: <FiGrid size={18} />, label: 'Dashboard' },
                { key: 'log' as const, icon: <FiPlus size={18} />, label: 'Log' },
                { key: 'budgets' as const, icon: <FiTarget size={18} />, label: 'Budgets' },
                { key: 'reports' as const, icon: <FiBarChart2 size={18} />, label: 'Reports' },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  className="flex-1 flex flex-col items-center py-2.5 transition-colors"
                  style={{
                    color: activeTab === tab.key ? 'hsl(40,30%,45%)' : 'hsl(30,5%,60%)',
                    borderTop: activeTab === tab.key ? '2px solid hsl(40,30%,45%)' : '2px solid transparent',
                  }}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.icon}
                  <span className="text-xs font-sans tracking-wider mt-1">{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </ErrorBoundary>
  )
}
