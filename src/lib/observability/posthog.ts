import { PostHog } from 'posthog-node';
import { env } from '@/validators/env';
import { logger } from '../logger/logger';

let posthogServer: PostHog | null = null;

// Initialize PostHog server-side client
if (typeof window === 'undefined' && env.POSTHOG_KEY) {
  try {
    posthogServer = new PostHog(env.POSTHOG_KEY, {
      host: 'https://app.posthog.com',
      flushAt: 1, // Flush immediately in serverless functions to avoid losing events on function termination
    });
  } catch (error) {
    logger.error('posthog_init_error', 'Failed to initialize server-side PostHog client', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Server-side tracking wrapper
 */
export const trackServerEvent = (
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
) => {
  if (!posthogServer) {
    logger.debug('posthog_server_disabled', `PostHog server event not tracked: ${event}`, {
      distinctId,
      properties,
    });
    return;
  }

  try {
    posthogServer.capture({
      distinctId,
      event,
      properties: {
        ...properties,
        $lib: 'posthog-node',
        environment: env.NODE_ENV,
      },
    });
    logger.info('posthog_server_track', `Tracked server event: ${event}`, { distinctId });
  } catch (error) {
    logger.error('posthog_track_error', `Failed to track server event: ${event}`, {
      distinctId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Identify user properties server-side
 */
export const identifyServerUser = (
  distinctId: string,
  properties: Record<string, unknown>
) => {
  if (!posthogServer) return;

  try {
    posthogServer.identify({
      distinctId,
      properties,
    });
  } catch (error) {
    logger.error('posthog_identify_error', `Failed to identify user: ${distinctId}`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Gracefully flush PostHog queue
 */
export const flushPostHog = async (): Promise<void> => {
  if (posthogServer) {
    await posthogServer.shutdown();
  }
};
