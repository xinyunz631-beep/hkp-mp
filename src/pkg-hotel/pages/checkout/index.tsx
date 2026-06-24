import { useMemo, useState } from 'react';
import { Input, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { observer } from 'mobx-react';
import { AppBottomSheet } from '@/core/components/AppBottomSheet';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { CouponSelectionPopup, FixedSubmitBar, QuantityStepper } from '@/core/components/commerce';
import { PageShare, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { useCheckoutController } from '@/core/runtime/use-checkout-controller';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { showWechatToast } from '@/core/utils/wechat-actions';
import {
  fetchCheckoutData,
  persistHotelCheckoutPendingOrder,
  submitHotelCheckoutOrder,
  type HotelCheckoutData,
} from '@/pkg-hotel/services/checkout';
import { updateHotelOrderDraft } from '@/pkg-hotel/services/order-draft';
import './index.scss';

function isValidMainlandMobile(value: string) {
  return /^1\d{10}$/.test(value.trim());
}

// 将酒店确认单金额转为分单位比较，避免浮点格式差异误判为改价。
function toHotelAmountCent(value?: number) {
  return Math.round((Number(value) || 0) * 100);
}

// 判断酒店提交前确认结果是否发生支付关键字段变化。
function hasHotelCheckoutChanged(currentData: HotelCheckoutData, nextData: HotelCheckoutData) {
  return toHotelAmountCent(currentData.totalAmount) !== toHotelAmountCent(nextData.totalAmount)
    || toHotelAmountCent(currentData.discountAmount) !== toHotelAmountCent(nextData.discountAmount)
    || toHotelAmountCent(currentData.productAmount) !== toHotelAmountCent(nextData.productAmount)
    || currentData.selectedCouponId !== nextData.selectedCouponId
    || currentData.roomCount !== nextData.roomCount;
}

const CheckoutPage = observer(function CheckoutPage() {
  const [guestNames, setGuestNames] = useState<Record<string, string>>({});
  const [contactName, setContactName] = useState('');
  const [mobile, setMobile] = useState('');
  const [roomCount, setRoomCount] = useState(1);
  const [activeRoomIndex, setActiveRoomIndex] = useState(0);
  const [discountPopupVisible, setDiscountPopupVisible] = useState(false);
  const checkoutController = useCheckoutController<HotelCheckoutData, Parameters<typeof submitHotelCheckoutOrder>[1]>({
    load: (params) => {
      const routeParams = Taro.getCurrentInstance().router?.params ?? {};
      return fetchCheckoutData({
        draftId: params.draftId ? String(params.draftId) : routeParams.draftId,
        productId: routeParams.productId || routeParams.roomId,
        hotelId: routeParams.hotelId,
        roomCount: typeof params.roomCount === 'number' ? params.roomCount : undefined,
        selectedCouponId: Object.prototype.hasOwnProperty.call(params, 'selectedCouponId')
          ? params.selectedCouponId
          : undefined,
      });
    },
    readSelectedCouponId: (data) => data.selectedCouponId,
    readCouponNoticeText: (data) => data.couponNoticeText,
    readPayableAmount: (data) => data.totalAmount,
    revalidateBeforeSubmit: async (data, payload) => {
      const nextData = await fetchCheckoutData({
        draftId: data.draftId,
        roomCount: payload.roomCount,
        selectedCouponId: payload.selectedCouponId,
      });
      return {
        data: nextData,
        changed: hasHotelCheckoutChanged(data, nextData),
        message: '酒店房态、价格或优惠已更新，请确认后重新提交',
      };
    },
    submit: (data, payload) => submitHotelCheckoutOrder(data.draftId, payload),
    onPaymentPrepared: (data, payload, result) => persistHotelCheckoutPendingOrder(data.draftId, payload, result),
    buildSuccessRoute: (result) => `${MINI_PACKAGE_ROUTES.orderDetail}?orderId=${encodeURIComponent(result.orderNo)}`,
    submitErrorText: '酒店订单提交暂不可用，请稍后再试',
    emptySubmitText: '订单信息已失效，请重新选择',
  });
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const params = Taro.getCurrentInstance().router?.params ?? {};
      const nextData = await checkoutController.load({
        draftId: params.draftId,
      });

      setRoomCount(nextData.roomCount);
      setActiveRoomIndex(0);
      setGuestNames(
        nextData.guestFields.reduce<Record<string, string>>((result, field) => {
          result[field.id] = field.value;
          return result;
        }, {}),
      );
      setContactName(nextData.contactNameValue);
      setMobile(nextData.mobileValue);
    },
  });
  const checkoutData = checkoutController.data;
  const selectedCouponId = checkoutController.selectedCouponId;
  const couponPopupVisible = checkoutController.couponPopupVisible;

  const guestFields = useMemo(() => {
    if (!checkoutData) return [];

    return Array.from({ length: roomCount }, (_, index) => {
      const field = checkoutData.guestFields[index] ?? checkoutData.guestFields[checkoutData.guestFields.length - 1];
      return {
        ...field,
        id: `guest-${index + 1}`,
        label: `房间${index + 1}`,
      };
    });
  }, [checkoutData, roomCount]);
  const activeGuestField = guestFields[activeRoomIndex] ?? guestFields[0];
  const totalAmount = checkoutData ? checkoutData.totalAmount : 0;
  const productAmount = checkoutData?.productAmount;
  const couponOptions = checkoutData?.coupons ?? [];
  const selectedCoupon = couponOptions.find((coupon) => coupon.id === selectedCouponId);
  const hasCoupons = couponOptions.length > 0;
  const couponText = selectedCoupon
    ? `${selectedCoupon.amountText} ${selectedCoupon.thresholdText}`
    : hasCoupons
      ? '请选择优惠券'
      : '暂无可用优惠券';
  const hasCouponDiscount = Boolean(checkoutData && checkoutData.discountAmount > 0);
  const hasDiscountDetails = Boolean(checkoutData?.discountDetails.length);
  const summarySubtotalAmount = productAmount;

  async function refreshHotelCheckout(nextRoomCount = roomCount, nextCouponId: string | null | undefined = selectedCouponId) {
    if (!checkoutData) return false;

    const nextData = await checkoutController.refreshByCoupon(nextCouponId, {
      withLoading: pageRuntime.withLoading,
    }, {
        draftId: checkoutData.draftId,
        roomCount: nextRoomCount,
    });

    if (!nextData) return false;

      updateHotelOrderDraft(nextData.draftId, {
        occupancy: {
          ...nextData.occupancy,
          roomCount: nextData.roomCount,
        },
        selectedCouponId: nextData.selectedCouponId,
      });
      setRoomCount(nextData.roomCount);
      return nextData;
  }

  function handleRoomCountChange(nextRoomCount: number) {
    setRoomCount(nextRoomCount);
    setActiveRoomIndex((current) => Math.min(current, nextRoomCount - 1));
    void refreshHotelCheckout(nextRoomCount, selectedCouponId);
  }

  function handleDiscountPress() {
    if (!checkoutData?.discountDetails.length) return;
    setDiscountPopupVisible(true);
  }

  async function handleSubmit() {
    if (!checkoutData) return;

    if (!contactName.trim()) {
      await showWechatToast('请填写联系人姓名');
      return;
    }

    if (!isValidMainlandMobile(mobile)) {
      await showWechatToast('请输入正确手机号');
      return;
    }

    const emptyGuestIndex = guestFields.findIndex((field) => !guestNames[field.id]?.trim());

    if (emptyGuestIndex >= 0) {
      setActiveRoomIndex(emptyGuestIndex);
      await showWechatToast(`请填写${guestFields[emptyGuestIndex].label}入住人`);
      return;
    }

    await checkoutController.submitAndPay({
      roomCount,
      guestNames: guestFields.map((field) => guestNames[field.id]?.trim()).filter(Boolean),
      contact: {
        name: contactName.trim(),
        mobile: mobile.trim(),
      },
      selectedCouponId,
      totalAmount,
      discountAmount: checkoutData.discountAmount,
    }, {
      withLoading: pageRuntime.withLoading,
    });
  }

  return pageRuntime.renderPage(() => {
    if (!checkoutData) return null;

    return (
      <View className="_pg">
        <PageShell
          title="确认订单"
          className="_pg-shell"
          reserveTabBarSpace={false}
          footer={(
            <FixedSubmitBar
              className="_pg-submit"
              label={<Text className="_pg-submit_label">金额:</Text>}
              amountText={<Text className="_pg-submit_amount">¥{totalAmount.toFixed(2)}</Text>}
              extra={hasCouponDiscount ? (
                <View className="_pg-submit_extra" onClick={hasDiscountDetails ? handleDiscountPress : undefined}>
                  <Text>已优惠: ¥{checkoutData.discountAmount.toFixed(2)}</Text>
                  {hasDiscountDetails ? <AppIcon name="arrowRight" size={12} color="#8b909a" /> : null}
                </View>
              ) : undefined}
              buttonText="去支付"
              onSubmit={() => void handleSubmit()}
            />
          )}
        >
          <View className="_pg-content">
            <View className="_pg-card">
              <View className="_pg-product">
                <AppImage className="_pg-product_image" src={checkoutData.productImageSrc} mode="aspectFill" />
                <View className="_pg-product_main">
                  <Text className="_pg-product_title">{checkoutData.productTitle}</Text>
                  <Text className="_pg-product_meta">{checkoutData.productSubtitle}</Text>
                  <Text className="_pg-product_plan">{checkoutData.ratePlanTitle}</Text>
                </View>
                {typeof productAmount === 'number' ? (
                  <View className="_pg-product_amount-wrap">
                    <Text className="_pg-product_amount">¥{productAmount.toFixed(2)}</Text>
                  </View>
                ) : null}
              </View>
              <View className="_pg-summary-row">
                <Text>入住日期</Text>
                <Text>{checkoutData.stayDateText} {checkoutData.nightsText}</Text>
              </View>
              <View className="_pg-summary-row">
                <Text>房间数</Text>
                <QuantityStepper
                  value={roomCount}
                  min={1}
                  max={checkoutData.maxRoomCount}
                  onChange={handleRoomCountChange}
                />
              </View>
            </View>

            <View className="_pg-card">
              <Text className="_pg-card_title">入住人信息</Text>
              <View className="_pg-room-tabs">
                {guestFields.map((field, index) => (
                  <View
                    className={`_pg-room-tabs_item ${activeRoomIndex === index ? '_pg-room-tabs_item--active' : ''}`}
                    key={field.id}
                    onClick={() => setActiveRoomIndex(index)}
                  >
                    <Text>{field.label}</Text>
                  </View>
                ))}
              </View>
              {activeGuestField ? (
                <View className="_pg-form-row">
                  <Text className="_pg-form-row_label">入住人</Text>
                  <Input
                    className="_pg-form-row_input"
                    value={guestNames[activeGuestField.id] ?? ''}
                    placeholder={activeGuestField.placeholder}
                    onInput={(event) => {
                      const nextValue = event.detail.value;
                      setGuestNames((current) => ({
                        ...current,
                        [activeGuestField.id]: nextValue,
                      }));
                    }}
                  />
                </View>
              ) : null}
            </View>

            <View className="_pg-card">
              <Text className="_pg-card_title">联系人</Text>
              <View className="_pg-form-row">
                <Text className="_pg-form-row_label">姓名</Text>
                <Input
                  className="_pg-form-row_input"
                  value={contactName}
                  placeholder={checkoutData.contactNamePlaceholder}
                  onInput={(event) => setContactName(event.detail.value)}
                />
              </View>
              <View className="_pg-form-row">
                <Text className="_pg-form-row_label">手机</Text>
                <Input
                  className="_pg-form-row_input"
                  value={mobile}
                  placeholder={checkoutData.mobilePlaceholder}
                  type="number"
                  maxlength={11}
                  onInput={(event) => setMobile(event.detail.value)}
                />
              </View>
            </View>

            <View className="_pg-card _pg-card--compact">
              <View
                className={`_pg-line-row ${hasCoupons ? '_pg-line-row--link' : '_pg-line-row--disabled'}`}
                onClick={hasCoupons ? checkoutController.openCouponPopup : undefined}
              >
                <Text className="_pg-line-row_label">优惠券</Text>
                <View className="_pg-line-row_value">
                  <Text className={`_pg-line-row_coupon ${hasCoupons ? '' : '_pg-line-row_coupon--disabled'}`}>{couponText}</Text>
                  {hasCoupons ? <AppIcon name="arrowRight" size={16} color="#9ca3af" /> : null}
                </View>
              </View>
            </View>

            <View className="_pg-card _pg-card--compact">
              <View className="_pg-line-row">
                <Text className="_pg-line-row_label">取消规则</Text>
                <Text className="_pg-line-row_value">{checkoutData.cancelRule}</Text>
              </View>
              <View className="_pg-line-row">
                <Text className="_pg-line-row_label">入住时间</Text>
                <Text className="_pg-line-row_value">{checkoutData.checkInTimeText}，{checkoutData.checkOutTimeText}</Text>
              </View>
              <View className="_pg-line-row">
                <Text className="_pg-line-row_label">发票</Text>
                <Text className="_pg-line-row_value">{checkoutData.invoiceText}</Text>
              </View>
            </View>

            {typeof summarySubtotalAmount === 'number' ? (
              <View className="_pg-card _pg-card--compact">
                <View className="_pg-amount-summary">
                  <View className="_pg-amount-summary_header">
                    <Text className="_pg-amount-summary_title">共 {roomCount} 间</Text>
                    <Text className="_pg-amount-summary_dot">·</Text>
                    <Text className="_pg-amount-summary_subtitle">小计 ¥{summarySubtotalAmount.toFixed(2)}</Text>
                  </View>
                  <View className="_pg-amount-summary_row">
                    <Text className="_pg-amount-summary_label">房费金额</Text>
                    <Text className="_pg-amount-summary_value">¥{summarySubtotalAmount.toFixed(2)}</Text>
                  </View>
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
                    <Text className="_pg-amount-summary_total">¥{totalAmount.toFixed(2)}</Text>
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
                onClear={() => {
                  return refreshHotelCheckout(roomCount, null).then((nextData) => (nextData ? nextData.selectedCouponId ?? null : false));
                }}
                onSelect={(coupon) => {
                  return refreshHotelCheckout(roomCount, coupon.id).then((nextData) => (nextData ? nextData.selectedCouponId ?? null : false));
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
                    <Text className="_pg-discount-item_title">{item.title}</Text>
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
