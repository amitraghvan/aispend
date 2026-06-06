'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Section, Card, Badge, Button, FadeInView } from '@/components/ui';
import { ArrowRight, Zap, Shield, BarChart3, TrendingDown, Layers, CheckCircle2, ChevronDown, Sparkles, DollarSign, Users, Clock } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import Navbar from '@/components/Navbar';

function Hero() {
  const { user } = useAuth();

  return (
    <section className="pt-40 md:pt-52 pb-20 md:pb-28 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:64px_64px] opacity-30" />
      {/* Gradient orb */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[var(--primary)]/8 rounded-full blur-3xl" />

      <div className="relative text-center max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Badge variant="primary" className="mb-6">
            <Sparkles className="w-3 h-3" /> Trusted by 500+ startups
          </Badge>
        </motion.div>

        <motion.h1
          className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
        >
          Stop Overpaying
          <br />
          <span className="bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-purple-500 bg-clip-text text-transparent">for AI Tools</span>
        </motion.h1>

        <motion.p
          className="text-lg md:text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-10 leading-relaxed"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
        >
          Discover wasted AI spend, eliminate tool overlap, and save thousands annually.
          Free instant audit for engineering teams.
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
              <a href="#how-it-works">
                <Button variant="outline" size="lg">See How It Works</Button>
              </a>
            </>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-3 gap-8 mt-16 max-w-lg mx-auto"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}
        >
          {[
            { value: '$2.4M+', label: 'Savings Found' },
            { value: '500+', label: 'Audits Run' },
            { value: '34%', label: 'Avg. Savings' },
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
    { icon: <DollarSign className="w-5 h-5" />, title: 'Overlapping Subscriptions', desc: 'Teams subscribe to 3-4 AI tools that do the same thing. Nobody tracks the waste.' },
    { icon: <Users className="w-5 h-5" />, title: 'Unused Seats', desc: 'Paying for 20 seats when only 8 people actively use the tool. Money down the drain.' },
    { icon: <Clock className="w-5 h-5" />, title: 'Wrong Plans', desc: 'Enterprise plans for startup-sized teams. Pro plans when free tiers would suffice.' },
  ];
  return (
    <Section className="bg-[var(--muted)]/50">
      <FadeInView>
        <div className="text-center mb-16">
          <Badge variant="destructive" className="mb-4">The Problem</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">AI Spend is Out of Control</h2>
          <p className="text-[var(--muted-foreground)] max-w-xl mx-auto">The average startup wastes 34% of their AI tool budget. Here&apos;s why.</p>
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
    { num: '01', title: 'Add Your Tools', desc: 'Tell us which AI tools your team uses, the plans, and how many seats.' },
    { num: '02', title: 'Instant Analysis', desc: 'Our engine runs 55+ optimization rules, overlap detection, and benchmarking.' },
    { num: '03', title: 'Get Recommendations', desc: 'Receive actionable, prioritized recommendations with exact dollar savings.' },
  ];
  return (
    <Section id="how-it-works">
      <FadeInView>
        <div className="text-center mb-16">
          <Badge variant="primary" className="mb-4">How It Works</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Three Steps to Savings</h2>
          <p className="text-[var(--muted-foreground)] max-w-xl mx-auto">No credit card. No signup. Get your audit results in under 60 seconds.</p>
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
    { icon: <TrendingDown className="w-5 h-5" />, title: 'Savings Detection', desc: 'Identifies plan downgrades, seat optimization, billing switches, and more.' },
    { icon: <Layers className="w-5 h-5" />, title: 'Overlap Analysis', desc: 'Detects when you\'re paying for multiple tools that serve the same purpose.' },
    { icon: <BarChart3 className="w-5 h-5" />, title: 'Health Score', desc: 'Composite score (0-100) showing how optimized your AI spend is.' },
    { icon: <Shield className="w-5 h-5" />, title: 'Industry Benchmarks', desc: 'Compare your spend against similar companies in your stage.' },
    { icon: <Zap className="w-5 h-5" />, title: '55+ Audit Rules', desc: 'Comprehensive rule engine covering all optimization categories.' },
    { icon: <CheckCircle2 className="w-5 h-5" />, title: 'Shareable Reports', desc: 'Generate public-safe report links to share with your team or investors.' },
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

/* ─── SAVINGS EXAMPLES ─── */
function SavingsExamples() {
  const examples = [
    { company: 'Series A Startup', tools: 'Cursor + Copilot + ChatGPT', before: '$580/mo', after: '$240/mo', saved: '$4,080/yr', pct: '59%' },
    { company: 'Growth Stage', tools: 'Claude + ChatGPT + Gemini + OpenAI API', before: '$2,400/mo', after: '$1,200/mo', saved: '$14,400/yr', pct: '50%' },
    { company: 'Scale-Up Team', tools: '8 AI tools, 40 seats', before: '$6,800/mo', after: '$3,900/mo', saved: '$34,800/yr', pct: '43%' },
  ];
  return (
    <Section id="savings">
      <FadeInView>
        <div className="text-center mb-16">
          <Badge variant="success" className="mb-4">Real Savings</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">See What Teams Are Saving</h2>
        </div>
      </FadeInView>
      <div className="grid md:grid-cols-3 gap-6">
        {examples.map((ex, i) => (
          <FadeInView key={ex.company} delay={i * 0.1}>
            <Card hover className="h-full flex flex-col">
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
    <Section className="bg-[var(--muted)]/50">
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
    { q: 'Is the audit really free?', a: 'Yes, completely free. No credit card required. We generate revenue through premium features and enterprise plans.' },
    { q: 'How long does the audit take?', a: 'Under 60 seconds. You enter your tool subscriptions and our engine analyzes everything instantly.' },
    { q: 'Do you need access to my accounts?', a: 'No. You simply tell us which tools you use, the plans, seats, and monthly spend. We never access your accounts.' },
    { q: 'How accurate are the recommendations?', a: 'Our engine uses 55+ deterministic rules based on real pricing data. Every recommendation includes a confidence score.' },
    { q: 'Can I share the report with my team?', a: 'Yes. You can generate a public shareable link that hides sensitive company information.' },
  ];
  return (
    <Section id="faq">
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
            Get your free AI spend audit in under 60 seconds. No signup required.
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

/* ═══════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════ */
export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <SavingsExamples />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
