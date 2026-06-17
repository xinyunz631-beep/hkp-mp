import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import classNames from 'classnames';
import { observer } from 'mobx-react';
import { useState } from 'react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { FixedSubmitBar } from '@/core/components/commerce';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { previewWechatImages, requestWechatPayment, showWechatConfirm, showWechatToast } from '@/core/utils/wechat-actions';
import { fetchCheckoutData, submitOrderCheckoutOrder, type OrderCheckoutData } from '@/pkg-order/services/checkout';
import './index.scss';

function resolveCheckoutRouteParams() {
  const params = Taro.getCurrentInstance().router?.params ?? {};

  return {
    draftId: params.draftId,
    addressId: params.addressId,
  };
}

const CheckoutPage = observer(function CheckoutPage() {
  const [checkoutData, setCheckoutData] = useState<OrderCheckoutData>();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchCheckoutData(resolveCheckoutRouteParams());
      setCheckoutData(nextData);
    },
    refreshOnShow: true,
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

    if (checkoutData.canSubmit === false) {
      await showWechatToast(checkoutData.deliveryErrors?.[0] || '当前订单暂不可提交');
      return;
    }

    const paymentStatus = await requestWechatPayment({
      title: '微信支付',
      amount: checkoutData.totalAmount,
      allowPending: true,
    });

    if (paymentStatus === 'failed') return;

    const order = submitOrderCheckoutOrder(checkoutData, {
      paymentStatus: paymentStatus === 'success' ? 'paid' : 'pending',
    });
    await showWechatToast(paymentStatus === 'success' ? '支付成功' : '订单已提交，可稍后继续支付', 'success');
    navigateToMiniRoute(`${MINI_PACKAGE_ROUTES.orderDetail}?orderId=${encodeURIComponent(order.id)}`, {
      loginMode: 'none',
    });
  }

  function handleAddressPress() {
    if (!checkoutData?.draftId) {
      navigateToMiniRoute(MINI_PACKAGE_ROUTES.orderAddress);
      return;
    }

    navigateToMiniRoute(
      `${MINI_PACKAGE_ROUTES.orderAddress}?mode=select&draftId=${encodeURIComponent(checkoutData.draftId)}&selectedId=${encodeURIComponent(checkoutData.address.id)}`,
    );
  }

  return pageRuntime.renderPage(() => {
    if (!checkoutData) return null;
    const hasCouponDiscount = checkoutData.discountAmount > 0 && checkoutData.couponText.trim().length > 0;
    const deliveryErrors = checkoutData.deliveryErrors ?? [];
    const deliveryUnavailable = checkoutData.canSubmit === false;

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
              disabled={deliveryUnavailable}
              onSubmit={() => void handleSubmit()}
              onDisabledClick={() => void handleSubmit()}
            />
          )}
        >
          <View className="_pg-content">
            <View className="_pg-card _pg-card--address" onClick={handleAddressPress}>
              <View className="_pg-address_topline">
                <View className="_pg-address_title">
                  <AppIcon name="location" size={16} color="#d94a88" />
                  <Text>收货地址</Text>
                </View>
                <Text className="_pg-address_action">更换</Text>
              </View>
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

            {deliveryUnavailable ? (
              <View className="_pg-delivery-alert">
                <View className="_pg-delivery-alert_header">
                  <AppIcon name="ask" size={16} color="#d97706" />
                  <Text>当前订单暂不可提交</Text>
                </View>
                {deliveryErrors.map((errorText) => (
                  <Text className="_pg-delivery-alert_item" key={errorText}>{errorText}</Text>
                ))}
                <View className="_pg-delivery-alert_action" onClick={handleAddressPress}>
                  <Text>更换收货地址</Text>
                  <AppIcon name="arrowRight" size={14} color="#d97706" />
                </View>
              </View>
            ) : null}

            <View className="_pg-card _pg-card--compact">
              <View className="_pg-line-row">
                <Text className="_pg-line-row_label">支付方法</Text>
                <Text className="_pg-line-row_value">{checkoutData.paymentMethodText}</Text>
              </View>
            </View>

            <View className="_pg-card _pg-card--products">
              <View className="_pg-products-header">
                <View className="_pg-products-header_title">
                  <AppIcon name="shop" size={16} color="#23262f" />
                  <Text>Hello Kitty 官方商城</Text>
                </View>
                <Text className="_pg-products-header_count">共{checkoutData.products.reduce((total, item) => total + item.quantity, 0)}件</Text>
              </View>
              {checkoutData.products.map((item) => (
                <View
                  className={classNames('_pg-product', deliveryUnavailable && '_pg-product--disabled')}
                  key={item.id}
                >
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

            <View className={classNames('_pg-card', '_pg-card--compact', deliveryUnavailable && '_pg-card--delivery-error')}>
              <View className="_pg-line-row">
                <Text className="_pg-line-row_label">配送</Text>
                <Text className={classNames('_pg-line-row_value', deliveryUnavailable && '_pg-line-row_value--error')}>
                  {checkoutData.shippingText}
                </Text>
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
