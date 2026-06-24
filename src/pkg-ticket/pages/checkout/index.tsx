import { useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Input, ScrollView, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppBottomSheet } from '@/core/components/AppBottomSheet';
import { AppIcon } from '@/core/components/AppIcon';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { CouponSelectionPopup, QuantityStepper } from '@/core/components/commerce';
import { StatusException } from '@/core/components/status';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { PageShare, PageShell } from '@/core/components/PageShell';
import { useCheckoutController } from '@/core/runtime/use-checkout-controller';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { isBffTicketOrderIssued } from '@/core/services/bff-order-api';
import { resolveErrorMessage } from '@/core/utils/error-message';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { showWechatConfirm, showWechatToast } from '@/core/utils/wechat-actions';
import { TicketSubmitFooter } from '@/pkg-ticket/components/TicketSubmitFooter';
import { fetchCheckoutData, type TicketCheckoutPageData } from '@/pkg-ticket/services/checkout';
import {
  submitTicketOrderDraft,
  updateTicketOrderDraft,
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

function isDiscountTraveler(traveler: TicketOrderTraveler) {
  return traveler.role === 'senior';
}

function isChildTraveler(traveler: TicketOrderTraveler) {
  return traveler.role === 'child' || traveler.role === 'annualChild';
}

function isTravelerComplete(traveler: TicketOrderTraveler) {
  return (!traveler.nameRequired || Boolean(traveler.name.trim()))
    && (!traveler.certificateRequired || isValidMainlandIdCard(traveler.idCard))
    && (!traveler.mobileRequired || isValidMainlandMobile(traveler.mobile));
}

function getTravelerTabTitle(traveler: TicketOrderTraveler, index: number) {
  return traveler.category === 'annualCard' ? `持卡人${index + 1}` : `游客${index + 1}`;
}

// 将确认单金额转为分单位比较，避免浮点格式差异误判为改价。
function toTicketAmountCent(value?: number) {
  return Math.round((Number(value) || 0) * 100);
}

// 判断门票提交前确认结果是否发生支付关键字段变化。
function hasTicketCheckoutChanged(currentData: TicketCheckoutPageData, nextData: TicketCheckoutPageData) {
  return toTicketAmountCent(currentData.payableAmount) !== toTicketAmountCent(nextData.payableAmount)
    || toTicketAmountCent(currentData.discountAmount) !== toTicketAmountCent(nextData.discountAmount)
    || toTicketAmountCent(currentData.ticketItem.price) !== toTicketAmountCent(nextData.ticketItem.price)
    || currentData.draft?.selectedCouponId !== nextData.draft?.selectedCouponId
    || currentData.draftMissing !== nextData.draftMissing;
}

const CheckoutPage = observer(function CheckoutPage() {
  const [draftId, setDraftId] = useState('');
  const [addonQuantity, setAddonQuantity] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [couponPopupVisible, setCouponPopupVisible] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [discountPopupVisible, setDiscountPopupVisible] = useState(false);
  const [travelerForms, setTravelerForms] = useState<TicketOrderTraveler[]>([]);
  const [activeTravelerId, setActiveTravelerId] = useState('');
  const [contactForm, setContactForm] = useState<ContactFormState>({
    name: '',
    mobile: '',
    idCard: '',
  });
  const checkoutController = useCheckoutController<TicketCheckoutPageData, Parameters<typeof submitTicketOrderDraft>[1]>({
    load: (params) => {
      const routeDraftId = Taro.getCurrentInstance().router?.params?.draftId || '';
      return fetchCheckoutData(
        params.draftId ? String(params.draftId) : draftId || routeDraftId,
        Object.prototype.hasOwnProperty.call(params, 'selectedCouponId') ? params.selectedCouponId : undefined,
      );
    },
    readSelectedCouponId: (data) => data.draft?.selectedCouponId,
    readCouponNoticeText: (data) => data.couponNoticeText,
    readPayableAmount: (data) => data.payableAmount,
    revalidateBeforeSubmit: async (data, payload) => {
      const nextData = await fetchCheckoutData(data.draft?.id || draftId, payload.selectedCouponId);
      return {
        data: nextData,
        changed: hasTicketCheckoutChanged(data, nextData),
        message: '门票库存、价格或优惠已更新，请确认后重新提交',
      };
    },
    submit: (data, payload) => submitTicketOrderDraft(data.draft?.id || draftId, payload),
    buildSuccessRoute: (result) => `${MINI_PACKAGE_ROUTES.orderDetail}?orderId=${encodeURIComponent(result.orderNo)}`,
    isOrderComplete: (result) => isBffTicketOrderIssued(result.orderStatus, result.order?.ticketVouchers),
    submitErrorText: '门票订单提交暂不可用，请稍后再试',
    emptySubmitText: '订单提交失败，请重新选择门票',
    completeSuccessText: '出票成功',
  });
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextDraftId = Taro.getCurrentInstance().router?.params?.draftId || '';
      const nextData = await checkoutController.load({ draftId: nextDraftId });
      setDraftId(nextDraftId);
      setAddonQuantity(nextData.addonItem.quantity);
      setSelectedDate(nextData.ticketItem.travelDate);
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
    errorFallback: ({ retry, loading }) => (
      <StatusException
        fullScreen
        type="server"
        title="门票订单确认暂不可用"
        description="当前订单确认服务未返回可用结果，请稍后重试。"
        actionText="重新确认"
        actionDisabled={loading}
        backActionVisible
        backActionText="返回选票"
        onRetry={retry}
      />
    ),
  });
  const checkoutData = checkoutController.data;
  const selectedCouponId = checkoutController.selectedCouponId;

  const ticketAmount = checkoutData?.ticketItem.price;
  const addonAmount = checkoutData?.addonItem.price ?? 0;
  const selectedCoupon = checkoutData?.draft?.coupons.find((coupon) => coupon.id === selectedCouponId);
  const discountAmount = checkoutData?.discountAmount ?? 0;
  const payAmount = checkoutData ? checkoutData.payableAmount : 0;
  const couponOptions = useMemo(() => {
    if (!checkoutData) return [];

    return checkoutData.draft?.coupons ?? [];
  }, [checkoutData]);
  const hasCoupons = couponOptions.length > 0;
  const couponText = selectedCoupon
    ? `${selectedCoupon.amountText} ${selectedCoupon.thresholdText}`
    : hasCoupons
      ? '请选择优惠券'
      : '暂无可用优惠券';
  const hasDiscountDetails = Boolean(checkoutData?.discountDetails.length);

  async function refreshCheckoutByCoupon(nextCouponId?: string | null) {
    if (!draftId) return false;

    const previousCouponId = selectedCouponId;
    updateTicketOrderDraft(draftId, {
      selectedCouponId: nextCouponId ?? undefined,
      addonQuantity,
      contact: contactForm,
      travelers: travelerForms,
    });

    try {
      const nextData = await pageRuntime.withLoading(() => fetchCheckoutData(draftId, nextCouponId));
      checkoutController.setData(nextData);
      if (nextData.couponNoticeText) await showWechatToast(nextData.couponNoticeText);
      return nextData;
    } catch (error) {
      updateTicketOrderDraft(draftId, {
        selectedCouponId: previousCouponId,
        addonQuantity,
        contact: contactForm,
        travelers: travelerForms,
      });
      await showWechatToast(resolveErrorMessage(error, '优惠券暂不可用，请稍后再试'));
      return false;
    }
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

  function handleAddonQuantityChange(value: number) {
    setAddonQuantity(value);
    if (draftId) updateTicketOrderDraft(draftId, { addonQuantity: value });
  }

  async function validateTravelers(nextTravelers: TicketOrderTraveler[]) {
    const idCardMap = new Map<string, string>();

    for (const traveler of nextTravelers) {
      if (traveler.nameRequired && !traveler.name.trim()) {
        await showWechatToast(`请填写${traveler.title}姓名`);
        return false;
      }

      if (traveler.certificateRequired && !isValidMainlandIdCard(traveler.idCard)) {
        await showWechatToast(`请填写${traveler.title}正确身份证号`);
        return false;
      }

      if (traveler.mobileRequired && !isValidMainlandMobile(traveler.mobile)) {
        await showWechatToast(`请填写${traveler.title}手机号`);
        return false;
      }

      if (!traveler.certificateRequired || !traveler.idCard) continue;

      const existedTravelerTitle = idCardMap.get(traveler.idCard);
      if (existedTravelerTitle) {
        await showWechatToast(`${traveler.title}与${existedTravelerTitle}证件重复`);
        return false;
      }

      idCardMap.set(traveler.idCard, traveler.title);
    }

    const needsQualificationConfirm = nextTravelers.some((traveler) => {
      if (!isDiscountTraveler(traveler) && !isChildTraveler(traveler)) return false;
      if (!traveler.certificateRequired) return false;
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

  function handleDiscountPress() {
    if (!checkoutData?.discountDetails.length) return;
    setDiscountPopupVisible(true);
  }

  async function handleSubmit() {
    setSubmitAttempted(true);
    const authed = await pageRuntime.ensureLogin('登录后可提交门票订单');
    if (!authed) return;

    if (!checkoutData?.draft || checkoutData.draftMissing || !draftId) {
      await showWechatToast('请先选择门票');
      return;
    }

    const nextTravelers = travelerForms.map((traveler) => ({
      ...traveler,
      name: traveler.name.trim(),
      mobile: normalizeMobileInput(traveler.mobile),
      idCard: normalizeIdCardInput(traveler.idCard),
    }));
    const nextContact = {
      name: nextTravelers.find((traveler) => Boolean(traveler.name))?.name || contactForm.name.trim(),
      mobile: nextTravelers.find((traveler) => Boolean(traveler.mobile))?.mobile || normalizeMobileInput(contactForm.mobile),
      idCard: nextTravelers.find((traveler) => Boolean(traveler.idCard))?.idCard || normalizeIdCardInput(contactForm.idCard),
    };

    if (!await validateTravelers(nextTravelers)) return;

    setContactForm(nextContact);
    setTravelerForms(nextTravelers);
    updateTicketOrderDraft(draftId, {
      contact: nextContact,
      travelers: nextTravelers,
    });

    const confirmed = await showWechatConfirm({
      title: '确认订单',
      content: nextTravelers.length
        ? `已核对 ${nextTravelers.length} 位实名出游人，本次应付 ¥${payAmount.toFixed(2)}，提交后将生成入园凭证。`
        : `已核对订单信息，本次应付 ¥${payAmount.toFixed(2)}，提交后将生成入园凭证。`,
      confirmText: '确认提交',
    });
    if (!confirmed) return;

    await checkoutController.submitAndPay({
      selectedDate,
      selectedCouponId,
      addonQuantity,
      contact: nextContact,
      travelers: nextTravelers,
    }, {
      withLoading: pageRuntime.withLoading,
    });
  }

  return pageRuntime.renderPage(() => {
    if (!checkoutData) return null;

    const travelerCount = travelerForms.length;
    const completedTravelerCount = travelerForms.filter(isTravelerComplete).length;
    const selectedProducts = checkoutData.draft?.products ?? [];
    const totalTicketQuantity = selectedProducts.reduce((total, product) => total + product.quantity, 0)
      || checkoutData.ticketItem.quantity;
    const activeTraveler = travelerForms.find((traveler) => traveler.id === activeTravelerId) ?? travelerForms[0];
    const hasAddonItem = checkoutData.addonItem.quantity > 0 || addonQuantity > 0;

    return (
      <View className="_pg">
        <PageShell
          title="订单确认"
          className="_pg-shell"
          reserveTabBarSpace={false}
          footer={checkoutData.draftMissing ? undefined : (
            <TicketSubmitFooter
              label="金额:"
              amount={payAmount}
              buttonText={checkoutData.payButtonText}
              discountText={discountAmount > 0 ? `已优惠: ¥${discountAmount.toFixed(2)}` : undefined}
              onDiscountClick={hasDiscountDetails ? handleDiscountPress : undefined}
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
              <View className="_pg-section">
                <View className="_pg-section_header">
                  <View className="_pg-section_title-wrap">
                    <Text className="_pg-section_title">门票信息</Text>
                  </View>
                  <Text className="_pg-section_count">共{totalTicketQuantity}张</Text>
                </View>

                <View className="_pg-ticket-date">
                  <View className="_pg-ticket-date_label">
                    <AppIcon name="calendar" className="_pg-ticket-date_icon" size={14} color="#94a3b8" />
                    <Text>游玩日期</Text>
                  </View>
                  <View className="_pg-ticket-date_value">
                    <Text>{selectedDate}</Text>
                  </View>
                </View>

                <View className="_pg-entry-tip">
                  <AppIcon name="code" className="_pg-entry-tip_icon" size={14} color="#94a3b8" />
                  <Text>支付成功后生成订单入园码，也可凭购票证件核验入园</Text>
                </View>

                <View className="_pg-product-list">
                  {selectedProducts.map((product) => (
                    <View className="_pg-product" key={product.id}>
                      <AppIcon name="ticket" className="_pg-product_icon" size={15} color="#e45c98" />
                      <View className="_pg-product_main">
                        <Text className="_pg-product_title">{product.title}</Text>
                      </View>
                      <Text className="_pg-product_count">x{product.quantity}</Text>
                    </View>
                  ))}
                </View>

                {hasAddonItem ? (
                  <View className="_pg-addon">
                    <View className="_pg-addon_summary">
                      <AppIcon name="gift" className="_pg-addon_icon" size={15} color="#e45c98" />
                      <View className="_pg-addon_main">
                        <Text className="_pg-addon_title">{checkoutData.addonItem.productTitle || checkoutData.addonItem.merchantTitle}</Text>
                        {checkoutData.addonItem.noteText ? <Text className="_pg-addon_note">{checkoutData.addonItem.noteText}</Text> : null}
                      </View>
                      <Text className="_pg-addon_count">x{addonQuantity}</Text>
                    </View>
                    <View className="_pg-addon_stepper">
                      <Text className="_pg-addon_stepper-label">套餐数量</Text>
                      <QuantityStepper value={addonQuantity} min={0} onChange={handleAddonQuantityChange} />
                    </View>
                  </View>
                ) : null}
              </View>
            </View>

            {travelerCount > 0 ? (
            <View className="_pg-card">
              <View className="_pg-form _pg-form--traveler">
                <View className="_pg-form_heading _pg-form_heading--traveler">
                  <View className="_pg-form_title-row">
                    <Text className="_pg-form_title">出游人信息</Text>
                    <Text className="_pg-form_desc">请补充 {travelerCount} 位出游人信息</Text>
                  </View>
                  <Text className="_pg-form_progress">{completedTravelerCount}/{travelerCount} 已完善</Text>
                </View>
                <Text className="_pg-form_notice-text">请按票种要求补充出游人信息，儿童票、优待票和年卡资格以园区现场核验为准。</Text>

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
                          <Text className="_pg-traveler-tabs_status">
                            {travelerCompleted ? '已完善' : '待填'}
                          </Text>
                          <Text className="_pg-traveler-tabs_title">{getTravelerTabTitle(traveler, index)}</Text>
                          <Text className="_pg-traveler-tabs_role">{traveler.roleText}</Text>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>

                {activeTraveler ? (() => {
                  const traveler = activeTraveler;
                  const travelerIdCardError = submitAttempted
                    && traveler.certificateRequired
                    && !isValidMainlandIdCard(traveler.idCard);
                  const travelerMobileError = submitAttempted
                    && traveler.mobileRequired
                    && !isValidMainlandMobile(traveler.mobile);

                  return (
                    <View className="_pg-traveler" key={traveler.id}>
                      <View className="_pg-traveler_header">
                        <Text className="_pg-traveler_title">
                          {traveler.title}
                        </Text>
                      </View>
                      <Text className="_pg-traveler_desc">{traveler.requirementText}</Text>
                      {traveler.qualificationText ? (
                        <View className="_pg-traveler_tip">
                          <AppIcon name="ask" className="_pg-traveler_tip-icon" size={14} color="#d0851f" />
                          <Text>{traveler.qualificationText}</Text>
                        </View>
                      ) : null}

                      <View className="_pg-field-shell">
                        {traveler.nameRequired ? (
                          <View className="_pg-field">
                            <Text className="_pg-field_label">姓名</Text>
                            <Input
                              className="_pg-field_input"
                              value={traveler.name}
                              placeholder="请输入实际入园人姓名"
                              onInput={(event) => updateTravelerField(traveler.id, 'name', event.detail.value)}
                            />
                          </View>
                        ) : null}

                        {traveler.certificateRequired ? (
                          <>
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
                          </>
                        ) : null}

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
                    </View>
                  );
                })() : null}
              </View>
            </View>
            ) : null}

            <View className="_pg-card _pg-card--compact">
              <View
                className={`_pg-line-row ${hasCoupons ? '_pg-line-row--link' : '_pg-line-row--disabled'}`}
                onClick={hasCoupons ? () => setCouponPopupVisible(true) : undefined}
              >
                  <Text className="_pg-line-row_label">优惠券</Text>
                  <View className="_pg-line-row_coupon">
                    <Text className={`_pg-line-row_coupon-tag ${hasCoupons ? '' : '_pg-line-row_coupon-tag--disabled'}`}>{couponText}</Text>
                    {hasCoupons ? <AppIcon name="arrowRight" className="_pg-line-row_chevron" size={16} color="#c0c5cf" /> : null}
                  </View>
                </View>
                {discountAmount > 0 ? <Text className="_pg-line-row_extra">已优惠 ¥{discountAmount.toFixed(2)}</Text> : null}
              </View>

            <View className="_pg-check-tip">
              <AppIcon name="check" className="_pg-check-tip_icon" size={14} color="#e45c98" />
              <Text>请确认所填信息准确无误，提交后部分信息不可更改。如有疑问请联系客服。</Text>
            </View>

            <View className="_pg-card _pg-card--compact">
              <View className="_pg-amount-summary">
                {typeof ticketAmount === 'number' ? (
                  <View className="_pg-amount-summary_row">
                    <Text className="_pg-amount-summary_label">票品金额</Text>
                    <Text className="_pg-amount-summary_value">¥{ticketAmount.toFixed(2)}</Text>
                  </View>
                ) : null}
                {hasAddonItem && addonAmount > 0 ? (
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
                    selectedCouponId={selectedCouponId}
                    onClose={() => setCouponPopupVisible(false)}
                    onClear={() => {
                      return refreshCheckoutByCoupon(null).then((nextData) => (nextData ? nextData.draft?.selectedCouponId ?? null : false));
                    }}
                    onSelect={(coupon) => {
                      return refreshCheckoutByCoupon(coupon.id).then((nextData) => (nextData ? nextData.draft?.selectedCouponId ?? null : false));
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
                    <Text className="_pg-discount-summary_amount">¥{discountAmount.toFixed(2)}</Text>
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
              </>
            ) : null}
          </PageShare>
        </PageShell>
      </View>
    );
  });
});

export default CheckoutPage;
