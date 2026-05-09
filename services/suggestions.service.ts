import api from './api';
import { ENDPOINTS } from '@/constants/api';
import type { ChargeCategory, MarketSuggestion } from '@/types';

export interface CategorizeResponse {
  category: ChargeCategory | string;
  confidence?: number;
}

export interface AnalyzeChargeRequest {
  label: string;
  amount: number;
  category: string;
  budget_id?: string;
}

export interface AnalyzeChargeResponse extends MarketSuggestion {
  message?: string;
}

export const SuggestionsService = {
  /**
   * Categorize a free-text label using the budget-api Claude AI categorizer.
   * Returns 'other' as a safe fallback on any failure.
   */
  async categorize(label: string): Promise<ChargeCategory | string> {
    if (!label.trim()) return 'other';
    try {
      const { data } = await api.post<CategorizeResponse>(ENDPOINTS.CATEGORIZE, { label });
      return data.category ?? 'other';
    } catch {
      return 'other';
    }
  },

  async analyze(payload: AnalyzeChargeRequest): Promise<MarketSuggestion | null> {
    try {
      const { data } = await api.post<AnalyzeChargeResponse>(ENDPOINTS.SUGGEST_ANALYZE, payload);
      return data;
    } catch {
      return null;
    }
  },

  async bulkAnalyze(budgetId: string): Promise<{ analyzed: number }> {
    const { data } = await api.post<{ analyzed: number }>(ENDPOINTS.BULK_ANALYZE(budgetId), {});
    return data;
  },
};
