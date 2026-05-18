import { useState } from 'react';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { showWechatConfirm, showWechatToast } from '@/core/utils/wechat-actions';
import { fetchAddressData, type OrderAddressData } from '@/pkg-order/services/address';
import './index.scss';

const AddressPage = observer(function AddressPage() {
  const [pageData, setPageData] = useState<OrderAddressData>();
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchAddressData();
      setPageData(nextData);
      setSelectedAddressId(nextData.addresses.find((item) => item.isDefault)?.id ?? nextData.addresses[0]?.id ?? '');
    },
  });

  function updateAddresses(updater: (current: OrderAddressData['addresses']) => OrderAddressData['addresses']) {
    setPageData((current) => (current ? { ...current, addresses: updater(current.addresses) } : current));
  }

  async function handleSetDefault(addressId: string) {
    setSelectedAddressId(addressId);
    updateAddresses((addresses) => addresses.map((address) => ({
      ...address,
      isDefault: address.id === addressId,
    })));
    await showWechatToast('已设为默认地址', 'success');
  }

  async function handleAddAddress() {
    const confirmed = await showWechatConfirm({
      title: '新增地址',
      content: '使用本地模拟地址补充到地址列表？',
      confirmText: '新增',
      cancelText: '取消',
    });

    if (!confirmed) return;

    const nextAddress = {
      id: `addr-local-${Date.now()}`,
      name: '乐园游客',
      mobile: '188****8888',
      region: '浙江省湖州市',
      detail: '安吉县天使大道1号',
      isDefault: false,
    };
    updateAddresses((addresses) => [...addresses, nextAddress]);
    await showWechatToast('地址已新增', 'success');
  }

  async function handleEditAddress(addressId: string) {
    const confirmed = await showWechatConfirm({
      title: '编辑地址',
      content: '本地模拟编辑会给地址备注“已更新”。',
      confirmText: '编辑',
      cancelText: '取消',
    });

    if (!confirmed) return;

    updateAddresses((addresses) => addresses.map((address) => (
      address.id === addressId
        ? { ...address, detail: address.detail.includes('已更新') ? address.detail : `${address.detail}（已更新）` }
        : address
    )));
    await showWechatToast('地址已更新', 'success');
  }

  async function handleDeleteAddress(addressId: string) {
    if ((pageData?.addresses.length ?? 0) <= 1) {
      await showWechatToast('至少保留一个地址');
      return;
    }

    const confirmed = await showWechatConfirm({
      title: '删除地址',
      content: '确认删除该收件地址？',
      confirmText: '删除',
      cancelText: '取消',
    });

    if (!confirmed) return;

    updateAddresses((addresses) => addresses.filter((address) => address.id !== addressId));
    if (selectedAddressId === addressId) {
      const nextSelected = pageData?.addresses.find((address) => address.id !== addressId)?.id ?? '';
      setSelectedAddressId(nextSelected);
    }
    await showWechatToast('地址已删除', 'success');
  }

  return pageRuntime.renderPage(() => {
    if (!pageData) return null;

    return (
      <View className="_pg">
        <PageShell
          title="收件人管理"
          className="_pg-shell"
          reserveTabBarSpace={false}
          footer={(
            <View className="_pg-footer">
              <View className="_pg-footer_button" onClick={() => void handleAddAddress()}>
                新增地址
              </View>
            </View>
          )}
        >
          <View className="_pg-content">
            {pageData.addresses.map((address) => {
              const isSelected = address.id === selectedAddressId;

              return (
                <View className="_pg-card" key={address.id}>
                  <View className="_pg-card_header">
                    <Text className="_pg-card_name">{address.name}</Text>
                    <Text className="_pg-card_mobile">{address.mobile}</Text>
                  </View>
                  <Text className="_pg-card_detail">
                    {address.region}
                    {address.detail}
                  </Text>
                  <View className="_pg-card_footer">
                    <View className="_pg-card_default" onClick={() => void handleSetDefault(address.id)}>
                      <View className={`_pg-card_check ${isSelected ? '_pg-card_check--active' : ''}`}>
                        {isSelected ? <AppIcon name="check" size={14} color="#ffffff" /> : null}
                      </View>
                      <Text className={`_pg-card_default-text ${isSelected ? '_pg-card_default-text--active' : ''}`}>
                        默认地址
                      </Text>
                    </View>
                    <View className="_pg-card_actions">
                      <View className="_pg-card_action" onClick={() => void handleEditAddress(address.id)}>
                        <AppIcon name="edit" size={16} color="#23262f" />
                      </View>
                      <View className="_pg-card_action" onClick={() => void handleDeleteAddress(address.id)}>
                        <AppIcon name="delete" size={16} color="#23262f" />
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </PageShell>
      </View>
    );
  });
});

export default AddressPage;
