import {
  bindBffCrmLegacyMember,
  fetchBffCrmProfile,
  updateBffCrmProfile,
  type BffCrmGender,
  type BffCrmProfile,
  type BffCrmProfileUpdateRequest,
} from '@/core/services/bff-crm-api';
import { authorizeBffMiniProgramPhone, uploadBffImage } from '@/core/services/bff-api';
import { syncMemberStatus } from '@/core/services/auth';
import { rootStore } from '@/core/store';
import type { LoginUserProfile } from '@/core/types/auth';
import type { WechatPhoneCredential } from '@/core/wechat/auth';
import {
  DEFAULT_MEMBER_AVATAR_URL,
  DEFAULT_MEMBER_GROWTH_VALUE,
  DEFAULT_MEMBER_LEVEL_ID,
  DEFAULT_MEMBER_LEVEL_NAME,
  DEFAULT_MEMBER_LEVEL_NO,
} from '@/core/utils/member-profile';
import { resolveLegacyBindAuthorizedPhone } from './legacy-bind-phone';

export const MEMBER_PROFILE_GENDER_UNKNOWN = 0;
export const MEMBER_PROFILE_GENDER_MALE = 1;
export const MEMBER_PROFILE_GENDER_FEMALE = 2;
export const MEMBER_PROFILE_LEGACY_UNBOUND = 0;
export const MEMBER_PROFILE_LEGACY_BOUND = 1;

export type MemberProfileGender =
  | typeof MEMBER_PROFILE_GENDER_UNKNOWN
  | typeof MEMBER_PROFILE_GENDER_MALE
  | typeof MEMBER_PROFILE_GENDER_FEMALE;

export type MemberProfileLegacyStatus =
  | typeof MEMBER_PROFILE_LEGACY_UNBOUND
  | typeof MEMBER_PROFILE_LEGACY_BOUND;

export interface MemberProfileData {
  id: string;
  nickname: string;
  avatarUrl: string;
  mobile: string;
  idCardNo: string;
  birthday: string;
  gender: MemberProfileGender;
  regionText: string;
  plateNo: string;
  onlineStoreText: string;
  legacyStatus: MemberProfileLegacyStatus;
  levelId: string;
  levelNo: number;
  levelName: string;
  growthValue: number;
  points: number;
}

export type MemberProfileUpdatePayload = Partial<Pick<
  MemberProfileData,
  'avatarUrl' | 'idCardNo' | 'gender' | 'regionText' | 'plateNo'
>>;

export interface MemberAvatarUploadResult {
  id: string;
  fileUrl: string;
}

export interface LegacyMemberBindPayload {
  mobile: string;
}

function normalizeBffGender(gender?: BffCrmGender): MemberProfileGender {
  if (gender === 'MALE') return MEMBER_PROFILE_GENDER_MALE;
  if (gender === 'FEMALE') return MEMBER_PROFILE_GENDER_FEMALE;
  return MEMBER_PROFILE_GENDER_UNKNOWN;
}

function toBffGender(gender?: MemberProfileGender): BffCrmGender | undefined {
  if (gender === MEMBER_PROFILE_GENDER_MALE) return 'MALE';
  if (gender === MEMBER_PROFILE_GENDER_FEMALE) return 'FEMALE';
  if (gender === MEMBER_PROFILE_GENDER_UNKNOWN) return 'UNKNOWN';
  return undefined;
}

function normalizeBffCrmProfile(
  profile: BffCrmProfile,
  legacyStatus: MemberProfileLegacyStatus = MEMBER_PROFILE_LEGACY_UNBOUND,
): MemberProfileData {
  const mobile = profile.phone || '';
  const growthValue = profile.growthValue ?? DEFAULT_MEMBER_GROWTH_VALUE;
  const pointsBalance = profile.pointsBalance ?? 0;

  return {
    id: mobile,
    nickname: profile.nickName || '微信用户',
    avatarUrl: profile.avatarUrl || DEFAULT_MEMBER_AVATAR_URL,
    mobile,
    idCardNo: profile.idCardNo || '',
    birthday: profile.birthday || '',
    gender: normalizeBffGender(profile.gender),
    regionText: profile.regionName || '',
    plateNo: profile.carPlateNo || '',
    onlineStoreText: profile.onlineStoreUrl || '',
    legacyStatus,
    levelId: profile.levelCode || DEFAULT_MEMBER_LEVEL_ID,
    levelNo: profile.levelNo || DEFAULT_MEMBER_LEVEL_NO,
    levelName: profile.levelName || DEFAULT_MEMBER_LEVEL_NAME,
    growthValue,
    points: pointsBalance,
  };
}

function toBffProfileUpdatePayload(payload: MemberProfileUpdatePayload): BffCrmProfileUpdateRequest {
  return {
    ...(payload.avatarUrl !== undefined ? { avatarUrl: payload.avatarUrl } : {}),
    ...(payload.idCardNo !== undefined ? { idCardNo: payload.idCardNo } : {}),
    ...(payload.gender !== undefined ? { gender: toBffGender(payload.gender) } : {}),
    ...(payload.regionText !== undefined ? { regionName: payload.regionText } : {}),
    ...(payload.plateNo !== undefined ? { carPlateNo: payload.plateNo } : {}),
  };
}

function syncGlobalMemberProfile(profile: MemberProfileData) {
  rootStore.member.setProfile(buildLoginProfileFromMemberProfile(profile));
}

// 拉取会员资料，头像和昵称以该接口结果为展示事实源。
export async function fetchMemberProfileData() {
  const profile = normalizeBffCrmProfile(await fetchBffCrmProfile());
  syncGlobalMemberProfile(profile);
  return profile;
}

// 上传会员头像，使用真实 BFF 图片上传接口返回的线上 URL。
export async function uploadMemberAvatarImage(filePath: string) {
  const uploadResult = await uploadBffImage(filePath);
  return {
    id: uploadResult.imageUrl,
    fileUrl: uploadResult.imageUrl,
  };
}

// 更新会员资料，成功后同步全局会员信息，并用当前 session 刷新 member/status。
export async function updateMemberProfile(payload: MemberProfileUpdatePayload) {
  const profile = normalizeBffCrmProfile(await updateBffCrmProfile(toBffProfileUpdatePayload(payload)));
  syncGlobalMemberProfile(profile);
  await syncMemberStatus({ silent: true });
  return profile;
}

// 使用微信授权得到的昵称更新会员资料，不开放普通手动编辑入口。
export async function updateMemberWechatNickname(nickname: string) {
  const nextNickname = nickname.trim();
  if (!nextNickname) throw new Error('微信昵称为空');

  const profile = normalizeBffCrmProfile(await updateBffCrmProfile({ nickName: nextNickname }));
  syncGlobalMemberProfile(profile);
  await syncMemberStatus({ silent: true });
  return profile;
}

// 绑定老会员手机号，接口成功后重新拉取会员资料并同步全局会员态。
export async function bindLegacyMember(payload: LegacyMemberBindPayload) {
  const result = await bindBffCrmLegacyMember(payload.mobile);
  const legacyStatus = result.bound === false ? MEMBER_PROFILE_LEGACY_UNBOUND : MEMBER_PROFILE_LEGACY_BOUND;
  const profile = normalizeBffCrmProfile(await fetchBffCrmProfile(), legacyStatus);
  syncGlobalMemberProfile(profile);
  await syncMemberStatus({ silent: true });
  return profile;
}

// 老会员绑定先走微信手机号授权，绑定手机号只取后端授权结果，不接受页面手输值。
export async function bindLegacyMemberWithWechatPhone(credential: WechatPhoneCredential) {
  if (!credential.code) throw new Error('请使用微信手机号授权绑定');

  const phoneAuthorization = await authorizeBffMiniProgramPhone({ code: credential.code });
  const authorizedPhone = resolveLegacyBindAuthorizedPhone(phoneAuthorization);
  if (!authorizedPhone) throw new Error('未获取到微信授权手机号');

  return bindLegacyMember({ mobile: authorizedPhone });
}

// 将会员资料接口结果转换为全局登录态可承载的字段，避免页面各自拼 profile。
export function buildLoginProfileFromMemberProfile(
  profile: MemberProfileData,
): LoginUserProfile {
  return {
    id: profile.id || profile.mobile,
    nickname: profile.nickname || '微信用户',
    avatarUrl: profile.avatarUrl || DEFAULT_MEMBER_AVATAR_URL,
    mobile: profile.mobile || '',
    levelId: profile.levelId || DEFAULT_MEMBER_LEVEL_ID,
    levelNo: profile.levelNo || DEFAULT_MEMBER_LEVEL_NO,
    levelName: profile.levelName || DEFAULT_MEMBER_LEVEL_NAME,
    growthValue: profile.growthValue ?? DEFAULT_MEMBER_GROWTH_VALUE,
    points: profile.points ?? 0,
  };
}
