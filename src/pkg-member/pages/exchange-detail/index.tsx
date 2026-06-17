import { useState } from 'react';
import Taro, { useShareAppMessage } from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { AppPopup } from '@/core/components/AppPopup';
import { AppShareButton } from '@/core/components/AppShareButton';
import { QuantityStepper } from '@/core/components/commerce';
import { PageFooter, PageShare, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { resolveErrorMessage } from '@/core/utils/error-message';
import { showWechatToast } from '@/core/utils/wechat-actions';
import { MemberRichText } from '@/pkg-member/components/MemberRichText';
import {
  fetchMemberExchangeDetailData,
  submitMemberKcoinExchange,
  type MemberExchangeDetailData,
} from '@/pkg-member/services/exchange';
import './index.scss';

function resolveExchangeProductId() {
  return Taro.getCurrentInstance().router?.params?.id || '';
}

function clampQuantity(value: number, max: number) {
  return Math.min(Math.max(value, 1), Math.max(max, 1));
}

// 渲染兑换商品详情页，商品和详情正文由接口字段承载。
const MemberExchangeDetailPage = observer(function MemberExchangeDetailPage() {
  const [detailData, setDetailData] = useState<MemberExchangeDetailData>();
  const [quantity, setQuantity] = useState(1);
  const [liked, setLiked] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchMemberExchangeDetailData(resolveExchangeProductId());
      setDetailData(nextData);
      setLiked(nextData.product.liked);
      setQuantity(1);
      setConfirmVisible(false);
    },
    loginRequired: true,
    loginReason: '登录后可兑换商品',
  });
  const product = detailData?.product;
  const stock = product?.stock ?? 0;
  const totalKCoins = (product?.kCoinPrice ?? 0) * quantity;
  const exchangeDisabled = !product || stock <= 0;

  useShareAppMessage(() => ({
    title: product?.title || '兑换专区',
    path: product?.id
      ? `${MINI_PACKAGE_ROUTES.memberExchangeDetail}?id=${encodeURIComponent(product.id)}`
      : MINI_PACKAGE_ROUTES.memberExchange,
    imageUrl: product?.imageSrc || undefined,
  }));

  function openConfirmPopup() {
    if (exchangeDisabled) {
      void showWechatToast('当前商品暂无库存');
      return;
    }

    if (totalKCoins > (detailData?.memberKCoins ?? 0)) {
      void showWechatToast('K币余额不足');
      return;
    }

    setConfirmVisible(true);
  }

  function handleQuantityChange(nextQuantity: number) {
    setQuantity(clampQuantity(nextQuantity, stock));
  }

  async function handleSubmitExchange() {
    if (!product) return;

    if (quantity > stock) {
      await showWechatToast('库存不足');
      return;
    }

    if (totalKCoins > (detailData?.memberKCoins ?? 0)) {
      await showWechatToast('K币余额不足');
      return;
    }

    try {
      const response = await pageRuntime.withLoading(() => submitMemberKcoinExchange({
        itemNo: product.id,
        quantity,
      }));
      setConfirmVisible(false);
      if (typeof response.afterBalance === 'number') {
        setDetailData((currentData) => currentData
          ? { ...currentData, memberKCoins: response.afterBalance ?? currentData.memberKCoins }
          : currentData);
      }
      await showWechatToast('兑换已受理，请稍后查看', 'success');
    } catch (error) {
      await showWechatToast(resolveErrorMessage(error, '兑换失败，请稍后再试'));
    }
  }

  return pageRuntime.renderPage(() => {
    if (!product) return null;

    return (
      <View className="_pg">
        <PageShell title="商品详情" className="_pg-shell">
          <View className="_pg-content">
            <AppImage className="_pg-hero" src={product.imageSrc} mode="aspectFill" emptyState="error" />

            <View className="_pg-info">
              <View className="_pg-info_price-row">
                <View className="_pg-info_price">
                  <Text className="_pg-info_price-current">{product.kCoinPrice}K币</Text>
                  <Text className="_pg-info_price-origin">{product.originalKCoinPrice}</Text>
                </View>
                <View className="_pg-info_actions">
                  <AppShareButton className="_pg-info_action" iconSize={20} iconColor="#9b9b9b" />
                  <View className="_pg-info_action" onClick={() => setLiked((nextLiked) => !nextLiked)}>
                    <AppIcon name="heart" size={20} color={liked ? '#e96b9e' : '#9b9b9b'} />
                  </View>
                </View>
              </View>
              <Text className="_pg-info_title">{product.title}</Text>
              <View className="_pg-info_meta">
                <Text>已兑{product.exchangedCount}件</Text>
                <Text>库存 {product.stock}件</Text>
                <Text>余额 {detailData?.memberKCoins ?? 0}K币</Text>
              </View>
            </View>

            <View className="_pg-detail">
              <View className="_pg-detail_header">
                <Text>商品详情</Text>
              </View>
              <MemberRichText className="_pg-detail_rich-text" nodes={product.detailHtml} />
            </View>
          </View>

          <PageFooter>
            <View className="_pg-footer">
              <View
                className={`_pg-footer_button ${exchangeDisabled ? '_pg-footer_button--disabled' : ''}`}
                onClick={openConfirmPopup}
              >
                <Text>{exchangeDisabled ? '暂无库存' : '立即兑换'}</Text>
              </View>
            </View>
          </PageFooter>

          <PageShare>
            <AppPopup
              visible={confirmVisible}
              position="center"
              safeArea={false}
              closeOnOverlayClick={false}
              className="_pg-confirm-popup-shell"
              contentClassName="_pg-confirm-popup-wrap"
              onClose={() => setConfirmVisible(false)}
            >
              <View className="_pg-confirm">
                <Text className="_pg-confirm_title">订单确认</Text>
                <View className="_pg-confirm_body">
                  <AppImage className="_pg-confirm_image" src={product.imageSrc} mode="aspectFill" emptyState="error" />
                  <View className="_pg-confirm_info">
                    <Text className="_pg-confirm_name">{product.title}</Text>
                    <Text className="_pg-confirm_stock">库存:{product.stock}</Text>
                    <View className="_pg-confirm_price-row">
                      <View className="_pg-confirm_price">
                        <Text className="_pg-confirm_price-current">{totalKCoins}K币</Text>
                        <Text className="_pg-confirm_price-origin">{product.originalKCoinPrice}</Text>
                      </View>
                      <QuantityStepper
                        className="_pg-confirm_stepper"
                        value={quantity}
                        min={1}
                        max={Math.max(product.stock, 1)}
                        onChange={handleQuantityChange}
                      />
                    </View>
                  </View>
                </View>
                <View className="_pg-confirm_actions">
                  <View className="_pg-confirm_button _pg-confirm_button--cancel" onClick={() => setConfirmVisible(false)}>
                    <Text>取消</Text>
                  </View>
                  <View className="_pg-confirm_button _pg-confirm_button--submit" onClick={() => void handleSubmitExchange()}>
                    <Text>确定</Text>
                  </View>
                </View>
              </View>
            </AppPopup>
          </PageShare>
        </PageShell>
      </View>
    );
  });
});

export default MemberExchangeDetailPage;
