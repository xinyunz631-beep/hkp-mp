import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppImage } from '@/core/components/AppImage';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import {
  callWechatPhone,
  copyWechatText,
  previewWechatImages,
  showWechatToast,
} from '@/core/utils/wechat-actions';
import { fetchLogisticsData, type OrderLogisticsData } from '@/pkg-order/services/logistics';
import './index.scss';

const LogisticsPage = observer(function LogisticsPage() {
  const [pageData, setPageData] = useState<OrderLogisticsData>();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const orderId = Taro.getCurrentInstance().router?.params?.orderId;
      const nextData = await fetchLogisticsData(orderId);
      setPageData(nextData);
    },
    loginRequired: true,
    loginReason: '登录后可查看物流',
  });

  return pageRuntime.renderPage(() => {
    if (!pageData) return null;
    const hasTraceData = pageData.traces.length > 0;

    return (
      <View className="_pg">
        <PageShell title="物流详情" className="_pg-shell" reserveTabBarSpace={false}>
          <View className="_pg-content">
            <View className="_pg-summary">
              <View className="_pg-summary_top">
                <AppImage
                  className="_pg-summary_image"
                  src={pageData.productImageSrc}
                  mode="aspectFill"
                  emptyState="error"
                  onClick={() => previewWechatImages({ urls: [pageData.productImageSrc], emptyText: '暂无商品大图' })}
                />
                <View className="_pg-summary_body">
                  <View className="_pg-summary_row">
                    <Text className="_pg-summary_label">物流状态：</Text>
                    <Text className="_pg-summary_value">{pageData.statusText}</Text>
                  </View>
                  <View className="_pg-summary_row">
                    <Text className="_pg-summary_label">快递公司：</Text>
                    <Text className="_pg-summary_value">{pageData.companyText}</Text>
                  </View>
                  <View
                    className="_pg-summary_row"
                    onClick={() => {
                      if (pageData.trackingNumberText === '-') {
                        void showWechatToast('当前订单暂未回传物流单号');
                        return;
                      }
                      void copyWechatText(pageData.trackingNumberText, '快递单号已复制');
                    }}
                  >
                    <Text className="_pg-summary_label">快递单号：</Text>
                    <Text className="_pg-summary_value">{pageData.trackingNumberText}</Text>
                  </View>
                  <View
                    className="_pg-summary_row"
                    onClick={() => {
                      if (!pageData.hotlineText) {
                        void showWechatToast('当前订单暂未回传商户联系电话');
                        return;
                      }
                      void callWechatPhone(pageData.hotlineText);
                    }}
                  >
                    <Text className="_pg-summary_label">官方电话：</Text>
                    <Text className="_pg-summary_value">{pageData.hotlineText || '-'}</Text>
                  </View>
                </View>
              </View>

              <View className="_pg-summary_total">
                {pageData.quantityText ? <Text className="_pg-summary_total-text">{pageData.quantityText}</Text> : <View />}
                <View className="_pg-summary_total-amount-wrap">
                  <Text className="_pg-summary_total-text">合计：</Text>
                  <Text className="_pg-summary_total-amount">{pageData.totalAmountText}</Text>
                </View>
              </View>

              {pageData.confirmButtonText ? (
                <View className="_pg-summary_action-row">
                  <View className="_pg-summary_button">
                    {pageData.confirmButtonText}
                  </View>
                </View>
              ) : null}
            </View>

            <View className="_pg-traces">
              {hasTraceData ? pageData.traces.map((trace, index) => (
                <View className="_pg-traces_item" key={trace.id}>
                  <View className="_pg-traces_axis">
                    <View className={`_pg-traces_dot ${index === 0 ? '_pg-traces_dot--active' : ''}`} />
                    {index < pageData.traces.length - 1 ? <View className="_pg-traces_line" /> : null}
                  </View>
                  <View className="_pg-traces_body">
                    <Text className="_pg-traces_time">{trace.timeText}</Text>
                    <Text className={`_pg-traces_detail ${index === 0 ? '_pg-traces_detail--active' : ''}`}>
                      {trace.detailText}
                    </Text>
                  </View>
                </View>
              )) : (
                <BaseEmpty
                  className="_pg-empty"
                  title="暂无物流轨迹"
                  description="当前订单还没有回传可展示的物流轨迹，请稍后再试。"
                  size="small"
                />
              )}
            </View>
          </View>
        </PageShell>
      </View>
    );
  });
});

export default LogisticsPage;
