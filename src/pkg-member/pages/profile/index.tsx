import { useState } from 'react';
import { Button, Input, Picker, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { AppPopup } from '@/core/components/AppPopup';
import { PageShare, PageShell } from '@/core/components/PageShell';
import { MINI_MAIN_ROUTES, MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { logout } from '@/core/services/auth';
import { resolveErrorMessage } from '@/core/utils/error-message';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { chooseWechatImages, showWechatConfirm, showWechatToast } from '@/core/utils/wechat-actions';
import {
  MEMBER_PROFILE_GENDER_FEMALE,
  MEMBER_PROFILE_GENDER_MALE,
  MEMBER_PROFILE_GENDER_UNKNOWN,
  fetchMemberProfileData,
  updateMemberProfile,
  updateMemberWechatNickname,
  uploadMemberAvatarImage,
  type MemberProfileData,
  type MemberProfileGender,
  type MemberProfileUpdatePayload,
} from '@/pkg-member/services/profile';
import './index.scss';

type EditableField = 'idCardNo' | 'plateNo';
type AvatarSourceType = 'album' | 'camera';

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
  const [avatarSheetVisible, setAvatarSheetVisible] = useState(false);
  const [nicknameSheetVisible, setNicknameSheetVisible] = useState(false);
  const [nicknameValue, setNicknameValue] = useState('');
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextProfile = await fetchMemberProfileData();
      setProfileData(nextProfile);
    },
    refreshOnShow: true,
    loginRequired: true,
    loginReason: '登录后可查看个人信息',
  });

  function syncProfile(nextProfile: MemberProfileData) {
    setProfileData(nextProfile);
  }

  async function commitProfileUpdate(payload: MemberProfileUpdatePayload, successText: string) {
    const nextProfile = await pageRuntime.withLoading(() => updateMemberProfile(payload));
    syncProfile(nextProfile);
    await showWechatToast(successText, 'success');
  }

  async function updateAvatarFromFile(filePath: string) {
    if (!filePath) return;

    await pageRuntime.withLoading(async () => {
      const uploadResult = await uploadMemberAvatarImage(filePath);
      const nextProfile = await updateMemberProfile({ avatarUrl: uploadResult.fileUrl });
      syncProfile(nextProfile);
    });
    await showWechatToast('头像已更新', 'success');
  }

  async function updateAvatarFromWechat(avatarUrl: string) {
    if (!avatarUrl) return;

    const nextProfile = await pageRuntime.withLoading(() => updateMemberProfile({ avatarUrl }));
    syncProfile(nextProfile);
    await showWechatToast('头像已更新', 'success');
  }

  function handleAvatarTap() {
    setAvatarSheetVisible(true);
  }

  function closeAvatarSheet() {
    setAvatarSheetVisible(false);
  }

  async function handleWechatAvatarChoose(event: ChooseAvatarEvent) {
    const avatarUrl = event.detail?.avatarUrl?.trim();
    closeAvatarSheet();

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

  async function handleLocalAvatarChoose(sourceType: AvatarSourceType) {
    closeAvatarSheet();
    const [filePath] = await chooseWechatImages({ count: 1, sourceType: [sourceType] });
    if (!filePath) return;

    try {
      await updateAvatarFromFile(filePath);
    } catch (error) {
      await showWechatToast(resolveErrorMessage(error, '头像更新失败'));
    }
  }

  function handleNicknameTap() {
    const currentNickname = profileData?.nickname === '微信用户' ? '' : profileData?.nickname || '';
    setNicknameValue(currentNickname);
    setNicknameSheetVisible(true);
  }

  function closeNicknameSheet() {
    setNicknameSheetVisible(false);
  }

  async function handleNicknameSave() {
    const nextNickname = nicknameValue.trim();
    if (!nextNickname) {
      await showWechatToast('请选择微信昵称');
      return;
    }

    try {
      const nextProfile = await pageRuntime.withLoading(() => updateMemberWechatNickname(nextNickname));
      syncProfile(nextProfile);
      closeNicknameSheet();
      await showWechatToast('昵称已更新', 'success');
    } catch (error) {
      await showWechatToast(resolveErrorMessage(error, '昵称更新失败'));
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

  function renderBirthdayRow() {
    const birthday = profileData?.birthday || '';
    if (birthday) {
      return renderRow('生日', birthday, { showArrow: false });
    }

    return (
      <Picker
        mode="date"
        value=""
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

  function renderAvatarSheet(displayAvatar: string) {
    return (
      <AppPopup
        visible={avatarSheetVisible}
        className="_pg-avatar-sheet-shell"
        contentClassName="_pg-avatar-sheet-wrap"
        position="bottom"
        onClose={closeAvatarSheet}
      >
        <View className="_pg-avatar-sheet">
          <Button
            className="_pg-avatar-sheet_button"
            openType="chooseAvatar"
            onChooseAvatar={(event) => {
              void handleWechatAvatarChoose(event as ChooseAvatarEvent);
            }}
          >
            <Text className="_pg-avatar-sheet_label">用微信头像</Text>
            {displayAvatar ? (
              <AppImage
                className="_pg-avatar-sheet_preview"
                src={displayAvatar}
                width={34}
                height={34}
                showErrorIcon={false}
              />
            ) : null}
          </Button>
          <View className="_pg-avatar-sheet_item" onClick={() => handleLocalAvatarChoose('album').catch(() => undefined)}>
            <Text>从相册选择</Text>
          </View>
          <View className="_pg-avatar-sheet_item" onClick={() => handleLocalAvatarChoose('camera').catch(() => undefined)}>
            <Text>拍照</Text>
          </View>
          <View className="_pg-avatar-sheet_gap" />
          <View className="_pg-avatar-sheet_item _pg-avatar-sheet_item--cancel" onClick={closeAvatarSheet}>
            <Text>取消</Text>
          </View>
        </View>
      </AppPopup>
    );
  }

  function renderNicknameSheet() {
    return (
      <AppPopup
        visible={nicknameSheetVisible}
        className="_pg-nickname-sheet-shell"
        contentClassName="_pg-nickname-sheet-wrap"
        position="bottom"
        destroyOnClose
        onClose={closeNicknameSheet}
      >
        <View className="_pg-nickname-sheet">
          <Text className="_pg-nickname-sheet_title">微信昵称</Text>
          <Input
            className="_pg-nickname-sheet_input"
            type="nickname"
            focus={nicknameSheetVisible}
            value={nicknameValue}
            maxlength={30}
            placeholder="请选择微信昵称"
            placeholderClass="_pg-nickname-sheet_placeholder"
            confirmType="done"
            onInput={(event) => {
              setNicknameValue(event.detail.value || '');
            }}
            onConfirm={() => handleNicknameSave().catch(() => undefined)}
          />
          <View className="_pg-nickname-sheet_actions">
            <View className="_pg-nickname-sheet_button _pg-nickname-sheet_button--cancel" onClick={closeNicknameSheet}>
              <Text>取消</Text>
            </View>
            <View className="_pg-nickname-sheet_button _pg-nickname-sheet_button--confirm" onClick={() => handleNicknameSave().catch(() => undefined)}>
              <Text>保存</Text>
            </View>
          </View>
        </View>
      </AppPopup>
    );
  }

  return pageRuntime.renderPage(() => {
    if (!profileData) return null;

    const displayAvatar = profileData.avatarUrl;
    const displayName = profileData.nickname;
    const displayMobile = profileData.mobile;

    return (
      <View className="_pg">
        <PageShell title="个人信息" className="_pg-shell" reserveTabBarSpace={false}>
          <View className="_pg-content">
            <View className="_pg-card">
              <View className="_pg-row _pg-row--avatar _pg-row--clickable" onClick={handleAvatarTap}>
                <Text className="_pg-row_label">头像</Text>
                <View className="_pg-row_value-wrap">
                  <AppImage
                    className="_pg-avatar"
                    src={displayAvatar}
                    width={54}
                    height={54}
                    showErrorIcon={false}
                  />
                </View>
              </View>

              {renderRow('姓名', displayName, {
                placeholder: '微信用户',
                onClick: handleNicknameTap,
              })}
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
            {renderAvatarSheet(displayAvatar)}
            {renderNicknameSheet()}
            {renderEditPopup()}
          </PageShare>
        </PageShell>
      </View>
    );
  });
});

export default MemberProfilePage;
