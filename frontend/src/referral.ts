// Referral API helpers
import { api } from './api';

export type ReferralFriend = {
  name: string;
  rewarded: boolean;
  joined_at: string | null;
};

export type ReferralStats = {
  code: string;
  share_link: string;
  deep_link: string;
  invited_total: number;
  qualified: number;
  pending: number;
  rewards_count: number;
  bonus_premium_until: string | null;
  current_tier_effective: string;
  friends: ReferralFriend[];
};

export async function getMyReferral(): Promise<ReferralStats> {
  const { data } = await api.get('/referrals/me');
  return data;
}

export async function redeemReferral(code: string): Promise<{ ok: boolean; referrer_name: string }> {
  const { data } = await api.post('/referrals/redeem', { code });
  return data;
}

export async function lookupReferral(code: string): Promise<{ code: string; referrer_name: string } | null> {
  try {
    const { data } = await api.get(`/referrals/lookup/${encodeURIComponent(code.trim().toUpperCase())}`);
    return data;
  } catch {
    return null;
  }
}
