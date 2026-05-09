import api from './api';
import { ENDPOINTS } from '@/constants/api';

export interface TOTPSetupResponse {
  secret: string;
  qr_code_url: string; // otpauth:// URI used to render the QR
  backup_codes?: string[];
}

export const TwoFactorService = {
  async setup(): Promise<TOTPSetupResponse> {
    const { data } = await api.post<TOTPSetupResponse>(ENDPOINTS.TFA_SETUP);
    return data;
  },

  async verify(code: string): Promise<void> {
    await api.post(ENDPOINTS.TFA_VERIFY, { code });
  },

  async disable(password: string, code: string): Promise<void> {
    await api.post(ENDPOINTS.TFA_DISABLE, { password, code });
  },
};
