import { useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Input, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { FixedSubmitBar } from '@/core/components/commerce';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { showWechatConfirm, showWechatToast } from '@/core/utils/wechat-actions';
import { fetchCheckoutData, submitHotelCheckoutOrder, type HotelCheckoutData } from '@/pkg-hotel/services/checkout';
import './index.scss';

function resolveRoomCount(roomCountText?: string) {
  const matchedCount = roomCountText?.match(/\d+/)?.[0];
  return Math.max(Number(matchedCount) || 1, 1);
}

function isValidMainlandMobile(value: string) {
  return /^1\d{10}$/.test(value.trim());
}

const CheckoutPage = observer(function CheckoutPage() {
  const [checkoutData, setCheckoutData] = useState<HotelCheckoutData>();
  const [guestNames, setGuestNames] = useState<Record<string, string>>({});
  const [mobile, setMobile] = useState('');
  const [roomCount, setRoomCount] = useState(1);
  const [baseRoomCount, setBaseRoomCount] = useState(1);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const roomId = Taro.getCurrentInstance().router?.params?.roomId;
      const nextData = await fetchCheckoutData(roomId);
      const nextRoomCount = resolveRoomCount(nextData.roomCountText);

      setCheckoutData(nextData);
      setRoomCount(nextRoomCount);
      setBaseRoomCount(nextRoomCount);
      setGuestNames(
        nextData.guestFields.reduce<Record<string, string>>((result, field) => {
          result[field.id] = field.value;
          return result;
        }, {}),
      );
      setMobile(nextData.mobileValue);
    },
  });

  const guestFields = useMemo(() => {
    if (!checkoutData) return [];

    return Array.from({ length: roomCount }, (_, index) => {
      const field = checkoutData.guestFields[index] ?? checkoutData.guestFields[checkoutData.guestFields.length - 1];
      const roomIndexText = String(index + 1).padStart(2, '0');

      return {
        ...field,
        id: `guest-${index + 1}`,
        label: `房间${roomIndexText}`,
      };
    });
  }, [checkoutData, roomCount]);

  const unitAmount = checkoutData ? checkoutData.totalAmount / Math.max(baseRoomCount, 1) : 0;
  const unitDiscount = checkoutData ? checkoutData.discountAmount / Math.max(baseRoomCount, 1) : 0;
  const totalAmount = Number((unitAmount * roomCount).toFixed(2));
  const discountAmount = Number((unitDiscount * roomCount).toFixed(2));

  function handleRoomCountPress() {
    const nextRoomCount = roomCount >= 3 ? 1 : roomCount + 1;
    setRoomCount(nextRoomCount);
    void showWechatToast(`已调整为${nextRoomCount}间`);
  }

  async function handleCouponPress() {
    if (!checkoutData) return;

    await showWechatConfirm({
      title: '优惠券',
      content: `${checkoutData.couponText} 已自动匹配当前房型，提交订单时同步抵扣。`,
      confirmText: '知道了',
      cancelText: '关闭',
    });
  }

  async function handleDiscountPress() {
    if (!checkoutData) return;

    await showWechatConfirm({
      title: '折扣信息',
      content: `当前订单已优惠 ¥${discountAmount.toFixed(2)}，最终以支付页展示金额为准。`,
      confirmText: '知道了',
      cancelText: '关闭',
    });
  }

  async function handleSubmit() {
    if (!checkoutData) return;

    const hasEmptyGuest = guestFields.some((field) => !guestNames[field.id]?.trim());

    if (hasEmptyGuest) {
      await showWechatToast('请补全入住人信息');
      return;
    }

    if (!isValidMainlandMobile(mobile)) {
      await showWechatToast('请输入正确手机号');
      return;
    }

    const confirmed = await showWechatConfirm({
      title: '模拟微信支付',
      content: `确认支付 ¥${totalAmount.toFixed(2)} 预订 ${roomCount} 间？`,
      confirmText: '支付',
      cancelText: '再看看',
    });

    if (!confirmed) return;

    const order = submitHotelCheckoutOrder({
      hotelName: checkoutData.hotelName,
      roomTitle: checkoutData.roomTitle,
      roomTagsText: checkoutData.roomTagsText,
      stayDateText: checkoutData.stayDateText,
      nightsText: checkoutData.nightsText,
      roomCount,
      guestNames: guestFields.map((field) => guestNames[field.id]?.trim()).filter(Boolean),
      mobile,
      totalAmount,
      discountAmount,
      couponText: checkoutData.couponText,
    });

    await showWechatToast('支付成功', 'success');
    Taro.navigateTo({ url: `${MINI_PACKAGE_ROUTES.orderDetail}?orderId=${encodeURIComponent(order.id)}` });
  }

  return pageRuntime.renderPage(() => {
    if (!checkoutData) return null;
    const currentRoomId = Taro.getCurrentInstance().router?.params?.roomId || 'luxury-twin';
    const discountText = checkoutData.discountText === '无可用'
      ? `已优惠 ¥${discountAmount.toFixed(2)}`
      : checkoutData.discountText;

    return (
      <View className="_pg">
        <PageShell
          title={checkoutData.hotelName}
          className="_pg-shell"
          reserveTabBarSpace={false}
          footer={(
            <FixedSubmitBar
              className="_pg-submit"
              label={<Text className="_pg-submit_label">金额:</Text>}
              amountText={<Text className="_pg-submit_amount">¥{totalAmount.toFixed(2)}</Text>}
              extra={<Text className="_pg-submit_extra">已优惠: ¥{discountAmount.toFixed(2)}</Text>}
              buttonText="去支付"
              onSubmit={() => void handleSubmit()}
            />
          )}
        >
          <View className="_pg-content">
            <View className="_pg-card">
              <View className="_pg-room">
                <View className="_pg-room_header">
                  <Text className="_pg-room_title">{checkoutData.roomTitle}</Text>
                  <View
                    className="_pg-room_link"
                    onClick={() => Taro.navigateTo({ url: `${MINI_PACKAGE_ROUTES.hotelRoomDetail}?roomId=${currentRoomId}` })}
                  >
                    房型详情 ›
                  </View>
                </View>
                <Text className="_pg-room_tags">{checkoutData.roomTagsText}</Text>
                <Text className="_pg-room_dates">
                  {checkoutData.stayDateText} {checkoutData.nightsText}
                </Text>
              </View>
            </View>

            <View className="_pg-card">
              <View className="_pg-form">
                <Text className="_pg-form_title">入住信息</Text>

                <View className="_pg-form_row _pg-form_row--link" onClick={handleRoomCountPress}>
                  <Text className="_pg-form_label">房间数</Text>
                  <View className="_pg-form_value">
                    <Text>{roomCount}间</Text>
                    <Text className="_pg-form_chevron">›</Text>
                  </View>
                </View>

                <View className="_pg-form_row _pg-form_row--multi">
                  <Text className="_pg-form_label">入住人</Text>
                  <View className="_pg-form_column">
                    {guestFields.map((field) => (
                      <View className="_pg-guest" key={field.id}>
                        <Text className="_pg-guest_name">{field.label}</Text>
                        <Input
                          className="_pg-guest_input"
                          value={guestNames[field.id] ?? ''}
                          placeholder={field.placeholder}
                          onInput={(event) => {
                            const nextValue = event.detail.value;
                            setGuestNames((current) => ({
                              ...current,
                              [field.id]: nextValue,
                            }));
                          }}
                        />
                      </View>
                    ))}
                  </View>
                </View>

                <View className="_pg-form_row">
                  <Text className="_pg-form_label">手机</Text>
                  <Input
                    className="_pg-form_input"
                    value={mobile}
                    placeholder={checkoutData.mobilePlaceholder}
                    type="number"
                    maxlength={11}
                    onInput={(event) => setMobile(event.detail.value)}
                  />
                </View>
              </View>
            </View>

            <View className="_pg-card _pg-card--compact">
              <View className="_pg-line-row _pg-line-row--link" onClick={() => void handleCouponPress()}>
                <Text className="_pg-line-row_label">优惠券</Text>
                <View className="_pg-line-row_value-wrap">
                  <Text className="_pg-line-row_coupon">{checkoutData.couponText}</Text>
                  <Text className="_pg-line-row_chevron">›</Text>
                </View>
              </View>
            </View>

            <View className="_pg-card _pg-card--compact">
              <View className="_pg-line-row _pg-line-row--link" onClick={() => void handleDiscountPress()}>
                <Text className="_pg-line-row_label">折扣信息</Text>
                <View className="_pg-line-row_value-wrap">
                  <Text className="_pg-line-row_value">{discountText}</Text>
                  <Text className="_pg-line-row_chevron">›</Text>
                </View>
              </View>
            </View>

            <View className="_pg-card _pg-card--compact">
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
