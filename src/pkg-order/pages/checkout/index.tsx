import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { useState } from 'react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { FixedSubmitBar } from '@/core/components/commerce';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { previewWechatImages, showWechatConfirm, showWechatToast } from '@/core/utils/wechat-actions';
import { fetchCheckoutData, submitOrderCheckoutOrder, type OrderCheckoutData } from '@/pkg-order/services/checkout';
import './index.scss';

const CheckoutPage = observer(function CheckoutPage() {
  const [checkoutData, setCheckoutData] = useState<OrderCheckoutData>();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchCheckoutData();
      setCheckoutData(nextData);
    },
    loginRequired: true,
    loginReason: '登录后可提交订单',
  });

  async function handleCouponPress() {
    if (!checkoutData) return;

    await showWechatConfirm({
      title: '优惠券',
      content: `${checkoutData.couponText} 已自动匹配当前订单，支付时将同步抵扣。`,
      confirmText: '知道了',
      cancelText: '关闭',
    });
  }

  async function handleDiscountPress() {
    if (!checkoutData) return;

    await showWechatConfirm({
      title: '折扣信息',
      content: `当前订单已优惠 ¥${checkoutData.discountAmount.toFixed(2)}，最终以支付结果为准。`,
      confirmText: '知道了',
      cancelText: '关闭',
    });
  }

  async function handleSubmit() {
    if (!checkoutData) return;

    const confirmed = await showWechatConfirm({
      title: '模拟微信支付',
      content: `确认支付 ¥${checkoutData.totalAmount.toFixed(2)}？`,
      confirmText: '支付',
      cancelText: '再看看',
    });

    if (!confirmed) return;

    const order = submitOrderCheckoutOrder(checkoutData);
    await showWechatToast('支付成功', 'success');
    navigateToMiniRoute(`${MINI_PACKAGE_ROUTES.orderDetail}?orderId=${encodeURIComponent(order.id)}`);
  }

  return pageRuntime.renderPage(() => {
    if (!checkoutData) return null;
    const hasCouponDiscount = checkoutData.discountAmount > 0 && checkoutData.couponText.trim().length > 0;

    return (
      <View className="_pg">
        <PageShell
          title="订单确认"
          className="_pg-shell"
          reserveTabBarSpace={false}
          footer={(
            <FixedSubmitBar
              className="_pg-submit"
              label={<Text className="_pg-submit_label">金额:</Text>}
              amountText={<Text className="_pg-submit_amount">¥{checkoutData.totalAmount.toFixed(2)}</Text>}
              extra={hasCouponDiscount ? <Text className="_pg-submit_extra">已优惠: ¥{checkoutData.discountAmount.toFixed(2)}</Text> : undefined}
              buttonText="去支付"
              onSubmit={() => void handleSubmit()}
            />
          )}
        >
          <View className="_pg-content">
            <View className="_pg-card" onClick={() => navigateToMiniRoute(MINI_PACKAGE_ROUTES.orderAddress)}>
              <View className="_pg-address">
                <View className="_pg-address_header">
                  <Text className="_pg-address_name">{checkoutData.address.name}</Text>
                  <Text className="_pg-address_mobile">{checkoutData.address.mobile}</Text>
                  {checkoutData.address.isDefault ? <Text className="_pg-address_tag">默认</Text> : null}
                </View>
                <View className="_pg-address_row">
                  <Text className="_pg-address_detail">
                    {checkoutData.address.region}
                    {checkoutData.address.detail}
                  </Text>
                  <AppIcon name="arrowRight" className="_pg-address_chevron" size={16} color="#c0c5cf" />
                </View>
              </View>
            </View>

            <View className="_pg-card _pg-card--compact">
              <View className="_pg-line-row">
                <Text className="_pg-line-row_label">支付方法</Text>
                <Text className="_pg-line-row_value">{checkoutData.paymentMethodText}</Text>
              </View>
            </View>

            <View className="_pg-card">
              {checkoutData.products.map((item) => (
                <View className="_pg-product" key={item.id}>
                  <AppImage
                    className="_pg-product_image"
                    src={item.imageSrc}
                    mode="aspectFill"
                    onClick={() => previewWechatImages({ urls: [item.imageSrc], emptyText: '暂无商品大图' })}
                  />
                  <View className="_pg-product_main">
                    <Text className="_pg-product_title">{item.title}</Text>
                    <Text className="_pg-product_spec">{item.specText}</Text>
                    {item.giftText ? <Text className="_pg-product_gift">{item.giftText}</Text> : null}
                    <Text className="_pg-product_price">{item.priceText}</Text>
                  </View>
                  <Text className="_pg-product_quantity">x{item.quantity}</Text>
                </View>
              ))}
            </View>

            <View className="_pg-card _pg-card--compact">
              <View className="_pg-line-row">
                <Text className="_pg-line-row_label">配送</Text>
                <Text className="_pg-line-row_value">{checkoutData.shippingText}</Text>
              </View>
            </View>

            {hasCouponDiscount ? (
              <>
                <View className="_pg-card _pg-card--compact">
                  <View className="_pg-line-row _pg-line-row--link" onClick={() => void handleCouponPress()}>
                    <Text className="_pg-line-row_label">优惠券</Text>
                    <View className="_pg-line-row_value-wrap">
                      <Text className="_pg-line-row_coupon">{checkoutData.couponText}</Text>
                      <AppIcon name="arrowRight" className="_pg-line-row_chevron" size={16} color="#c0c5cf" />
                    </View>
                  </View>
                </View>

                <View className="_pg-card _pg-card--compact">
                  <View className="_pg-line-row _pg-line-row--link" onClick={() => void handleDiscountPress()}>
                    <Text className="_pg-line-row_label">折扣信息</Text>
                    <View className="_pg-line-row_value-wrap">
                      <Text className="_pg-line-row_value">
                        {checkoutData.discountText === '无可用' ? `已优惠 ¥${checkoutData.discountAmount.toFixed(2)}` : checkoutData.discountText}
                      </Text>
                      <AppIcon name="arrowRight" className="_pg-line-row_chevron" size={16} color="#c0c5cf" />
                    </View>
                  </View>
                </View>
              </>
            ) : null}

            <View className="_pg-card">
              {checkoutData.amountFields.map((item) => (
                <View className="_pg-line-row" key={item.label}>
                  <Text className="_pg-line-row_label">{item.label}</Text>
                  <Text className="_pg-line-row_value _pg-line-row_value--amount">{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </PageShell>
      </View>
    );
  });
});

export default CheckoutPage;
