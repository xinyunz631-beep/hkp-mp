import { useMemo, useState } from 'react';
import { Input, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { CouponSelectionPopup, FixedSubmitBar, QuantityStepper } from '@/core/components/commerce';
import { PageShare, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { useCheckoutController } from '@/core/runtime/use-checkout-controller';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { showWechatToast } from '@/core/utils/wechat-actions';
import { fetchCheckoutData, submitHotelCheckoutOrder, type HotelCheckoutData } from '@/pkg-hotel/services/checkout';
import { serializeHotelOccupancy } from '@/pkg-hotel/services/model';
import { updateHotelOrderDraft } from '@/pkg-hotel/services/order-draft';
import './index.scss';

function isValidMainlandMobile(value: string) {
  return /^1\d{10}$/.test(value.trim());
}

const CheckoutPage = observer(function CheckoutPage() {
  const [guestNames, setGuestNames] = useState<Record<string, string>>({});
  const [contactName, setContactName] = useState('');
  const [mobile, setMobile] = useState('');
  const [roomCount, setRoomCount] = useState(1);
  const [activeRoomIndex, setActiveRoomIndex] = useState(0);
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
    submit: (data, payload) => submitHotelCheckoutOrder(data.draftId, payload),
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
  const couponOptions = checkoutData?.coupons ?? [];
  const selectedCoupon = couponOptions.find((coupon) => coupon.id === selectedCouponId);
  const hasCoupons = couponOptions.length > 0;
  const couponText = selectedCoupon
    ? `${selectedCoupon.amountText} ${selectedCoupon.thresholdText}`
    : '请选择优惠券';
  const hasCouponDiscount = Boolean(checkoutData && checkoutData.discountAmount > 0);

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
      return true;
  }

  function handleRoomCountChange(nextRoomCount: number) {
    setRoomCount(nextRoomCount);
    setActiveRoomIndex((current) => Math.min(current, nextRoomCount - 1));
    void refreshHotelCheckout(nextRoomCount, selectedCouponId);
  }

  function handleDetailPress() {
    if (!checkoutData) return;

    const url = [
      `${MINI_PACKAGE_ROUTES.hotelRoomDetail}?hotelId=${encodeURIComponent(checkoutData.hotelId)}`,
      `productId=${encodeURIComponent(checkoutData.productId)}`,
      `checkIn=${encodeURIComponent(checkoutData.checkIn)}`,
      `checkOut=${encodeURIComponent(checkoutData.checkOut)}`,
      `occupancy=${serializeHotelOccupancy(checkoutData.occupancy)}`,
    ].join('&');

    navigateToMiniRoute(url);
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
              extra={hasCouponDiscount ? <Text className="_pg-submit_extra">已优惠: ¥{checkoutData.discountAmount.toFixed(2)}</Text> : undefined}
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
                <View className="_pg-product_link" onClick={handleDetailPress}>
                  <Text>详情</Text>
                  <AppIcon name="arrowRight" size={16} color="#9ca3af" />
                </View>
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

            {hasCoupons ? (
              <View className="_pg-card _pg-card--compact">
                <View className="_pg-line-row _pg-line-row--link" onClick={checkoutController.openCouponPopup}>
                  <Text className="_pg-line-row_label">优惠券</Text>
                  <View className="_pg-line-row_value">
                    <Text>{couponText}</Text>
                    <AppIcon name="arrowRight" size={16} color="#9ca3af" />
                  </View>
                </View>
              </View>
            ) : null}

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
          </View>
          <PageShare>
            {hasCoupons ? (
              <CouponSelectionPopup
                visible={couponPopupVisible}
                coupons={couponOptions}
                selectedCouponId={selectedCouponId}
                onClose={checkoutController.closeCouponPopup}
                onClear={() => {
                  return refreshHotelCheckout(roomCount, null);
                }}
                onSelect={(coupon) => {
                  return refreshHotelCheckout(roomCount, coupon.id);
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
