import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { AppIcon } from '@/core/components/AppIcon';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { setMallCheckoutSelectedAddressId } from '@/core/services/mall-checkout-draft';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { showWechatConfirm, showWechatToast } from '@/core/utils/wechat-actions';
import {
  deleteOrderAddress,
  fetchAddressData,
  formatOrderAddress,
  setDefaultOrderAddress,
  type OrderAddressData,
} from '@/pkg-order/services/address';
import './index.scss';

function openAddressEditor(addressId?: string) {
  const query = addressId ? `?id=${encodeURIComponent(addressId)}` : '';
  navigateToMiniRoute(`${MINI_PACKAGE_ROUTES.orderAddressEdit}${query}`);
}

function resolveAddressRouteParams() {
  const params = Taro.getCurrentInstance().router?.params ?? {};

  return {
    mode: params.mode,
    draftId: params.draftId,
    selectedId: params.selectedId,
  };
}

const AddressPage = observer(function AddressPage() {
  const [pageData, setPageData] = useState<OrderAddressData>();
  const [routeParams] = useState(resolveAddressRouteParams);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchAddressData();
      setPageData(nextData);
    },
    refreshOnShow: true,
    loginRequired: true,
    loginReason: '登录后可管理地址',
  });

  async function reloadAddressData() {
    const nextData = await fetchAddressData();
    setPageData(nextData);
  }

  async function handleSetDefault(addressId: string) {
    await setDefaultOrderAddress(addressId);
    await reloadAddressData();
    await showWechatToast('已设为默认地址', 'success');
  }

  async function handleAddAddress() {
    if ((pageData?.addresses.length ?? 0) >= (pageData?.maxCount ?? 10)) {
      await showWechatToast('最多维护 10 个收件人地址');
      return;
    }

    openAddressEditor();
  }

  async function handleDeleteAddress(addressId: string) {
    const confirmed = await showWechatConfirm({
      title: '删除地址',
      content: '删除后该地址不会再出现在订单收货信息里，确认删除吗？',
      confirmText: '删除',
      cancelText: '取消',
    });

    if (!confirmed) return;

    await deleteOrderAddress(addressId);
    await reloadAddressData();
    await showWechatToast('地址已删除', 'success');
  }

  async function handleSelectAddress(addressId: string) {
    if (routeParams.mode !== 'select' || !routeParams.draftId) return;

    setMallCheckoutSelectedAddressId(routeParams.draftId, addressId);
    await showWechatToast('已选择收货地址', 'success');
    Taro.navigateBack({ delta: 1 });
  }

  return pageRuntime.renderPage(() => {
    if (!pageData) return null;

    const addressCount = pageData.addresses.length;
    const maxCount = pageData.maxCount;
    const isFull = addressCount >= maxCount;

    return (
      <View className="_pg">
        <PageShell
          title="地址管理"
          className="_pg-shell"
          reserveTabBarSpace={false}
          footer={(
            <View className="_pg-footer">
              <View
                className={`_pg-footer_button ${isFull ? '_pg-footer_button--disabled' : ''}`}
                onClick={() => void handleAddAddress()}
              >
                新增收件人地址
              </View>
            </View>
          )}
        >
          <View className="_pg-content">
            {addressCount > 0 ? (
              <View className="_pg-list">
                {pageData.addresses.map((address) => {
                  const selected = routeParams.mode === 'select' && (
                    address.id === routeParams.selectedId || address.isDefault && !routeParams.selectedId
                  );

                  return (
                    <View
                      className={`_pg-card ${selected ? '_pg-card--selected' : ''}`}
                      key={address.id}
                      onClick={() => void handleSelectAddress(address.id)}
                    >
                    <View className="_pg-card_header">
                      <Text className="_pg-card_name">{address.name}</Text>
                      <Text className="_pg-card_mobile">{address.mobile}</Text>
                      {address.isDefault ? <Text className="_pg-card_tag">默认</Text> : null}
                      {address.tag ? <Text className="_pg-card_tag _pg-card_tag--soft">{address.tag}</Text> : null}
                      {selected ? <AppIcon name="check" className="_pg-card_selected-icon" size={16} color="#ec6d9c" /> : null}
                    </View>
                    {address.locationName ? <Text className="_pg-card_location">{address.locationName}</Text> : null}
                    <Text className="_pg-card_detail">{formatOrderAddress(address)}</Text>
                    <View className="_pg-card_footer">
                      <View
                        className="_pg-card_default"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleSetDefault(address.id);
                        }}
                      >
                        <View className={`_pg-card_check ${address.isDefault ? '_pg-card_check--active' : ''}`}>
                          {address.isDefault ? <AppIcon name="check" size={10} color="#ffffff" /> : null}
                        </View>
                        <Text className={`_pg-card_default-text ${address.isDefault ? '_pg-card_default-text--active' : ''}`}>
                          默认地址
                        </Text>
                      </View>
                      <View className="_pg-card_actions">
                        <View
                          className="_pg-card_action"
                          onClick={(event) => {
                            event.stopPropagation();
                            openAddressEditor(address.id);
                          }}
                        >
                          <AppIcon name="edit" size={16} color="#23262f" />
                          <Text>编辑</Text>
                        </View>
                        <View
                          className="_pg-card_action"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeleteAddress(address.id);
                          }}
                        >
                          <AppIcon name="delete" size={16} color="#23262f" />
                          <Text>删除</Text>
                        </View>
                      </View>
                    </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <BaseEmpty
                className="_pg-empty"
                title="还没有收件地址"
                description="新增常用收货地址后，商城下单会自动带入。"
              />
            )}
          </View>
        </PageShell>
      </View>
    );
  });
});

export default AddressPage;
