import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, Textarea, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { OrderCard } from '@/core/components/commerce';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchAftersaleApplyData, type OrderAftersaleApplyData } from '@/pkg-order/services/aftersale-apply';
import './index.scss';

const AftersaleApplyPage = observer(function AftersaleApplyPage() {
  const [pageData, setPageData] = useState<OrderAftersaleApplyData>();
  const [selectedReason, setSelectedReason] = useState('');
  const [remarkText, setRemarkText] = useState('');
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchAftersaleApplyData();
      const selectedType = decodeURIComponent(Taro.getCurrentInstance().router?.params?.type || '');

      setPageData({
        ...nextData,
        selectedTypeText: selectedType || nextData.selectedTypeText,
      });
      setSelectedReason(nextData.defaultReason);
    },
  });

  function handleSubmit() {
    if (!selectedReason) {
      Taro.showToast({ title: '请选择售后原因', icon: 'none' });
      return;
    }

    Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.orderAftersaleProgress });
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
              <View className="_pg-footer_button" onClick={handleSubmit}>
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
                <Text className="_pg-upload_title">{pageData.uploadHintText}</Text>
                <View
                  className="_pg-upload_add"
                  onClick={() => Taro.showToast({ title: '凭证上传即将开放', icon: 'none' })}
                >
                  <AppIcon name="photograph" size={26} color="#6b7280" />
                  <Text className="_pg-upload_text">添加图片</Text>
                </View>
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
