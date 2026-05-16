import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { useState } from 'react';
import { AppImage } from '@/core/components/AppImage';
import { FixedSubmitBar } from '@/core/components/commerce';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchCheckoutData, type OrderCheckoutData } from '@/pkg-order/services/checkout';
import './index.scss';

const CheckoutPage = observer(function CheckoutPage() {
  const [checkoutData, setCheckoutData] = useState<OrderCheckoutData>();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchCheckoutData();
      setCheckoutData(nextData);
    },
  });

  return pageRuntime.renderPage(() => {
    if (!checkoutData) return null;

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
              extra={<Text className="_pg-submit_extra">已优惠: ¥{checkoutData.discountAmount.toFixed(2)}</Text>}
              buttonText="去支付"
              onSubmit={() => Taro.showToast({ title: '支付能力即将开放', icon: 'none' })}
            />
          )}
        >
          <View className="_pg-content">
            <View className="_pg-card" onClick={() => Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.orderAddress })}>
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
                  <Text className="_pg-address_chevron">›</Text>
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
                  <AppImage className="_pg-product_image" src={item.imageSrc} mode="aspectFill" />
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
