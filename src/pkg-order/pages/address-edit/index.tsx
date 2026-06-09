import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Input, Text, Textarea, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import type { HkpAddressSummary } from '@/core/types/hkp';
import { resolveErrorMessage } from '@/core/utils/error-message';
import { navigateBackOrHome } from '@/core/utils/navigation';
import {
  chooseWechatLocation,
  showWechatToast,
} from '@/core/utils/wechat-actions';
import {
  getOrderAddress,
  listOrderAddresses,
  ORDER_ADDRESS_MAX_COUNT,
  saveOrderAddress,
} from '@/pkg-order/services/address';
import './index.scss';

interface AddressFormState {
  id?: string;
  name: string;
  mobile: string;
  region: string;
  detail: string;
  isDefault: boolean;
  locationName: string;
  locationAddress: string;
  latitude?: number;
  longitude?: number;
  tag: string;
}

type AddressFormErrors = Partial<Record<keyof AddressFormState, string>>;

const ADDRESS_TAG_OPTIONS = ['家', '公司', '学校', '乐园附近'];

function createEmptyForm(): AddressFormState {
  return {
    name: '',
    mobile: '',
    region: '',
    detail: '',
    isDefault: false,
    locationName: '',
    locationAddress: '',
    tag: '',
  };
}

function resolveRouteAddressId() {
  return Taro.getCurrentInstance().router?.params?.id || '';
}

function normalizeFormFromAddress(address?: HkpAddressSummary): AddressFormState {
  if (!address) return createEmptyForm();

  return {
    id: address.id,
    name: address.name,
    mobile: address.mobile,
    region: address.region,
    detail: address.detail,
    isDefault: Boolean(address.isDefault),
    locationName: address.locationName || '',
    locationAddress: address.locationAddress || '',
    latitude: address.latitude,
    longitude: address.longitude,
    tag: address.tag || '',
  };
}

function trimAddressForm(form: AddressFormState): AddressFormState {
  return {
    ...form,
    name: form.name.trim(),
    mobile: form.mobile.trim(),
    region: form.region.trim(),
    detail: form.detail.trim(),
    locationName: form.locationName.trim(),
    locationAddress: form.locationAddress.trim(),
    tag: form.tag.trim(),
  };
}

function validateAddressForm(form: AddressFormState) {
  const errors: AddressFormErrors = {};

  if (!form.name) {
    errors.name = '请填写收件人姓名';
  }

  if (!/^1[3-9]\d{9}$/.test(form.mobile)) {
    errors.mobile = '请填写正确的手机号';
  }

  if (!form.region && !form.locationName && !form.locationAddress) {
    errors.region = '请选择所在位置';
  }

  if (!form.detail) {
    errors.detail = '请填写门牌号';
  }

  return errors;
}

function getFirstErrorMessage(errors: AddressFormErrors) {
  return errors.name || errors.mobile || errors.region || errors.detail || '';
}

const AddressEditPage = observer(function AddressEditPage() {
  const [form, setForm] = useState<AddressFormState>(() => createEmptyForm());
  const [errors, setErrors] = useState<AddressFormErrors>({});
  const [addressCount, setAddressCount] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const addressId = resolveRouteAddressId();
      const addresses = listOrderAddresses();
      const currentAddress = getOrderAddress(addressId);
      setAddressCount(addresses.length);
      setIsEditMode(Boolean(currentAddress));
      setForm(normalizeFormFromAddress(currentAddress));
      setLoaded(true);
    },
    loginRequired: true,
    loginReason: '登录后可编辑地址',
  });

  function patchForm(nextForm: Partial<AddressFormState>) {
    setForm((currentForm) => ({
      ...currentForm,
      ...nextForm,
    }));
  }

  function clearFieldError(field: keyof AddressFormState) {
    if (!errors[field]) return;

    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));
  }

  async function handleChooseLocation() {
    const location = await chooseWechatLocation();
    if (!location) return;

    patchForm({
      region: location.address,
      locationName: location.name,
      locationAddress: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    });
    clearFieldError('region');
  }

  function handleTagClick(tag: string) {
    patchForm({
      tag: form.tag === tag ? '' : tag,
    });
  }

  async function handleSave() {
    const nextForm = trimAddressForm(form);
    const nextErrors = validateAddressForm(nextForm);
    const firstErrorMessage = getFirstErrorMessage(nextErrors);

    setErrors(nextErrors);
    setForm(nextForm);

    if (firstErrorMessage) {
      await showWechatToast(firstErrorMessage);
      return;
    }

    if (!nextForm.id && addressCount >= ORDER_ADDRESS_MAX_COUNT) {
      await showWechatToast(`最多维护 ${ORDER_ADDRESS_MAX_COUNT} 个收件人地址`);
      return;
    }

    try {
      await pageRuntime.withLoading(async () => {
        saveOrderAddress({
          ...nextForm,
          region: nextForm.locationAddress || nextForm.region,
        });
      });
      await showWechatToast('地址已保存', 'success');
      setTimeout(() => {
        void navigateBackOrHome();
      }, 300);
    } catch (error) {
      if (error instanceof Error && error.message === 'ADDRESS_LIMIT_EXCEEDED') {
        await showWechatToast(`最多维护 ${ORDER_ADDRESS_MAX_COUNT} 个收件人地址`);
        return;
      }

      await showWechatToast(resolveErrorMessage(error, '保存失败，请稍后再试'));
    }
  }

  const pageTitle = isEditMode ? '编辑地址' : '新增地址';
  const locationTitle = form.locationName || '选择小区、楼宇或收货定位';
  const locationDesc = form.locationAddress || form.region || '请选择所在位置';

  return pageRuntime.renderPage(() => {
    if (!loaded) return null;

    return (
      <View className="_pg">
        <PageShell
          title={pageTitle}
          className="_pg-shell"
          reserveTabBarSpace={false}
          footer={(
            <View className="_pg-footer">
              <View className="_pg-footer_button" onClick={() => void handleSave()}>
                保存地址
              </View>
            </View>
          )}
        >
          <View className="_pg-content">
            <View className="_pg-card">
              <View className="_pg-field-wrap">
                <View className="_pg-field">
                  <Text className="_pg-field_label">收件人</Text>
                  <Input
                    className="_pg-field_input"
                    value={form.name}
                    maxlength={20}
                    placeholder="请输入收件人姓名"
                    placeholderClass="_pg-field_placeholder"
                    onInput={(event) => {
                      patchForm({ name: event.detail.value || '' });
                      clearFieldError('name');
                    }}
                  />
                </View>
                {errors.name ? <Text className="_pg-field_error">{errors.name}</Text> : null}
              </View>

              <View className="_pg-field-wrap">
                <View className="_pg-field">
                  <Text className="_pg-field_label">手机号</Text>
                  <Input
                    className="_pg-field_input"
                    value={form.mobile}
                    maxlength={11}
                    type="number"
                    placeholder="请输入手机号"
                    placeholderClass="_pg-field_placeholder"
                    onInput={(event) => {
                      patchForm({ mobile: event.detail.value || '' });
                      clearFieldError('mobile');
                    }}
                  />
                </View>
                {errors.mobile ? <Text className="_pg-field_error">{errors.mobile}</Text> : null}
              </View>
            </View>

            <View className="_pg-card">
              <View className="_pg-field-wrap">
                <View className="_pg-location" onClick={() => void handleChooseLocation()}>
                  <View className="_pg-location_icon">
                    <AppIcon name="location" size={16} color="#db2777" />
                  </View>
                  <View className="_pg-location_main">
                    <Text className={`_pg-location_title ${form.locationName || form.region ? '' : '_pg-location_title--placeholder'}`}>
                      {locationTitle}
                    </Text>
                    <Text className="_pg-location_desc">{locationDesc}</Text>
                  </View>
                  <AppIcon name="arrowRight" size={16} color="#b8bec8" />
                </View>
              </View>

              <View className="_pg-field-wrap">
                <View className="_pg-field _pg-field--detail">
                  <Text className="_pg-field_label">门牌号</Text>
                  <Textarea
                    className="_pg-field_textarea"
                    value={form.detail}
                    maxlength={60}
                    placeholder="例：8号楼2单元1201室"
                    placeholderClass="_pg-field_placeholder"
                    onInput={(event) => {
                      patchForm({ detail: event.detail.value || '' });
                      clearFieldError('detail');
                    }}
                  />
                </View>
                {errors.detail ? <Text className="_pg-field_error _pg-field_error--detail">{errors.detail}</Text> : null}
              </View>
            </View>

            <View className="_pg-card">
              <Text className="_pg-section-title">地址标签</Text>
              <View className="_pg-tags">
                {ADDRESS_TAG_OPTIONS.map((tag) => (
                  <View
                    className={`_pg-tags_item ${form.tag === tag ? '_pg-tags_item--active' : ''}`}
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                  >
                    {tag}
                  </View>
                ))}
              </View>
            </View>

            <View className="_pg-card _pg-card--default">
              <View
                className="_pg-default"
                onClick={() => patchForm({ isDefault: !form.isDefault })}
              >
                <View className={`_pg-default_check ${form.isDefault ? '_pg-default_check--active' : ''}`}>
                  {form.isDefault ? <AppIcon name="check" size={10} color="#ffffff" /> : null}
                </View>
                <View className="_pg-default_main">
                  <Text className="_pg-default_title">设为默认地址</Text>
                  <Text className="_pg-default_desc">下次商城结算时优先使用该地址</Text>
                </View>
              </View>
            </View>
          </View>
        </PageShell>
      </View>
    );
  });
});

export default AddressEditPage;
