'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useMemo, Suspense, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { motion } from 'framer-motion';
import { Button, Card, Badge, KpiCard, ScoreRing, Progress, Input, FadeIn, Spinner } from '@/components/ui';
import { 
  DollarSign, 
  TrendingDown, 
  BarChart3, 
  ArrowRight, 
  Copy, 
  Check, 
  Mail, 
  Share2, 
  Sparkles, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Target,
  Shield,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import CopilotDrawer from '@/components/CopilotDrawer';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

/* ─── TYPES ─── */
interface RecommendationItem {
  id: string;
  ruleId: string;
  ruleName: string;
  category: string;
  priority: string;
  reason: string;
  currentState: string | null;
  recommendedAction: string | null;
  estimatedMonthlySavings: number;
  confidenceScore: number;
}

interface AuditResult {
  auditId: string;
  organizationId?: string | null;
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
  recommendations?: RecommendationItem[];
}

interface MappedRecommendation {
  id: string;
  ruleName: string;
  category: string;
  priority: string;
  reason: string;
  action: string;
  expectedSavings: number;
  confidence: number;
  currentState: string;
}

interface AIRecommendationExplainer {
  whyItExists: string;
  expectedOutcome: string;
  risk: string;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  businessImpact: string;
}

interface AIOpportunity {
  title: string;
  description: string;
  impact: string;
  priority: string;
  complexity: string;
  confidence: number;
}

interface AIInsights {
  executiveSummary: {
    summary: string;
    keyFindings: string[];
    topOpportunity: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  opportunities: AIOpportunity[];
  healthScoreExplanation: {
    narrative: string;
    strengths: string[];
    weaknesses: string[];
    biggestFactors: string[];
    improvementActions: string[];
  };
  benchmarkNarrative: {
    positionNarrative: string;
    percentileAnalysis: string;
    industryComparison: string;
    optimizationPotential: string;
  };
}

const PRIORITY_COLORS: Record<string, string> = { CRITICAL: '#dc2626', HIGH: '#f59e0b', MEDIUM: '#6d28d9', LOW: '#6b7280' };
const PRIORITY_BADGES: Record<string, 'destructive' | 'warning' | 'primary' | 'default'> = { CRITICAL: 'destructive', HIGH: 'warning', MEDIUM: 'primary', LOW: 'default' };

const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

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
   RECOMMENDATIONS PANEL (WITH DYNAMIC AI EXPLAINER)
   ═══════════════════════════════════════════════════ */
function RecommendationsPanel({ data }: { data: AuditResult }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Explainers states
  const [explainers, setExplainers] = useState<Record<string, AIRecommendationExplainer>>({});
  const [explainerLoading, setExplainerLoading] = useState<Record<string, boolean>>({});
  const [explainerError, setExplainerError] = useState<Record<string, string | null>>({});

  // Generate recommendations based on audit result
  const recommendations = useMemo(() => {
    if (data.recommendations && data.recommendations.length > 0) {
      return data.recommendations.map(r => ({
        id: r.id,
        ruleName: r.ruleName,
        category: r.category,
        priority: r.priority,
        reason: r.reason,
        action: r.recommendedAction || 'Consolidate overlapping tools to a single provider per use case',
        expectedSavings: Math.round(r.estimatedMonthlySavings),
        confidence: r.confidenceScore || 0.9,
        currentState: r.currentState || '',
      }));
    }

    const recs = [];
    if (data.monthlySavings > 0) {
      recs.push(
        { id: 'mock-1', ruleName: 'Tool Overlap', category: 'OVERLAP_ELIMINATION', priority: 'CRITICAL', reason: `${data.overlapGroupCount} tool overlap group(s) detected in your AI stack`, expectedSavings: Math.round(data.monthlySavings * 0.4), action: 'Consolidate overlapping tools to a single provider per use case', confidence: 0.92, currentState: 'Multiple redundant coding/writing tools' },
        { id: 'mock-2', ruleName: 'Plan Fit Optimization', category: 'PLAN_DOWNGRADE', priority: 'HIGH', reason: 'Current plan features exceed your team usage patterns', expectedSavings: Math.round(data.monthlySavings * 0.25), action: 'Downgrade to a plan that matches your actual feature usage', confidence: 0.88, currentState: 'Over-provisioned feature tiers' },
        { id: 'mock-3', ruleName: 'License Right-Sizing', category: 'SEAT_OPTIMIZATION', priority: 'HIGH', reason: 'Some tools have more licensed seats than active users', expectedSavings: Math.round(data.monthlySavings * 0.2), action: 'Reduce seat count to match actual active users', confidence: 0.85, currentState: 'Unused software seat licenses' },
        { id: 'mock-4', ruleName: 'Annual Commitment Strategy', category: 'BILLING_OPTIMIZATION', priority: 'MEDIUM', reason: 'Monthly billing detected where annual billing would save money', expectedSavings: Math.round(data.monthlySavings * 0.1), action: 'Switch to annual billing for committed tools', confidence: 0.95, currentState: 'Monthly vendor pricing' },
        { id: 'mock-5', ruleName: 'Feature Alignment', category: 'FEATURE_ALIGNMENT', priority: 'LOW', reason: 'Some tools could be replaced with better-suited alternatives', expectedSavings: Math.round(data.monthlySavings * 0.05), action: 'Evaluate alternative tools that better match your use cases', confidence: 0.7, currentState: 'Legacy tool catalog mismatch' },
      );
    }
    return recs.filter(r => r.expectedSavings > 0);
  }, [data]);

  const fetchExplanation = async (rec: MappedRecommendation) => {
    setExplainerLoading(prev => ({ ...prev, [rec.id]: true }));
    setExplainerError(prev => ({ ...prev, [rec.id]: null }));
    try {
      const body: { recommendationId?: string; data?: Record<string, unknown> } = {};
      if (rec.id && !rec.id.startsWith('mock-') && isUuid(rec.id)) {
        body.recommendationId = rec.id;
      } else {
        body.data = {
          ruleName: rec.ruleName,
          category: rec.category,
          priority: rec.priority,
          reason: rec.reason,
          currentState: rec.currentState || '',
          recommendedAction: rec.action,
          estimatedMonthlySavings: rec.expectedSavings,
        };
      }

      const res = await fetch('/api/ai/explain-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const json = await res.json();
        setExplainers(prev => ({ ...prev, [rec.id]: json.data }));
      } else {
        setExplainerError(prev => ({ ...prev, [rec.id]: 'Failed to generate explanation' }));
      }
    } catch {
      setExplainerError(prev => ({ ...prev, [rec.id]: 'Failed to generate explanation' }));
    } finally {
      setExplainerLoading(prev => ({ ...prev, [rec.id]: false }));
    }
  };

  useEffect(() => {
    if (expanded) {
      const rec = recommendations.find(r => r.id === expanded);
      if (rec && !explainers[expanded] && !explainerLoading[expanded]) {
        Promise.resolve().then(() => {
          fetchExplanation(rec);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const categoryLabels: Record<string, string> = {
    OVERLAP_ELIMINATION: 'Overlap', PLAN_DOWNGRADE: 'Plan', SEAT_OPTIMIZATION: 'Seats',
    BILLING_OPTIMIZATION: 'Billing', FEATURE_ALIGNMENT: 'Features', API_OPTIMIZATION: 'API',
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Recommendations</h3>
        <Badge variant="primary">{recommendations.length} found</Badge>
      </div>
      <div className="space-y-3">
        {recommendations.map((rec, i) => (
          <motion.div key={rec.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <div className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/20 transition-colors">
              <button
                onClick={() => setExpanded(expanded === rec.id ? null : rec.id)}
                className="w-full text-left p-4 flex items-start justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-1 h-12 rounded-full" style={{ background: PRIORITY_COLORS[rec.priority] }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={PRIORITY_BADGES[rec.priority]} className="text-[10px]">{rec.priority}</Badge>
                      <Badge variant="outline" className="text-[10px]">{categoryLabels[rec.category] ?? rec.category}</Badge>
                    </div>
                    <p className="text-sm font-medium">{rec.reason}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-emerald-600">${rec.expectedSavings}/mo</p>
                  {expanded === rec.id ? <ChevronUp className="w-4 h-4 text-[var(--muted-foreground)] mt-1" /> : <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)] mt-1" />}
                </div>
              </button>
              {expanded === rec.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="px-4 pb-4 border-t border-[var(--border)]/50 pt-4 ml-4 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[var(--muted-foreground)] text-xs mb-1">Recommended Action</p>
                      <p className="font-semibold text-xs">{rec.action}</p>
                    </div>
                    <div>
                      <p className="text-[var(--muted-foreground)] text-xs mb-1">Confidence</p>
                      <Progress value={rec.confidence * 100} showValue size="sm" color="var(--primary)" />
                    </div>
                  </div>

                  {/* AI Recommendation Explainer Box */}
                  <div className="p-3.5 bg-purple-500/5 rounded-lg border border-purple-500/10 text-xs space-y-2">
                    <p className="font-bold flex items-center gap-1.5 text-purple-600 text-xs uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                      AI Explainer Details
                    </p>
                    {explainerLoading[rec.id] && (
                      <div className="flex items-center gap-2 text-[var(--muted-foreground)] py-1">
                        <span className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        <span>CFO is explaining recommendation...</span>
                      </div>
                    )}
                    {explainerError[rec.id] && (
                      <div className="text-red-500 flex items-center justify-between py-1">
                        <span>{explainerError[rec.id]}</span>
                        <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => fetchExplanation(rec)}>Retry</Button>
                      </div>
                    )}
                    {explainers[rec.id] && (
                      <div className="space-y-2 text-xs leading-relaxed text-[var(--foreground)]">
                        <div>
                          <strong className="text-[10px] text-[var(--muted-foreground)] uppercase block">Why it exists:</strong>
                          <p>{explainers[rec.id].whyItExists}</p>
                        </div>
                        <div>
                          <strong className="text-[10px] text-[var(--muted-foreground)] uppercase block">Business Impact:</strong>
                          <p>{explainers[rec.id].businessImpact}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-1">
                          <div>
                            <strong className="text-[10px] text-[var(--muted-foreground)] uppercase block mb-1">Complexity:</strong>
                            <Badge variant={explainers[rec.id].complexity === 'LOW' ? 'success' : explainers[rec.id].complexity === 'MEDIUM' ? 'warning' : 'destructive'} className="text-[8px] px-1 py-0.5">
                              {explainers[rec.id].complexity}
                            </Badge>
                          </div>
                          <div>
                            <strong className="text-[10px] text-[var(--muted-foreground)] uppercase block">Outcome Risk:</strong>
                            <p className="font-semibold text-xs">{explainers[rec.id].risk}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
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
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      Promise.resolve().then(() => {
        setShareUrl(`${window.location.origin}/share/${auditId.slice(0, 8)}`);
      });
    }
  }, [auditId]);

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
  const router = useRouter();
  const { user, organization, loading: authLoading } = useAuth();
  const raw = searchParams.get('data');
  const auditIdParam = searchParams.get('auditId');
  const [showCopilot, setShowCopilot] = useState(false);

  const [data, setData] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // AI Insights States
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const loadAiInsights = async (force: boolean = false) => {
    if (!data) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const body: { auditId?: string; auditData?: Record<string, unknown>; bypassCache?: boolean } = {};
      if (data.auditId && !data.auditId.startsWith('mock-')) {
        body.auditId = data.auditId;
      } else {
        body.auditData = {
          totalSpend: data.currentSpend,
          optimizedSpend: data.optimizedSpend,
          potentialSavings: data.monthlySavings,
          savingsPercentage: data.savingsPercentage,
          healthScore: data.healthScore,
          healthGrade: data.healthGrade,
          toolCount: data.toolCount,
          itemCount: data.itemCount,
          recommendations: (data.recommendations || []).map(r => ({
            ruleName: r.ruleName,
            category: r.category,
            priority: r.priority,
            reason: r.reason,
            currentState: r.currentState || '',
            recommendedAction: r.recommendedAction || '',
            estimatedMonthlySavings: r.estimatedMonthlySavings,
          })),
        };
      }

      if (force) {
        body.bypassCache = true;
      }

      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const json = await res.json();
        setAiInsights(json.data);
      } else {
        setAiError('Failed to load AI insights. Click below to retry.');
      }
    } catch {
      setAiError('An error occurred while generating AI insights.');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    async function loadAudit() {
      setLoading(true);
      setError(null);
      try {
        if (raw) {
          const parsed = JSON.parse(decodeURIComponent(raw));
          setData(parsed);
          setLoading(false);
        } else if (auditIdParam) {
          const res = await fetch(`/api/audits/${auditIdParam}`);
          if (res.ok) {
            const json = await res.json();
            const audit = json.data;
            if (audit) {
              setData({
                auditId: audit.id,
                organizationId: audit.organizationId,
                status: audit.status,
                currentSpend: Number(audit.totalSpend),
                optimizedSpend: audit.optimizedSpend ? Number(audit.optimizedSpend) : Number(audit.totalSpend),
                monthlySavings: Number(audit.potentialSavings),
                annualSavings: Number(audit.potentialSavings) * 12,
                savingsPercentage: audit.savingsPercentage ? Number(audit.savingsPercentage) : 0,
                healthScore: audit.healthScore ?? 100,
                healthGrade: audit.healthGrade || 'A',
                recommendationCount: audit.recommendations ? audit.recommendations.length : 0,
                overlapGroupCount: audit.recommendations ? audit.recommendations.filter((r: { category: string }) => r.category === 'OVERLAP_ELIMINATION').length : 0,
                itemCount: audit.itemCount,
                toolCount: audit.toolCount,
                createdAt: audit.createdAt || new Date().toISOString(),
                recommendations: audit.recommendations,
              });
            } else {
              setError('Failed to resolve audit data');
            }
          } else {
            setError(`Failed to fetch audit: ${res.statusText}`);
          }
          setLoading(false);
        } else {
          setError('No audit data provided');
          setLoading(false);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        setLoading(false);
      }
    }
    loadAudit();
  }, [raw, auditIdParam]);

  useEffect(() => {
    if (data) {
      Promise.resolve().then(() => {
        loadAiInsights();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <span className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin inline-block mb-4" />
          <p className="text-sm text-[var(--muted-foreground)]">Loading results...</p>
        </div>
      </div>
    );
  }

  // Ownership Validation: Ensure audit organization matches session organization
  if (data && organization && data.organizationId && data.organizationId !== organization.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <Card className="text-center max-w-md p-6">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">You do not have access to view this audit report.</p>
          <Link href="/dashboard"><Button>Go to Dashboard</Button></Link>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <Card className="text-center max-w-md p-6">
          <AlertTriangle className="w-10 h-10 text-[var(--warning)] mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No Audit Data</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">{error || 'Run an audit first to see your results.'}</p>
          <Link href="/audit"><Button>Start Audit <ArrowRight className="w-4 h-4" /></Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-16">
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

        {/* AI CFO EXECUTIVE INSIGHTS */}
        <FadeIn delay={0.05}>
          <Card className="p-6 border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 glow">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border)]">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" />
                AI CFO Executive Insights
              </h2>
              <Badge variant="primary" className="bg-purple-600 text-white font-semibold">Groq Llama 3.3</Badge>
            </div>

            {aiLoading && (
              <div className="py-8 text-center space-y-3">
                <span className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin inline-block" />
                <p className="text-sm text-[var(--muted-foreground)]">Analyzing stack metrics, overlaps, and industry benchmarks...</p>
              </div>
            )}

            {aiError && (
              <div className="py-6 text-center space-y-3 bg-red-500/5 rounded-xl border border-red-500/20">
                <p className="text-sm text-red-600 font-medium">{aiError}</p>
                <Button onClick={() => loadAiInsights(true)} variant="outline" size="sm">Retry AI CFO Analysis</Button>
              </div>
            )}

            {!aiLoading && !aiError && aiInsights && (
              <div className="space-y-6">
                {/* Executive Summary */}
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Executive Summary</h3>
                    <p className="text-sm leading-relaxed text-[var(--foreground)]">{aiInsights.executiveSummary.summary}</p>
                    <div className="pt-2">
                      <h4 className="text-xs font-bold text-[var(--muted-foreground)] mb-2 uppercase">Key Findings:</h4>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-[var(--muted-foreground)]">
                        {aiInsights.executiveSummary.keyFindings.map((finding: string, i: number) => (
                          <li key={i}>{finding}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="space-y-4 p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block mb-1">Stack Risk Assessment</span>
                      <Badge 
                        variant={
                          aiInsights.executiveSummary.riskLevel === 'CRITICAL' ? 'destructive' : 
                          aiInsights.executiveSummary.riskLevel === 'HIGH' ? 'warning' : 
                          aiInsights.executiveSummary.riskLevel === 'MEDIUM' ? 'primary' : 'default'
                        }
                      >
                        {aiInsights.executiveSummary.riskLevel} RISK
                      </Badge>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block mb-1">Top Opportunity</span>
                      <p className="text-xs font-semibold leading-snug">{aiInsights.executiveSummary.topOpportunity}</p>
                    </div>
                  </div>
                </div>

                <hr className="border-[var(--border)]" />

                {/* Benchmark Narrative & Health Explanation */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">Health Score Explanation</h3>
                    <p className="text-xs leading-relaxed text-[var(--muted-foreground)] mb-3">{aiInsights.healthScoreExplanation.narrative}</p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="font-bold text-emerald-600 block mb-1">Strengths:</span>
                        <ul className="list-disc pl-4 space-y-1 text-[11px] text-[var(--muted-foreground)]">
                          {aiInsights.healthScoreExplanation.strengths.slice(0, 2).map((s: string, i: number) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                      <div>
                        <span className="font-bold text-amber-600 block mb-1">Weaknesses:</span>
                        <ul className="list-disc pl-4 space-y-1 text-[11px] text-[var(--muted-foreground)]">
                          {aiInsights.healthScoreExplanation.weaknesses.slice(0, 2).map((w: string, i: number) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">Industry Comparison Narrative</h3>
                    <p className="text-xs leading-relaxed text-[var(--muted-foreground)] mb-3">{aiInsights.benchmarkNarrative.positionNarrative}</p>
                    <div className="space-y-2 text-xs text-[var(--muted-foreground)]">
                      <p><strong>Percentile context:</strong> {aiInsights.benchmarkNarrative.percentileAnalysis}</p>
                      <p><strong>Industry comparison:</strong> {aiInsights.benchmarkNarrative.industryComparison}</p>
                      <p><strong>Optimization headroom:</strong> {aiInsights.benchmarkNarrative.optimizationPotential}</p>
                    </div>
                  </div>
                </div>

                <hr className="border-[var(--border)]" />

                {/* Top Opportunities */}
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-4">Top Opportunities</h3>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {aiInsights.opportunities.map((opp: AIOpportunity, i: number) => (
                      <div key={i} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-xs leading-snug">{opp.title}</h4>
                          <Badge variant={opp.priority === 'CRITICAL' ? 'destructive' : opp.priority === 'HIGH' ? 'warning' : 'primary'} className="text-[8px] uppercase px-1.5 py-0.5">
                            {opp.priority}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">{opp.description}</p>
                        <div className="pt-2 border-t border-[var(--border)] text-[10px] space-y-1 text-[var(--muted-foreground)]">
                          <p><strong>Impact:</strong> {opp.impact}</p>
                          <p><strong>Complexity:</strong> {opp.complexity}</p>
                          <p><strong>Confidence:</strong> {Math.round(opp.confidence * 100)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
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

      {/* Floating Copilot Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setShowCopilot(true)}
          className="flex items-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-2xl hover:scale-105 transition-all duration-300 font-semibold text-xs tracking-wide cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          <MessageSquare className="w-4 h-4" />
          Ask Copilot
        </button>
      </div>

      {/* Copilot Drawer */}
      <CopilotDrawer
        isOpen={showCopilot}
        onClose={() => setShowCopilot(false)}
        auditId={data.auditId}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PAGE WRAPPER WITH SUSPENSE
   ═══════════════════════════════════════════════════ */
export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <span className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin inline-block mb-4" />
          <p className="text-sm text-[var(--muted-foreground)]">Loading results...</p>
        </div>
      </div>
    }>
      <ResultsInner />
    </Suspense>
  );
}
