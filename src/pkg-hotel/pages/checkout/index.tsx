import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Input, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { FixedSubmitBar } from '@/core/components/commerce';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchCheckoutData, type HotelCheckoutData } from '@/pkg-hotel/services/checkout';
import './index.scss';

function showComingSoon(title: string) {
  Taro.showToast({ title, icon: 'none' });
}

const CheckoutPage = observer(function CheckoutPage() {
  const [checkoutData, setCheckoutData] = useState<HotelCheckoutData>();
  const [guestNames, setGuestNames] = useState<Record<string, string>>({});
  const [mobile, setMobile] = useState('');
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const roomId = Taro.getCurrentInstance().router?.params?.roomId;
      const nextData = await fetchCheckoutData(roomId);
      setCheckoutData(nextData);
      setGuestNames(
        nextData.guestFields.reduce<Record<string, string>>((result, field) => {
          result[field.id] = field.value;
          return result;
        }, {}),
      );
      setMobile(nextData.mobileValue);
    },
  });

  function handleSubmit() {
    if (!checkoutData) return;

    const hasEmptyGuest = checkoutData.guestFields.some((field) => !guestNames[field.id]?.trim());

    if (hasEmptyGuest || !mobile.trim()) {
      Taro.showToast({ title: '请补全入住信息', icon: 'none' });
      return;
    }

    Taro.showToast({ title: '支付能力即将开放', icon: 'none' });
  }

  return pageRuntime.renderPage(() => {
    if (!checkoutData) return null;
    const currentRoomId = Taro.getCurrentInstance().router?.params?.roomId || 'luxury-twin';

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
              amountText={<Text className="_pg-submit_amount">¥{checkoutData.totalAmount.toFixed(2)}</Text>}
              extra={<Text className="_pg-submit_extra">已优惠: ¥{checkoutData.discountAmount.toFixed(2)}</Text>}
              buttonText="去支付"
              onSubmit={handleSubmit}
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

                <View className="_pg-form_row _pg-form_row--link" onClick={() => showComingSoon('房间数调整即将开放')}>
                  <Text className="_pg-form_label">房间数</Text>
                  <View className="_pg-form_value">
                    <Text>{checkoutData.roomCountText}</Text>
                    <Text className="_pg-form_chevron">›</Text>
                  </View>
                </View>

                <View className="_pg-form_row _pg-form_row--multi">
                  <Text className="_pg-form_label">入住人</Text>
                  <View className="_pg-form_column">
                    {checkoutData.guestFields.map((field) => (
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
              <View className="_pg-line-row _pg-line-row--link">
                <Text className="_pg-line-row_label">优惠券</Text>
                <View className="_pg-line-row_value-wrap">
                  <Text className="_pg-line-row_coupon">{checkoutData.couponText}</Text>
                  <Text className="_pg-line-row_chevron">›</Text>
                </View>
              </View>
            </View>

            <View className="_pg-card _pg-card--compact">
              <View className="_pg-line-row _pg-line-row--link">
                <Text className="_pg-line-row_label">折扣信息</Text>
                <View className="_pg-line-row_value-wrap">
                  <Text className="_pg-line-row_value">{checkoutData.discountText}</Text>
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
