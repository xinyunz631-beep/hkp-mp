import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, Textarea, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { refundBffOrder } from '@/core/services/bff-order-api';
import { OrderCard } from '@/core/components/commerce';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { showWechatToast } from '@/core/utils/wechat-actions';
import { fetchAftersaleApplyData, type OrderAftersaleApplyData } from '@/pkg-order/services/aftersale-apply';
import './index.scss';

const AftersaleApplyPage = observer(function AftersaleApplyPage() {
  const [pageData, setPageData] = useState<OrderAftersaleApplyData>();
  const [selectedReason, setSelectedReason] = useState('');
  const [remarkText, setRemarkText] = useState('');
  const [routeOrderId, setRouteOrderId] = useState('');
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const selectedType = decodeURIComponent(Taro.getCurrentInstance().router?.params?.type || '');
      const orderId = Taro.getCurrentInstance().router?.params?.orderId;
      const nextData = await fetchAftersaleApplyData({ orderId, typeText: selectedType });

      setPageData({
        ...nextData,
      });
      setSelectedReason(nextData.defaultReason);
      setRouteOrderId(orderId || '');
    },
    loginRequired: true,
    loginReason: '登录后可申请售后',
  });

  async function handleSubmit() {
    const currentPageData = pageData;
    if (!currentPageData) return;
    if (!routeOrderId) {
      await showWechatToast('缺少订单编号，请返回订单详情重试');
      return;
    }

    if (!selectedReason) {
      await showWechatToast('请选择售后原因');
      return;
    }

    const reasonPayload = [selectedReason, remarkText.trim()].filter(Boolean).join('；');
    await refundBffOrder(routeOrderId, { reason: reasonPayload || selectedReason });
    await showWechatToast('退款申请已提交', 'success');
    const query = [
      routeOrderId ? `orderId=${encodeURIComponent(routeOrderId)}` : '',
      currentPageData.selectedTypeText ? `type=${encodeURIComponent(currentPageData.selectedTypeText)}` : '',
      selectedReason ? `reason=${encodeURIComponent(selectedReason)}` : '',
    ].filter(Boolean).join('&');
    navigateToMiniRoute(`${MINI_PACKAGE_ROUTES.orderAftersaleProgress}${query ? `?${query}` : ''}`);
  }

  return pageRuntime.renderPage(() => {
    if (!pageData) return null;

    return (
      <View className="_pg">
        <PageShell
          title="售后申请"
          className="_pg-shell"
          reserveTabBarSpace={false}
          footer={(
            <View className="_pg-footer">
              <View className="_pg-footer_button" onClick={() => void handleSubmit()}>
                {pageData.submitButtonText}
              </View>
            </View>
          )}
        >
          <View className="_pg-content">
            <OrderCard order={pageData.order} className="_pg-order-card" />

            <View className="_pg-card">
              <Text className="_pg-card_title">售后类型</Text>
              <View className="_pg-type-chip">
                <Text className="_pg-type-chip_label">{pageData.selectedTypeText}</Text>
                <Text className="_pg-type-chip_value">退款金额 {pageData.refundAmountText}</Text>
              </View>
            </View>

            <View className="_pg-card">
              <Text className="_pg-card_title">申请原因</Text>
              <View className="_pg-reasons">
                {pageData.reasons.map((reason) => (
                  <View
                    className={`_pg-reasons_item ${selectedReason === reason ? '_pg-reasons_item--active' : ''}`}
                    key={reason}
                    onClick={() => setSelectedReason(reason)}
                  >
                    <Text>{reason}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View className="_pg-card">
              <Text className="_pg-card_title">补充说明</Text>
              <Textarea
                className="_pg-editor"
                value={remarkText}
                maxlength={200}
                placeholder={pageData.placeholderText}
                onInput={(event) => setRemarkText((event.detail.value || '').slice(0, 200))}
              />
              <Text className="_pg-editor_count">{remarkText.length}/200</Text>

              <View className="_pg-upload">
                <Text className="_pg-upload_title">图片凭证</Text>
                <Text className="_pg-card_hint">{pageData.uploadHintText}</Text>
              </View>
            </View>

            <View className="_pg-card">
              <Text className="_pg-card_title">联系信息</Text>
              <View className="_pg-contact">
                <View className="_pg-contact_row">
                  <Text className="_pg-contact_label">联系人</Text>
                  <Text className="_pg-contact_value">{pageData.contactName}</Text>
                </View>
                <View className="_pg-contact_row">
                  <Text className="_pg-contact_label">联系电话</Text>
                  <Text className="_pg-contact_value">{pageData.contactMobile}</Text>
                </View>
              </View>
              <Text className="_pg-card_hint">{pageData.serviceTipText}</Text>
            </View>
          </View>
        </PageShell>
      </View>
    );
  });
});

export default AftersaleApplyPage;
