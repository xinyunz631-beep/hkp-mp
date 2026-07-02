import { useEffect, useRef, useState } from 'react';
import { Button, Input, Picker, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppPopup } from '@/core/components/AppPopup';
import { MemberAvatar } from '@/core/components/MemberAvatar';
import { PageShare, PageShell } from '@/core/components/PageShell';
import { MINI_MAIN_ROUTES, MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { logout } from '@/core/services/auth';
import { resolveErrorMessage } from '@/core/utils/error-message';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { showWechatConfirm, showWechatToast } from '@/core/utils/wechat-actions';
import {
  MEMBER_PROFILE_GENDER_FEMALE,
  MEMBER_PROFILE_GENDER_MALE,
  MEMBER_PROFILE_GENDER_UNKNOWN,
  fetchMemberProfileData,
  updateMemberProfile,
  updateMemberWechatNickname,
  type MemberProfileData,
  type MemberProfileGender,
  type MemberProfileUpdatePayload,
} from '@/pkg-member/services/profile';
import './index.scss';

type EditableField = 'idCardNo' | 'plateNo';

interface ChooseAvatarEvent {
  detail?: {
    avatarUrl?: string;
  };
}

interface EditConfig {
  field: EditableField;
  title: string;
  desc: string;
  placeholder: string;
  maxlength: number;
  inputType?: 'text' | 'number' | 'idcard';
}

const GENDER_OPTIONS: Array<{ value: MemberProfileGender; text: string }> = [
  { value: MEMBER_PROFILE_GENDER_UNKNOWN, text: '未知' },
  { value: MEMBER_PROFILE_GENDER_MALE, text: '男' },
  { value: MEMBER_PROFILE_GENDER_FEMALE, text: '女' },
];
const BIRTHDAY_PICKER_START_DATE = '1900-01-01';
const BIRTHDAY_PICKER_DEFAULT_DATE = '1990-01-01';

// 生成 date Picker 需要的 YYYY-MM-DD 文本，避免传空日期导致微信端渲染异常。
function formatBirthdayPickerDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function resolveTextValue(value: string, fallback = '未知') {
  return value.trim() || fallback;
}

function resolveGenderText(gender: MemberProfileGender) {
  return GENDER_OPTIONS.find((option) => option.value === gender)?.text || '未知';
}

function resolveGenderIndex(gender: MemberProfileGender) {
  const index = GENDER_OPTIONS.findIndex((option) => option.value === gender);
  return index >= 0 ? index : 0;
}

function normalizePlateNo(value: string) {
  return value.trim().replace(/\s+/g, '').toUpperCase();
}

function getEditConfig(field: EditableField): EditConfig {
  if (field === 'idCardNo') {
    return {
      field,
      title: '更换身份证号',
      desc: '请输入本人身份证号',
      placeholder: '请输入身份证号',
      maxlength: 18,
      inputType: 'idcard',
    };
  }

  return {
    field,
    title: '更换车牌号',
    desc: '请输入车牌号：如 浙A88888',
    placeholder: '请输入车牌号',
    maxlength: 8,
    inputType: 'text',
  };
}

function validateEditValue(field: EditableField, value: string) {
  if (field === 'idCardNo' && !/^(\d{15}|\d{17}[\dX])$/.test(value)) return '请输入正确的身份证号';
  if (field === 'plateNo' && !/^[\u4e00-\u9fa5][A-Z][A-Z0-9]{5,6}$/.test(value)) return '请输入正确的车牌号';

  return '';
}

// 渲染会员资料页，资料展示和头像昵称更新都以会员信息接口返回值为准。
const MemberProfilePage = observer(function MemberProfilePage() {
  const [profileData, setProfileData] = useState<MemberProfileData>();
  const [editingField, setEditingField] = useState<EditableField>();
  const [editingValue, setEditingValue] = useState('');
  const [nicknameDraft, setNicknameDraft] = useState('');
  const nicknameSubmittingRef = useRef('');
  const nicknameCommittedRef = useRef('');
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextProfile = await fetchMemberProfileData();
      setProfileData(nextProfile);
    },
    refreshOnShow: true,
    loginRequired: true,
    loginReason: '登录后可查看个人信息',
  });

  useEffect(() => {
    if (!profileData) return;

    setNicknameDraft(profileData.nickname === '微信用户' ? '' : profileData.nickname || '');
  }, [profileData?.nickname]);

  function syncProfile(nextProfile: MemberProfileData) {
    setProfileData(nextProfile);
  }

  async function commitProfileUpdate(payload: MemberProfileUpdatePayload, successText: string) {
    const nextProfile = await pageRuntime.withLoading(() => updateMemberProfile(payload));
    syncProfile(nextProfile);
    await showWechatToast(successText, 'success');
  }

  async function updateAvatarFromWechat(avatarUrl: string) {
    if (!avatarUrl) return;

    const nextProfile = await pageRuntime.withLoading(() => updateMemberProfile({ avatarUrl }));
    syncProfile(nextProfile);
    await showWechatToast('头像已更新', 'success');
  }

  async function handleWechatAvatarChoose(event: ChooseAvatarEvent) {
    const avatarUrl = event.detail?.avatarUrl?.trim();

    if (!avatarUrl) {
      await showWechatToast('未获取到微信头像');
      return;
    }

    try {
      await updateAvatarFromWechat(avatarUrl);
    } catch (error) {
      await showWechatToast(resolveErrorMessage(error, '头像更新失败'));
    }
  }

  async function handleNicknameCommit(value: string) {
    const nextNickname = value.trim();
    const currentNickname = profileData?.nickname === '微信用户' ? '' : profileData?.nickname?.trim() || '';

    if (!nextNickname || nextNickname === currentNickname) {
      setNicknameDraft(currentNickname);
      return;
    }
    if (nextNickname === nicknameCommittedRef.current) {
      setNicknameDraft(nextNickname);
      return;
    }
    if (nicknameSubmittingRef.current === nextNickname) return;

    nicknameSubmittingRef.current = nextNickname;

    try {
      const nextProfile = await pageRuntime.withLoading(() => updateMemberWechatNickname(nextNickname));
      nicknameCommittedRef.current = nextNickname;
      syncProfile(nextProfile);
      await showWechatToast('昵称已更新', 'success');
    } catch (error) {
      setNicknameDraft(currentNickname);
      await showWechatToast(resolveErrorMessage(error, '昵称更新失败'));
    } finally {
      if (nicknameSubmittingRef.current === nextNickname) {
        nicknameSubmittingRef.current = '';
      }
    }
  }

  function openEditPopup(field: EditableField, value: string) {
    setEditingField(field);
    setEditingValue(value);
  }

  function closeEditPopup() {
    setEditingField(undefined);
    setEditingValue('');
  }

  async function handleEditConfirm() {
    if (!editingField) return;

    const config = getEditConfig(editingField);
    const nextValue = config.field === 'plateNo'
      ? normalizePlateNo(editingValue)
      : config.field === 'idCardNo'
        ? editingValue.trim().toUpperCase()
        : editingValue.trim();
    const errorMessage = validateEditValue(config.field, nextValue);

    if (errorMessage) {
      await showWechatToast(errorMessage);
      return;
    }

    const payload = { [config.field]: nextValue } as MemberProfileUpdatePayload;
    await commitProfileUpdate(payload, '资料已更新');
    closeEditPopup();
  }

  async function handleGenderChange(index: number) {
    const nextGender = GENDER_OPTIONS[index]?.value ?? MEMBER_PROFILE_GENDER_UNKNOWN;
    if (nextGender === profileData?.gender) return;
    await commitProfileUpdate({ gender: nextGender }, '性别已更新');
  }

  async function handleRegionChange(value: string[]) {
    const nextRegion = value.filter(Boolean).join(' ');
    if (!nextRegion || nextRegion === profileData?.regionText) return;
    await commitProfileUpdate({ regionText: nextRegion }, '地区已更新');
  }

  // 生日只允许首次补填；已有生日时页面不会再触发更新入口。
  async function handleBirthdayChange(value: string) {
    const nextBirthday = value.trim();
    if (!nextBirthday || profileData?.birthday) return;
    await commitProfileUpdate({ birthday: nextBirthday }, '生日已更新');
  }

  async function handleLogoutTap() {
    const confirmed = await showWechatConfirm({
      title: '退出登录',
      content: '退出后需要重新授权手机号才能使用会员服务。',
      confirmText: '退出登录',
      cancelText: '取消',
    });
    if (!confirmed) return;

    await pageRuntime.withLoading(logout);
    await showWechatToast('已退出登录', 'success');
    navigateToMiniRoute(MINI_MAIN_ROUTES.member);
  }

  function renderArrow(showArrow = true) {
    return showArrow ? <AppIcon name="arrowRight" size={14} color="#9aa0a6" /> : null;
  }

  function renderRow(label: string, value: string, options: {
    placeholder?: string;
    showArrow?: boolean;
    onClick?: () => void;
  } = {}) {
    const showArrow = options.showArrow ?? Boolean(options.onClick);
    const displayValue = value || options.placeholder || '';

    return (
      <View
        className={`_pg-row ${showArrow ? '_pg-row--clickable' : ''}`}
        onClick={options.onClick}
      >
        <Text className="_pg-row_label">{label}</Text>
        <View className="_pg-row_value-wrap">
          <Text className={`_pg-row_value ${value ? '' : '_pg-row_value--placeholder'}`}>
            {displayValue}
          </Text>
          {renderArrow(showArrow)}
        </View>
      </View>
    );
  }

  function renderNicknameRow() {
    return (
      <View className="_pg-row _pg-row--nickname">
        <Text className="_pg-row_label">姓名</Text>
        <View className="_pg-row_value-wrap">
          <Input
            className="_pg-row_nickname-input"
            type="nickname"
            value={nicknameDraft}
            maxlength={30}
            placeholder="微信用户"
            placeholderClass="_pg-row_nickname-placeholder"
            confirmType="done"
            onInput={(event) => {
              setNicknameDraft(event.detail.value || '');
            }}
            onBlur={(event) => {
              void handleNicknameCommit(event.detail.value || '');
            }}
            onConfirm={(event) => {
              void handleNicknameCommit(event.detail.value || nicknameDraft);
            }}
          />
          {renderArrow(true)}
        </View>
      </View>
    );
  }

  function renderBirthdayRow() {
    const birthday = profileData?.birthday || '';
    if (birthday) {
      return renderRow('生日', birthday, { showArrow: false });
    }

    return (
      <Picker
        mode="date"
        value={BIRTHDAY_PICKER_DEFAULT_DATE}
        start={BIRTHDAY_PICKER_START_DATE}
        end={formatBirthdayPickerDate(new Date())}
        onChange={(event) => handleBirthdayChange(String(event.detail.value || '')).catch(() => undefined)}
      >
        {renderRow('生日', '', {
          placeholder: '未知',
          showArrow: true,
        })}
      </Picker>
    );
  }

  function renderEditPopup() {
    if (!editingField) return null;

    const config = getEditConfig(editingField);

    return (
      <AppPopup
        visible={Boolean(editingField)}
        className="_pg-edit-popup-shell"
        contentClassName="_pg-edit-popup-wrap"
        position="center"
        safeArea={false}
        onClose={closeEditPopup}
      >
        <View className="_pg-edit-popup">
          <Text className="_pg-edit-popup_title">{config.title}</Text>
          <Text className="_pg-edit-popup_desc">{config.desc}</Text>
          <Input
            className="_pg-edit-popup_input"
            value={editingValue}
            maxlength={config.maxlength}
            type={config.inputType || 'text'}
            placeholder={config.placeholder}
            placeholderClass="_pg-edit-popup_placeholder"
            confirmType="done"
            onConfirm={() => handleEditConfirm().catch(() => undefined)}
            onInput={(event) => {
              setEditingValue(event.detail.value || '');
            }}
          />
          <View className="_pg-edit-popup_actions">
            <View className="_pg-edit-popup_button _pg-edit-popup_button--cancel" onClick={closeEditPopup}>
              <Text>取消</Text>
            </View>
            <View className="_pg-edit-popup_button _pg-edit-popup_button--confirm" onClick={() => handleEditConfirm().catch(() => undefined)}>
              <Text>确认</Text>
            </View>
          </View>
        </View>
      </AppPopup>
    );
  }

  return pageRuntime.renderPage(() => {
    if (!profileData) return null;

    const displayAvatar = profileData.avatarUrl;
    const displayMobile = profileData.mobile;

    return (
      <View className="_pg">
        <PageShell title="个人信息" className="_pg-shell" reserveTabBarSpace={false}>
          <View className="_pg-content">
            <View className="_pg-card">
              <View className="_pg-row _pg-row--avatar">
                <Text className="_pg-row_label">头像</Text>
                <View className="_pg-row_value-wrap">
                  <Button
                    className="_pg-avatar-button"
                    openType="chooseAvatar"
                    onChooseAvatar={(event) => {
                      void handleWechatAvatarChoose(event as ChooseAvatarEvent);
                    }}
                  >
                    <MemberAvatar
                      className="_pg-avatar"
                      src={displayAvatar}
                      size="64rpx"
                    />
                  </Button>
                </View>
              </View>

              {renderNicknameRow()}
              {renderRow('手机', displayMobile, {
                placeholder: '手机号待同步',
                showArrow: false,
              })}
              {renderRow('身份证号', profileData.idCardNo, {
                placeholder: '添加身份证号',
                onClick: () => openEditPopup('idCardNo', profileData.idCardNo),
              })}
              {renderBirthdayRow()}
              <Picker
                mode="selector"
                range={GENDER_OPTIONS.map((option) => option.text)}
                value={resolveGenderIndex(profileData.gender)}
                onChange={(event) => handleGenderChange(Number(event.detail.value)).catch(() => undefined)}
              >
                {renderRow('性别', resolveGenderText(profileData.gender), { showArrow: true })}
              </Picker>
              <Picker
                mode="region"
                onChange={(event) => handleRegionChange(event.detail.value as string[]).catch(() => undefined)}
              >
                {renderRow('地区', resolveTextValue(profileData.regionText), { showArrow: true })}
              </Picker>
              {renderRow('车牌号', profileData.plateNo, {
                placeholder: '添加车牌号',
                onClick: () => openEditPopup('plateNo', profileData.plateNo),
              })}
              {renderRow('官方商城', profileData.onlineStoreText, {
                placeholder: '',
                showArrow: true,
                onClick: () => navigateToMiniRoute(MINI_PACKAGE_ROUTES.mallHome),
              })}
            </View>
            <View className="_pg-logout" onClick={() => handleLogoutTap().catch(() => undefined)}>
              <Text>退出登录</Text>
            </View>
          </View>

          <PageShare>
            {renderEditPopup()}
          </PageShare>
        </PageShell>
      </View>
    );
  });
});

export default MemberProfilePage;
