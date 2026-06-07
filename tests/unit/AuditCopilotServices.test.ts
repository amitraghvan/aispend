import { describe, it, expect, vi, beforeEach } from 'vitest';
import { conversationService } from '@/features/ai/services/ConversationService';
import { auditCopilotService } from '@/features/ai/services/AuditCopilotService';
import { actionPlanService } from '@/features/ai/services/ActionPlanService';
import { recommendationCopilotService } from '@/features/ai/services/RecommendationCopilotService';
import { executiveAdvisorService } from '@/features/ai/services/ExecutiveAdvisorService';
import { conversationRepository } from '@/features/ai/repositories/ConversationRepository';
import { auditRepository } from '@/features/audit/repositories/AuditRepository';
import { cacheService } from '@/lib/cache/cache-service';
import { prismaMock } from '../setup';
import { trackServerEvent } from '@/lib/observability/posthog';

vi.mock('@/lib/observability/posthog', () => ({
  trackServerEvent: vi.fn(),
}));

describe('AI Copilot Services', () => {
  const mockAudit = {
    id: 'audit-123',
    organizationId: 'org-123',
    status: 'COMPLETED',
    totalSpend: 1000,
    optimizedSpend: 800,
    potentialSavings: 200,
    savingsPercentage: 20,
    healthScore: 80,
    healthGrade: 'B',
    toolCount: 5,
    itemCount: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    items: [],
    recommendations: [],
  };

  const mockConvo = {
    id: 'convo-123',
    auditId: 'audit-123',
    organizationId: 'org-123',
    title: 'Copilot Chat',
    isPinned: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    messages: [
      { id: 'm1', content: 'hello', sender: 'USER' as const, createdAt: new Date() },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ConversationService', () => {
    it('should start a conversation and delegate to repository', async () => {
      vi.spyOn(conversationRepository, 'createConversation').mockResolvedValue(mockConvo);

      const res = await conversationService.startConversation({
        organizationId: 'org-123',
        auditId: 'audit-123',
        title: 'Copilot Chat',
      });

      expect(conversationRepository.createConversation).toHaveBeenCalledWith({
        organizationId: 'org-123',
        auditId: 'audit-123',
        title: 'Copilot Chat',
      });
      expect(res).toEqual(mockConvo);
    });

    it('should fetch conversation from cache if available', async () => {
      vi.spyOn(cacheService, 'get').mockResolvedValue(mockConvo);
      const findSpy = vi.spyOn(conversationRepository, 'findConversationById');

      const res = await conversationService.getConversation('convo-123', 'org-123');

      expect(cacheService.get).toHaveBeenCalledWith('copilot_conversation', 'convo-123');
      expect(findSpy).not.toHaveBeenCalled();
      expect(res).toEqual(mockConvo);
    });

    it('should fallback to database and cache results if cache misses', async () => {
      vi.spyOn(cacheService, 'get').mockResolvedValue(null);
      vi.spyOn(conversationRepository, 'findConversationById').mockResolvedValue(mockConvo as any);
      vi.spyOn(cacheService, 'set').mockResolvedValue();

      const res = await conversationService.getConversation('convo-123', 'org-123');

      expect(conversationRepository.findConversationById).toHaveBeenCalledWith('convo-123', 'org-123');
      expect(cacheService.set).toHaveBeenCalledWith('copilot_conversation', 'convo-123', mockConvo, 86400);
      expect(res).toEqual(mockConvo);
    });

    it('should check tenant ownership and throw Forbidden if organizationId mismatch', async () => {
      vi.spyOn(cacheService, 'get').mockResolvedValue(mockConvo);

      await expect(
        conversationService.getConversation('convo-123', 'org-different')
      ).rejects.toThrow('Forbidden');
    });

    it('should list conversations from database', async () => {
      vi.spyOn(conversationRepository, 'listConversations').mockResolvedValue([mockConvo]);

      const res = await conversationService.listConversations({
        auditId: 'audit-123',
        organizationId: 'org-123',
      });

      expect(conversationRepository.listConversations).toHaveBeenCalledWith({
        auditId: 'audit-123',
        organizationId: 'org-123',
      });
      expect(res).toHaveLength(1);
    });

    it('should pin conversation thread and invalidate cache', async () => {
      vi.spyOn(conversationRepository, 'pinConversation').mockResolvedValue({ ...mockConvo, isPinned: true });
      vi.spyOn(cacheService, 'invalidate').mockResolvedValue();

      const res = await conversationService.pinConversation('convo-123', true, 'org-123');

      expect(conversationRepository.pinConversation).toHaveBeenCalledWith('convo-123', true, 'org-123');
      expect(cacheService.invalidate).toHaveBeenCalledWith('copilot_conversation', 'convo-123');
      expect(res.isPinned).toBe(true);
    });

    it('should delete conversation thread and invalidate cache', async () => {
      vi.spyOn(conversationRepository, 'deleteConversation').mockResolvedValue({ ...mockConvo, deletedAt: new Date() });
      vi.spyOn(cacheService, 'invalidate').mockResolvedValue();

      const res = await conversationService.deleteConversation('convo-123', 'org-123');

      expect(conversationRepository.deleteConversation).toHaveBeenCalledWith('convo-123', 'org-123');
      expect(cacheService.invalidate).toHaveBeenCalledWith('copilot_conversation', 'convo-123');
      expect(res.deletedAt).toBeDefined();
    });

    it('should add message to conversation and invalidate cache', async () => {
      vi.spyOn(conversationRepository, 'findConversationById').mockResolvedValue(mockConvo as any);
      vi.spyOn(conversationRepository, 'appendMessage').mockResolvedValue({
        id: 'msg-new',
        conversationId: 'convo-123',
        sender: 'USER',
        content: 'ping',
        createdAt: new Date(),
      });
      vi.spyOn(cacheService, 'invalidate').mockResolvedValue();

      const msg = await conversationService.addMessage('convo-123', 'USER', 'ping', 'org-123');

      expect(conversationRepository.appendMessage).toHaveBeenCalledWith('convo-123', 'USER', 'ping');
      expect(cacheService.invalidate).toHaveBeenCalledWith('copilot_conversation', 'convo-123');
      expect(msg.content).toBe('ping');
    });

    it('should throw error when adding message to non-existent conversation', async () => {
      vi.spyOn(conversationRepository, 'findConversationById').mockResolvedValue(null);

      await expect(
        conversationService.addMessage('convo-none', 'USER', 'ping', 'org-123')
      ).rejects.toThrow('Conversation not found or access denied');
    });

    it('should handle cache service failures during getConversation gracefully', async () => {
      vi.spyOn(cacheService, 'get').mockRejectedValue(new Error('Redis Down'));
      vi.spyOn(conversationRepository, 'findConversationById').mockResolvedValue(mockConvo as any);
      vi.spyOn(cacheService, 'set').mockResolvedValue();

      const res = await conversationService.getConversation('convo-123', 'org-123');

      expect(conversationRepository.findConversationById).toHaveBeenCalledWith('convo-123', 'org-123');
      expect(res).toEqual(mockConvo);
    });
  });

  describe('AuditCopilotService', () => {
    it('should ask question, coordinate context, call Groq, and persist replies', async () => {
      vi.spyOn(conversationService, 'getConversation').mockResolvedValue(mockConvo as any);
      vi.spyOn(auditRepository, 'findById').mockResolvedValue(mockAudit as any);
      vi.spyOn(conversationService, 'addMessage').mockResolvedValue({} as any);

      const reply = await auditCopilotService.askQuestion({
        conversationId: 'convo-123',
        question: 'How do I optimize my spend?',
        organizationId: 'org-123',
      });

      expect(conversationService.getConversation).toHaveBeenCalledWith('convo-123', 'org-123');
      expect(auditRepository.findById).toHaveBeenCalledWith('audit-123');
      expect(conversationService.addMessage).toHaveBeenCalledWith('convo-123', 'USER', 'How do I optimize my spend?', 'org-123');
      expect(conversationService.addMessage).toHaveBeenCalledWith('convo-123', 'COPILOT', expect.any(String), 'org-123');
      
      expect(reply.reply).toBeDefined();
      expect(reply.suggestedFollowUps).toBeDefined();
      expect(trackServerEvent).toHaveBeenCalledWith('org-123', 'copilot_message_sent', expect.any(Object));
    });

    it('should throw error if audit context is not found during askQuestion', async () => {
      vi.spyOn(conversationService, 'getConversation').mockResolvedValue(mockConvo as any);
      vi.spyOn(auditRepository, 'findById').mockResolvedValue(null);

      await expect(
        auditCopilotService.askQuestion({
          conversationId: 'convo-123',
          question: 'Hello?',
          organizationId: 'org-123',
        })
      ).rejects.toThrow('Audit context not found');
      
      expect(trackServerEvent).toHaveBeenCalledWith('org-123', 'copilot_response_failed', expect.any(Object));
    });
  });

  describe('ActionPlanService', () => {
    it('should generate a structured action plan and cache it', async () => {
      vi.spyOn(cacheService, 'get').mockResolvedValue(null);
      vi.spyOn(auditRepository, 'findById').mockResolvedValue(mockAudit as any);
      vi.spyOn(cacheService, 'set').mockResolvedValue();

      const plan = await actionPlanService.generatePlan({
        auditId: 'audit-123',
        organizationId: 'org-123',
      });

      expect(auditRepository.findById).toHaveBeenCalledWith('audit-123');
      expect(cacheService.set).toHaveBeenCalledWith('copilot_action_plan', 'audit-123', plan, 86400);
      expect(plan.weeks.length).toBeGreaterThan(0);
      expect(plan.weeks[0].goal).toBeDefined();
    });

    it('should return action plan from cache if hit', async () => {
      const mockCachedPlan = { weeks: [{ weekNumber: 1, goal: 'Goal 1', steps: [] }] };
      vi.spyOn(cacheService, 'get').mockResolvedValue(mockCachedPlan);
      const findSpy = vi.spyOn(auditRepository, 'findById');

      const plan = await actionPlanService.generatePlan({
        auditId: 'audit-123',
        organizationId: 'org-123',
      });

      expect(cacheService.get).toHaveBeenCalledWith('copilot_action_plan', 'audit-123');
      expect(findSpy).not.toHaveBeenCalled();
      expect(plan).toEqual(mockCachedPlan);
    });

    it('should throw if audit is not found during plan generation', async () => {
      vi.spyOn(cacheService, 'get').mockResolvedValue(null);
      vi.spyOn(auditRepository, 'findById').mockResolvedValue(null);

      await expect(
        actionPlanService.generatePlan({
          auditId: 'audit-none',
          organizationId: 'org-123',
        })
      ).rejects.toThrow('Audit not found');
    });

    it('should throw Forbidden if organizationId mismatch during plan generation', async () => {
      vi.spyOn(cacheService, 'get').mockResolvedValue(null);
      vi.spyOn(auditRepository, 'findById').mockResolvedValue(mockAudit as any);

      await expect(
        actionPlanService.generatePlan({
          auditId: 'audit-123',
          organizationId: 'org-different',
        })
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('RecommendationCopilotService', () => {
    it('should generate a deep dive analysis for a recommendation', async () => {
      const mockRecommendation = {
        id: 'rec-1',
        auditId: 'audit-123',
        ruleName: 'Tool Overlap',
        category: 'OVERLAP_ELIMINATION',
        priority: 'CRITICAL',
        reason: 'Duplicate subscriptions',
        currentState: 'Two tools active',
        recommendedAction: 'Downgrade one tool',
        estimatedMonthlySavings: 150 as any,
        confidenceScore: 0.9 as any,
        audit: { organizationId: 'org-123' },
      };

      prismaMock.recommendation.findUnique.mockResolvedValue(mockRecommendation as any);
      vi.spyOn(cacheService, 'get').mockResolvedValue(null);
      vi.spyOn(cacheService, 'set').mockResolvedValue();

      const deepDive = await recommendationCopilotService.generateDeepDive({
        recommendationId: 'rec-1',
        organizationId: 'org-123',
      });

      expect(prismaMock.recommendation.findUnique).toHaveBeenCalledWith({
        where: { id: 'rec-1' },
        include: { audit: true },
      });
      expect(deepDive.whyItExists).toBeDefined();
      expect(deepDive.expectedOutcome).toBeDefined();
      expect(deepDive.risk).toBeDefined();
      expect(deepDive.complexity).toBe('LOW');
      expect(deepDive.implementationGuidance.length).toBeGreaterThan(0);
    });

    it('should return deep dive from cache if hit', async () => {
      const mockCachedDeepDive = { whyItExists: 'exists', expectedOutcome: 'outcome', risk: 'low', complexity: 'LOW' as const, implementationGuidance: [] };
      vi.spyOn(cacheService, 'get').mockResolvedValue(mockCachedDeepDive);

      const deepDive = await recommendationCopilotService.generateDeepDive({
        recommendationId: 'rec-1',
        organizationId: 'org-123',
      });

      expect(cacheService.get).toHaveBeenCalledWith('copilot_deep_dive', 'rec-1');
      expect(deepDive).toEqual(mockCachedDeepDive);
    });

    it('should throw if recommendation is not found during deep dive', async () => {
      vi.spyOn(cacheService, 'get').mockResolvedValue(null);
      prismaMock.recommendation.findUnique.mockResolvedValue(null);

      await expect(
        recommendationCopilotService.generateDeepDive({
          recommendationId: 'rec-none',
          organizationId: 'org-123',
        })
      ).rejects.toThrow('Recommendation not found');
    });

    it('should throw Forbidden if organizationId mismatch during deep dive', async () => {
      const mockRecommendation = {
        id: 'rec-1',
        audit: { organizationId: 'org-123' },
      };
      vi.spyOn(cacheService, 'get').mockResolvedValue(null);
      prismaMock.recommendation.findUnique.mockResolvedValue(mockRecommendation as any);

      await expect(
        recommendationCopilotService.generateDeepDive({
          recommendationId: 'rec-1',
          organizationId: 'org-different',
        })
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('ExecutiveAdvisorService', () => {
    it('should generate board-level executive brief', async () => {
      vi.spyOn(cacheService, 'get').mockResolvedValue(null);
      vi.spyOn(auditRepository, 'findById').mockResolvedValue(mockAudit as any);
      vi.spyOn(cacheService, 'set').mockResolvedValue();

      const analysis = await executiveAdvisorService.generateExecutiveAnalysis({
        auditId: 'audit-123',
        organizationId: 'org-123',
      });

      expect(auditRepository.findById).toHaveBeenCalledWith('audit-123');
      expect(analysis.peerComparison).toBeDefined();
      expect(analysis.biggestWasteArea).toBeDefined();
      expect(analysis.leadershipFocus).toBeDefined();
      expect(analysis.executiveSummary).toBeDefined();
    });

    it('should return executive brief from cache if hit', async () => {
      const mockCachedExec = { peerComparison: 'comp', biggestWasteArea: 'waste', leadershipFocus: 'focus', strategicRecommendations: [], executiveSummary: 'sum' };
      vi.spyOn(cacheService, 'get').mockResolvedValue(mockCachedExec);
      const findSpy = vi.spyOn(auditRepository, 'findById');

      const analysis = await executiveAdvisorService.generateExecutiveAnalysis({
        auditId: 'audit-123',
        organizationId: 'org-123',
      });

      expect(cacheService.get).toHaveBeenCalledWith('copilot_executive', 'audit-123');
      expect(findSpy).not.toHaveBeenCalled();
      expect(analysis).toEqual(mockCachedExec);
    });

    it('should throw if audit is not found during executive brief generation', async () => {
      vi.spyOn(cacheService, 'get').mockResolvedValue(null);
      vi.spyOn(auditRepository, 'findById').mockResolvedValue(null);

      await expect(
        executiveAdvisorService.generateExecutiveAnalysis({
          auditId: 'audit-none',
          organizationId: 'org-123',
        })
      ).rejects.toThrow('Audit not found');
    });

    it('should throw Forbidden if organizationId mismatch during executive brief generation', async () => {
      vi.spyOn(cacheService, 'get').mockResolvedValue(null);
      vi.spyOn(auditRepository, 'findById').mockResolvedValue(mockAudit as any);

      await expect(
        executiveAdvisorService.generateExecutiveAnalysis({
          auditId: 'audit-123',
          organizationId: 'org-different',
        })
      ).rejects.toThrow('Forbidden');
    });
  });
});
