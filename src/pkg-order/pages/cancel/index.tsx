import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, Textarea, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { OrderCard } from '@/core/components/commerce';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { showWechatConfirm, showWechatToast } from '@/core/utils/wechat-actions';
import { fetchCancelData, type OrderCancelData } from '@/pkg-order/services/cancel';
import './index.scss';

const CancelPage = observer(function CancelPage() {
  const [pageData, setPageData] = useState<OrderCancelData>();
  const [selectedReason, setSelectedReason] = useState('');
  const [remarkText, setRemarkText] = useState('');
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchCancelData();
      setPageData(nextData);
    },
    loginRequired: true,
    loginReason: '登录后可取消订单',
  });

  async function handleSubmit() {
    if (!selectedReason) {
      await showWechatToast('请选择取消原因');
      return;
    }

    const confirmed = await showWechatConfirm({
      title: '提交取消申请',
      content: `取消原因：${selectedReason}${remarkText ? `\n补充说明：${remarkText}` : ''}`,
      confirmText: '提交',
      cancelText: '再看看',
    });

    if (!confirmed) return;

    await showWechatToast('取消申请已提交', 'success');
    setTimeout(() => {
      Taro.navigateBack({ delta: 1 });
    }, 300);
  }

  return pageRuntime.renderPage(() => {
    if (!pageData) return null;

    return (
      <View className="_pg">
        <PageShell
          title="取消订单"
          className="_pg-shell"
          reserveTabBarSpace={false}
          footer={(
            <View className="_pg-footer">
              <View
                className={`_pg-footer_button ${selectedReason ? '_pg-footer_button--active' : ''}`}
                onClick={() => void handleSubmit()}
              >
                {pageData.submitButtonText}
              </View>
            </View>
          )}
        >
          <View className="_pg-content">
            <OrderCard order={pageData.order} className="_pg-order-card" />

            <View className="_pg-card">
              <Text className="_pg-card_title">取消原因</Text>
              <View className="_pg-reasons">
                {pageData.reasons.map((reason) => (
                  <View
                    className={`_pg-reasons_item ${reason === selectedReason ? '_pg-reasons_item--active' : ''}`}
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
                maxlength={120}
                placeholder="可补充取消订单的具体情况，方便后续处理"
                onInput={(event) => setRemarkText((event.detail.value || '').slice(0, 120))}
              />
              <Text className="_pg-editor_count">{remarkText.length}/120</Text>
            </View>

            <View className="_pg-card">
              <Text className="_pg-card_title">取消说明</Text>
              <View className="_pg-tips">
                {pageData.tips.map((tip) => (
                  <Text className="_pg-tips_item" key={tip}>
                    {tip}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </PageShell>
      </View>
    );
  });
});

export default CancelPage;
