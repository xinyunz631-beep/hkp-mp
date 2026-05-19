import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { useState } from 'react';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { OrderCard } from '@/core/components/commerce';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchAftersaleTypeData, type OrderAftersaleTypeData } from '@/pkg-order/services/aftersale-type';
import './index.scss';

const AftersaleTypePage = observer(function AftersaleTypePage() {
  const [pageData, setPageData] = useState<OrderAftersaleTypeData>();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchAftersaleTypeData();
      setPageData(nextData);
    },
    loginRequired: true,
    loginReason: '登录后可申请售后',
  });

  function openApplyPage(typeTitle: string) {
    Taro.navigateTo({
      url: `${MINI_PACKAGE_ROUTES.orderAftersaleApply}?type=${encodeURIComponent(typeTitle)}`,
    });
  }

  return pageRuntime.renderPage(() => {
    if (!pageData) return null;

    return (
      <View className="_pg">
        <PageShell title="售后类型" className="_pg-shell" reserveTabBarSpace={false}>
          <View className="_pg-content">
            <OrderCard order={pageData.order} className="_pg-order-card" />

            <View className="_pg-tip">
              <Text>{pageData.tipText}</Text>
            </View>

            <View className="_pg-types">
              {pageData.types.map((type) => (
                <View className="_pg-types_item" key={type.key} onClick={() => openApplyPage(type.title)}>
                  <View className="_pg-types_main">
                    <View className="_pg-types_title-row">
                      <Text className="_pg-types_title">{type.title}</Text>
                      {type.tagText ? <Text className="_pg-types_tag">{type.tagText}</Text> : null}
                    </View>
                    <Text className="_pg-types_desc">{type.desc}</Text>
                    <Text className="_pg-types_amount">{type.amountText}</Text>
                  </View>
                  <AppIcon name="arrowRight" size={16} color="#98a2b3" />
                </View>
              ))}
            </View>
          </View>
        </PageShell>
      </View>
    );
  });
});

export default AftersaleTypePage;
