import { makeAutoObservable } from 'mobx';
import { MINI_STORAGE_KEYS } from '@/core/constants/storage';
import { buildLoginUserProfile, hasLoginIdentity } from '@/core/auth/identity';
import { getCache, removeCache, setCache } from '@/core/utils/cache';
import type { LoginUserProfile } from '@/core/types/auth';

export interface MemberSnapshot {
  csession: string;
  refreshToken?: string;
  signSecret?: string;
  profile?: LoginUserProfile;
}

export class MemberStore {
  csession = '';
  refreshToken = '';
  signSecret = '';
  profile?: LoginUserProfile;
  memberStatusChecked = false;

  // 初始化会员全局状态，承载后端会话和会员资料。
  constructor() {
    makeAutoObservable(this);
    this.restoreMember();
  }

  // 判断当前是否已有后端 CSESSION，用于 request 排队等待。
  get hasCsession() {
    return Boolean(this.csession);
  }

  // 判断当前是否已具备会员登录身份，具体字段由 auth/identity 统一控制。
  get isLoggedIn() {
    return hasLoginIdentity({
      csession: this.csession,
      user: this.profile,
    });
  }

  // 页面统一读取的会员资料，头像昵称手机号等级等用户信息都维护在 member store。
  get memberInfo() {
    return this.profile;
  }

  // 同步后端会话，不改变已有会员资料。
  setCsession(csession: string) {
    this.csession = csession;
    this.persistMember();
  }

  // 同步后端完整认证会话，包含后续刷新令牌和高风险写接口签名密钥。
  setAuthSession(
    payload: { accessToken: string; refreshToken?: string; signSecret?: string },
    options: { resetProfile?: boolean } = {},
  ) {
    this.csession = payload.accessToken;
    this.refreshToken = payload.refreshToken || '';
    this.signSecret = payload.signSecret || '';
    if (options.resetProfile) {
      this.profile = undefined;
      this.memberStatusChecked = false;
    }
    this.persistMember();
  }

  // 仅清空后端请求凭证；下次需要会员身份时重新拉取会员状态。
  clearCsession() {
    this.csession = '';
    this.refreshToken = '';
    this.signSecret = '';
    this.profile = undefined;
    this.memberStatusChecked = false;
    this.persistMember();
  }

  // 同步 V2 返回的会员资料，只有存在手机号时才视为真实登录资料。
  setProfileFromAuth(payload: Partial<LoginUserProfile> = {}) {
    const profile = buildLoginUserProfile(payload);
    if (!profile) {
      this.profile = undefined;
      this.memberStatusChecked = true;
      this.persistMember();
      return;
    }

    this.profile = profile;
    this.memberStatusChecked = true;
    this.persistMember();
  }

  // 同步完整会员资料，用于手机号授权或后续会员信息接口刷新。
  setMember(csession: string, profile: LoginUserProfile) {
    this.csession = csession;
    this.refreshToken = '';
    this.signSecret = '';
    this.profile = profile;
    this.memberStatusChecked = true;
    this.persistMember();
  }

  // 同步会员资料，不覆盖已经建立的 CSESSION。
  setProfile(profile: LoginUserProfile) {
    this.profile = profile;
    this.memberStatusChecked = true;
    this.persistMember();
  }

  // 应用后端会员状态接口结果；没有 memberInfo 时明确记录已查但未成为会员。
  applyMemberStatus(profile?: LoginUserProfile) {
    this.profile = profile;
    this.memberStatusChecked = true;
    this.persistMember();
  }

  // 清空会员资料，但保留当前 BFF token，适用于状态接口确认未成为会员。
  clearProfile(checked = true) {
    this.profile = undefined;
    this.memberStatusChecked = checked;
    this.persistMember();
  }

  // 清空会员登录态，用于用户主动退出登录后的全局状态回收。
  clearMember() {
    this.csession = '';
    this.refreshToken = '';
    this.signSecret = '';
    this.profile = undefined;
    this.memberStatusChecked = false;
    removeCache(MINI_STORAGE_KEYS.member);
  }

  // 从本地缓存恢复会员状态，减少重复授权。
  restoreMember() {
    const snapshot = getCache<MemberSnapshot>(MINI_STORAGE_KEYS.member);
    if (!snapshot) return;

    this.csession = snapshot.csession;
    this.refreshToken = snapshot.refreshToken || '';
    this.signSecret = snapshot.signSecret || '';
    this.profile = snapshot.profile;
    this.memberStatusChecked = false;
  }

  // 持久化会员状态，统一管理本地缓存 key。
  private persistMember() {
    setCache<MemberSnapshot>(MINI_STORAGE_KEYS.member, {
      csession: this.csession,
      refreshToken: this.refreshToken,
      signSecret: this.signSecret,
      profile: this.profile,
    });
  }
}
