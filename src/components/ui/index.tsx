'use client';
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { motion, type HTMLMotionProps } from 'framer-motion';

/* ═══════════════════════════════════════════════════
   BUTTON
   ═══════════════════════════════════════════════════ */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const btnBase = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]';
const btnVariants: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 shadow-lg shadow-[var(--primary)]/20',
  secondary: 'bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)]',
  ghost: 'bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]',
  destructive: 'bg-[var(--destructive)] text-white hover:opacity-90',
  outline: 'border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] bg-transparent',
};
const btnSizes: Record<ButtonSize, string> = {
  sm: 'text-sm px-3 py-1.5 gap-1.5',
  md: 'text-sm px-5 py-2.5 gap-2',
  lg: 'text-base px-7 py-3.5 gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => (
    <button ref={ref} className={clsx(btnBase, btnVariants[variant], btnSizes[size], className)} disabled={disabled || loading} {...props}>
      {loading && <Spinner className="w-4 h-4" />}
      {children}
    </button>
  )
);
Button.displayName = 'Button';

/* ═══════════════════════════════════════════════════
   INPUT
   ═══════════════════════════════════════════════════ */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && <label htmlFor={inputId} className="text-sm font-medium text-[var(--foreground)]">{label}</label>}
        <input
          ref={ref} id={inputId}
          className={clsx(
            'w-full px-4 py-2.5 rounded-xl border bg-[var(--card)] text-[var(--foreground)] text-sm transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent',
            'placeholder:text-[var(--muted-foreground)]',
            error ? 'border-[var(--destructive)]' : 'border-[var(--border)]',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
        {hint && !error && <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

/* ═══════════════════════════════════════════════════
   SELECT
   ═══════════════════════════════════════════════════ */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && <label htmlFor={selectId} className="text-sm font-medium text-[var(--foreground)]">{label}</label>}
        <select
          ref={ref} id={selectId}
          className={clsx(
            'w-full px-4 py-2.5 rounded-xl border bg-[var(--card)] text-[var(--foreground)] text-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent appearance-none',
            error ? 'border-[var(--destructive)]' : 'border-[var(--border)]',
            className
          )}
          {...props}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

/* ═══════════════════════════════════════════════════
   CARD
   ═══════════════════════════════════════════════════ */
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: boolean;
}

export function Card({ hover, glow, className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6',
        hover && 'transition-all duration-300 hover:shadow-xl hover:shadow-[var(--primary)]/5 hover:-translate-y-0.5 hover:border-[var(--primary)]/30',
        glow && 'shadow-lg shadow-[var(--primary)]/10 border-[var(--primary)]/20',
        className
      )}
      {...props}
    >{children}</div>
  );
}

/* ═══════════════════════════════════════════════════
   BADGE
   ═══════════════════════════════════════════════════ */
type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'primary' | 'outline';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-[var(--muted)] text-[var(--muted-foreground)]',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  destructive: 'bg-red-500/10 text-red-600 dark:text-red-400',
  primary: 'bg-[var(--primary)]/10 text-[var(--primary)]',
  outline: 'border border-[var(--border)] text-[var(--muted-foreground)] bg-transparent',
};

export function Badge({ variant = 'default', dot, className, children, ...props }: BadgeProps) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full', badgeVariants[variant], className)} {...props}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ═══════════════════════════════════════════════════
   KPI CARD (for dashboard)
   ═══════════════════════════════════════════════════ */
interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: { value: number; label: string };
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

export function KpiCard({ label, value, subtitle, icon, trend, variant = 'default' }: KpiCardProps) {
  const accentColors: Record<string, string> = {
    default: 'from-[var(--primary)]/10 to-transparent',
    success: 'from-emerald-500/10 to-transparent',
    warning: 'from-amber-500/10 to-transparent',
    destructive: 'from-red-500/10 to-transparent',
  };
  return (
    <Card className={clsx('relative overflow-hidden')}>
      <div className={clsx('absolute inset-0 bg-gradient-to-br opacity-50', accentColors[variant])} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-[var(--muted-foreground)] font-medium">{label}</p>
          {icon && <div className="text-[var(--muted-foreground)]">{icon}</div>}
        </div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {subtitle && <p className="text-sm text-[var(--muted-foreground)] mt-1">{subtitle}</p>}
        {trend && (
          <div className={clsx('flex items-center gap-1 mt-2 text-xs font-medium', trend.value >= 0 ? 'text-emerald-600' : 'text-red-600')}>
            <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
            <span className="text-[var(--muted-foreground)]">{trend.label}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════
   PROGRESS BAR
   ═══════════════════════════════════════════════════ */
interface ProgressProps { value: number; max?: number; label?: string; color?: string; showValue?: boolean; size?: 'sm' | 'md' }

export function Progress({ value, max = 100, label, color, showValue = true, size = 'md' }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const barColor = color || (pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--destructive)');
  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between mb-1.5">
          {label && <span className="text-sm text-[var(--muted-foreground)]">{label}</span>}
          {showValue && <span className="text-sm font-medium">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className={clsx('w-full rounded-full bg-[var(--muted)] overflow-hidden', size === 'sm' ? 'h-1.5' : 'h-2.5')}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   HEALTH SCORE RING
   ═══════════════════════════════════════════════════ */
interface ScoreRingProps { score: number; grade: string; size?: number; label?: string }

export function ScoreRing({ score, grade, size = 160, label }: ScoreRingProps) {
  const r = (size - 16) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const gradeColor = score >= 90 ? '#059669' : score >= 80 ? '#10b981' : score >= 70 ? '#d97706' : score >= 60 ? '#f59e0b' : '#dc2626';

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--muted)" strokeWidth="8" fill="none" />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={gradeColor} strokeWidth="8" fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color: gradeColor }}>{score}</span>
          <span className="text-lg font-semibold text-[var(--muted-foreground)]">{grade}</span>
        </div>
      </div>
      {label && <p className="text-sm text-[var(--muted-foreground)] mt-2">{label}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SKELETON
   ═══════════════════════════════════════════════════ */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('animate-pulse rounded-xl bg-[var(--muted)]', className)} {...props} />;
}

/* ═══════════════════════════════════════════════════
   SPINNER
   ═══════════════════════════════════════════════════ */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={clsx('animate-spin', className || 'w-5 h-5')} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════
   SECTION WRAPPER (for landing page sections)
   ═══════════════════════════════════════════════════ */
interface SectionProps extends HTMLAttributes<HTMLElement> {
  container?: boolean;
}

export function Section({ container = true, className, children, ...props }: SectionProps) {
  return (
    <section className={clsx('py-20 md:py-28', className)} {...props}>
      {container ? <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div> : children}
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   STEP INDICATOR (for audit wizard)
   ═══════════════════════════════════════════════════ */
interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2 w-full">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-2 flex-1">
          <div className={clsx(
            'flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 shrink-0',
            i < currentStep ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' :
            i === currentStep ? 'bg-[var(--primary)] text-[var(--primary-foreground)] ring-4 ring-[var(--primary)]/20' :
            'bg-[var(--muted)] text-[var(--muted-foreground)]'
          )}>
            {i < currentStep ? '✓' : i + 1}
          </div>
          <span className={clsx('text-xs font-medium hidden sm:block', i <= currentStep ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]')}>{step}</span>
          {i < steps.length - 1 && <div className={clsx('h-0.5 flex-1 rounded-full transition-all duration-500', i < currentStep ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]')} />}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MOTION WRAPPER (for page animations)
   ═══════════════════════════════════════════════════ */
export function FadeIn({ children, className, delay = 0, ...props }: HTMLMotionProps<'div'> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
      {...props}
    >{children}</motion.div>
  );
}

export function FadeInView({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >{children}</motion.div>
  );
}
