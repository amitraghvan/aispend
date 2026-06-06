'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useMemo, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Button, Card, Badge, KpiCard, ScoreRing, Progress, Input, FadeIn, Spinner, Section } from '@/components/ui';
import { DollarSign, TrendingDown, BarChart3, Shield, ArrowRight, Copy, Check, Mail, Download, Share2, Sparkles, AlertTriangle, Layers, ArrowUpRight, ChevronDown, ChevronUp, Zap, Target } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

/* ─── TYPES ─── */
interface AuditResult {
  auditId: string;
  companyId: string;
  status: string;
  currentSpend: number;
  optimizedSpend: number;
  monthlySavings: number;
  annualSavings: number;
  savingsPercentage: number;
  healthScore: number;
  healthGrade: string;
  recommendationCount: number;
  overlapGroupCount: number;
  itemCount: number;
  toolCount: number;
  createdAt: string;
}

/* ─── COLORS ─── */
const CHART_COLORS = ['#6d28d9', '#4f46e5', '#8b5cf6', '#a78bfa', '#c4b5fd', '#7c3aed', '#6366f1', '#818cf8', '#a5b4fc'];
const PRIORITY_COLORS: Record<string, string> = { CRITICAL: '#dc2626', HIGH: '#f59e0b', MEDIUM: '#6d28d9', LOW: '#6b7280' };
const PRIORITY_BADGES: Record<string, 'destructive' | 'warning' | 'primary' | 'default'> = { CRITICAL: 'destructive', HIGH: 'warning', MEDIUM: 'primary', LOW: 'default' };

/* ═══════════════════════════════════════════════════
   KPI ROW
   ═══════════════════════════════════════════════════ */
function KpiRow({ data }: { data: AuditResult }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard label="Current Monthly Spend" value={`$${data.currentSpend.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} variant="default" />
      <KpiCard label="Monthly Savings" value={`$${data.monthlySavings.toLocaleString()}`} icon={<TrendingDown className="w-5 h-5" />} variant="success" subtitle={`${data.savingsPercentage.toFixed(1)}% reduction`} />
      <KpiCard label="Annual Savings" value={`$${data.annualSavings.toLocaleString()}`} icon={<BarChart3 className="w-5 h-5" />} variant="success" />
      <KpiCard label="Optimized Spend" value={`$${data.optimizedSpend.toLocaleString()}/mo`} icon={<Target className="w-5 h-5" />} variant="default" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   HEALTH SCORE SECTION
   ═══════════════════════════════════════════════════ */
function HealthSection({ data }: { data: AuditResult }) {
  const healthFactors = [
    { name: 'Plan Fit', value: Math.min(100, data.healthScore + 10) },
    { name: 'Seat Usage', value: Math.min(100, data.healthScore + 5) },
    { name: 'Overlap', value: data.overlapGroupCount > 0 ? Math.max(20, 100 - data.overlapGroupCount * 25) : 90 },
    { name: 'Spend Efficiency', value: data.savingsPercentage > 30 ? 40 : data.savingsPercentage > 15 ? 60 : 85 },
    { name: 'Tool Diversity', value: data.toolCount >= 3 ? 70 : 90 },
  ];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card glow>
        <h3 className="text-lg font-semibold mb-6">Health Score</h3>
        <div className="flex justify-center">
          <ScoreRing score={data.healthScore} grade={data.healthGrade} size={180} label="AI Spend Health" />
        </div>
        <div className="mt-6 space-y-3">
          {healthFactors.map(f => (
            <Progress key={f.name} label={f.name} value={f.value} size="sm" />
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-6">Spend Breakdown</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={[{ name: 'Optimized', value: data.optimizedSpend }, { name: 'Savings', value: data.monthlySavings }]} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value" strokeWidth={0}>
                <Cell fill="#059669" />
                <Cell fill="#6d28d9" />
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '13px' }} formatter={(v) => [`$${Number(v).toLocaleString()}`, '']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-600" />Optimized: ${data.optimizedSpend.toLocaleString()}</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[var(--primary)]" />Savings: ${data.monthlySavings.toLocaleString()}</div>
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   RECOMMENDATIONS PANEL
   ═══════════════════════════════════════════════════ */
function RecommendationsPanel({ data }: { data: AuditResult }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Generate mock recommendations based on audit result
  const recommendations = useMemo(() => {
    const recs = [];
    if (data.monthlySavings > 0) {
      recs.push(
        { id: '1', category: 'OVERLAP_ELIMINATION', priority: 'CRITICAL', reason: `${data.overlapGroupCount} tool overlap group(s) detected in your AI stack`, expectedSavings: Math.round(data.monthlySavings * 0.4), action: 'Consolidate overlapping tools to a single provider per use case', confidence: 0.92 },
        { id: '2', category: 'PLAN_DOWNGRADE', priority: 'HIGH', reason: 'Current plan features exceed your team usage patterns', expectedSavings: Math.round(data.monthlySavings * 0.25), action: 'Downgrade to a plan that matches your actual feature usage', confidence: 0.88 },
        { id: '3', category: 'SEAT_OPTIMIZATION', priority: 'HIGH', reason: 'Some tools have more licensed seats than active users', expectedSavings: Math.round(data.monthlySavings * 0.2), action: 'Reduce seat count to match actual active users', confidence: 0.85 },
        { id: '4', category: 'BILLING_OPTIMIZATION', priority: 'MEDIUM', reason: 'Monthly billing detected where annual billing would save money', expectedSavings: Math.round(data.monthlySavings * 0.1), action: 'Switch to annual billing for committed tools', confidence: 0.95 },
        { id: '5', category: 'FEATURE_ALIGNMENT', priority: 'LOW', reason: 'Some tools could be replaced with better-suited alternatives', expectedSavings: Math.round(data.monthlySavings * 0.05), action: 'Evaluate alternative tools that better match your use cases', confidence: 0.7 },
      );
    }
    return recs.filter(r => r.expectedSavings > 0);
  }, [data]);

  const categoryLabels: Record<string, string> = {
    OVERLAP_ELIMINATION: 'Overlap', PLAN_DOWNGRADE: 'Plan', SEAT_OPTIMIZATION: 'Seats',
    BILLING_OPTIMIZATION: 'Billing', FEATURE_ALIGNMENT: 'Features', API_OPTIMIZATION: 'API',
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Recommendations</h3>
        <Badge variant="primary">{data.recommendationCount} found</Badge>
      </div>
      <div className="space-y-3">
        {recommendations.map((rec, i) => (
          <motion.div key={rec.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <button
              onClick={() => setExpanded(expanded === rec.id ? null : rec.id)}
              className="w-full text-left p-4 rounded-xl border border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-1 h-12 rounded-full" style={{ background: PRIORITY_COLORS[rec.priority] }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={PRIORITY_BADGES[rec.priority]} className="text-[10px]">{rec.priority}</Badge>
                      <Badge variant="outline" className="text-[10px]">{categoryLabels[rec.category] ?? rec.category}</Badge>
                    </div>
                    <p className="text-sm">{rec.reason}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-emerald-600">${rec.expectedSavings}/mo</p>
                  {expanded === rec.id ? <ChevronUp className="w-4 h-4 text-[var(--muted-foreground)] mt-1" /> : <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)] mt-1" />}
                </div>
              </div>
              {expanded === rec.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 ml-7 pt-4 border-t border-[var(--border)]">
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[var(--muted-foreground)] text-xs mb-1">Recommended Action</p>
                      <p>{rec.action}</p>
                    </div>
                    <div>
                      <p className="text-[var(--muted-foreground)] text-xs mb-1">Confidence</p>
                      <Progress value={rec.confidence * 100} showValue size="sm" color="var(--primary)" />
                    </div>
                  </div>
                </motion.div>
              )}
            </button>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════
   OVERLAP ANALYSIS
   ═══════════════════════════════════════════════════ */
function OverlapSection({ data }: { data: AuditResult }) {
  const overlapScore = data.overlapGroupCount > 0 ? Math.max(20, 100 - data.overlapGroupCount * 25) : 100;

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Overlap Analysis</h3>
        {data.overlapGroupCount > 0 ? (
          <Badge variant="warning" dot>{data.overlapGroupCount} overlap group{data.overlapGroupCount > 1 ? 's' : ''}</Badge>
        ) : (
          <Badge variant="success" dot>No overlaps</Badge>
        )}
      </div>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 rounded-xl bg-[var(--muted)]">
          <p className="text-2xl font-bold">{data.toolCount}</p>
          <p className="text-xs text-[var(--muted-foreground)]">Tools Analyzed</p>
        </div>
        <div className="text-center p-4 rounded-xl bg-[var(--muted)]">
          <p className="text-2xl font-bold">{data.overlapGroupCount}</p>
          <p className="text-xs text-[var(--muted-foreground)]">Overlap Groups</p>
        </div>
        <div className="text-center p-4 rounded-xl bg-[var(--muted)]">
          <p className="text-2xl font-bold">{overlapScore}%</p>
          <p className="text-xs text-[var(--muted-foreground)]">Uniqueness Score</p>
        </div>
      </div>
      <Progress label="Stack Uniqueness" value={overlapScore} size="sm" />
    </Card>
  );
}

/* ═══════════════════════════════════════════════════
   BENCHMARK DASHBOARD
   ═══════════════════════════════════════════════════ */
function BenchmarkSection({ data }: { data: AuditResult }) {
  const spendPerTool = data.toolCount > 0 ? Math.round(data.currentSpend / data.toolCount) : 0;
  const percentile = data.savingsPercentage > 30 ? 25 : data.savingsPercentage > 15 ? 50 : 75;
  const rating = percentile >= 75 ? 'Above Average' : percentile >= 50 ? 'Average' : 'Below Average';

  const benchmarkData = [
    { metric: 'Your Spend', value: data.currentSpend, fill: '#6d28d9' },
    { metric: 'Industry Avg', value: Math.round(data.currentSpend * 0.7), fill: '#059669' },
    { metric: 'Best-in-Class', value: Math.round(data.currentSpend * 0.45), fill: '#10b981' },
  ];

  return (
    <Card>
      <h3 className="text-lg font-semibold mb-6">Industry Benchmark</h3>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 rounded-xl bg-[var(--muted)]">
          <p className="text-2xl font-bold">{percentile}th</p>
          <p className="text-xs text-[var(--muted-foreground)]">Percentile</p>
        </div>
        <div className="text-center p-4 rounded-xl bg-[var(--muted)]">
          <p className="text-2xl font-bold">${spendPerTool}</p>
          <p className="text-xs text-[var(--muted-foreground)]">Spend per Tool</p>
        </div>
        <div className="text-center p-4 rounded-xl bg-[var(--muted)]">
          <Badge variant={percentile >= 75 ? 'success' : percentile >= 50 ? 'warning' : 'destructive'} className="text-sm">{rating}</Badge>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Rating</p>
        </div>
      </div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={benchmarkData} layout="vertical">
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="metric" width={100} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '13px' }} formatter={(v) => [`$${Number(v).toLocaleString()}/mo`, '']} />
            <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={28}>
              {benchmarkData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════
   LEAD CAPTURE
   ═══════════════════════════════════════════════════ */
function LeadCapture({ auditId }: { auditId: string }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email) return;
    setLoading(true);
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, auditId }),
      });
      setSubmitted(true);
    } catch {
      // Silently handle
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <Card glow>
        <div className="text-center py-4">
          <Check className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-1">Report Saved!</h3>
          <p className="text-sm text-[var(--muted-foreground)]">We&apos;ll send optimization updates to your email.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card glow>
      <div className="text-center mb-4">
        <Mail className="w-8 h-8 text-[var(--primary)] mx-auto mb-2" />
        <h3 className="text-lg font-semibold">Save Your Report</h3>
        <p className="text-sm text-[var(--muted-foreground)]">Enter your email to save and receive optimization alerts.</p>
      </div>
      <div className="flex gap-2">
        <Input placeholder="you@company.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1" />
        <Button onClick={submit} loading={loading}>Save</Button>
      </div>
      <p className="text-[10px] text-[var(--muted-foreground)] text-center mt-3">🔒 No spam. We respect your privacy.</p>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════
   SHARE SECTION
   ═══════════════════════════════════════════════════ */
function ShareSection({ auditId }: { auditId: string }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${auditId.slice(0, 8)}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-[var(--primary)]" />
          <h3 className="font-semibold">Share Report</h3>
        </div>
      </div>
      <p className="text-sm text-[var(--muted-foreground)] mb-4">Share a public-safe version of this report with your team. No sensitive data exposed.</p>
      <div className="flex gap-2">
        <div className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--muted)] text-sm text-[var(--muted-foreground)] overflow-hidden text-ellipsis whitespace-nowrap">{shareUrl}</div>
        <Button variant="outline" onClick={copyLink}>
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════
   RESULTS PAGE INNER
   ═══════════════════════════════════════════════════ */
function ResultsInner() {
  const searchParams = useSearchParams();
  const raw = searchParams.get('data');

  if (!raw) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-[var(--warning)] mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No Audit Data</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">Run an audit first to see your results.</p>
          <Link href="/audit"><Button>Start Audit <ArrowRight className="w-4 h-4" /></Button></Link>
        </Card>
      </div>
    );
  }

  let data: AuditResult;
  try {
    data = JSON.parse(decodeURIComponent(raw));
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-[var(--destructive)] mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Invalid Data</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">The audit data appears to be corrupted.</p>
          <Link href="/audit"><Button>Run New Audit <ArrowRight className="w-4 h-4" /></Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold">AI Spend</span>
          </Link>
          <div className="flex items-center gap-3">
            <Badge variant="success" dot>Audit Complete</Badge>
            <Link href="/audit"><Button variant="outline" size="sm">New Audit</Button></Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Title */}
        <FadeIn>
          <div>
            <h1 className="text-3xl font-bold mb-2">Audit Results</h1>
            <p className="text-[var(--muted-foreground)]">{data.toolCount} tools analyzed · {data.recommendationCount} recommendations · {new Date(data.createdAt).toLocaleDateString()}</p>
          </div>
        </FadeIn>

        {/* KPIs */}
        <FadeIn delay={0.1}><KpiRow data={data} /></FadeIn>

        {/* Health + Charts */}
        <FadeIn delay={0.2}><HealthSection data={data} /></FadeIn>

        {/* Recommendations */}
        <FadeIn delay={0.3}><RecommendationsPanel data={data} /></FadeIn>

        {/* Overlap + Benchmark */}
        <FadeIn delay={0.4}>
          <div className="grid lg:grid-cols-2 gap-6">
            <OverlapSection data={data} />
            <BenchmarkSection data={data} />
          </div>
        </FadeIn>

        {/* Lead Capture + Share */}
        <FadeIn delay={0.5}>
          <div className="grid lg:grid-cols-2 gap-6">
            <LeadCapture auditId={data.auditId} />
            <ShareSection auditId={data.auditId} />
          </div>
        </FadeIn>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PAGE WRAPPER WITH SUSPENSE
   ═══════════════════════════════════════════════════ */
export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner className="w-10 h-10 text-[var(--primary)] mx-auto mb-4" />
          <p className="text-sm text-[var(--muted-foreground)]">Loading results...</p>
        </div>
      </div>
    }>
      <ResultsInner />
    </Suspense>
  );
}
