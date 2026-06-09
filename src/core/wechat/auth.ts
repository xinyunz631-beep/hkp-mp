import Taro from '@tarojs/taro';
import type { ButtonProps } from '@tarojs/components';
import { resolveErrorMessage } from '@/core/utils/error-message';

export interface WechatPhoneCredential {
  errMsg: string;
  code?: string;
  encryptedData?: string;
  iv?: string;
}

export interface WechatUserProfileCredential {
  encryptedData?: string;
  iv?: string;
  rawData?: string;
  signature?: string;
  userInfo?: Taro.UserInfo;
}

// 获取当前微信小程序 appId，异常时回落到项目配置里的默认 appId。
export function getCurrentMiniProgramAppId(fallbackAppId: string) {
  try {
    return Taro.getAccountInfoSync().miniProgram.appId || fallbackAppId;
  } catch {
    return fallbackAppId;
  }
}

// 检查微信登录态是否仍有效，用于决定是否复用本地会话。
export async function checkWechatSessionValid() {
  try {
    await Taro.checkSession();
    return true;
  } catch {
    return false;
  }
}

// 获取微信登录 code，后端用它换取 openId、unionId 或业务会话。
export async function getWechatLoginCode() {
  const result = await Taro.login();
  if (!result.code) {
    throw new Error(resolveErrorMessage(result, '微信登录凭证获取失败'));
  }

  return result.code;
}

// 拉起微信用户资料授权，适合用户主动点击后的资料补全。
export async function getWechatUserProfile(desc = '用于完善乐园会员资料'): Promise<WechatUserProfileCredential> {
  const result = await Taro.getUserProfile({ desc });
  return {
    encryptedData: result.encryptedData,
    iv: result.iv,
    rawData: result.rawData,
    signature: result.signature,
    userInfo: result.userInfo,
  };
}

// 解析微信手机号授权结果，新后端只接收 getPhoneNumber 返回的一次性 code。
export function parseWechatPhoneCredential(detail?: ButtonProps.onGetPhoneNumberEventDetail): WechatPhoneCredential | undefined {
  if (!detail?.errMsg?.includes(':ok')) return undefined;
  if (!detail.code) return undefined;

  return {
    errMsg: detail.errMsg,
    code: detail.code,
  };
}

// 解析手机号授权失败原因，优先保留微信平台原始 errMsg/msg。
export function resolveWechatPhoneCredentialMessage(
  detail?: ButtonProps.onGetPhoneNumberEventDetail,
  fallback = '未完成手机号授权',
) {
  return resolveErrorMessage(detail, fallback);
}
