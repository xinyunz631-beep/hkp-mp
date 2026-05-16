import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchAddressData, type OrderAddressData } from '@/pkg-order/services/address';
import './index.scss';

function showToast(title: string) {
  Taro.showToast({ title, icon: 'none' });
}

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
              <View className="_pg-footer_button" onClick={() => showToast('新增地址即将开放')}>
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
                    <View className="_pg-card_default" onClick={() => setSelectedAddressId(address.id)}>
                      <View className={`_pg-card_check ${isSelected ? '_pg-card_check--active' : ''}`}>
                        {isSelected ? <AppIcon name="check" size={14} color="#ffffff" /> : null}
                      </View>
                      <Text className={`_pg-card_default-text ${isSelected ? '_pg-card_default-text--active' : ''}`}>
                        默认地址
                      </Text>
                    </View>
                    <View className="_pg-card_actions">
                      <View className="_pg-card_action" onClick={() => showToast('编辑地址即将开放')}>
                        <AppIcon name="edit" size={16} color="#23262f" />
                      </View>
                      <View className="_pg-card_action" onClick={() => showToast('删除地址即将开放')}>
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
