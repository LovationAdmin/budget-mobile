import api from './api';
import { ENDPOINTS } from '@/constants/api';
import type { Budget, BudgetData } from '@/types';

export const BudgetService = {
  async list(): Promise<Budget[]> {
    const { data } = await api.get(ENDPOINTS.BUDGETS);
    return data;
  },

  async get(id: string): Promise<Budget> {
    const { data } = await api.get(ENDPOINTS.BUDGET(id));
    return data;
  },

  async getData(id: string): Promise<BudgetData> {
    const { data } = await api.get(ENDPOINTS.BUDGET_DATA(id));
    return data;
  },

  async create(payload: { name: string; description?: string; currency?: string }): Promise<Budget> {
    const { data } = await api.post(ENDPOINTS.BUDGETS, payload);
    return data;
  },

  async update(id: string, payload: Partial<Budget>): Promise<Budget> {
    const { data } = await api.put(ENDPOINTS.BUDGET(id), payload);
    return data;
  },

  async updateData(id: string, payload: Partial<BudgetData>): Promise<BudgetData> {
    const { data } = await api.put(ENDPOINTS.BUDGET_DATA(id), payload);
    return data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(ENDPOINTS.BUDGET(id));
  },

  async invite(budgetId: string, email: string, role: string): Promise<void> {
    await api.post(ENDPOINTS.BUDGET_INVITE(budgetId), { email, role });
  },

  async removeMember(budgetId: string, memberId: string): Promise<void> {
    await api.delete(ENDPOINTS.REMOVE_MEMBER(budgetId, memberId));
  },

  async cancelInvitation(budgetId: string, invitationId: string): Promise<void> {
    await api.delete(ENDPOINTS.CANCEL_INVITATION(budgetId, invitationId));
  },
};
