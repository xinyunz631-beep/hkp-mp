import {
  bindBffCrmLegacyMember,
  fetchBffCrmProfile,
  updateBffCrmProfile,
  type BffCrmGender,
  type BffCrmProfile,
  type BffCrmProfileUpdateRequest,
} from '@/core/services/bff-crm-api';
import { resolveMockData, withServiceFallback } from '@/core/services/mock';
import type { LoginUserProfile } from '@/core/types/auth';
import {
  DEFAULT_MEMBER_AVATAR_URL,
  DEFAULT_MEMBER_GROWTH_VALUE,
  DEFAULT_MEMBER_LEVEL_ID,
  DEFAULT_MEMBER_LEVEL_NAME,
  DEFAULT_MEMBER_LEVEL_NO,
} from '@/core/utils/member-profile';

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
  'nickname' | 'avatarUrl' | 'mobile' | 'idCardNo' | 'birthday' | 'gender' | 'regionText' | 'plateNo'
>>;

export interface MemberAvatarUploadResult {
  id: string;
  fileUrl: string;
}

export interface LegacyMemberBindPayload {
  mobile: string;
}

interface MemberProfileApiData {
  memberId: string;
  nickName: string;
  avatarUrl: string;
  mobile: string;
  certificateNo: string;
  birthday: string;
  gender: MemberProfileGender;
  regionName: string;
  carNo: string;
  onlineStoreName: string;
  legacyBindStatus: MemberProfileLegacyStatus;
  levelId: string;
  levelNo: number;
  levelName: string;
  growthValue: number;
  points: number;
}

interface MemberAvatarUploadApiResult {
  fileId: string;
  url: string;
}

let memberProfileApiData: MemberProfileApiData = {
  memberId: '9000000000001001',
  nickName: '微信用户',
  avatarUrl: DEFAULT_MEMBER_AVATAR_URL,
  mobile: '13333333333',
  certificateNo: '',
  birthday: '',
  gender: MEMBER_PROFILE_GENDER_UNKNOWN,
  regionName: '',
  carNo: '',
  onlineStoreName: '',
  legacyBindStatus: MEMBER_PROFILE_LEGACY_UNBOUND,
  levelId: DEFAULT_MEMBER_LEVEL_ID,
  levelNo: DEFAULT_MEMBER_LEVEL_NO,
  levelName: DEFAULT_MEMBER_LEVEL_NAME,
  growthValue: DEFAULT_MEMBER_GROWTH_VALUE,
  points: 1280,
};

function normalizeMemberProfile(apiData: MemberProfileApiData): MemberProfileData {
  return {
    id: apiData.memberId,
    nickname: apiData.nickName,
    avatarUrl: apiData.avatarUrl,
    mobile: apiData.mobile,
    idCardNo: apiData.certificateNo,
    birthday: apiData.birthday,
    gender: apiData.gender,
    regionText: apiData.regionName,
    plateNo: apiData.carNo,
    onlineStoreText: apiData.onlineStoreName,
    legacyStatus: apiData.legacyBindStatus,
    levelId: apiData.levelId,
    levelNo: apiData.levelNo,
    levelName: apiData.levelName,
    growthValue: apiData.growthValue,
    points: apiData.points,
  };
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

function normalizeBffCrmProfile(profile: BffCrmProfile): MemberProfileApiData {
  return {
    memberId: profile.memberNo,
    nickName: profile.nickName || memberProfileApiData.nickName,
    avatarUrl: profile.avatarUrl || DEFAULT_MEMBER_AVATAR_URL,
    mobile: profile.phone || '',
    certificateNo: profile.idCardNo || '',
    birthday: profile.birthday || '',
    gender: normalizeBffGender(profile.gender),
    regionName: profile.regionName || '',
    carNo: profile.carPlateNo || '',
    onlineStoreName: profile.onlineStoreUrl || '',
    legacyBindStatus: memberProfileApiData.legacyBindStatus,
    levelId: profile.levelCode || DEFAULT_MEMBER_LEVEL_ID,
    levelNo: profile.levelNo || DEFAULT_MEMBER_LEVEL_NO,
    levelName: profile.levelName || DEFAULT_MEMBER_LEVEL_NAME,
    growthValue: profile.growthValue || DEFAULT_MEMBER_GROWTH_VALUE,
    points: memberProfileApiData.points,
  };
}

function normalizeAvatarUploadResult(apiResult: MemberAvatarUploadApiResult): MemberAvatarUploadResult {
  return {
    id: apiResult.fileId,
    fileUrl: apiResult.url,
  };
}

function applyMemberProfilePatch(payload: MemberProfileUpdatePayload) {
  memberProfileApiData = {
    ...memberProfileApiData,
    ...(payload.nickname !== undefined ? { nickName: payload.nickname } : {}),
    ...(payload.avatarUrl !== undefined ? { avatarUrl: payload.avatarUrl } : {}),
    ...(payload.mobile !== undefined ? { mobile: payload.mobile } : {}),
    ...(payload.idCardNo !== undefined ? { certificateNo: payload.idCardNo } : {}),
    ...(payload.birthday !== undefined ? { birthday: payload.birthday } : {}),
    ...(payload.gender !== undefined ? { gender: payload.gender } : {}),
    ...(payload.regionText !== undefined ? { regionName: payload.regionText } : {}),
    ...(payload.plateNo !== undefined ? { carNo: payload.plateNo } : {}),
  };
  return memberProfileApiData;
}

function toBffProfileUpdatePayload(payload: MemberProfileUpdatePayload): BffCrmProfileUpdateRequest {
  return {
    ...(payload.nickname !== undefined ? { nickName: payload.nickname } : {}),
    ...(payload.avatarUrl !== undefined ? { avatarUrl: payload.avatarUrl } : {}),
    ...(payload.mobile !== undefined ? { phone: payload.mobile } : {}),
    ...(payload.idCardNo !== undefined ? { idCardNo: payload.idCardNo } : {}),
    ...(payload.birthday !== undefined ? { birthday: payload.birthday } : {}),
    ...(payload.gender !== undefined ? { gender: toBffGender(payload.gender) } : {}),
    ...(payload.regionText !== undefined ? { regionName: payload.regionText } : {}),
    ...(payload.plateNo !== undefined ? { carPlateNo: payload.plateNo } : {}),
  };
}

// 拉取会员资料，头像和昵称以该接口结果为展示事实源。
export async function fetchMemberProfileData() {
  const apiData = await withServiceFallback(async () => {
    const profile = await fetchBffCrmProfile();
    memberProfileApiData = normalizeBffCrmProfile(profile);
    return memberProfileApiData;
  }, memberProfileApiData);
  return normalizeMemberProfile(apiData);
}

// 上传会员头像，真实接口接入后只需要替换上传实现和返回字段归一。
export async function uploadMemberAvatarImage(filePath: string) {
  const apiResult: MemberAvatarUploadApiResult = {
    fileId: '9000000000002001',
    url: filePath,
  };
  const uploadResult = await resolveMockData<MemberAvatarUploadApiResult>(apiResult, 300);

  return normalizeAvatarUploadResult(uploadResult);
}

// 更新会员资料，页面不直接改全局会员信息，成功后使用接口返回值同步。
export async function updateMemberProfile(payload: MemberProfileUpdatePayload) {
  const fallbackProfile = applyMemberProfilePatch(payload);
  const apiData = await withServiceFallback(async () => {
    const profile = await updateBffCrmProfile(toBffProfileUpdatePayload(payload));
    memberProfileApiData = normalizeBffCrmProfile(profile);
    return memberProfileApiData;
  }, fallbackProfile);

  return normalizeMemberProfile(apiData);
}

// 绑定老会员手机号，真实接口接入后由这里处理历史会员核验和资料回写。
export async function bindLegacyMember(payload: LegacyMemberBindPayload) {
  const fallbackProfile: MemberProfileApiData = {
    ...memberProfileApiData,
    mobile: payload.mobile,
    legacyBindStatus: MEMBER_PROFILE_LEGACY_BOUND,
  };
  memberProfileApiData = fallbackProfile;
  const apiData = await withServiceFallback(async () => {
    const result = await bindBffCrmLegacyMember(payload.mobile);
    const profile = await fetchBffCrmProfile();
    memberProfileApiData = {
      ...normalizeBffCrmProfile(profile),
      legacyBindStatus: result.bound === false ? MEMBER_PROFILE_LEGACY_UNBOUND : MEMBER_PROFILE_LEGACY_BOUND,
    };
    return memberProfileApiData;
  }, fallbackProfile);

  return normalizeMemberProfile(apiData);
}

// 将会员资料接口结果转换为全局登录态可承载的字段，避免页面各自拼 profile。
export function buildLoginProfileFromMemberProfile(
  profile: MemberProfileData,
  currentProfile?: LoginUserProfile,
): LoginUserProfile {
  return {
    id: profile.id || currentProfile?.id || profile.mobile,
    nickname: profile.nickname || currentProfile?.nickname || '微信用户',
    avatarUrl: profile.avatarUrl || currentProfile?.avatarUrl || DEFAULT_MEMBER_AVATAR_URL,
    mobile: profile.mobile || currentProfile?.mobile || '',
    levelId: profile.levelId || currentProfile?.levelId || DEFAULT_MEMBER_LEVEL_ID,
    levelNo: profile.levelNo || currentProfile?.levelNo || DEFAULT_MEMBER_LEVEL_NO,
    levelName: profile.levelName || currentProfile?.levelName || DEFAULT_MEMBER_LEVEL_NAME,
    growthValue: profile.growthValue ?? currentProfile?.growthValue ?? DEFAULT_MEMBER_GROWTH_VALUE,
    points: profile.points ?? currentProfile?.points ?? 0,
  };
}
