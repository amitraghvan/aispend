'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card, Input, Select, StepIndicator, Badge, Spinner, FadeIn } from '@/components/ui';
import { ArrowLeft, ArrowRight, Plus, X, Sparkles, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/* ─── TYPES ─── */
interface ToolEntry {
  id: string;
  toolId: string;
  toolName: string;
  planName: string;
  monthlySpend: number;
  seatCount: number;
  teamSize: number;
  useCase: string;
}

interface AuditFormData {
  companyName: string;
  companySize: string;
  developerCount: number;
  tools: ToolEntry[];
}

const STEPS = ['Company', 'Tools', 'Details', 'Review', 'Audit'];

const TOOL_OPTIONS = [
  { value: 'cursor', label: 'Cursor', plans: ['Free', 'Pro', 'Business'] },
  { value: 'github-copilot', label: 'GitHub Copilot', plans: ['Free', 'Pro', 'Business', 'Enterprise'] },
  { value: 'chatgpt', label: 'ChatGPT', plans: ['Free', 'Plus', 'Pro', 'Team', 'Enterprise'] },
  { value: 'claude', label: 'Claude', plans: ['Free', 'Pro', 'Team', 'Enterprise'] },
  { value: 'gemini', label: 'Gemini', plans: ['Free', 'Advanced', 'Business', 'Enterprise'] },
  { value: 'windsurf', label: 'Windsurf', plans: ['Free', 'Pro', 'Team', 'Enterprise'] },
  { value: 'openai-api', label: 'OpenAI API', plans: ['Pay-as-you-go', 'Scale', 'Enterprise'] },
  { value: 'anthropic-api', label: 'Anthropic API', plans: ['Pay-as-you-go', 'Scale', 'Enterprise'] },
  { value: 'v0', label: 'v0', plans: ['Free', 'Premium'] },
];

const USE_CASE_OPTIONS = [
  { value: 'coding', label: 'Coding' },
  { value: 'writing', label: 'Writing / Content' },
  { value: 'research', label: 'Research / Analysis' },
  { value: 'data', label: 'Data Processing' },
  { value: 'mixed', label: 'Mixed / General' },
];

const COMPANY_SIZE_OPTIONS = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '501+', label: '501+ employees' },
];

function newTool(): ToolEntry {
  return { id: crypto.randomUUID(), toolId: '', toolName: '', planName: '', monthlySpend: 0, seatCount: 1, teamSize: 1, useCase: 'coding' };
}

/* ═══════════════════════════════════════════════════
   STEP COMPONENTS
   ═══════════════════════════════════════════════════ */

function Step1Company({ data, onChange }: { data: AuditFormData; onChange: (d: Partial<AuditFormData>) => void }) {
  return (
    <FadeIn>
      <div className="space-y-6 max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">About Your Company</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Help us benchmark your spend against similar companies.</p>
        </div>
        <Input label="Company Name" placeholder="Acme Corp" value={data.companyName} onChange={(e) => onChange({ companyName: e.target.value })} />
        <Select label="Company Size" options={[{ value: '', label: 'Select size...' }, ...COMPANY_SIZE_OPTIONS]} value={data.companySize} onChange={(e) => onChange({ companySize: e.target.value })} />
        <Input label="Developer Count" type="number" placeholder="10" min={1} value={data.developerCount || ''} onChange={(e) => onChange({ developerCount: parseInt(e.target.value) || 0 })} />
      </div>
    </FadeIn>
  );
}

function Step2Tools({ data, onChange }: { data: AuditFormData; onChange: (d: Partial<AuditFormData>) => void }) {
  const addTool = (toolId: string) => {
    const option = TOOL_OPTIONS.find(t => t.value === toolId);
    if (!option || data.tools.some(t => t.toolId === toolId)) return;
    const tool = newTool();
    tool.toolId = toolId;
    tool.toolName = option.label;
    onChange({ tools: [...data.tools, tool] });
  };

  const removeTool = (id: string) => {
    onChange({ tools: data.tools.filter(t => t.id !== id) });
  };

  const available = TOOL_OPTIONS.filter(o => !data.tools.some(t => t.toolId === o.value));

  return (
    <FadeIn>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Select Your AI Tools</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Which AI tools does your team use?</p>
        </div>

        {/* Tool grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {TOOL_OPTIONS.map(tool => {
            const selected = data.tools.some(t => t.toolId === tool.value);
            return (
              <button
                key={tool.value}
                onClick={() => selected ? removeTool(data.tools.find(t => t.toolId === tool.value)!.id) : addTool(tool.value)}
                className={`p-4 rounded-xl border text-sm font-medium transition-all duration-200 text-left ${
                  selected
                    ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]'
                    : 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--primary)]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{tool.label}</span>
                  {selected ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4 text-[var(--muted-foreground)]" />}
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-center text-[var(--muted-foreground)]">{data.tools.length} tool{data.tools.length !== 1 ? 's' : ''} selected</p>
      </div>
    </FadeIn>
  );
}

function Step3Details({ data, onChange }: { data: AuditFormData; onChange: (d: Partial<AuditFormData>) => void }) {
  const updateTool = (id: string, field: keyof ToolEntry, value: string | number) => {
    onChange({
      tools: data.tools.map(t => t.id === id ? { ...t, [field]: value } : t),
    });
  };

  return (
    <FadeIn>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Subscription Details</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Tell us about each tool&apos;s plan, seats, and spend.</p>
        </div>

        <div className="space-y-4">
          {data.tools.map(tool => {
            const toolOption = TOOL_OPTIONS.find(t => t.value === tool.toolId);
            return (
              <Card key={tool.id} className="relative">
                <button onClick={() => onChange({ tools: data.tools.filter(t => t.id !== tool.id) })} className="absolute top-4 right-4 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                  <X className="w-4 h-4" />
                </button>
                <h3 className="font-semibold mb-4">{tool.toolName}</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Select label="Plan" options={[{ value: '', label: 'Select plan...' }, ...(toolOption?.plans.map(p => ({ value: p, label: p })) ?? [])]} value={tool.planName} onChange={(e) => updateTool(tool.id, 'planName', e.target.value)} />
                  <Input label="Monthly Spend ($)" type="number" min={0} placeholder="20" value={tool.monthlySpend || ''} onChange={(e) => updateTool(tool.id, 'monthlySpend', parseFloat(e.target.value) || 0)} />
                  <Input label="Seats" type="number" min={1} placeholder="1" value={tool.seatCount} onChange={(e) => updateTool(tool.id, 'seatCount', parseInt(e.target.value) || 1)} />
                  <Input label="Team Size Using It" type="number" min={1} placeholder="1" value={tool.teamSize} onChange={(e) => updateTool(tool.id, 'teamSize', parseInt(e.target.value) || 1)} />
                  <Select label="Primary Use Case" options={USE_CASE_OPTIONS} value={tool.useCase} onChange={(e) => updateTool(tool.id, 'useCase', e.target.value)} />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </FadeIn>
  );
}

function Step4Review({ data }: { data: AuditFormData }) {
  const totalSpend = data.tools.reduce((s, t) => s + t.monthlySpend, 0);
  return (
    <FadeIn>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Review Your Audit</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Confirm everything looks correct before we run the analysis.</p>
        </div>

        <Card className="mb-6">
          <h3 className="font-semibold mb-3">Company</h3>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div><span className="text-[var(--muted-foreground)]">Name</span><p className="font-medium">{data.companyName || '—'}</p></div>
            <div><span className="text-[var(--muted-foreground)]">Size</span><p className="font-medium">{data.companySize || '—'}</p></div>
            <div><span className="text-[var(--muted-foreground)]">Developers</span><p className="font-medium">{data.developerCount || '—'}</p></div>
          </div>
        </Card>

        <Card className="mb-6">
          <h3 className="font-semibold mb-3">Subscriptions ({data.tools.length} tools)</h3>
          <div className="space-y-3">
            {data.tools.map(tool => (
              <div key={tool.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <div>
                  <p className="text-sm font-medium">{tool.toolName}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{tool.planName} · {tool.seatCount} seat{tool.seatCount > 1 ? 's' : ''} · {tool.useCase}</p>
                </div>
                <p className="text-sm font-bold">${tool.monthlySpend}/mo</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-[var(--border)]">
            <span className="font-semibold">Total Monthly Spend</span>
            <span className="text-xl font-bold">${totalSpend.toLocaleString()}/mo</span>
          </div>
        </Card>
      </div>
    </FadeIn>
  );
}

function Step5Running() {
  return (
    <FadeIn>
      <div className="max-w-md mx-auto text-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 mx-auto mb-8"
        >
          <Sparkles className="w-16 h-16 text-[var(--primary)]" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-4">Analyzing Your AI Spend</h2>
        <p className="text-[var(--muted-foreground)] mb-8">Running 55+ optimization rules, overlap detection, and industry benchmarking...</p>
        <div className="space-y-3">
          {['Validating subscriptions', 'Checking plan optimization', 'Detecting tool overlap', 'Calculating health score', 'Running industry benchmarks', 'Generating recommendations'].map((step, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.5 }}
              className="flex items-center gap-3 text-sm"
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.5 + 0.3 }}>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </motion.div>
              <span>{step}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </FadeIn>
  );
}

/* ═══════════════════════════════════════════════════
   AUDIT PAGE
   ═══════════════════════════════════════════════════ */
export default function AuditPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<AuditFormData>({
    companyName: '',
    companySize: '',
    developerCount: 0,
    tools: [],
  });

  const onChange = useCallback((partial: Partial<AuditFormData>) => {
    setData(prev => ({ ...prev, ...partial }));
  }, []);

  const canNext = () => {
    if (step === 0) return data.companyName.length > 0;
    if (step === 1) return data.tools.length > 0;
    if (step === 2) return data.tools.every(t => t.planName && t.monthlySpend > 0);
    return true;
  };

  const runAudit = async () => {
    setIsRunning(true);
    setStep(4);
    setError('');

    try {
      const companyId = crypto.randomUUID();
      const sizeMap: Record<string, number> = { '1-10': 5, '11-50': 30, '51-200': 100, '201-500': 300, '501+': 750 };

      const response = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          items: data.tools.map(t => ({
            toolId: t.toolId,
            toolName: t.toolName,
            planName: t.planName,
            monthlySpend: t.monthlySpend,
            seatCount: t.seatCount,
            teamSize: t.teamSize,
            useCase: t.useCase,
          })),
          totalEmployees: sizeMap[data.companySize] ?? 10,
          totalDevelopers: data.developerCount || 5,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Audit failed');
      }

      // Small delay for animation effect
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Navigate to results with audit data
      const encoded = encodeURIComponent(JSON.stringify(result.data));
      router.push(`/audit/results?data=${encoded}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStep(3);
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold">AI Spend</span>
          </Link>
          <Badge variant="primary">Free Audit</Badge>
        </div>
      </header>

      {/* Steps */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-10">
          <StepIndicator steps={STEPS} currentStep={step} />
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 0 && <Step1Company data={data} onChange={onChange} />}
          {step === 1 && <Step2Tools data={data} onChange={onChange} />}
          {step === 2 && <Step3Details data={data} onChange={onChange} />}
          {step === 3 && <Step4Review data={data} />}
          {step === 4 && <Step5Running />}
        </AnimatePresence>

        {/* Navigation */}
        {!isRunning && (
          <div className="flex items-center justify-between mt-10 max-w-2xl mx-auto">
            <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={runAudit} size="lg">
                <Sparkles className="w-4 h-4" /> Run Audit
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
