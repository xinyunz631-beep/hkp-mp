import Taro from '@tarojs/taro';
import { Text, Textarea, View } from '@tarojs/components';
import classNames from 'classnames';
import { observer } from 'mobx-react';
import { useState } from 'react';
import { AppBottomSheet } from '@/core/components/AppBottomSheet';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { CouponSelectionPopup, FixedSubmitBar } from '@/core/components/commerce';
import { PageShare, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { useCheckoutController } from '@/core/runtime/use-checkout-controller';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { previewWechatImages, showWechatToast } from '@/core/utils/wechat-actions';
import {
  clearMallCheckoutPendingOrder,
  fetchCheckoutData,
  persistMallCheckoutPendingOrder,
  submitOrderCheckoutOrder,
  type OrderCheckoutData,
} from '@/pkg-order/services/checkout';
import './index.scss';

function resolveCheckoutRouteParams() {
  const params = Taro.getCurrentInstance().router?.params ?? {};

  return {
    draftId: params.draftId,
    addressId: params.addressId,
  };
}

const ORDER_REMARK_MAX_LENGTH = 120;

// 将商城确认单金额转为分单位比较，避免浮点格式差异误判为改价。
function toMallAmountCent(value?: number) {
  return Math.round((Number(value) || 0) * 100);
}

// 判断商城提交前确认结果是否发生支付、配送或可提交状态变化。
function hasMallCheckoutChanged(currentData: OrderCheckoutData, nextData: OrderCheckoutData) {
  return toMallAmountCent(currentData.totalAmount) !== toMallAmountCent(nextData.totalAmount)
    || toMallAmountCent(currentData.discountAmount) !== toMallAmountCent(nextData.discountAmount)
    || toMallAmountCent(currentData.productAmount) !== toMallAmountCent(nextData.productAmount)
    || toMallAmountCent(currentData.freightAmount) !== toMallAmountCent(nextData.freightAmount)
    || currentData.selectedCouponId !== nextData.selectedCouponId
    || currentData.canSubmit !== nextData.canSubmit
    || currentData.shippingText !== nextData.shippingText
    || (currentData.deliveryErrors ?? []).join('|') !== (nextData.deliveryErrors ?? []).join('|');
}

const CheckoutPage = observer(function CheckoutPage() {
  const [orderRemark, setOrderRemark] = useState('');
  const [discountPopupVisible, setDiscountPopupVisible] = useState(false);
  const checkoutController = useCheckoutController<OrderCheckoutData, string | undefined>({
    load: (params) => fetchCheckoutData({
      ...resolveCheckoutRouteParams(),
      ...(Object.prototype.hasOwnProperty.call(params, 'selectedCouponId') ? { selectedCouponId: params.selectedCouponId } : {}),
      ...(params.draftId ? { draftId: String(params.draftId) } : {}),
      ...(params.addressId ? { addressId: String(params.addressId) } : {}),
    }),
    readSelectedCouponId: (data) => data.selectedCouponId,
    readCouponNoticeText: (data) => data.couponNoticeText,
    readPayableAmount: (data) => data.totalAmount,
    revalidateBeforeSubmit: async (data) => {
      const nextData = await fetchCheckoutData({
        draftId: data.draftId,
        addressId: data.address?.id,
        selectedCouponId: data.selectedCouponId,
      });
      return {
        data: nextData,
        changed: hasMallCheckoutChanged(data, nextData),
        message: nextData.canSubmit === false
          ? nextData.deliveryErrors?.[0] || '当前商品暂不可提交'
          : '商城商品、配送或优惠已更新，请确认后重新提交',
      };
    },
    submit: (data, remark) => submitOrderCheckoutOrder(data, remark),
    onPaymentPrepared: (data, remark, result) => persistMallCheckoutPendingOrder(data, result, remark),
    onPaymentCanceled: (data) => clearMallCheckoutPendingOrder(data),
    buildSuccessRoute: (result) => `${MINI_PACKAGE_ROUTES.orderDetail}?orderId=${encodeURIComponent(result.orderNo)}&paymentSettling=1`,
    submitErrorText: '商城订单提交暂不可用，请稍后再试',
    emptySubmitText: '订单信息已失效，请重新选择商品',
    paymentSuccessRedirectDelayMs: 2000,
    paymentSuccessLoadingText: '加载中',
  });
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await checkoutController.load({});
    },
    refreshOnShow: true,
  });
  const checkoutData = checkoutController.data;
  const selectedCouponId = checkoutController.selectedCouponId;
  const couponPopupVisible = checkoutController.couponPopupVisible;

  function handleDiscountPress() {
    if (!checkoutData?.discountDetails.length) return;
    setDiscountPopupVisible(true);
  }

  async function handleSubmit() {
    if (!checkoutData) return;

    if (checkoutData.canSubmit === false) {
      await showWechatToast(checkoutData.deliveryErrors?.[0] || '当前订单暂不可提交');
      return;
    }

    await checkoutController.submitAndPay(orderRemark.trim() || undefined, {
      withLoading: pageRuntime.withLoading,
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
    const shouldShowCouponRow = checkoutData.amountReady !== false;
    const couponText = selectedCoupon
      ? `${selectedCoupon.amountText} ${selectedCoupon.thresholdText}`
      : hasCoupons
        ? '请选择优惠券'
        : '暂无可用优惠券';
    const merchantName = checkoutData.merchantName?.trim() || '';
    const merchantDisplayName = merchantName || '未提供';
    const hasCouponDiscount = checkoutData.discountAmount > 0;
    const hasDiscountDetails = checkoutData.discountDetails.length > 0;
    const productCount = checkoutData.products.reduce((total, item) => total + item.quantity, 0);
    const productAmount = checkoutData.productAmount;
    const summaryProductAmount = checkoutData.amountReady !== false && typeof productAmount === 'number'
      ? productAmount
      : undefined;
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
              amountText={<Text className="_pg-submit_amount">{checkoutData.amountReady ? `¥${checkoutData.totalAmount.toFixed(2)}` : '待确认'}</Text>}
              extra={hasCouponDiscount ? (
                <View className="_pg-submit_extra" onClick={hasDiscountDetails ? handleDiscountPress : undefined}>
                  <Text>已优惠: ¥{checkoutData.discountAmount.toFixed(2)}</Text>
                  {hasDiscountDetails ? <AppIcon name="arrowRight" size={12} color="#8b909a" /> : null}
                </View>
              ) : undefined}
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

            <View className="_pg-card _pg-card--products">
              <View className="_pg-products-header">
                <View className="_pg-products-header_title">
                  <AppIcon name="shop" size={16} color="#23262f" />
                  <Text>{merchantDisplayName}</Text>
                </View>
                <Text className="_pg-products-header_count">共{checkoutData.products.length}种商品</Text>
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
                    emptyState="error"
                    onClick={() => previewWechatImages({ urls: [item.imageSrc], emptyText: '暂无商品大图' })}
                  />
                  <View className="_pg-product_main">
                    <Text className="_pg-product_title">{item.title}</Text>
                    {item.specText ? <Text className="_pg-product_spec">{item.specText}</Text> : null}
                    {item.giftText ? <Text className="_pg-product_gift">{item.giftText}</Text> : null}
                    <View className="_pg-product_price-row">
                      <Text className="_pg-product_price">{item.paidPriceText || item.priceText}</Text>
                      {item.originalPriceText ? (
                        <Text className="_pg-product_original-price">{item.originalPriceText}</Text>
                      ) : null}
                    </View>
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

            {shouldShowCouponRow ? (
              <View className="_pg-card _pg-card--compact">
                <View
                  className={classNames('_pg-line-row', hasCoupons ? '_pg-line-row--link' : '_pg-line-row--disabled')}
                  onClick={hasCoupons ? checkoutController.openCouponPopup : undefined}
                >
                  <Text className="_pg-line-row_label">优惠券</Text>
                  <View className="_pg-line-row_value-wrap">
                    <Text className={classNames('_pg-line-row_coupon', !hasCoupons && '_pg-line-row_coupon--disabled')}>{couponText}</Text>
                    {hasCoupons ? <AppIcon name="arrowRight" className="_pg-line-row_chevron" size={16} color="#c0c5cf" /> : null}
                  </View>
                </View>
              </View>
            ) : null}

            <View className="_pg-card _pg-card--compact">
              <View className="_pg-line-row">
                <Text className="_pg-line-row_label">支付方式</Text>
                <Text className="_pg-line-row_value">{checkoutData.paymentMethodText}</Text>
              </View>
            </View>

            <View className="_pg-card _pg-remark-card">
              <View className="_pg-remark_header">
                <Text className="_pg-remark_title">订单备注</Text>
                <Text className="_pg-remark_count">{orderRemark.length}/{ORDER_REMARK_MAX_LENGTH}</Text>
              </View>
              <Textarea
                className="_pg-remark_textarea"
                value={orderRemark}
                maxlength={ORDER_REMARK_MAX_LENGTH}
                placeholder="选填，可填写配送或商品备注"
                placeholderClass="hkp-placeholder"
                onInput={(event) => {
                  setOrderRemark(event.detail.value.slice(0, ORDER_REMARK_MAX_LENGTH));
                }}
              />
            </View>

            {typeof summaryProductAmount === 'number' ? (
              <View className="_pg-card _pg-card--compact">
                <View className="_pg-amount-summary">
                  <View className="_pg-amount-summary_header">
                    <Text className="_pg-amount-summary_title">共 {productCount} 件</Text>
                    <Text className="_pg-amount-summary_dot">·</Text>
                    <Text className="_pg-amount-summary_subtitle">小计 ¥{summaryProductAmount.toFixed(2)}</Text>
                  </View>
                  <View className="_pg-amount-summary_row">
                    <Text className="_pg-amount-summary_label">商品金额</Text>
                    <Text className="_pg-amount-summary_value">¥{summaryProductAmount.toFixed(2)}</Text>
                  </View>
                  {requiresAddress ? (
                    <View className="_pg-amount-summary_row">
                      <Text className="_pg-amount-summary_label">运费</Text>
                      <Text className="_pg-amount-summary_value">¥{checkoutData.freightAmount.toFixed(2)}</Text>
                    </View>
                  ) : null}
                  {checkoutData.discountAmount > 0 ? (
                    <>
                      <View className="_pg-amount-summary_row">
                        <Text className="_pg-amount-summary_label">优惠金额</Text>
                        <Text className="_pg-amount-summary_value _pg-amount-summary_value--discount">
                          - ¥{checkoutData.discountAmount.toFixed(2)}
                        </Text>
                      </View>
                      {checkoutData.discountDetails.map((item) => (
                        <View className="_pg-amount-summary_row _pg-amount-summary_row--sub" key={item.id}>
                          <View className="_pg-amount-summary_sub-main">
                            <Text className="_pg-amount-summary_bullet">·</Text>
                            <Text className="_pg-amount-summary_sub-label">{item.title}</Text>
                          </View>
                          <Text className="_pg-amount-summary_sub-value">{item.amountText}</Text>
                        </View>
                      ))}
                    </>
                  ) : null}
                  <View className="_pg-amount-summary_row _pg-amount-summary_row--total">
                    <Text className="_pg-amount-summary_label">实付款</Text>
                    <Text className="_pg-amount-summary_total">¥{checkoutData.totalAmount.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
          <PageShare>
            {hasCoupons ? (
              <CouponSelectionPopup
                visible={couponPopupVisible}
                coupons={couponOptions}
                selectedCouponId={selectedCouponId}
                onClose={checkoutController.closeCouponPopup}
                onClear={async () => {
                  const refreshed = await checkoutController.refreshByCoupon(null, {
                    withLoading: pageRuntime.withLoading,
                  }, {
                    draftId: checkoutData.draftId,
                    addressId: checkoutData.address?.id,
                  });
                  return refreshed ? refreshed.selectedCouponId ?? null : false;
                }}
                onSelect={async (coupon) => {
                  const refreshed = await checkoutController.refreshByCoupon(coupon.id, {
                    withLoading: pageRuntime.withLoading,
                  }, {
                    draftId: checkoutData.draftId,
                    addressId: checkoutData.address?.id,
                  });
                  return refreshed ? refreshed.selectedCouponId ?? null : false;
                }}
              />
            ) : null}
            <AppBottomSheet
              visible={discountPopupVisible && hasDiscountDetails}
              title="优惠明细"
              className="_pg-discount-sheet"
              bodyMinHeight={260}
              bodyMaxHeight="50vh"
              showFooter={false}
              onClose={() => setDiscountPopupVisible(false)}
            >
              <View className="_pg-discount-summary">
                <Text className="_pg-discount-summary_label">本单已优惠</Text>
                <Text className="_pg-discount-summary_amount">¥{checkoutData.discountAmount.toFixed(2)}</Text>
              </View>
              <View className="_pg-discount-list">
                {checkoutData.discountDetails.map((item) => (
                  <View className="_pg-discount-item" key={item.id}>
                    <View className="_pg-discount-item_main">
                      <Text className="_pg-discount-item_title">{item.title}</Text>
                      {item.detailText ? <Text className="_pg-discount-item_detail">{item.detailText}</Text> : null}
                    </View>
                    <Text className="_pg-discount-item_amount">{item.amountText}</Text>
                  </View>
                ))}
              </View>
            </AppBottomSheet>
          </PageShare>
        </PageShell>
      </View>
    );
  });
});

export default CheckoutPage;
