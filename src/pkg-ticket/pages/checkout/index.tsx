import { useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Input, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { CouponSelectionPopup, DateSelectionPopup, QuantityStepper } from '@/core/components/commerce';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { PageShare, PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { showWechatConfirm, showWechatToast } from '@/core/utils/wechat-actions';
import { TicketSubmitFooter } from '@/pkg-ticket/components/TicketSubmitFooter';
import { fetchCheckoutData, type TicketCheckoutPageData } from '@/pkg-ticket/services/checkout';
import { submitTicketOrderDraft, updateTicketOrderDraft } from '@/pkg-ticket/services/order-draft';
import './index.scss';

interface ContactFormState {
  name: string;
  mobile: string;
  idCard: string;
}

const CheckoutPage = observer(function CheckoutPage() {
  const [checkoutData, setCheckoutData] = useState<TicketCheckoutPageData>();
  const [draftId, setDraftId] = useState('');
  const [addonQuantity, setAddonQuantity] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedCouponId, setSelectedCouponId] = useState<string>();
  const [datePopupVisible, setDatePopupVisible] = useState(false);
  const [couponPopupVisible, setCouponPopupVisible] = useState(false);
  const [contactForm, setContactForm] = useState<ContactFormState>({
    name: '',
    mobile: '',
    idCard: '',
  });
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextDraftId = Taro.getCurrentInstance().router?.params?.draftId || '';
      const nextData = await fetchCheckoutData(nextDraftId);
      setDraftId(nextDraftId);
      setCheckoutData(nextData);
      setAddonQuantity(nextData.addonItem.quantity);
      setSelectedDate(nextData.ticketItem.travelDate);
      setSelectedCouponId(nextData.draft?.selectedCouponId);
      setContactForm({
        name: nextData.contact.name,
        mobile: nextData.contact.mobile,
        idCard: nextData.contact.idCard,
      });
    },
    loginRequired: true,
    loginReason: '登录后可提交门票订单',
  });

  const payAmount = useMemo(() => {
    if (!checkoutData) return 0;
    const selectedCoupon = checkoutData.draft?.coupons.find((coupon) => coupon.id === selectedCouponId);
    const discountAmount = selectedCoupon && checkoutData.ticketItem.price >= selectedCoupon.minimumAmount
      ? selectedCoupon.discountAmount
      : 0;

    return Math.max(0, checkoutData.ticketItem.price + checkoutData.addonItem.price * addonQuantity - discountAmount);
  }, [addonQuantity, checkoutData, selectedCouponId]);

  const selectedCoupon = checkoutData?.draft?.coupons.find((coupon) => coupon.id === selectedCouponId);
  const discountAmount = selectedCoupon && checkoutData && checkoutData.ticketItem.price >= selectedCoupon.minimumAmount
    ? selectedCoupon.discountAmount
    : 0;
  const couponText = selectedCoupon ? `${selectedCoupon.amountText} ${selectedCoupon.thresholdText}` : '请选择优惠券';

  function updateContactField(field: keyof ContactFormState, value: string) {
    setContactForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit() {
    if (!checkoutData?.draft || !draftId) {
      showWechatToast('请先选择门票');
      return;
    }

    if (!contactForm.name.trim()) {
      showWechatToast('请填写联系人姓名');
      return;
    }

    if (!/^1\d{10}$/.test(contactForm.mobile)) {
      showWechatToast('请填写正确手机号');
      return;
    }

    if (!/^[0-9A-Za-z]{6,18}$/.test(contactForm.idCard)) {
      showWechatToast('请填写正确身份证号');
      return;
    }

    const confirmed = await showWechatConfirm({
      title: '确认支付',
      content: `本次需支付 ¥${payAmount.toFixed(2)}，确认后将生成门票订单。`,
      confirmText: '确认支付',
    });
    if (!confirmed) return;

    const nextOrder = submitTicketOrderDraft(draftId, {
      selectedDate,
      selectedCouponId,
      addonQuantity,
      contact: contactForm,
    });

    if (!nextOrder) {
      showWechatToast('订单提交失败，请重新选择门票');
      return;
    }

    await showWechatToast('支付成功', 'success');
    Taro.navigateTo({ url: `${MINI_PACKAGE_ROUTES.orderDetail}?orderId=${encodeURIComponent(nextOrder.id)}` });
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
            <TicketSubmitFooter
              label="金额:"
              amount={payAmount}
              buttonText={checkoutData.payButtonText}
              discountText={`已优惠: ¥${checkoutData.discountAmount.toFixed(2)}`}
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
                <View className="_pg-item_row _pg-item_row--link" onClick={() => setDatePopupVisible(true)}>
                  <Text className="_pg-item_label">游玩日期</Text>
                  <View className="_pg-item_value">
                    <Text>{selectedDate}</Text>
                    <AppIcon name="arrowRight" className="_pg-item_chevron" size={16} color="#c0c5cf" />
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
                <Text className="_pg-line-row_value">{discountAmount > 0 ? `已优惠 ¥${discountAmount.toFixed(2)}` : checkoutData.discountText}</Text>
              </View>
            </View>

            <View className="_pg-card _pg-card--compact">
              <View className="_pg-line-row _pg-line-row--link" onClick={() => setCouponPopupVisible(true)}>
                <Text className="_pg-line-row_label">优惠券</Text>
                <View className="_pg-line-row_coupon">
                  <Text className="_pg-line-row_coupon-tag">{couponText}</Text>
                  <AppIcon name="arrowRight" className="_pg-line-row_chevron" size={16} color="#c0c5cf" />
                </View>
              </View>
            </View>
          </View>
          <PageShare>
            <DateSelectionPopup
              visible={datePopupVisible}
              mode="single"
              title="选择游玩日期"
              value={selectedDate}
              startDate={checkoutData.dates[0]?.date}
              endDate={checkoutData.dates[checkoutData.dates.length - 1]?.date}
              onClose={() => setDatePopupVisible(false)}
              onConfirm={(value) => {
                const nextDate = Array.isArray(value) ? value[0] : value;
                if (nextDate) {
                  setSelectedDate(nextDate);
                  if (draftId) updateTicketOrderDraft(draftId, { selectedDate: nextDate });
                }
                setDatePopupVisible(false);
              }}
            />
            <CouponSelectionPopup
              visible={couponPopupVisible}
              coupons={checkoutData.draft?.coupons ?? []}
              selectedCouponId={selectedCouponId}
              onClose={() => setCouponPopupVisible(false)}
              onSelect={(coupon) => {
                setSelectedCouponId(coupon.id);
                if (draftId) updateTicketOrderDraft(draftId, { selectedCouponId: coupon.id });
                setCouponPopupVisible(false);
              }}
            />
          </PageShare>
        </PageShell>
      </View>
    );
  });
});

export default CheckoutPage;
