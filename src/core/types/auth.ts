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
