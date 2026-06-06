'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { 
  Sparkles, 
  TrendingDown, 
  ShieldAlert, 
  Calendar, 
  DollarSign, 
  ArrowRight,
  Plus
} from 'lucide-react';
import { 
  Button, 
  Card, 
  Badge, 
  Skeleton, 
  FadeIn,
  KpiCard
} from '@/components/ui';

interface AuditItem {
  id: string;
  status: string;
  totalSpend: number;
  potentialSavings: number;
  healthScore: number;
  healthGrade: string;
  createdAt: string;
  itemCount: number;
  toolCount: number;
}

interface TrendItem {
  id: string;
  healthScore: number;
  createdAt: string;
  totalSpend: number;
  potentialSavings: number;
}

interface RecentReportItem {
  id: string;
  title: string;
  createdAt: string;
  shareToken: string;
}

interface TeamActivityItem {
  id: string;
  createdAt: string;
  userName: string;
  name: string;
}

interface DashboardStats {
  metrics: {
    totalMonthlySpend: number;
    potentialSavings: number;
    healthScore: number;
    healthGrade: string;
    toolCount: number;
  };
  trends: TrendItem[];
  recentReports: RecentReportItem[];
  teamActivity: TeamActivityItem[];
}

export default function DashboardPage() {
  const { user, organization } = useAuth();
  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [auditsRes, statsRes] = await Promise.all([
          fetch('/api/audits'),
          fetch('/api/dashboard/stats')
        ]);
        if (auditsRes.ok) {
          const { data } = await auditsRes.json();
          setAudits(data || []);
        }
        if (statsRes.ok) {
          const { data } = await statsRes.json();
          setStats(data || null);
        }
      } catch (err) {
        setError('An unexpected error occurred while loading dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const latestAudit = audits[0];

  const totalMonthlySpend = stats ? stats.metrics.totalMonthlySpend : (latestAudit ? latestAudit.totalSpend : 0);
  const potentialSavings = stats ? stats.metrics.potentialSavings : (latestAudit ? latestAudit.potentialSavings : 0);
  const healthScore = stats ? stats.metrics.healthScore : (latestAudit ? latestAudit.healthScore : 100);
  const healthGrade = stats ? stats.metrics.healthGrade : (latestAudit ? latestAudit.healthGrade : 'A');
  const toolsAudited = stats ? stats.metrics.toolCount : (latestAudit ? latestAudit.toolCount : 0);

  const savingsPct = totalMonthlySpend > 0 ? (potentialSavings / totalMonthlySpend) * 100 : 0;

  return (
    <FadeIn className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.name || user?.email?.split('@')[0] || 'User'}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Analyze, monitor, and optimize AI subscriptions for <strong className="text-[var(--foreground)]">{organization?.name || 'your workspace'}</strong>
          </p>
        </div>
        <Link href="/audit">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Start New Audit
          </Button>
        </Link>
      </div>

      {/* KPI Stats */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <KpiCard
            label="Total Monthly Spend"
            value={`$${totalMonthlySpend.toLocaleString()}`}
            subtitle={`${toolsAudited} active AI tools`}
            icon={<DollarSign className="w-4 h-4" />}
          />
          <KpiCard
            label="Potential Monthly Savings"
            value={`$${potentialSavings.toLocaleString()}`}
            subtitle={`${savingsPct.toFixed(0)}% optimization ceiling`}
            icon={<TrendingDown className="w-4 h-4 text-emerald-500" />}
            variant={potentialSavings > 0 ? 'success' : 'default'}
          />
          <KpiCard
            label="Annual Run-rate Savings"
            value={`$${(potentialSavings * 12).toLocaleString()}`}
            subtitle="Projected annual savings"
            icon={<TrendingDown className="w-4 h-4 text-emerald-500" />}
            variant={potentialSavings > 0 ? 'success' : 'default'}
          />
          <KpiCard
            label="Spend Health Score"
            value={`${healthScore}/100`}
            subtitle={`Grade Grade: ${healthGrade}`}
            icon={<ShieldAlert className="w-4 h-4" />}
            variant={healthScore >= 80 ? 'success' : healthScore >= 60 ? 'warning' : 'destructive'}
          />
        </div>
      )}

      {/* Trends, Reports and Activity Grid */}
      {!loading && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Health Trends & Reports */}
          <div className="lg:col-span-2 space-y-6">
            {stats.trends && stats.trends.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[var(--primary)]" />
                  Health Score Trends
                </h3>
                <div className="flex items-end gap-3 h-32 pt-4">
                  {stats.trends.map((t: TrendItem) => (
                    <div key={t.id} className="flex-1 flex flex-col items-center gap-2 group relative">
                      <div className="w-full bg-[var(--muted)] rounded-t-lg h-24 flex items-end">
                        <div 
                          className={`w-full rounded-t-lg transition-all group-hover:opacity-90 ${
                            t.healthScore >= 80 ? 'bg-emerald-500' :
                            t.healthScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ height: `${t.healthScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold">{t.healthScore}</span>
                      <span className="text-[10px] text-[var(--muted-foreground)]">{t.createdAt.slice(5)}</span>
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 bg-[var(--foreground)] text-[var(--background)] text-xs rounded p-2 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap shadow-lg">
                        Spend: ${t.totalSpend.toLocaleString()}<br/>
                        Savings: ${t.potentialSavings.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {stats.recentReports && stats.recentReports.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4">Recent Reports</h3>
                <div className="divide-y divide-[var(--border)]">
                  {stats.recentReports.map((r: RecentReportItem) => (
                    <div key={r.id} className="py-3 flex items-center justify-between hover:bg-[var(--muted)]/20 px-2 rounded-lg transition-colors">
                      <div>
                        <p className="font-semibold text-sm">{r.title}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">Generated on {r.createdAt}</p>
                      </div>
                      <Link href={`/share/${r.shareToken}`}>
                        <Button variant="outline" size="sm">View Share Link</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Team Activity Feed */}
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">Team Activity</h3>
            {stats.teamActivity && stats.teamActivity.length > 0 ? (
              <div className="space-y-4">
                {stats.teamActivity.map((act: TeamActivityItem) => (
                  <div key={act.id} className="flex gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="font-medium text-xs">
                        <span className="text-[var(--foreground)] font-bold">{act.userName}</span>{' '}
                        {act.name === 'audit.completed' ? 'ran an AI spend audit' :
                         act.name === 'share.created' ? 'created a report share link' :
                         act.name === 'email.sent' ? 'sent team invitation email' :
                         act.name === 'report.generated' ? 'generated an audit report' :
                         `performed ${act.name.replace('_', ' ')}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-8">No recent team activities.</p>
            )}
          </Card>
        </div>
      )}

      {/* Past Audits Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Audit History</h2>
          <Badge variant="outline">{audits.length} Run(s)</Badge>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : audits.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] mx-auto mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No Audits Performed</h3>
            <p className="text-sm text-[var(--muted-foreground)] max-w-sm mx-auto mb-6">
              You haven&apos;t run any AI spend audits yet. Start your first audit to see cost-saving recommendations.
            </p>
            <Link href="/audit">
              <Button>
                <Plus className="w-4 h-4" /> Run First Audit
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs text-[var(--muted-foreground)] uppercase font-semibold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Monthly Spend</th>
                  <th className="py-3 px-4">Monthly Savings</th>
                  <th className="py-3 px-4">Health</th>
                  <th className="py-3 px-4">Tools Audited</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-sm">
                {audits.map((audit) => {
                  const date = new Date(audit.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  return (
                    <tr key={audit.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                      <td className="py-4 px-4 font-medium flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[var(--muted-foreground)]" />
                        {date}
                      </td>
                      <td className="py-4 px-4">
                        <Badge 
                          variant={
                            audit.status === 'COMPLETED' ? 'success' : 
                            audit.status === 'PROCESSING' ? 'warning' : 'destructive'
                          }
                        >
                          {audit.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 font-semibold">${audit.totalSpend.toLocaleString()}</td>
                      <td className="py-4 px-4 text-emerald-600 font-semibold">
                        {audit.potentialSavings > 0 ? `$${audit.potentialSavings.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-4 px-4 font-bold">
                        <span className={
                          audit.healthScore >= 80 ? 'text-emerald-600' :
                          audit.healthScore >= 60 ? 'text-amber-600' : 'text-red-600'
                        }>
                          {audit.healthScore} ({audit.healthGrade})
                        </span>
                      </td>
                      <td className="py-4 px-4 text-[var(--muted-foreground)]">
                        {audit.toolCount} tool(s) / {audit.itemCount} subscription(s)
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Link href={`/audit/results?auditId=${audit.id}`}>
                          <Button variant="ghost" size="sm" className="inline-flex items-center gap-1">
                            View Results
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </FadeIn>
  );
}
