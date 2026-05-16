import { useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Input, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { FixedSubmitBar, QuantityStepper } from '@/core/components/commerce';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchCheckoutData, type TicketCheckoutData } from '@/pkg-ticket/services/checkout';
import './index.scss';

interface ContactFormState {
  name: string;
  mobile: string;
  idCard: string;
}

const CheckoutPage = observer(function CheckoutPage() {
  const [checkoutData, setCheckoutData] = useState<TicketCheckoutData>();
  const [addonQuantity, setAddonQuantity] = useState(1);
  const [contactForm, setContactForm] = useState<ContactFormState>({
    name: '',
    mobile: '',
    idCard: '',
  });
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchCheckoutData();
      setCheckoutData(nextData);
      setAddonQuantity(nextData.addonItem.quantity);
      setContactForm({
        name: nextData.contact.name,
        mobile: nextData.contact.mobile,
        idCard: nextData.contact.idCard,
      });
    },
  });

  const payAmount = useMemo(() => {
    if (!checkoutData) return 0;

    return checkoutData.ticketItem.price + checkoutData.addonItem.price * addonQuantity - checkoutData.discountAmount;
  }, [addonQuantity, checkoutData]);

  function updateContactField(field: keyof ContactFormState, value: string) {
    setContactForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit() {
    if (!contactForm.name || !contactForm.mobile || !contactForm.idCard) {
      Taro.showToast({ title: '请补全出游信息', icon: 'none' });
      return;
    }

    Taro.showToast({ title: '支付能力即将开放', icon: 'none' });
  }

  return pageRuntime.renderPage(() => {
    if (!checkoutData) return null;

    const idCardError = !contactForm.idCard;

    return (
      <View className="_pg">
        <PageShell
          title={checkoutData.parkName}
          className="_pg-shell"
          reserveTabBarSpace={false}
          footer={(
            <FixedSubmitBar
              className="_pg-submit"
              label="金额:"
              amount={payAmount}
              buttonText={checkoutData.payButtonText}
              extra={<Text className="_pg-submit_discount">已优惠: ¥{checkoutData.discountAmount.toFixed(2)}</Text>}
              onSubmit={handleSubmit}
            />
          )}
        >
          <View className="_pg-content">
            <View className="_pg-card">
              <View className="_pg-item">
                <View className="_pg-item_header">
                  <Text className="_pg-item_title">1. {checkoutData.ticketItem.title}</Text>
                  <Text className="_pg-item_quantity">X{checkoutData.ticketItem.quantity}</Text>
                </View>
                <View className="_pg-item_row _pg-item_row--link">
                  <Text className="_pg-item_label">游玩日期</Text>
                  <View className="_pg-item_value">
                    <Text>{checkoutData.ticketItem.travelDate}</Text>
                    <Text className="_pg-item_chevron">›</Text>
                  </View>
                </View>
                <Text className="_pg-item_tag">{checkoutData.ticketItem.tagText}</Text>
              </View>
            </View>

            <View className="_pg-card">
              <View className="_pg-item">
                <View className="_pg-item_header">
                  <Text className="_pg-item_title">2. {checkoutData.addonItem.merchantTitle}</Text>
                  <Text className="_pg-item_quantity">X{addonQuantity}</Text>
                </View>
                <Text className="_pg-item_subtitle">{checkoutData.addonItem.productTitle}</Text>
                <Text className="_pg-item_note">{checkoutData.addonItem.noteText}</Text>
              </View>
            </View>

            <View className="_pg-card _pg-card--compact">
              <View className="_pg-stepper-row">
                <Text className="_pg-stepper-row_label">套餐购买数量</Text>
                <QuantityStepper value={addonQuantity} min={1} onChange={setAddonQuantity} />
              </View>
            </View>

            <View className="_pg-card">
              <View className="_pg-form">
                <View className="_pg-form_heading">
                  <Text className="_pg-form_title">出游信息</Text>
                  <Text className="_pg-form_desc">需填写1个联系人用于接收出票信息</Text>
                </View>

                <View className="_pg-field">
                  <Text className="_pg-field_label">姓名</Text>
                  <Input
                    className="_pg-field_input"
                    value={contactForm.name}
                    placeholder="请输入联系人姓名"
                    onInput={(event) => updateContactField('name', event.detail.value)}
                  />
                </View>

                <View className="_pg-field">
                  <Text className="_pg-field_label">手机</Text>
                  <Input
                    className="_pg-field_input"
                    value={contactForm.mobile}
                    placeholder={checkoutData.contact.mobilePlaceholder}
                    type="number"
                    maxlength={11}
                    onInput={(event) => updateContactField('mobile', event.detail.value)}
                  />
                </View>

                <Text className="_pg-form_hint">{checkoutData.contact.helperText}</Text>

                <View className="_pg-field">
                  <Text className="_pg-field_label">身份证</Text>
                  <Input
                    className="_pg-field_input"
                    value={contactForm.idCard}
                    placeholder={checkoutData.contact.idCardPlaceholder}
                    onInput={(event) => updateContactField('idCard', event.detail.value)}
                  />
                </View>

                {idCardError ? <Text className="_pg-form_error">{checkoutData.contact.errorText}</Text> : null}
              </View>
            </View>

            <View className="_pg-card _pg-card--compact">
              <View className="_pg-line-row">
                <Text className="_pg-line-row_label">折扣信息</Text>
                <Text className="_pg-line-row_value">{checkoutData.discountText}</Text>
              </View>
            </View>

            <View className="_pg-card _pg-card--compact">
              <View className="_pg-line-row _pg-line-row--link">
                <Text className="_pg-line-row_label">优惠券</Text>
                <View className="_pg-line-row_coupon">
                  <Text className="_pg-line-row_coupon-tag">{checkoutData.couponText}</Text>
                  <Text className="_pg-line-row_chevron">›</Text>
                </View>
              </View>
            </View>
          </View>
        </PageShell>
      </View>
    );
  });
});

export default CheckoutPage;
