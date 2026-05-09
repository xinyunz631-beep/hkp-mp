export interface LoginUserProfile {
  id: string;
  nickname: string;
  mobile: string;
  levelName: string;
  points: number;
}

export interface LoginResult {
  token: string;
  user: LoginUserProfile;
}

export interface SilentLoginPayload {
  loginCode: string;
}

export interface PhoneLoginPayload {
  loginCode: string;
  phoneCode?: string;
  encryptedData?: string;
  iv?: string;
}

export interface ProfileLoginPayload {
  loginCode: string;
  encryptedData?: string;
  iv?: string;
  rawData?: string;
  signature?: string;
  nickname?: string;
  avatarUrl?: string;
}
