export interface LoginUserProfile {
  id: string;
  nickname: string;
  avatarUrl?: string;
  mobile: string;
  levelName: string;
  points: number;
}

export interface LoginResult {
  token?: string;
  csession?: string;
  user: LoginUserProfile;
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
