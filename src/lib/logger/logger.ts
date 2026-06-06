import * as Sentry from '@sentry/nextjs';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'AUDIT' | 'SECURITY';

export interface LogPayload {
  timestamp: string;
  level: LogLevel;
  service: string;
  action: string;
  message: string;
  metadata?: Record<string, unknown>;
}

class Logger {
  private service: string;

  constructor(service: string = 'app-server') {
    this.service = service;
  }

  private log(level: LogLevel, action: string, message: string, metadata?: Record<string, unknown>) {
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      action,
      message,
      metadata,
    };

    if (process.env.NODE_ENV === 'production') {
      // Production: structured JSON logging
      console.log(JSON.stringify(payload));
    } else {
      // Development: colored/pretty logging
      const colorMap: Record<LogLevel, string> = {
        DEBUG: '\x1b[36m', // Cyan
        INFO: '\x1b[32m',  // Green
        WARN: '\x1b[33m',  // Yellow
        ERROR: '\x1b[31m', // Red
        AUDIT: '\x1b[35m', // Magenta
        SECURITY: '\x1b[41m\x1b[37m', // Red BG + White text
      };
      const reset = '\x1b[0m';
      const color = colorMap[level] || reset;
      
      console.log(
        `[${payload.timestamp}] ${color}${level.padEnd(8)}${reset} [${payload.service}::${payload.action}] ${payload.message}`,
        payload.metadata ? `\nMetadata: ${JSON.stringify(payload.metadata, null, 2)}` : ''
      );
    }

    // Capture errors in Sentry
    if (level === 'ERROR') {
      Sentry.withScope((scope) => {
        if (metadata) {
          scope.setExtras(metadata);
        }
        scope.setTag('service', this.service);
        scope.setTag('action', action);
        Sentry.captureException(new Error(`${action}: ${message}`));
      });
    }

    // Capture security events as Sentry messages/alerts
    if (level === 'SECURITY') {
      Sentry.withScope((scope) => {
        scope.setLevel('warning');
        if (metadata) scope.setExtras(metadata);
        scope.setTag('security_event', 'true');
        Sentry.captureMessage(`SECURITY: ${action} - ${message}`);
      });
    }
  }

  public debug(action: string, message: string, metadata?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'production' || process.env.LOG_LEVEL === 'DEBUG') {
      this.log('DEBUG', action, message, metadata);
    }
  }

  public info(action: string, message: string, metadata?: Record<string, unknown>) {
    this.log('INFO', action, message, metadata);
  }

  public warn(action: string, message: string, metadata?: Record<string, unknown>) {
    this.log('WARN', action, message, metadata);
  }

  public error(action: string, message: string, metadata?: Record<string, unknown>) {
    this.log('ERROR', action, message, metadata);
  }

  public audit(action: string, message: string, metadata?: Record<string, unknown>) {
    this.log('AUDIT', action, message, metadata);
  }

  public security(action: string, message: string, metadata?: Record<string, unknown>) {
    this.log('SECURITY', action, message, metadata);
  }

  public forService(serviceName: string): Logger {
    return new Logger(serviceName);
  }
}

export const logger = new Logger();
