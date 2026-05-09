import api from './api';
import { ENDPOINTS } from '@/constants/api';
import type { Budget, BudgetDataEnvelope, BudgetDataPayload, CreateBudgetRequest } from '@/types';

export const BudgetService = {
  async list(): Promise<Budget[]> {
    const { data } = await api.get<Budget[]>(ENDPOINTS.BUDGETS);
    return data;
  },

  async get(id: string): Promise<Budget> {
    const { data } = await api.get<Budget>(ENDPOINTS.BUDGET(id));
    return data;
  },

  async getData(id: string): Promise<BudgetDataEnvelope> {
    const { data } = await api.get<BudgetDataEnvelope>(ENDPOINTS.BUDGET_DATA(id));
    return data;
  },

  async create(payload: CreateBudgetRequest): Promise<Budget> {
    const { data } = await api.post<Budget>(ENDPOINTS.BUDGETS, {
      name:     payload.name,
      location: payload.location ?? 'FR',
      currency: payload.currency ?? 'EUR',
    });
    return data;
  },

  async update(id: string, payload: Partial<Budget>): Promise<Budget> {
    const { data } = await api.put<Budget>(ENDPOINTS.BUDGET(id), payload);
    return data;
  },

  async updateData(id: string, payload: BudgetDataPayload): Promise<BudgetDataEnvelope> {
    const { data } = await api.put<BudgetDataEnvelope>(ENDPOINTS.BUDGET_DATA(id), payload);
    return data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(ENDPOINTS.BUDGET(id));
  },

  async invite(budgetId: string, email: string): Promise<void> {
    await api.post(ENDPOINTS.BUDGET_INVITE(budgetId), { email });
  },

  async listInvitations(budgetId: string) {
    const { data } = await api.get(ENDPOINTS.BUDGET_INVITES(budgetId));
    return data;
  },

  async cancelInvitation(budgetId: string, invitationId: string): Promise<void> {
    await api.delete(ENDPOINTS.CANCEL_INVITE(budgetId, invitationId));
  },

  async removeMember(budgetId: string, memberId: string): Promise<void> {
    await api.delete(ENDPOINTS.REMOVE_MEMBER(budgetId, memberId));
  },

  async acceptInvitation(token: string): Promise<void> {
    await api.post(ENDPOINTS.ACCEPT_INVITE, { token });
  },
};
