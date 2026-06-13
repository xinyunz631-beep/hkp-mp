import { useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Input, ScrollView, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { CouponSelectionPopup, QuantityStepper } from '@/core/components/commerce';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { PageShare, PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { resolveErrorMessage } from '@/core/utils/error-message';
import { navigateBackInPageStack, navigateToMiniRoute } from '@/core/utils/navigation';
import { requestWechatPayment, showWechatConfirm, showWechatToast } from '@/core/utils/wechat-actions';
import { TicketSubmitFooter } from '@/pkg-ticket/components/TicketSubmitFooter';
import { fetchCheckoutData, type TicketCheckoutPageData } from '@/pkg-ticket/services/checkout';
import {
  submitTicketOrderDraft,
  updateTicketOrderDraft,
  type TicketOrderSubmitResult,
  type TicketOrderTraveler,
} from '@/pkg-ticket/services/order-draft';
import './index.scss';

interface ContactFormState {
  name: string;
  mobile: string;
  idCard: string;
}

type TravelerField = 'name' | 'mobile' | 'idCard';

// 校验大陆手机号，门票出票短信和订单通知都依赖该号码。
function isValidMainlandMobile(value: string) {
  return /^1\d{10}$/.test(value.trim());
}

// 校验身份证号基础格式，门票入园核验需要 18 位证件号。
function isValidMainlandIdCard(value: string) {
  return /^\d{17}[\dXx]$/.test(value.trim());
}

// 归一化手机号输入，只保留微信数字键盘可能产生的数字内容。
function normalizeMobileInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 11);
}

// 归一化身份证输入，避免小写 x 或空格影响提交校验。
function normalizeIdCardInput(value: string) {
  return value.replace(/\s/g, '').slice(0, 18).toUpperCase();
}

// 从身份证解析生日并按游玩日期计算年龄，用于优惠票资格提示。
function resolveAgeFromIdCard(idCard: string, travelDate: string) {
  const normalizedIdCard = normalizeIdCardInput(idCard);
  if (!isValidMainlandIdCard(normalizedIdCard)) return undefined;

  const birthYear = Number(normalizedIdCard.slice(6, 10));
  const birthMonth = Number(normalizedIdCard.slice(10, 12));
  const birthDay = Number(normalizedIdCard.slice(12, 14));
  const travelTime = new Date(`${travelDate}T00:00:00`);

  if (!birthYear || !birthMonth || !birthDay || Number.isNaN(travelTime.getTime())) return undefined;

  let age = travelTime.getFullYear() - birthYear;
  const monthDiff = travelTime.getMonth() + 1 - birthMonth;
  const dayDiff = travelTime.getDate() - birthDay;

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;

  return age;
}

function isAnnualCardTraveler(traveler: TicketOrderTraveler) {
  return traveler.role === 'annualAdult' || traveler.role === 'annualChild';
}

function isDiscountTraveler(traveler: TicketOrderTraveler) {
  return traveler.role === 'senior';
}

function isChildTraveler(traveler: TicketOrderTraveler) {
  return traveler.role === 'child' || traveler.role === 'annualChild';
}

function isTravelerComplete(traveler: TicketOrderTraveler) {
  return Boolean(traveler.name.trim())
    && isValidMainlandIdCard(traveler.idCard)
    && (!traveler.mobileRequired || isValidMainlandMobile(traveler.mobile));
}

function getTravelerTabTitle(traveler: TicketOrderTraveler, index: number) {
  return traveler.category === 'annualCard' ? `持卡人${index + 1}` : `游客${index + 1}`;
}

// 判断门票订单是否已由后端完成免支付出票，避免重复拉起微信支付。
function isTicketOrderReady(order: TicketOrderSubmitResult) {
  return Boolean(
    (order.ticketVouchers?.length ?? 0) > 0
    || ['WAIT_USE', 'PART_USED', 'USED', 'FULFILLED', 'COMPLETED'].includes(order.orderStatus || ''),
  );
}

const CheckoutPage = observer(function CheckoutPage() {
  const [checkoutData, setCheckoutData] = useState<TicketCheckoutPageData>();
  const [draftId, setDraftId] = useState('');
  const [addonQuantity, setAddonQuantity] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedCouponId, setSelectedCouponId] = useState<string>();
  const [couponPopupVisible, setCouponPopupVisible] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [travelerForms, setTravelerForms] = useState<TicketOrderTraveler[]>([]);
  const [activeTravelerId, setActiveTravelerId] = useState('');
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
      setTravelerForms(nextData.travelers);
      setActiveTravelerId(nextData.travelers[0]?.id || '');
      setSubmitAttempted(false);
      setContactForm({
        name: nextData.contact.name,
        mobile: nextData.contact.mobile,
        idCard: nextData.contact.idCard,
      });
    },
    loginRequired: true,
    loginReason: '登录后可提交门票订单',
  });

  const ticketAmount = checkoutData?.ticketItem.price ?? 0;
  const addonAmount = checkoutData ? checkoutData.addonItem.price * addonQuantity : 0;
  const originAmount = ticketAmount + addonAmount;
  const selectedCoupon = checkoutData?.draft?.coupons.find((coupon) => coupon.id === selectedCouponId);
  const selectedCouponUsable = Boolean(
    selectedCoupon
    && selectedCoupon.status === 'available'
    && originAmount >= selectedCoupon.minimumAmount,
  );
  const discountAmount = selectedCouponUsable && selectedCoupon ? selectedCoupon.discountAmount : 0;
  const payAmount = useMemo(() => Math.max(0, originAmount - discountAmount), [discountAmount, originAmount]);
  const couponOptions = useMemo(() => {
    if (!checkoutData) return [];

    return (checkoutData.draft?.coupons ?? []).map((coupon) => {
      const usable = coupon.status === 'available' && originAmount >= coupon.minimumAmount;

      return {
        ...coupon,
        status: usable ? coupon.status : 'disabled' as const,
        tag: usable ? coupon.tag : '未满足',
      };
    });
  }, [checkoutData, originAmount]);
  const couponText = selectedCouponUsable && selectedCoupon
    ? `${selectedCoupon.amountText} ${selectedCoupon.thresholdText}`
    : selectedCoupon
      ? '未满足使用门槛'
      : '请选择优惠券';
  const hasCoupons = couponOptions.length > 0;

  function updateContactField(field: keyof ContactFormState, value: string) {
    const nextValue = field === 'mobile'
      ? normalizeMobileInput(value)
      : field === 'idCard'
        ? normalizeIdCardInput(value)
        : value;
    const nextContact = {
      ...contactForm,
      [field]: nextValue,
    };

    setContactForm(nextContact);
    if (draftId) updateTicketOrderDraft(draftId, { contact: nextContact });
  }

  function updateTravelerField(travelerId: string, field: TravelerField, value: string) {
    const nextValue = field === 'mobile'
      ? normalizeMobileInput(value)
      : field === 'idCard'
        ? normalizeIdCardInput(value)
        : value;
    const nextTravelers = travelerForms.map((traveler) => (
      traveler.id === travelerId ? { ...traveler, [field]: nextValue } : traveler
    ));

    setTravelerForms(nextTravelers);
    if (draftId) updateTicketOrderDraft(draftId, { travelers: nextTravelers });
  }

  async function handleSyncContactToTraveler(travelerId: string) {
    const nextContactName = contactForm.name.trim();
    const nextContactMobile = normalizeMobileInput(contactForm.mobile);

    if (!nextContactName && !nextContactMobile) {
      await showWechatToast('请先填写联系人信息');
      return;
    }

    const nextTravelers = travelerForms.map((traveler) => (
      traveler.id === travelerId
        ? {
          ...traveler,
          name: nextContactName || traveler.name,
          mobile: nextContactMobile || traveler.mobile,
        }
        : traveler
    ));

    setTravelerForms(nextTravelers);
    if (draftId) updateTicketOrderDraft(draftId, { travelers: nextTravelers });
    await showWechatToast('已同步联系人，请补充证件号');
  }

  function handleAddonQuantityChange(value: number) {
    setAddonQuantity(value);
    if (draftId) updateTicketOrderDraft(draftId, { addonQuantity: value });
  }

  async function handleReselectDate() {
    const confirmed = await showWechatConfirm({
      title: '重新选择游玩日期',
      content: '游玩日期会影响可订门票、价格、库存和入园人信息，需要返回门票预定页重新选择。',
      confirmText: '返回重选',
      cancelText: '继续结算',
    });

    if (confirmed && !navigateBackInPageStack()) {
      navigateToMiniRoute(MINI_PACKAGE_ROUTES.ticketBooking);
    }
  }

  async function validateTravelers(nextTravelers: TicketOrderTraveler[]) {
    if (nextTravelers.length <= 0) {
      await showWechatToast('请先选择门票');
      return false;
    }

    const idCardMap = new Map<string, string>();

    for (const traveler of nextTravelers) {
      if (!traveler.name.trim()) {
        await showWechatToast(`请填写${traveler.title}姓名`);
        return false;
      }

      if (!isValidMainlandIdCard(traveler.idCard)) {
        await showWechatToast(`请填写${traveler.title}正确身份证号`);
        return false;
      }

      if (traveler.mobileRequired && !isValidMainlandMobile(traveler.mobile)) {
        await showWechatToast(`请填写${traveler.title}手机号`);
        return false;
      }

      const existedTravelerTitle = idCardMap.get(traveler.idCard);
      if (existedTravelerTitle) {
        await showWechatToast(`${traveler.title}与${existedTravelerTitle}证件重复`);
        return false;
      }

      idCardMap.set(traveler.idCard, traveler.title);
    }

    const needsQualificationConfirm = nextTravelers.some((traveler) => {
      if (!isDiscountTraveler(traveler) && !isChildTraveler(traveler)) return false;
      const age = resolveAgeFromIdCard(traveler.idCard, selectedDate);

      if (isDiscountTraveler(traveler)) return age !== undefined && age < 70;

      return age !== undefined && age >= 18;
    });

    if (!needsQualificationConfirm) return true;

    return showWechatConfirm({
      title: '优惠资格确认',
      content: '儿童票、优惠票或儿童年卡需现场核验年龄、身高或优待资格。若不满足要求可能无法入园，请确认出游人符合购买条件。',
      confirmText: '确认符合',
      cancelText: '返回修改',
    });
  }

  async function handleSubmit() {
    setSubmitAttempted(true);

    if (!checkoutData?.draft || checkoutData.draftMissing || !draftId) {
      await showWechatToast('请先选择门票');
      return;
    }

    const nextContact = {
      name: contactForm.name.trim(),
      mobile: normalizeMobileInput(contactForm.mobile),
      idCard: normalizeIdCardInput(travelerForms[0]?.idCard || contactForm.idCard),
    };
    const nextTravelers = travelerForms.map((traveler) => ({
      ...traveler,
      name: traveler.name.trim(),
      mobile: normalizeMobileInput(traveler.mobile),
      idCard: normalizeIdCardInput(traveler.idCard),
    }));

    if (!nextContact.name) {
      await showWechatToast('请填写联系人姓名');
      return;
    }

    if (!isValidMainlandMobile(nextContact.mobile)) {
      await showWechatToast('请填写正确手机号');
      return;
    }

    if (!await validateTravelers(nextTravelers)) return;

    if (addonQuantity > 0) {
      await showWechatToast('套餐暂不可随票下单，请先提交门票');
      return;
    }

    setContactForm(nextContact);
    setTravelerForms(nextTravelers);
    updateTicketOrderDraft(draftId, {
      contact: nextContact,
      travelers: nextTravelers,
    });

    const confirmed = await showWechatConfirm({
      title: '确认提交',
      content: `已核对 ${nextTravelers.length} 位实名出游人，本次订单金额 ¥${payAmount.toFixed(2)}。`,
      confirmText: '提交订单',
    });
    if (!confirmed) return;

    try {
      const nextOrder = await pageRuntime.withLoading(() => submitTicketOrderDraft(draftId, {
        selectedDate,
        selectedCouponId: selectedCouponUsable ? selectedCouponId : undefined,
        addonQuantity,
        contact: nextContact,
        travelers: nextTravelers,
      }));

      if (!nextOrder) {
        await showWechatToast('订单提交失败，请重新选择门票');
        return;
      }

      if (isTicketOrderReady(nextOrder)) {
        await showWechatToast('订单已提交', 'success');
        navigateToMiniRoute(`${MINI_PACKAGE_ROUTES.orderDetail}?orderId=${encodeURIComponent(nextOrder.id)}`);
        return;
      }

      const paymentParams = nextOrder.prepay?.paymentParams || nextOrder.prepay?.payParams;
      const paymentSkipped = nextOrder.prepay?.paymentSkipped;
      if (paymentSkipped) {
        await showWechatToast('订单已提交', 'success');
        navigateToMiniRoute(`${MINI_PACKAGE_ROUTES.orderDetail}?orderId=${encodeURIComponent(nextOrder.id)}`);
        return;
      }

      if (nextOrder.payableAmount > 0 && !paymentParams) {
        await showWechatToast('支付参数暂不可用，请稍后继续支付');
        navigateToMiniRoute(`${MINI_PACKAGE_ROUTES.orderDetail}?orderId=${encodeURIComponent(nextOrder.id)}`);
        return;
      }

      const paymentStatus = nextOrder.payableAmount > 0
        ? await requestWechatPayment({
          title: '微信支付',
          amount: nextOrder.payableAmount,
          paymentParams: paymentParams as Parameters<typeof requestWechatPayment>[0]['paymentParams'],
          allowPending: true,
        })
        : 'success';

      if (paymentStatus === 'failed') return;

      await showWechatToast(paymentStatus === 'success' ? '支付成功' : '订单已提交，可稍后继续支付', 'success');
      navigateToMiniRoute(`${MINI_PACKAGE_ROUTES.orderDetail}?orderId=${encodeURIComponent(nextOrder.id)}`);
    } catch (error) {
      await showWechatToast(resolveErrorMessage(error, '订单提交失败，请稍后再试'));
      return;
    }
  }

  return pageRuntime.renderPage(() => {
    if (!checkoutData) return null;

    const mobileError = submitAttempted && Boolean(contactForm.mobile) && !isValidMainlandMobile(contactForm.mobile);
    const travelerCount = travelerForms.length;
    const completedTravelerCount = travelerForms.filter(isTravelerComplete).length;
    const selectedProducts = checkoutData.draft?.products ?? [];
    const totalTicketQuantity = selectedProducts.reduce((total, product) => total + product.quantity, 0)
      || checkoutData.ticketItem.quantity;
    const activeTraveler = travelerForms.find((traveler) => traveler.id === activeTravelerId) ?? travelerForms[0];
    const activeTravelerIndex = Math.max(0, travelerForms.findIndex((traveler) => traveler.id === activeTraveler?.id));
    const hasAddonItem = checkoutData.addonItem.quantity > 0 || addonQuantity > 0;

    return (
      <View className="_pg">
        <PageShell
          title={checkoutData.parkName}
          className="_pg-shell"
          reserveTabBarSpace={false}
          footer={checkoutData.draftMissing ? undefined : (
            <TicketSubmitFooter
              label="金额:"
              amount={payAmount}
              buttonText={checkoutData.payButtonText}
              discountText={discountAmount > 0 ? `已优惠: ¥${discountAmount.toFixed(2)}` : undefined}
              onSubmit={handleSubmit}
            />
          )}
        >
          {checkoutData.draftMissing ? (
            <View className="_pg-content _pg-content--empty">
              <BaseEmpty
                className="_pg-empty"
                title="请先选择门票"
                description="选择游玩日期和票种后，再确认订单并完成支付。"
                actionText="去选择门票"
                onAction={() => {
                  navigateToMiniRoute(MINI_PACKAGE_ROUTES.ticketBooking);
                }}
              />
            </View>
          ) : (
          <View className="_pg-content">
            <View className="_pg-card">
              <View className="_pg-item">
                <View className="_pg-item_header">
                  <Text className="_pg-item_title">1. 门票信息</Text>
                  <Text className="_pg-item_quantity">共{totalTicketQuantity}张</Text>
                </View>
                <View className="_pg-item_row _pg-item_row--link" onClick={() => { void handleReselectDate(); }}>
                  <Text className="_pg-item_label">游玩日期</Text>
                  <View className="_pg-item_value">
                    <Text>{selectedDate}</Text>
                    <AppIcon name="arrowRight" className="_pg-item_chevron" size={16} color="#c0c5cf" />
                  </View>
                </View>
                <View className="_pg-item_notice">
                  <AppIcon name="code" size={14} color="#d94a88" />
                  <Text>提交成功后生成订单入园码，也可凭购票证件核验入园。</Text>
                </View>
                <View className="_pg-product-list">
                  {selectedProducts.map((product) => (
                    <View className="_pg-product" key={product.id}>
                      <View className="_pg-product_main">
                        <Text className="_pg-product_title">{product.title}</Text>
                        <Text className="_pg-product_note">{product.noticeText}</Text>
                      </View>
                      <View className="_pg-product_side">
                        <Text className="_pg-product_price">¥{(product.price * product.quantity).toFixed(2)}</Text>
                        <Text className="_pg-product_count">x{product.quantity}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {hasAddonItem ? (
              <>
                <View className="_pg-card">
                  <View className="_pg-item">
                    <View className="_pg-item_header">
                      <Text className="_pg-item_title">2. {checkoutData.addonItem.merchantTitle}</Text>
                      <Text className="_pg-item_quantity">x{addonQuantity}</Text>
                    </View>
                    <Text className="_pg-item_subtitle">{checkoutData.addonItem.productTitle}</Text>
                    <Text className="_pg-item_note">{checkoutData.addonItem.noteText}</Text>
                  </View>
                </View>

                <View className="_pg-card _pg-card--compact">
                  <View className="_pg-stepper-row">
                    <Text className="_pg-stepper-row_label">套餐购买数量</Text>
                    <QuantityStepper value={addonQuantity} min={0} onChange={handleAddonQuantityChange} />
                  </View>
                </View>
              </>
            ) : null}

            <View className="_pg-card">
              <View className="_pg-form">
                <View className="_pg-form_heading">
                  <Text className="_pg-form_title">联系人信息</Text>
                  <Text className="_pg-form_desc">用于接收出票和订单通知</Text>
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
                {mobileError ? <Text className="_pg-form_error">请填写正确手机号</Text> : null}
              </View>
            </View>

            <View className="_pg-card">
              <View className="_pg-form">
                <View className="_pg-form_heading">
                  <Text className="_pg-form_title">出游人信息</Text>
                  <Text className="_pg-form_desc">请补充 {travelerCount} 位出游人信息</Text>
                  <Text className="_pg-form_progress">{completedTravelerCount}/{travelerCount} 已完善</Text>
                </View>
                <View className="_pg-form_notice">
                  <AppIcon name="check" size={10} color="#d94a88" />
                  <Text>一票一实名，儿童票、优待票和年卡资格以园区现场核验为准。</Text>
                </View>

                <ScrollView className="_pg-traveler-tabs" scrollX enhanced showScrollbar={false}>
                  <View className="_pg-traveler-tabs_inner">
                    {travelerForms.map((traveler, index) => {
                      const active = traveler.id === activeTraveler?.id;
                      const travelerCompleted = isTravelerComplete(traveler);

                      return (
                        <View
                          className={`_pg-traveler-tabs_item ${active ? '_pg-traveler-tabs_item--active' : ''}`}
                          key={traveler.id}
                          onClick={() => setActiveTravelerId(traveler.id)}
                        >
                          <Text className="_pg-traveler-tabs_title">{getTravelerTabTitle(traveler, index)}</Text>
                          <Text className="_pg-traveler-tabs_role">{traveler.roleText}</Text>
                          <Text className={travelerCompleted ? '_pg-traveler-tabs_status _pg-traveler-tabs_status--done' : '_pg-traveler-tabs_status'}>
                            {travelerCompleted ? '已填' : '待填'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>

                {activeTraveler ? (() => {
                  const traveler = activeTraveler;
                  const travelerIdCardError = submitAttempted
                    && Boolean(traveler.idCard)
                    && !isValidMainlandIdCard(traveler.idCard);
                  const travelerMobileError = submitAttempted
                    && isAnnualCardTraveler(traveler)
                    && Boolean(traveler.mobile)
                    && !isValidMainlandMobile(traveler.mobile);
                  const travelerCompleted = isTravelerComplete(traveler);

                  return (
                    <View className="_pg-traveler" key={traveler.id}>
                      <View className="_pg-traveler_header">
                        <Text className="_pg-traveler_title">
                          {getTravelerTabTitle(traveler, activeTravelerIndex)} · {traveler.title}
                        </Text>
                        <View className="_pg-traveler_meta">
                          <Text className="_pg-traveler_badge">{traveler.roleText}</Text>
                          <Text className={travelerCompleted ? '_pg-traveler_status _pg-traveler_status--done' : '_pg-traveler_status'}>
                            {travelerCompleted ? '已完善' : '待完善'}
                          </Text>
                        </View>
                      </View>
                      <View className="_pg-traveler_intro">
                        <Text className="_pg-traveler_desc">{traveler.requirementText}</Text>
                        <Text className="_pg-traveler_action" onClick={() => { void handleSyncContactToTraveler(traveler.id); }}>
                          同联系人
                        </Text>
                      </View>
                      {traveler.qualificationText ? (
                        <View className="_pg-traveler_tip">
                          <AppIcon name="ask" size={14} color="#d0851f" />
                          <Text>{traveler.qualificationText}</Text>
                        </View>
                      ) : null}

                      <View className="_pg-field">
                        <Text className="_pg-field_label">姓名</Text>
                        <Input
                          className="_pg-field_input"
                          value={traveler.name}
                          placeholder="请输入实际入园人姓名"
                          onInput={(event) => updateTravelerField(traveler.id, 'name', event.detail.value)}
                        />
                      </View>

                      <View className="_pg-field">
                        <Text className="_pg-field_label">身份证</Text>
                        <Input
                          className="_pg-field_input"
                          value={traveler.idCard}
                          placeholder={checkoutData.contact.idCardPlaceholder}
                          type="idcard"
                          maxlength={18}
                          onInput={(event) => updateTravelerField(traveler.id, 'idCard', event.detail.value)}
                        />
                      </View>
                      {travelerIdCardError ? <Text className="_pg-form_error">请填写正确身份证号</Text> : null}

                      {traveler.mobileRequired ? (
                        <>
                          <View className="_pg-field">
                            <Text className="_pg-field_label">手机</Text>
                            <Input
                              className="_pg-field_input"
                              value={traveler.mobile}
                              placeholder="用于接收年卡激活通知"
                              type="number"
                              maxlength={11}
                              onInput={(event) => updateTravelerField(traveler.id, 'mobile', event.detail.value)}
                            />
                          </View>
                          {travelerMobileError ? <Text className="_pg-form_error">请填写正确手机号</Text> : null}
                        </>
                      ) : null}
                    </View>
                  );
                })() : null}
              </View>
            </View>

            {hasCoupons ? (
              <>
                <View className="_pg-card _pg-card--compact">
                  <View className="_pg-line-row">
                    <Text className="_pg-line-row_label">折扣信息</Text>
                    <Text className="_pg-line-row_value">{discountAmount > 0 ? `已优惠 ¥${discountAmount.toFixed(2)}` : '暂无优惠'}</Text>
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
              </>
            ) : null}

            <View className="_pg-card _pg-card--compact">
              <View className="_pg-amount-summary">
                <View className="_pg-amount-summary_row">
                  <Text className="_pg-amount-summary_label">票品金额</Text>
                  <Text className="_pg-amount-summary_value">¥{ticketAmount.toFixed(2)}</Text>
                </View>
                {hasAddonItem ? (
                  <View className="_pg-amount-summary_row">
                    <Text className="_pg-amount-summary_label">套餐加购</Text>
                    <Text className="_pg-amount-summary_value">¥{addonAmount.toFixed(2)}</Text>
                  </View>
                ) : null}
                {discountAmount > 0 ? (
                  <View className="_pg-amount-summary_row">
                    <Text className="_pg-amount-summary_label">优惠金额</Text>
                    <Text className="_pg-amount-summary_value _pg-amount-summary_value--discount">
                      - ¥{discountAmount.toFixed(2)}
                    </Text>
                  </View>
                ) : null}
                <View className="_pg-amount-summary_row _pg-amount-summary_row--total">
                  <Text className="_pg-amount-summary_label">实付款</Text>
                  <Text className="_pg-amount-summary_total">¥{payAmount.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          </View>
          )}
          <PageShare>
            {!checkoutData.draftMissing ? (
              <>
                {hasCoupons ? (
                  <CouponSelectionPopup
                    visible={couponPopupVisible}
                    coupons={couponOptions}
                    selectedCouponId={selectedCouponUsable ? selectedCouponId : undefined}
                    clearText="不使用优惠券"
                    onClose={() => setCouponPopupVisible(false)}
                    onClear={() => {
                      setSelectedCouponId(undefined);
                      if (draftId) updateTicketOrderDraft(draftId, { selectedCouponId: undefined });
                      setCouponPopupVisible(false);
                    }}
                    onSelect={(coupon) => {
                      setSelectedCouponId(coupon.id);
                      if (draftId) updateTicketOrderDraft(draftId, { selectedCouponId: coupon.id });
                      setCouponPopupVisible(false);
                    }}
                  />
                ) : null}
              </>
            ) : null}
          </PageShare>
        </PageShell>
      </View>
    );
  });
});

export default CheckoutPage;
