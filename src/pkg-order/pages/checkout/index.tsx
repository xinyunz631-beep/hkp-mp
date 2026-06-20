import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import classNames from 'classnames';
import { observer } from 'mobx-react';
import { useState } from 'react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { CouponSelectionPopup, FixedSubmitBar } from '@/core/components/commerce';
import { PageShare, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { resolveErrorMessage } from '@/core/utils/error-message';
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
  const [selectedCouponId, setSelectedCouponId] = useState<string>();
  const [couponPopupVisible, setCouponPopupVisible] = useState(false);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchCheckoutData({
        ...resolveCheckoutRouteParams(),
        selectedCouponId,
      });
      setCheckoutData(nextData);
      setSelectedCouponId(nextData.selectedCouponId);
      setCouponPopupVisible(false);
    },
    refreshOnShow: true,
  });

  async function refreshCheckoutByCoupon(nextCouponId?: string) {
    if (!checkoutData) return;

    try {
      const nextData = await pageRuntime.withLoading(() => fetchCheckoutData({
        draftId: checkoutData.draftId,
        addressId: checkoutData.address?.id,
        selectedCouponId: nextCouponId,
      }));
      setCheckoutData(nextData);
      setSelectedCouponId(nextData.selectedCouponId);
      setCouponPopupVisible(false);
    } catch (error) {
      await showWechatToast(resolveErrorMessage(error, '优惠券暂不可用，请稍后再试'));
    }
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

    let order: Awaited<ReturnType<typeof submitOrderCheckoutOrder>>;
    try {
      order = await pageRuntime.withLoading(() => submitOrderCheckoutOrder(checkoutData));
    } catch (error) {
      await showWechatToast(resolveErrorMessage(error, '商城订单提交暂不可用，请稍后再试'));
      return;
    }

    if (!order) {
      await showWechatToast('订单信息已失效，请重新选择商品');
      return;
    }

    if (order.payableAmount <= 0) {
      await showWechatToast('下单成功', 'success');
      navigateToMiniRoute(`${MINI_PACKAGE_ROUTES.orderDetail}?orderId=${encodeURIComponent(order.orderNo)}`, {
        loginMode: 'none',
      });
      return;
    }

    const paymentParams = order.payment?.prepay?.paymentParams || order.payment?.prepay?.payParams;
    if (!paymentParams) {
      await showWechatToast('支付参数缺失，请稍后再试');
      return;
    }

    const paymentStatus = await requestWechatPayment({
      amount: order.payableAmount || checkoutData.totalAmount,
      paymentParams: paymentParams as unknown as Parameters<typeof Taro.requestPayment>[0],
    });
    if (paymentStatus !== 'success') return;

    await showWechatToast('支付成功', 'success');
    navigateToMiniRoute(`${MINI_PACKAGE_ROUTES.orderDetail}?orderId=${encodeURIComponent(order.orderNo)}`, {
      loginMode: 'none',
    });
  }

  function handleAddressPress() {
    if (!checkoutData?.requiresAddress) return;

    if (!checkoutData?.draftId) {
      navigateToMiniRoute(MINI_PACKAGE_ROUTES.orderAddress);
      return;
    }

    const query = [
      `mode=select`,
      `draftId=${encodeURIComponent(checkoutData.draftId)}`,
      checkoutData.address?.id ? `selectedId=${encodeURIComponent(checkoutData.address.id)}` : '',
    ].filter(Boolean).join('&');

    navigateToMiniRoute(
      `${MINI_PACKAGE_ROUTES.orderAddress}?${query}`,
    );
  }

  return pageRuntime.renderPage(() => {
    if (!checkoutData) return null;
    const couponOptions = checkoutData.coupons ?? [];
    const selectedCoupon = couponOptions.find((coupon) => coupon.id === selectedCouponId);
    const hasCoupons = couponOptions.length > 0;
    const couponText = selectedCoupon
      ? `${selectedCoupon.amountText} ${selectedCoupon.thresholdText}`
      : '请选择优惠券';
    const merchantName = checkoutData.merchantName?.trim() || '';
    const merchantDisplayName = merchantName || '未提供';
    const hasCouponDiscount = checkoutData.discountAmount > 0;
    const deliveryErrors = checkoutData.deliveryErrors ?? [];
    const deliveryUnavailable = checkoutData.canSubmit === false;
    const requiresAddress = checkoutData.requiresAddress;
    const address = checkoutData.address;
    const deliveryLabel = requiresAddress ? '配送' : '交付';
    const addressActionText = requiresAddress ? (address ? '更换' : '去填写') : '';
    const addressHintText = requiresAddress
      ? '当前订单需要可配送收货地址后才可提交'
      : '该商品下单后将按虚拟权益或服务内容发放';

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
            <View className="_pg-card _pg-card--address" onClick={requiresAddress ? handleAddressPress : undefined}>
              <View className="_pg-address_topline">
                <View className="_pg-address_title">
                  <AppIcon name="location" size={16} color="#d94a88" />
                  <Text>{requiresAddress ? '收货地址' : '交付方式'}</Text>
                </View>
                {addressActionText ? <Text className="_pg-address_action">{addressActionText}</Text> : null}
              </View>
              {address ? (
                <View className="_pg-address">
                  <View className="_pg-address_header">
                    <Text className="_pg-address_name">{address.name}</Text>
                    <Text className="_pg-address_mobile">{address.mobile}</Text>
                    {address.isDefault ? <Text className="_pg-address_tag">默认</Text> : null}
                  </View>
                  <View className="_pg-address_row">
                    <Text className="_pg-address_detail">
                      {address.region}
                      {address.detail}
                    </Text>
                    {requiresAddress ? <AppIcon name="arrowRight" className="_pg-address_chevron" size={16} color="#c0c5cf" /> : null}
                  </View>
                </View>
              ) : (
                <View className="_pg-address">
                  <Text className="_pg-address_empty-title">{requiresAddress ? '请先新增收货地址' : '无需收货地址'}</Text>
                  <View className="_pg-address_row">
                    <Text className="_pg-address_detail">{addressHintText}</Text>
                    {requiresAddress ? <AppIcon name="arrowRight" className="_pg-address_chevron" size={16} color="#c0c5cf" /> : null}
                  </View>
                </View>
              )}
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
                {requiresAddress ? (
                  <View className="_pg-delivery-alert_action" onClick={handleAddressPress}>
                    <Text>{address ? '更换收货地址' : '去填写收货地址'}</Text>
                    <AppIcon name="arrowRight" size={14} color="#d97706" />
                  </View>
                ) : null}
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
                  <Text>{merchantDisplayName}</Text>
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
                    {item.specText ? <Text className="_pg-product_spec">{item.specText}</Text> : null}
                    {item.giftText ? <Text className="_pg-product_gift">{item.giftText}</Text> : null}
                    <Text className="_pg-product_price">{item.priceText}</Text>
                  </View>
                  <Text className="_pg-product_quantity">x{item.quantity}</Text>
                </View>
              ))}
            </View>

            <View className={classNames('_pg-card', '_pg-card--compact', deliveryUnavailable && '_pg-card--delivery-error')}>
              <View className="_pg-line-row">
                <Text className="_pg-line-row_label">{deliveryLabel}</Text>
                <Text className={classNames('_pg-line-row_value', deliveryUnavailable && '_pg-line-row_value--error')}>
                  {checkoutData.shippingText}
                </Text>
              </View>
            </View>

            {hasCoupons ? (
              <View className="_pg-card _pg-card--compact">
                <View className="_pg-line-row _pg-line-row--link" onClick={() => setCouponPopupVisible(true)}>
                  <Text className="_pg-line-row_label">优惠券</Text>
                  <View className="_pg-line-row_value-wrap">
                    <Text className="_pg-line-row_coupon">{couponText}</Text>
                    <AppIcon name="arrowRight" className="_pg-line-row_chevron" size={16} color="#c0c5cf" />
                  </View>
                </View>
              </View>
            ) : null}

            {hasCouponDiscount ? (
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
          <PageShare>
            {hasCoupons ? (
              <CouponSelectionPopup
                visible={couponPopupVisible}
                coupons={couponOptions}
                selectedCouponId={selectedCouponId}
                clearText="不使用优惠券"
                onClose={() => setCouponPopupVisible(false)}
                onClear={() => {
                  void refreshCheckoutByCoupon(undefined);
                }}
                onSelect={(coupon) => {
                  void refreshCheckoutByCoupon(coupon.id);
                }}
              />
            ) : null}
          </PageShare>
        </PageShell>
      </View>
    );
  });
});

export default CheckoutPage;
