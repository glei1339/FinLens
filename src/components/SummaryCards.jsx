import React from 'react'
import { TrendingDown, TrendingUp, Activity, Layers } from 'lucide-react'

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(n))
}

function Card({ label, value, sub, icon: Icon, gradient, iconBg, valueColor, delay }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 animate-fade-up"
      style={{
        background: gradient,
        animationDelay: delay,
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Shine overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">{label}</p>
          <p className={`text-2xl font-bold tracking-tight ${valueColor}`}>{value}</p>
          {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  )
}

export default function SummaryCards({ transactions }) {
  const income   = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const expenses = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0)
  const net      = income + expenses
  const uncategorized = transactions.filter((t) => t.category === 'Uncategorized').length

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card
        label="Total Credits"
        value={fmt(income)}
        sub="Deposits, refunds & credits"
        icon={TrendingUp}
        gradient="linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(16,185,129,0.12) 100%)"
        iconBg="bg-emerald-500/30"
        valueColor="text-emerald-400"
        delay="0s"
      />
      <Card
        label="Total Debits"
        value={fmt(expenses)}
        sub="Charges, payments & fees"
        icon={TrendingDown}
        gradient="linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(220,38,38,0.12) 100%)"
        iconBg="bg-red-500/30"
        valueColor="text-red-400"
        delay="0.08s"
      />
      <Card
        label="Net Balance"
        value={(net >= 0 ? '+' : '-') + fmt(net)}
        sub={net >= 0 ? 'Credits exceed debits' : 'Debits exceed credits'}
        icon={Activity}
        gradient={
          net >= 0
            ? 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(79,70,229,0.15) 100%)'
            : 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(217,119,6,0.12) 100%)'
        }
        iconBg={net >= 0 ? 'bg-indigo-500/30' : 'bg-amber-500/30'}
        valueColor={net >= 0 ? 'text-indigo-300' : 'text-amber-400'}
        delay="0.16s"
      />
      <Card
        label="Transactions"
        value={transactions.length}
        sub={uncategorized > 0 ? `${uncategorized} uncategorized` : '✓ All categorized'}
        icon={Layers}
        gradient="linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(109,40,217,0.12) 100%)"
        iconBg="bg-violet-500/30"
        valueColor="text-violet-300"
        delay="0.24s"
      />
    </div>
  )
}
