/**
 * Email Service — Resend integration with retry support.
 */

import { prisma } from '@/lib/prisma';
import { eventBus } from '@/lib/events/event-bus';
import { logger } from '@/lib/logger/logger';

const log = logger.forService('email-service');

export interface EmailPayload {
  to: string;
  subject?: string;
  template: string;
  data: Record<string, unknown>;
}

export interface EmailTemplate {
  subject: string;
  html: string;
}

const TEMPLATES: Record<string, (data: Record<string, unknown>) => EmailTemplate> = {
  audit_confirmation: (data) => ({
    subject: 'Your AI Spend Audit is Ready',
    html: `
      <h1>Your AI Spend Audit is Complete</h1>
      <p>Here are your key findings:</p>
      <ul>
        <li>Current Monthly Spend: <strong>$${data.currentSpend}</strong></li>
        <li>Potential Monthly Savings: <strong>$${data.monthlySavings}</strong></li>
        <li>Health Score: <strong>${data.healthScore}/100 (${data.healthGrade})</strong></li>
        <li>Recommendations: <strong>${data.recommendationCount}</strong></li>
      </ul>
      <p><a href="${data.reportUrl}">View Full Report</a></p>
    `,
  }),

  audit_completed: (data) => ({
    subject: 'Your AI Spend Audit is Ready',
    html: `
      <h1>Your AI Spend Audit is Complete</h1>
      <p>Here are your key findings:</p>
      <ul>
        <li>Current Monthly Spend: <strong>$${data.currentSpend}</strong></li>
        <li>Potential Monthly Savings: <strong>$${data.monthlySavings}</strong></li>
        <li>Health Score: <strong>${data.healthScore}/100 (${data.healthGrade})</strong></li>
        <li>Recommendations: <strong>${data.recommendationCount}</strong></li>
      </ul>
      <p><a href="${data.reportUrl}">View Full Report</a></p>
    `,
  }),

  lead_confirmation: (data) => ({
    subject: 'Welcome to AI Spend Intelligence',
    html: `
      <h1>Thank You for Your Interest</h1>
      <p>Hi ${data.name || 'there'},</p>
      <p>We've received your request. Our team will review your AI spend profile and reach out with personalized recommendations.</p>
      <p>In the meantime, you can explore our platform for free insights.</p>
    `,
  }),

  optimization_alert: (data) => ({
    subject: `New Optimization Opportunity: Save $${data.monthlySavings}/mo`,
    html: `
      <h1>New Optimization Alert</h1>
      <p>We found a new way to optimize your AI spending:</p>
      <p><strong>${data.recommendation}</strong></p>
      <p>Estimated savings: <strong>$${data.monthlySavings}/month</strong></p>
      <p><a href="${data.dashboardUrl}">Review in Dashboard</a></p>
    `,
  }),

  welcome_email: (data) => ({
    subject: 'Welcome to AI Spend Intelligence',
    html: `
      <h1>Welcome to AI Spend</h1>
      <p>Hi ${data.name || 'there'},</p>
      <p>Thanks for signing up for AI Spend! We're thrilled to help you analyze, monitor, and optimize your AI subscriptions.</p>
      <p>Get started by running your first spend audit:</p>
      <p><a href="${data.actionUrl}">Run Spend Audit</a></p>
    `,
  }),

  team_invitation: (data) => ({
    subject: `You're invited to join ${data.orgName} on AI Spend`,
    html: `
      <h1>Join your team on AI Spend</h1>
      <p>Hi there,</p>
      <p><strong>${data.inviterName || 'Someone'}</strong> has invited you to join the <strong>${data.orgName}</strong> workspace on AI Spend as an <strong>${data.role}</strong>.</p>
      <p>Click the link below to accept the invitation and join your team:</p>
      <p><a href="${data.inviteUrl}">Accept Invitation</a></p>
      <p>This link will expire on ${data.expiresAt}.</p>
    `,
  }),

  password_reset: (data) => ({
    subject: 'Reset your AI Spend Password',
    html: `
      <h1>Reset Password Request</h1>
      <p>Hi there,</p>
      <p>We received a request to reset your password. Click the link below to set a new password:</p>
      <p><a href="${data.resetUrl}">Reset Password</a></p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
  }),

  monthly_summary: (data) => ({
    subject: `AI Spend Monthly Summary — ${data.month}`,
    html: `
      <h1>Your AI Spend Monthly Summary</h1>
      <p>Here is your spend activity for ${data.month}:</p>
      <ul>
        <li>Total Monthly Spend: <strong>$${data.totalSpend}</strong></li>
        <li>Total Potential Savings: <strong>$${data.potentialSavings}</strong></li>
        <li>Active Subscriptions: <strong>${data.toolCount}</strong></li>
      </ul>
      <p><a href="${data.dashboardUrl}">View Dashboard</a></p>
    `,
  }),
};

export class EmailService {
  private maxRetries = 3;

  async send(payload: EmailPayload): Promise<{ success: boolean; emailLogId: string }> {
    const templateFn = TEMPLATES[payload.template];
    if (!templateFn) {
      throw new Error(`Unknown email template: ${payload.template}`);
    }

    const template = templateFn(payload.data);
    let lastError: string | undefined;
    let externalId: string | undefined;
    let success = false;

    // Create email log entry
    const emailLog = await prisma.emailLog.create({
      data: {
        recipient: payload.to,
        subject: template.subject,
        template: payload.template,
        status: 'PENDING',
      },
    });

    // Retry loop
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const result = await this.sendViaResend(payload.to, template.subject, template.html);
        externalId = result.id;
        success = true;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        log.warn('email_retry', `Email attempt ${attempt + 1} failed for ${payload.to}`, {
          attempt: attempt + 1, error: lastError, template: payload.template,
        });

        if (attempt < this.maxRetries - 1) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    // Update email log
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: success ? 'SENT' : 'FAILED',
        externalId,
        errorMessage: lastError,
        retryCount: success ? 0 : this.maxRetries,
        sentAt: success ? new Date() : null,
      },
    });

    if (success) {
      await eventBus.publish('email.sent', {
        emailLogId: emailLog.id, recipient: payload.to, template: payload.template,
      });
      log.info('email_sent', `Email sent to ${payload.to}`, { template: payload.template });
    } else {
      await eventBus.publish('email.failed', {
        emailLogId: emailLog.id, recipient: payload.to, template: payload.template, error: lastError,
      });
      log.error('email_failed', `Email failed after ${this.maxRetries} attempts`, {
        recipient: payload.to, template: payload.template, error: lastError,
      });
    }

    return { success, emailLogId: emailLog.id };
  }

  private async sendViaResend(to: string, subject: string, html: string): Promise<{ id: string }> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY not configured');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'AI Spend <noreply@aispend.io>',
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend API error: ${response.status} ${body}`);
    }

    return response.json();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getTemplate(name: string): typeof TEMPLATES[string] | undefined {
    return TEMPLATES[name];
  }
}

export const emailService = new EmailService();
