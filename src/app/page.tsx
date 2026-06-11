'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Section, Card, Badge, Button, FadeInView } from '@/components/ui';
import { ArrowRight, Zap, Shield, BarChart3, TrendingDown, Layers, CheckCircle2, ChevronDown, Sparkles, DollarSign, Users, Clock } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import Navbar from '@/components/Navbar';

function SpendEstimator() {
  const [devs, setDevs] = useState(15);
  const [team, setTeam] = useState(30);
  const [spend, setSpend] = useState(1200);

  // Dynamic leakage formula based on real SaaS audit parameters
  const avgSpendPerDev = spend / (devs || 1);
  let wastePct = 0.25;
  if (avgSpendPerDev > 35) wastePct += 0.15; // likely high-tier developer tool overlaps
  if (devs > 5 && spend > 500) wastePct += 0.10; // seat overlap chances
  wastePct = Math.min(0.60, wastePct);

  const monthlySavings = Math.round(spend * wastePct);
  const annualSavings = monthlySavings * 12;

  const handleDevsChange = (val: number) => {
    setDevs(val);
    if (team < val) {
      setTeam(val);
    }
  };

  const handleTeamChange = (val: number) => {
    if (val >= devs) {
      setTeam(val);
    }
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 md:p-8 max-w-2xl mx-auto shadow-2xl relative overflow-hidden mt-16">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 rounded-full blur-2xl pointer-events-none" />
      <h3 className="text-xl font-bold mb-6 text-center flex items-center justify-center gap-2">
        <Sparkles className="w-5 h-5 text-[var(--primary)]" />
        SaaS AI Leakage Estimator
      </h3>
      
      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-sm font-medium mb-2">
            <span>Developers</span>
            <span className="text-[var(--primary)] font-semibold">{devs} seats</span>
          </div>
          <input
            type="range" min="1" max="200" value={devs}
            onChange={(e) => handleDevsChange(Number(e.target.value))}
            className="w-full h-2 rounded-lg bg-[var(--muted)] appearance-none cursor-pointer accent-[var(--primary)]"
          />
        </div>

        <div>
          <div className="flex justify-between text-sm font-medium mb-2">
            <span>Total Team Size</span>
            <span className="text-[var(--primary)] font-semibold">{team} employees</span>
          </div>
          <input
            type="range" min="5" max="500" value={team}
            onChange={(e) => handleTeamChange(Number(e.target.value))}
            className="w-full h-2 rounded-lg bg-[var(--muted)] appearance-none cursor-pointer accent-[var(--primary)]"
          />
        </div>

        <div>
          <div className="flex justify-between text-sm font-medium mb-2">
            <span>Approx. Monthly AI Spend</span>
            <span className="text-[var(--primary)] font-semibold">${spend.toLocaleString()}</span>
          </div>
          <input
            type="range" min="50" max="10000" step="50" value={spend}
            onChange={(e) => setSpend(Number(e.target.value))}
            className="w-full h-2 rounded-lg bg-[var(--muted)] appearance-none cursor-pointer accent-[var(--primary)]"
          />
        </div>

        <div className="pt-6 border-t border-[var(--border)] grid grid-cols-2 gap-4 text-center">
          <div className="bg-[var(--muted)]/40 p-4 rounded-2xl">
            <p className="text-xs text-[var(--muted-foreground)] font-medium">Estimated Monthly Savings</p>
            <p className="text-2xl md:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">${monthlySavings}</p>
          </div>
          <div className="bg-[var(--muted)]/40 p-4 rounded-2xl">
            <p className="text-xs text-[var(--muted-foreground)] font-medium">Estimated Annual Savings</p>
            <p className="text-2xl md:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">${annualSavings.toLocaleString()}</p>
          </div>
        </div>

        <div className="pt-4 text-center">
          <Link href="/audit">
            <Button size="lg" className="w-full shadow-lg shadow-[var(--primary)]/20">
              Run Free Audit to Find Overlaps <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <p className="text-xs text-[var(--muted-foreground)] mt-2">Zero integration required. Free results in 90 seconds.</p>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  const { user } = useAuth();

  return (
    <section className="pt-40 md:pt-52 pb-20 md:pb-28 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:64px_64px] opacity-30 pointer-events-none" />
        {/* Gradient orb */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[var(--primary)]/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative text-center max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge variant="primary" className="mb-6">
              <Sparkles className="w-3 h-3" /> Startup-Grade B2B SaaS Audit Engine
            </Badge>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          >
            Stop Wasting Money on
            <br />
            <span className="bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-purple-500 bg-clip-text text-transparent">Redundant AI Tools</span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
          >
            Find overlapping seats, optimize plans, and slash your company&apos;s AI tool spend by up to 60% in less than 2 minutes. Free, secure, and entirely deterministic.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
          >
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button size="lg">
                    Go to Dashboard <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/audit">
                  <Button variant="outline" size="lg">Start New Audit</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/audit">
                  <Button size="lg">
                    Start Free Audit <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <a href="#estimator">
                  <Button variant="outline" size="lg">Quick Estimator</Button>
                </a>
              </>
            )}
          </motion.div>

          {/* Calculator Widget */}
          <div id="estimator" className="scroll-mt-24">
            <SpendEstimator />
          </div>

          {/* Stats */}
          <motion.div
            className="grid grid-cols-3 gap-8 mt-16 max-w-lg mx-auto"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}
          >
            {[
              { value: '$2.4M+', label: 'Savings Identified' },
              { value: '500+', label: 'Audits Run' },
              { value: '34%', label: 'Avg. Budget Wasted' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent">{stat.value}</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ─── PROBLEM ─── */
function Problem() {
  const problems = [
    { icon: <DollarSign className="w-5 h-5" />, title: 'Redundant Subscriptions', desc: 'Teams subscribe to 3-4 separate assistants that do the same thing (like Cursor + Copilot). Nobody tracks the overlap.' },
    { icon: <Users className="w-5 h-5" />, title: 'Unused Resource Seats', desc: 'Paying for 20 seats when only 8 people actively use the tool. Money down the drain due to messy offboarding.' },
    { icon: <Clock className="w-5 h-5" />, title: 'Wrong Plan Tiers', desc: 'Paying for ChatGPT Pro at $200/mo when Plus at $20/mo is enough, or using enterprise seats for small team stages.' },
  ];
  return (
    <Section className="bg-[var(--muted)]/50">
      <FadeInView>
        <div className="text-center mb-16">
          <Badge variant="destructive" className="mb-4">The Problem</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">AI Spend is Out of Control</h2>
          <p className="text-[var(--muted-foreground)] max-w-xl mx-auto">SaaS tools make expensing easy, leading to massive developer assistant sprawl. The average startup wastes 34% of their AI budget.</p>
        </div>
      </FadeInView>
      <div className="grid md:grid-cols-3 gap-6">
        {problems.map((p, i) => (
          <FadeInView key={p.title} delay={i * 0.1}>
            <Card hover className="h-full">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 mb-4">{p.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{p.title}</h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{p.desc}</p>
            </Card>
          </FadeInView>
        ))}
      </div>
    </Section>
  );
}

/* ─── HOW IT WORKS ─── */
function HowItWorks() {
  const steps = [
    { num: '01', title: 'Add Subscription Counts', desc: 'Select your tools and seat count manually in our 5-step wizard. No database connections or API keys required.' },
    { num: '02', title: 'Deterministic Analysis', desc: 'Our engine runs 55+ optimization rules, category overlaps, and industry averages in under 60 seconds.' },
    { num: '03', title: 'Get Action Plans', desc: 'Receive prioritized recommendations with exact savings projections and board-ready reports.' },
  ];
  return (
    <Section id="how-it-works">
      <FadeInView>
        <div className="text-center mb-16">
          <Badge variant="primary" className="mb-4">How It Works</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Three Steps to Savings</h2>
          <p className="text-[var(--muted-foreground)] max-w-xl mx-auto">No credit card. No signup. Get your audit results in under 90 seconds.</p>
        </div>
      </FadeInView>
      <div className="grid md:grid-cols-3 gap-8">
        {steps.map((step, i) => (
          <FadeInView key={step.num} delay={i * 0.15}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center mx-auto mb-6">
                <span className="text-xl font-bold text-white">{step.num}</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{step.desc}</p>
            </div>
          </FadeInView>
        ))}
      </div>
    </Section>
  );
}

/* ─── FEATURES ─── */
function Features() {
  const features = [
    { icon: <TrendingDown className="w-5 h-5" />, title: 'Deterministic Accuracy', desc: 'No AI hallucinations. 55 verified pricing rules map your stack directly to official documentation prices.' },
    { icon: <Layers className="w-5 h-5" />, title: 'Overlap Elimination', desc: 'Detects when you pay for multiple coding assistants or general AI tools for the same teams.' },
    { icon: <BarChart3 className="w-5 h-5" />, title: 'Health Scoring', desc: 'Composite health score (0-100) mapped to 5 weighted subscores (e.g. Plan Alignment, Seat Utilization).' },
    { icon: <Shield className="w-5 h-5" />, title: 'Stage Benchmarks', desc: 'Compare your spend per developer and total AI budget against stage-specific industry averages.' },
    { icon: <Zap className="w-5 h-5" />, title: 'Read-Only & Secure', desc: 'Zero credential sharing or code parsing. All LLM diagnostic data is stripped of PII prior to inference.' },
    { icon: <CheckCircle2 className="w-5 h-5" />, title: 'Board-Ready Reports', desc: 'Generate cryptographically signed, safe-share public links to justify software optimization to leadership.' },
  ];
  return (
    <Section id="features" className="bg-[var(--muted)]/50">
      <FadeInView>
        <div className="text-center mb-16">
          <Badge variant="primary" className="mb-4">Features</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Optimize AI Spend</h2>
        </div>
      </FadeInView>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <FadeInView key={f.title} delay={i * 0.08}>
            <Card hover className="h-full">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{f.desc}</p>
            </Card>
          </FadeInView>
        ))}
      </div>
    </Section>
  );
}

/* ─── PRICING ─── */
function Pricing() {
  const tiers = [
    {
      name: 'Free Audit',
      price: '$0',
      period: 'forever',
      desc: 'Quick self-serve optimization scan.',
      features: [
        '1-time manual audit wizard',
        'Web-only dashboard results',
        'Core health score & grade',
        'Basic savings recommendations'
      ],
      cta: 'Start Free Audit',
      href: '/audit',
      variant: 'outline' as const
    },
    {
      name: 'Growth Pro',
      price: '$19',
      period: 'company / mo',
      desc: 'Automatic auditing for small startups.',
      features: [
        'Continuous monthly invoice sync',
        'Slack integration spend alerts',
        'Access to AI Spend Copilot Chat',
        'PDF report downloads',
        'Up to 5 team members'
      ],
      cta: 'Join Waitlist',
      href: '/audit',
      variant: 'primary' as const,
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      desc: 'Continuous tracking for scale-ups.',
      features: [
        'Okta & Ramp integrations',
        'Automated seat monitoring',
        'Custom SSO/SAML support',
        'Dedicated billing accountant',
        'SOC2 compliance reports'
      ],
      cta: 'Contact Sales',
      href: 'mailto:sales@aispend.com',
      variant: 'outline' as const
    }
  ];

  return (
    <Section id="pricing" className="border-t border-[var(--border)]">
      <FadeInView>
        <div className="text-center mb-16">
          <Badge variant="primary" className="mb-4">Pricing Plans</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-[var(--muted-foreground)] max-w-xl mx-auto">Choose the tier that fits your startup stage. Optimize automatically.</p>
        </div>
      </FadeInView>
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {tiers.map((t, i) => (
          <FadeInView key={t.name} delay={i * 0.1}>
            <Card className={`h-full flex flex-col relative ${t.popular ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/10' : ''}`}>
              {t.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="primary">MOST POPULAR</Badge>
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-xl font-bold">{t.name}</h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">{t.desc}</p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-extrabold tracking-tight">{t.price}</span>
                  {t.period && <span className="text-sm text-[var(--muted-foreground)] ml-2">/{t.period}</span>}
                </div>
              </div>
              <ul className="space-y-3 mb-8 text-sm text-[var(--muted-foreground)] flex-1">
                {t.features.map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--primary)] shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href={t.href}>
                <Button variant={t.variant} className="w-full">
                  {t.cta}
                </Button>
              </Link>
            </Card>
          </FadeInView>
        ))}
      </div>
    </Section>
  );
}

/* ─── SAVINGS EXAMPLES ─── */
function SavingsExamples() {
  const examples = [
    { company: 'Series A Startup', tools: 'Cursor + Copilot + ChatGPT', before: '$580/mo', after: '$240/mo', saved: '$4,080/yr', pct: '59%' },
    { company: 'Growth Stage', tools: 'Claude + ChatGPT + Gemini + OpenAI API', before: '$2,400/mo', after: '$1,200/mo', saved: '$14,400/yr', pct: '50%' },
    { company: 'Scale-Up Team', tools: '8 AI tools, 40 seats', before: '$6,800/mo', after: '$3,900/mo', saved: '$34,800/yr', pct: '43%' },
  ];
  return (
    <Section id="savings" className="bg-[var(--muted)]/50">
      <FadeInView>
        <div className="text-center mb-16">
          <Badge variant="success" className="mb-4">Real Savings</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">See What Teams Are Saving</h2>
        </div>
      </FadeInView>
      <div className="grid md:grid-cols-3 gap-6">
        {examples.map((ex, i) => (
          <FadeInView key={ex.company} delay={i * 0.1}>
            <Card hover className="h-full flex flex-col bg-[var(--card)]">
              <Badge variant="outline" className="w-fit mb-4">{ex.company}</Badge>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">{ex.tools}</p>
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-sm line-through text-[var(--muted-foreground)]">{ex.before}</span>
                <ArrowRight className="w-3 h-3 text-[var(--muted-foreground)]" />
                <span className="text-xl font-bold text-emerald-600">{ex.after}</span>
              </div>
              <div className="mt-auto pt-4 border-t border-[var(--border)]">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted-foreground)]">Annual Savings</span>
                  <span className="font-bold text-emerald-600">{ex.saved}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-[var(--muted-foreground)]">Reduction</span>
                  <span className="font-bold text-emerald-600">{ex.pct}</span>
                </div>
              </div>
            </Card>
          </FadeInView>
        ))}
      </div>
    </Section>
  );
}

/* ─── TESTIMONIALS ─── */
function Testimonials() {
  const quotes = [
    { name: 'Sarah Chen', role: 'CTO, DataFlow', quote: 'We found $4,200 in annual savings in under 2 minutes. The overlap detection alone was worth it.' },
    { name: 'Marcus Rivera', role: 'VP Eng, BuildStack', quote: 'Our team was paying for 3 AI coding tools. AI Spend showed us we only needed one. Game changer.' },
    { name: 'Priya Sharma', role: 'Founder, NeuralOps', quote: 'The health score gave us a clear picture. We went from a D to a B+ in one quarter.' },
  ];
  return (
    <Section>
      <FadeInView>
        <div className="text-center mb-16">
          <Badge variant="primary" className="mb-4">Testimonials</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Loved by Engineering Leaders</h2>
        </div>
      </FadeInView>
      <div className="grid md:grid-cols-3 gap-6">
        {quotes.map((q, i) => (
          <FadeInView key={q.name} delay={i * 0.1}>
            <Card className="h-full">
              <p className="text-sm text-[var(--foreground)] leading-relaxed mb-6">&ldquo;{q.quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white text-sm font-bold">
                  {q.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="text-sm font-semibold">{q.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{q.role}</p>
                </div>
              </div>
            </Card>
          </FadeInView>
        ))}
      </div>
    </Section>
  );
}

/* ─── FAQ ─── */
function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faqs = [
    { q: 'Is the audit really free?', a: 'Yes, completely free. No credit card is required. You can run manual audits stateless at any time.' },
    { q: 'How long does the audit take?', a: 'Under 90 seconds. Simply input your active subscriptions, and our engine evaluates the stack immediately.' },
    { q: 'Do you need access to my company accounts?', a: 'No. You do not need to share credentials, databases, or API keys. We are a secure, read-only dashboard utility.' },
    { q: 'How accurate are the recommendations?', a: 'Our engine uses 55+ deterministic rules mapped directly to official vendor pricing catalogs verified as of June 2025.' },
    { q: 'Can I share the report with my team?', a: 'Yes. You can generate cryptographically signed public share links. All personal information and usernames are completely stripped before sharing.' },
  ];
  return (
    <Section id="faq" className="bg-[var(--muted)]/50">
      <FadeInView>
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">FAQ</Badge>
          <h2 className="text-3xl md:text-4xl font-bold">Common Questions</h2>
        </div>
      </FadeInView>
      <div className="max-w-2xl mx-auto space-y-3">
        {faqs.map((faq, i) => (
          <FadeInView key={i} delay={i * 0.05}>
            <button
              className="w-full text-left p-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/50 transition-colors"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              aria-expanded={openIndex === i}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
              </div>
              {openIndex === i && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-sm text-[var(--muted-foreground)] mt-3 leading-relaxed"
                >{faq.a}</motion.p>
              )}
            </button>
          </FadeInView>
        ))}
      </div>
    </Section>
  );
}

/* ─── FINAL CTA ─── */
function FinalCTA() {
  return (
    <Section className="bg-gradient-to-br from-[var(--primary)]/5 via-[var(--accent)]/5 to-purple-500/5 border-t border-[var(--border)]">
      <FadeInView>
        <div className="text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to Stop
            <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent"> Overpaying?</span>
          </h2>
          <p className="text-lg text-[var(--muted-foreground)] max-w-xl mx-auto mb-10">
            Get your free AI spend audit in under 90 seconds. No signup required.
          </p>
          <Link href="/audit">
            <Button size="lg">
              Start Free Audit <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </FadeInView>
    </Section>
  );
}

/* ─── FOOTER ─── */
function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold">AI Spend</span>
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">© {new Date().getFullYear()} AI Spend Intelligence. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <Pricing />
        <SavingsExamples />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
