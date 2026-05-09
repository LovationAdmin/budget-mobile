import api from './api';
import { ENDPOINTS } from '@/constants/api';
import type { User } from '@/types';

export const UserService = {
  async getProfile(): Promise<User> {
    const { data } = await api.get(ENDPOINTS.PROFILE);
    return data;
  },

  async updateProfile(payload: Partial<Pick<User, 'name' | 'avatar_url'>>): Promise<User> {
    const { data } = await api.put(ENDPOINTS.PROFILE, payload);
    return data;
  },

  async changePassword(current_password: string, new_password: string): Promise<void> {
    await api.post(ENDPOINTS.CHANGE_PASSWORD, { current_password, new_password });
  },

  async deleteAccount(password: string): Promise<void> {
    await api.delete(ENDPOINTS.DELETE_ACCOUNT, { data: { password } });
  },
};
