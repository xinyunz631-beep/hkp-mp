import { useMemo, useState } from 'react';
import { Input, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { FixedSubmitBar, QuantityStepper } from '@/core/components/commerce';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { showWechatConfirm, showWechatToast } from '@/core/utils/wechat-actions';
import { fetchCheckoutData, submitHotelCheckoutOrder, type HotelCheckoutData } from '@/pkg-hotel/services/checkout';
import { serializeHotelOccupancy } from '@/pkg-hotel/services/mock-data';
import './index.scss';

function isValidMainlandMobile(value: string) {
  return /^1\d{10}$/.test(value.trim());
}

const CheckoutPage = observer(function CheckoutPage() {
  const [checkoutData, setCheckoutData] = useState<HotelCheckoutData>();
  const [guestNames, setGuestNames] = useState<Record<string, string>>({});
  const [contactName, setContactName] = useState('');
  const [mobile, setMobile] = useState('');
  const [roomCount, setRoomCount] = useState(1);
  const [activeRoomIndex, setActiveRoomIndex] = useState(0);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const params = Taro.getCurrentInstance().router?.params ?? {};
      const nextData = await fetchCheckoutData({
        draftId: params.draftId,
        productId: params.productId || params.roomId,
        hotelId: params.hotelId,
      });

      setCheckoutData(nextData);
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
    loginRequired: true,
    loginReason: '登录后可提交酒店订单',
  });

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
  const totalAmount = checkoutData ? Number((checkoutData.unitAmount * roomCount - checkoutData.discountAmount).toFixed(2)) : 0;
  const hasCouponDiscount = Boolean(checkoutData && checkoutData.discountAmount > 0 && checkoutData.couponText.trim());

  function handleRoomCountChange(nextRoomCount: number) {
    setRoomCount(nextRoomCount);
    setActiveRoomIndex((current) => Math.min(current, nextRoomCount - 1));
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

    const confirmed = await showWechatConfirm({
      title: '确认支付',
      content: `确认支付 ¥${totalAmount.toFixed(2)} 预订 ${roomCount} 间？`,
      confirmText: '支付',
      cancelText: '再看看',
    });

    if (!confirmed) return;

    const order = submitHotelCheckoutOrder(checkoutData.draftId, {
      roomCount,
      guestNames: guestFields.map((field) => guestNames[field.id]?.trim()).filter(Boolean),
      contact: {
        name: contactName.trim(),
        mobile: mobile.trim(),
      },
      totalAmount,
      discountAmount: checkoutData.discountAmount,
    });

    if (!order) {
      await showWechatToast('订单信息已失效，请重新选择');
      return;
    }

    await showWechatToast('支付成功', 'success');
    navigateToMiniRoute(`${MINI_PACKAGE_ROUTES.orderDetail}?orderId=${encodeURIComponent(order.id)}`);
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
        </PageShell>
      </View>
    );
  });
});

export default CheckoutPage;
