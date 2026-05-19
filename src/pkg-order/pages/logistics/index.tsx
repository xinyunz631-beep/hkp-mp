import { useState } from 'react';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppImage } from '@/core/components/AppImage';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import {
  callWechatPhone,
  copyWechatText,
  previewWechatImages,
  showWechatConfirm,
  showWechatToast,
} from '@/core/utils/wechat-actions';
import { fetchLogisticsData, type OrderLogisticsData } from '@/pkg-order/services/logistics';
import './index.scss';

const LogisticsPage = observer(function LogisticsPage() {
  const [pageData, setPageData] = useState<OrderLogisticsData>();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchLogisticsData();
      setPageData(nextData);
    },
    loginRequired: true,
    loginReason: '登录后可查看物流',
  });

  async function handleConfirmReceive() {
    const confirmed = await showWechatConfirm({
      title: '确认收货',
      content: '确认已收到商品？确认后订单将进入待评价状态。',
      confirmText: '确认',
      cancelText: '取消',
    });

    if (!confirmed) return;

    setPageData((current) => (current ? {
      ...current,
      statusText: '已签收',
      confirmButtonText: '已确认收货',
    } : current));
    await showWechatToast('已确认收货', 'success');
  }

  return pageRuntime.renderPage(() => {
    if (!pageData) return null;

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
                  <View className="_pg-summary_row" onClick={() => void copyWechatText(pageData.trackingNumberText, '快递单号已复制')}>
                    <Text className="_pg-summary_label">快递单号：</Text>
                    <Text className="_pg-summary_value">{pageData.trackingNumberText}</Text>
                  </View>
                  <View className="_pg-summary_row" onClick={() => void callWechatPhone(pageData.hotlineText)}>
                    <Text className="_pg-summary_label">官方电话：</Text>
                    <Text className="_pg-summary_value">{pageData.hotlineText}</Text>
                  </View>
                </View>
              </View>

              <View className="_pg-summary_total">
                <Text className="_pg-summary_total-text">{pageData.quantityText}</Text>
                <View className="_pg-summary_total-amount-wrap">
                  <Text className="_pg-summary_total-text">合计：</Text>
                  <Text className="_pg-summary_total-amount">{pageData.totalAmountText}</Text>
                </View>
              </View>

              <View className="_pg-summary_action-row">
                <View
                  className="_pg-summary_button"
                  onClick={() => void handleConfirmReceive()}
                >
                  {pageData.confirmButtonText}
                </View>
              </View>
            </View>

            <View className="_pg-traces">
              {pageData.traces.map((trace, index) => (
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
              ))}
            </View>
          </View>
        </PageShell>
      </View>
    );
  });
});

export default LogisticsPage;
