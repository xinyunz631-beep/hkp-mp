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
import { rootStore } from '@/core/store';
import { resolveErrorMessage } from '@/core/utils/error-message';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { showWechatConfirm, showWechatToast } from '@/core/utils/wechat-actions';
import { TicketRichText } from '@/pkg-ticket/components/TicketRichText';
import { TicketSubmitFooter } from '@/pkg-ticket/components/TicketSubmitFooter';
import { fetchCheckoutData, type TicketCheckoutPageData } from '@/pkg-ticket/services/checkout';
import { fetchTicketBookingData, type TicketProduct } from '@/pkg-ticket/services/ticket-booking';
import {
  clearTicketCheckoutPendingOrder,
  persistTicketCheckoutPendingOrder,
  isTicketOrderIdentityRequired,
  submitTicketOrderDraft,
  TICKET_ORDER_SOURCE_OFFLINE_QR_FAST_BUY,
  updateTicketOrderDraft,
  type TicketOrderDraftProduct,
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

// 判断是否为优惠票出游人，用于提交前资格二次确认。
function isDiscountTraveler(traveler: TicketOrderTraveler) {
  return traveler.role === 'senior';
}

// 判断是否为儿童类出游人，用于提交前年龄资格提醒。
function isChildTraveler(traveler: TicketOrderTraveler) {
  return traveler.role === 'child' || traveler.role === 'annualChild';
}

// 读取会员信息作为第一位出游人的默认值，昵称缺失时用微信默认昵称兜底。
function resolveMemberContactSeed(): ContactFormState {
  const memberInfo = rootStore.memberInfo;

  return {
    name: memberInfo?.nickname?.trim() || '微信用户',
    mobile: normalizeMobileInput(memberInfo?.mobile || ''),
    idCard: '',
  };
}

// 合并草稿联系人和会员默认值，避免新确认单空白联系人影响提交。
function mergeContactWithMemberSeed(contact: ContactFormState): ContactFormState {
  const memberContact = resolveMemberContactSeed();

  return {
    name: contact.name.trim() || memberContact.name,
    mobile: normalizeMobileInput(contact.mobile || memberContact.mobile),
    idCard: normalizeIdCardInput(contact.idCard),
  };
}

// 归一化现网 A 方案的一组出游人表单，所有门票复用同一组实名信息。
function normalizeSingleTravelerForm(
  travelers: TicketOrderTraveler[],
  contact: ContactFormState,
) {
  const traveler = travelers[0];
  if (!traveler) return [];

  return [{
    ...traveler,
    name: traveler.name.trim() || contact.name,
    mobile: normalizeMobileInput(traveler.mobile || contact.mobile),
    idCard: normalizeIdCardInput(traveler.idCard || contact.idCard),
  }];
}

// 根据一组游客信息回推订单联系人，现网 A 方案不单独展示联系人板块。
function resolveContactFromTravelers(
  travelers: TicketOrderTraveler[],
  fallbackContact: ContactFormState,
) {
  return {
    name: travelers.find((traveler) => Boolean(traveler.name))?.name || fallbackContact.name.trim(),
    mobile: travelers.find((traveler) => Boolean(traveler.mobile))?.mobile || normalizeMobileInput(fallbackContact.mobile),
    idCard: travelers.find((traveler) => Boolean(traveler.idCard))?.idCard || normalizeIdCardInput(fallbackContact.idCard),
  };
}

// 将确认单金额转为分单位比较，避免浮点格式差异误判为改价。
function toTicketAmountCent(value?: number) {
  return Math.round((Number(value) || 0) * 100);
}

// 读取门票商品行单价，后端确认单单价优先，缺逐行单价时用草稿价格快照兜底展示。
function resolveTicketProductUnitPriceCent(product: TicketOrderDraftProduct) {
  const unitPriceCent = Number(product.unitPriceCent);
  if (Number.isFinite(unitPriceCent) && unitPriceCent >= 0) return unitPriceCent;

  return toTicketAmountCent(product.price);
}

// 格式化门票商品行单价，确认单商品列表保持两位小数展示。
function formatTicketProductUnitPrice(product: TicketOrderDraftProduct) {
  return `¥${(resolveTicketProductUnitPriceCent(product) / 100).toFixed(2)}`;
}

// 判断门票提交前确认结果是否发生支付关键字段变化。
function hasTicketCheckoutChanged(currentData: TicketCheckoutPageData, nextData: TicketCheckoutPageData) {
  return toTicketAmountCent(currentData.payableAmount) !== toTicketAmountCent(nextData.payableAmount)
    || toTicketAmountCent(currentData.discountAmount) !== toTicketAmountCent(nextData.discountAmount)
    || toTicketAmountCent(currentData.ticketItem.price) !== toTicketAmountCent(nextData.ticketItem.price)
    || currentData.ticketItem.quantity !== nextData.ticketItem.quantity
    || currentData.draft?.selectedCouponId !== nextData.draft?.selectedCouponId
    || currentData.draftMissing !== nextData.draftMissing;
}

// 判断确认单是否仅包含快速通票项，纯快速通无实名表单时仍需展示入园码提示。
function isFastPassOnlyOrder(products: TicketOrderDraftProduct[]) {
  return products.length > 0 && products.every((product) => (
    product.category === 'fastPass'
    || String(product.fulfillmentType || '').toUpperCase() === 'LOCAL_FAST_PASS_VOUCHER'
  ));
}

// 安全解码确认单来源参数，兼容小程序路由二次编码。
function decodeCheckoutRouteParam(value?: string) {
  if (!value) return '';
  try {
    return decodeURIComponent(value).trim();
  } catch (error) {
    return value.trim();
  }
}

// 判断当前确认单是否来自线下快速购票入口，草稿来源优先于路由兜底。
function isOfflineQrFastBuyCheckout(source?: string, routeSource?: string) {
  return source === TICKET_ORDER_SOURCE_OFFLINE_QR_FAST_BUY
    || routeSource === TICKET_ORDER_SOURCE_OFFLINE_QR_FAST_BUY;
}

// 判断快速购买确认单中哪些票品允许改数量，避免普通门票确认单误开放编辑。
function canEditOfflineFastBuyProduct(sourceEnabled: boolean, product: TicketOrderDraftProduct) {
  if (!sourceEnabled) return false;
  return product.category === 'fastPass'
    || String(product.fulfillmentType || '').toUpperCase() === 'LOCAL_FAST_PASS_VOUCHER';
}

// 读取快速购买数量上限，优先沿用预定页当日库存和限购的交集。
function resolveOfflineFastBuyQuantityMax(product: TicketOrderDraftProduct) {
  const maxQuantity = Number(product.maxQuantity);
  const availableStock = Number(product.availableStock);
  const candidates = [maxQuantity, availableStock].filter((value) => Number.isFinite(value) && value > 0);

  return candidates.length ? Math.min(...candidates) : 99;
}

// 生成快速购买数量上限提示，和门票预定页加号反馈保持一致。
function resolveOfflineFastBuyQuantityMaxText(product: TicketOrderDraftProduct) {
  const maxQuantity = resolveOfflineFastBuyQuantityMax(product);
  return maxQuantity > 0 ? `最多可购 ${maxQuantity} 张` : '';
}

// 将快速购买数量限制在 1 到库存上限内，防止输入框产生 0 或小数。
function clampOfflineFastBuyQuantity(product: TicketOrderDraftProduct, value: number) {
  const maxQuantity = resolveOfflineFastBuyQuantityMax(product);
  const normalizedValue = Math.floor(Number(value) || 1);

  return Math.min(maxQuantity, Math.max(1, normalizedValue));
}

// 判断推荐区是否展示快速通商品，和线下快速购买入口保持同一类目口径。
function isFastPassRecommendationProduct(product: TicketProduct) {
  return product.category === 'fastPass'
    || String(product.fulfillmentType || '').toUpperCase() === 'LOCAL_FAST_PASS_VOUCHER';
}

// 读取推荐快速通数量上限，沿用门票预定页的当日可售和限购结果。
function resolveFastPassRecommendationMaxQuantity(product: TicketProduct) {
  if (!product.saleable) return 0;
  const maxQuantity = Math.floor(Number(product.maxQuantity) || 0);
  return Math.max(0, maxQuantity);
}

// 判断快速通推荐商品是否可加购，不可售或无库存限购时不进入推荐区。
function isAddableFastPassRecommendationProduct(product: TicketProduct) {
  return isFastPassRecommendationProduct(product)
    && resolveFastPassRecommendationMaxQuantity(product) > 0;
}

// 生成结算页推荐列表，只排除初始化时已选票品，后续推荐区加购的票品仍保留展示。
function buildFastPassRecommendations(products: TicketProduct[], initialSelectedProductIds: string[]) {
  const initialSelectedIdSet = new Set(initialSelectedProductIds);

  return products
    .filter(isAddableFastPassRecommendationProduct)
    .filter((product) => !initialSelectedIdSet.has(product.id));
}

// 生成推荐快速通数量上限提示，和门票预定页加号反馈保持一致。
function resolveFastPassRecommendationMaxText(product: TicketProduct) {
  const maxQuantity = resolveFastPassRecommendationMaxQuantity(product);
  return maxQuantity > 0 ? `最多可购 ${maxQuantity} 张` : '';
}

// 将推荐快速通数量限制在 0 到库存上限内，0 表示从当前确认单移除该票品。
function clampFastPassRecommendationQuantity(product: TicketProduct, value: number) {
  const maxQuantity = resolveFastPassRecommendationMaxQuantity(product);
  const normalizedValue = Math.floor(Number(value) || 0);

  return Math.min(maxQuantity, Math.max(0, normalizedValue));
}

// 将推荐快速通商品快照转换为确认单草稿商品，确保后续统一确认接口能识别 SKU。
function buildFastPassRecommendationDraftProduct(product: TicketProduct, quantity: number): TicketOrderDraftProduct {
  return {
    id: product.id,
    productCode: product.productCode,
    skuId: product.skuId,
    skuName: product.skuName,
    title: product.title,
    imageSrc: product.imageSrc,
    category: product.category,
    price: product.price,
    unitPriceCent: product.unitPriceCent,
    quantity,
    availableStock: product.availableStock,
    maxQuantity: product.maxQuantity,
    noticeText: product.noticeText,
    travelerRoles: product.travelerRoles,
    requiredFields: product.requiredFields,
    mobileRequired: product.mobileRequired,
    certificateRequired: product.certificateRequired,
    verificationMethod: product.verificationMethod,
    verificationMethods: product.verificationMethods,
    fulfillmentType: product.fulfillmentType,
    realNameRequired: product.realNameRequired,
    entryMethods: product.entryMethods,
    cardRule: product.cardRule,
    usageInstructionHtml: product.usageInstructionHtml,
  };
}

// 格式化推荐快速通单价，优先使用后端返回的分单位价格。
function formatFastPassRecommendationPrice(product: TicketProduct) {
  const unitPriceCent = Number(product.unitPriceCent);
  if (Number.isFinite(unitPriceCent) && unitPriceCent >= 0) {
    return `¥${(unitPriceCent / 100).toFixed(2)}`;
  }

  return `¥${(Number(product.price) || 0).toFixed(2)}`;
}

const CheckoutPage = observer(function CheckoutPage() {
  const [draftId, setDraftId] = useState('');
  const [routeSource, setRouteSource] = useState('');
  const [addonQuantity, setAddonQuantity] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [fastPassRecommendations, setFastPassRecommendations] = useState<TicketProduct[]>([]);
  const [couponPopupVisible, setCouponPopupVisible] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [discountPopupVisible, setDiscountPopupVisible] = useState(false);
  const [noticeProduct, setNoticeProduct] = useState<TicketOrderDraftProduct>();
  const [travelerForms, setTravelerForms] = useState<TicketOrderTraveler[]>([]);
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
    onPaymentPrepared: (data, payload, result) => persistTicketCheckoutPendingOrder(data.draft?.id || draftId, payload, result),
    onPaymentCanceled: (data) => clearTicketCheckoutPendingOrder(data.draft?.id || draftId),
    buildSuccessRoute: (result) => `${MINI_PACKAGE_ROUTES.orderDetail}?orderId=${encodeURIComponent(result.orderNo)}&paymentSettling=1`,
    isOrderComplete: (result) => isBffTicketOrderIssued(result.orderStatus, result.order?.ticketVouchers, result.order?.annualCards),
    submitErrorText: '门票订单提交暂不可用，请稍后再试',
    emptySubmitText: '订单提交失败，请重新选择门票',
    completeSuccessText: '出票成功',
    paymentSuccessRedirectDelayMs: 2000,
    paymentSuccessLoadingText: '加载中',
  });
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const routeParams = Taro.getCurrentInstance().router?.params ?? {};
      const nextDraftId = routeParams.draftId || '';
      const nextRouteSource = decodeCheckoutRouteParam(routeParams.source);
      const nextData = await checkoutController.load({ draftId: nextDraftId });
      const nextContact = mergeContactWithMemberSeed({
        name: nextData.contact.name,
        mobile: nextData.contact.mobile,
        idCard: nextData.contact.idCard,
      });
      const nextTravelers = normalizeSingleTravelerForm(nextData.travelers, nextContact);
      const normalizedData: TicketCheckoutPageData = {
        ...nextData,
        contact: {
          ...nextData.contact,
          ...nextContact,
        },
        draft: nextData.draft
          ? {
            ...nextData.draft,
            contact: nextContact,
            travelers: nextTravelers,
          }
          : nextData.draft,
        travelers: nextTravelers,
      };
      setDraftId(nextDraftId);
      setRouteSource(nextRouteSource);
      setAddonQuantity(nextData.addonItem.quantity);
      setSelectedDate(nextData.ticketItem.travelDate);
      setTravelerForms(nextTravelers);
      setSubmitAttempted(false);
      setContactForm(nextContact);
      checkoutController.setData(normalizedData);
      void loadFastPassRecommendations(
        nextData.ticketItem.travelDate,
        (nextData.draft?.products ?? []).map((product) => product.id),
      );
      if (nextDraftId && !nextData.draftMissing) {
        updateTicketOrderDraft(nextDraftId, {
          contact: nextContact,
          travelers: nextTravelers,
        });
      }
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
    const nextContact = resolveContactFromTravelers(nextTravelers, contactForm);

    setTravelerForms(nextTravelers);
    setContactForm(nextContact);
    if (draftId) {
      updateTicketOrderDraft(draftId, {
        contact: nextContact,
        travelers: nextTravelers,
      });
    }
  }

  function handleAddonQuantityChange(value: number) {
    setAddonQuantity(value);
    if (draftId) updateTicketOrderDraft(draftId, { addonQuantity: value });
  }

  // 拉取同一游玩日期的快速通推荐商品，失败时不阻断确认单主流程。
  async function loadFastPassRecommendations(travelDate: string, initialSelectedProductIds: string[]) {
    if (!travelDate) {
      setFastPassRecommendations([]);
      return;
    }

    try {
      const bookingData = await fetchTicketBookingData({ travelDate });
      setFastPassRecommendations(buildFastPassRecommendations(bookingData.products, initialSelectedProductIds));
    } catch (error) {
      setFastPassRecommendations([]);
    }
  }

  // 读取推荐卡片当前在草稿中的数量，用于主商品区和推荐区双向同步。
  function resolveFastPassRecommendationQuantity(productId: string) {
    return checkoutData?.draft?.products.find((product) => product.id === productId)?.quantity ?? 0;
  }

  // 票品数量变化后统一刷新确认单，避免结算页自己计算优惠和应付金额。
  async function refreshTicketProductsAfterQuantityChange(
    nextProducts: TicketOrderDraftProduct[],
    previousProducts: TicketOrderDraftProduct[],
    errorText: string,
  ) {
    if (!draftId) return;

    updateTicketOrderDraft(draftId, {
      products: nextProducts,
      selectedCouponId,
      addonQuantity,
      contact: contactForm,
      travelers: travelerForms,
    });

    try {
      const nextData = await pageRuntime.withLoading(() => fetchCheckoutData(draftId, selectedCouponId));
      checkoutController.setData(nextData);
      if (nextData.couponNoticeText) await showWechatToast(nextData.couponNoticeText);
    } catch (error) {
      updateTicketOrderDraft(draftId, {
        products: previousProducts,
        selectedCouponId,
        addonQuantity,
        contact: contactForm,
        travelers: travelerForms,
      });
      await showWechatToast(resolveErrorMessage(error, errorText));
    }
  }

  // 快速购买数量已达上限时继续点击加号，给出和预定页一致的库存/限购反馈。
  function handleOfflineFastBuyMaxQuantityClick(product: TicketOrderDraftProduct) {
    const maxQuantityText = resolveOfflineFastBuyQuantityMaxText(product);
    if (!maxQuantityText) return;
    void showWechatToast(maxQuantityText);
  }

  // 线下快速购票在确认单内调整票品数量后，重新走统一订单确认刷新金额与优惠。
  async function handleOfflineFastBuyQuantityChange(product: TicketOrderDraftProduct, value: number) {
    if (!draftId || !checkoutData?.draft) return;
    if (Number(value) > resolveOfflineFastBuyQuantityMax(product)) {
      await showWechatToast(resolveOfflineFastBuyQuantityMaxText(product));
    }
    const nextQuantity = clampOfflineFastBuyQuantity(product, value);
    if (nextQuantity === product.quantity) return;

    const previousProducts = checkoutData.draft.products;
    const nextProducts = previousProducts.map((item) => (
      item.id === product.id ? { ...item, quantity: nextQuantity } : item
    ));

    await refreshTicketProductsAfterQuantityChange(nextProducts, previousProducts, '门票数量暂不可调整，请稍后再试');
  }

  // 推荐快速通不可售时点击步进器区域，给出和门票预定页一致的原因反馈。
  function handleFastPassRecommendationUnavailableClick(product: TicketProduct) {
    const unavailableReason = product.stockText || '当前票种暂不可订';
    void showWechatToast(`${unavailableReason}，请选择其他游玩日期`);
  }

  // 推荐快速通数量已达上限时继续点击加号，给出库存/限购反馈。
  function handleFastPassRecommendationMaxQuantityClick(product: TicketProduct) {
    const maxQuantityText = resolveFastPassRecommendationMaxText(product);
    if (!maxQuantityText) return;
    void showWechatToast(maxQuantityText);
  }

  // 推荐快速通加减后写入草稿并刷新确认单，支持新增、改量和移除推荐票品。
  async function handleFastPassRecommendationQuantityChange(product: TicketProduct, value: number) {
    if (!draftId || !checkoutData?.draft) return;
    const maxQuantity = resolveFastPassRecommendationMaxQuantity(product);
    if (maxQuantity < 1) {
      handleFastPassRecommendationUnavailableClick(product);
      return;
    }

    if (Number(value) > maxQuantity) {
      await showWechatToast(resolveFastPassRecommendationMaxText(product));
    }

    const nextQuantity = clampFastPassRecommendationQuantity(product, value);
    const previousProducts = checkoutData.draft.products;
    const currentProduct = previousProducts.find((item) => item.id === product.id);
    if ((currentProduct?.quantity ?? 0) === nextQuantity) return;

    const nextProducts = currentProduct
      ? nextQuantity > 0
        ? previousProducts.map((item) => (
            item.id === product.id ? { ...item, quantity: nextQuantity } : item
          ))
        : previousProducts.filter((item) => item.id !== product.id)
      : nextQuantity > 0
        ? [...previousProducts, buildFastPassRecommendationDraftProduct(product, nextQuantity)]
        : previousProducts;

    if (nextProducts.length < 1) {
      await showWechatToast('请至少保留 1 个票品');
      return;
    }

    await refreshTicketProductsAfterQuantityChange(nextProducts, previousProducts, '快速通数量暂不可调整，请稍后再试');
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

    const identityRequired = isTicketOrderIdentityRequired(checkoutData.draft.products);
    const nextTravelers = travelerForms.map((traveler) => ({
      ...traveler,
      name: traveler.name.trim(),
      mobile: normalizeMobileInput(traveler.mobile),
      idCard: normalizeIdCardInput(traveler.idCard),
    }));
    const nextContact = resolveContactFromTravelers(nextTravelers, contactForm);

    if (identityRequired && !isValidMainlandMobile(nextContact.mobile)) {
      await showWechatToast('请填写正确联系手机');
      return;
    }

    if (identityRequired && !await validateTravelers(nextTravelers)) return;

    setContactForm(nextContact);
    setTravelerForms(nextTravelers);
    updateTicketOrderDraft(draftId, {
      contact: nextContact,
      travelers: nextTravelers,
    });

    const confirmed = await showWechatConfirm({
      title: '确认订单',
      content: identityRequired && nextTravelers.length
        ? `已核对出游人信息，本次应付 ¥${payAmount.toFixed(2)}，提交后将生成入园凭证。`
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

    const selectedProducts = checkoutData.draft?.products ?? [];
    const offlineFastBuyEnabled = isOfflineQrFastBuyCheckout(checkoutData.draft?.source, routeSource);
    const totalTicketQuantity = selectedProducts.reduce((total, product) => total + product.quantity, 0)
      || checkoutData.ticketItem.quantity;
    const activeTraveler = travelerForms[0];
    const hasAddonItem = checkoutData.addonItem.quantity > 0 || addonQuantity > 0;
    const showTicketEntryTip = isFastPassOnlyOrder(selectedProducts) && travelerForms.length === 0;
    const summaryItemCount = totalTicketQuantity + (hasAddonItem ? addonQuantity : 0);
    const summarySubtotalAmount = typeof ticketAmount === 'number'
      ? ticketAmount + (hasAddonItem && addonAmount > 0 ? addonAmount : 0)
      : undefined;

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

                {showTicketEntryTip ? (
                  <View className="_pg-entry-tip">
                    <AppIcon name="code" className="_pg-entry-tip_icon" size={14} color="#94a3b8" />
                    <Text>支付成功后生成订单入园码，也可凭购票证件核验入园</Text>
                  </View>
                ) : null}

                <View className="_pg-product-list">
                  {selectedProducts.map((product) => {
                    const editableQuantity = canEditOfflineFastBuyProduct(offlineFastBuyEnabled, product);
                    const maxQuantity = resolveOfflineFastBuyQuantityMax(product);
                    const reachedMaxQuantity = editableQuantity && maxQuantity > 0 && product.quantity >= maxQuantity;

                    return (
                      <View className="_pg-product" key={product.id}>
                        <AppIcon name="ticket" className="_pg-product_icon" size={15} color="#e45c98" />
                        <View className="_pg-product_main">
                          <Text className="_pg-product_title">{product.title}</Text>
                          <View className="_pg-product_notice" onClick={() => setNoticeProduct(product)}>
                            <Text>预定须知</Text>
                            <AppIcon name="ask" className="_pg-product_notice-icon" size={11} color="#8a94a6" />
                          </View>
                        </View>
                        <View className="_pg-product_aside">
                          <Text className="_pg-product_amount">{formatTicketProductUnitPrice(product)}</Text>
                          {editableQuantity ? (
                            <View className="_pg-product_stepper">
                              <QuantityStepper
                                value={product.quantity}
                                min={1}
                                max={resolveOfflineFastBuyQuantityMax(product)}
                                onChange={(value) => void handleOfflineFastBuyQuantityChange(product, value)}
                              />
                              {reachedMaxQuantity ? (
                                <View className="_pg-product_stepper-plus-mask" onClick={() => handleOfflineFastBuyMaxQuantityClick(product)} />
                              ) : null}
                            </View>
                          ) : (
                            <Text className="_pg-product_count">x{product.quantity}</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
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

            {travelerForms.length > 0 ? (
            <View className="_pg-card">
              <View className="_pg-form _pg-form--traveler">
                <View className="_pg-form_heading _pg-form_heading--traveler">
                  <View className="_pg-form_title-row">
                    <Text className="_pg-form_title">出游人信息</Text>
                  </View>
                </View>

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
                      <View className="_pg-entry-tip">
                        <AppIcon name="code" className="_pg-entry-tip_icon" size={14} color="#94a3b8" />
                        <Text>支付成功后生成订单入园码，也可凭购票证件核验入园</Text>
                      </View>

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

            {travelerForms.length > 0 ? (
              <View className="_pg-check-tip">
                <AppIcon name="check" className="_pg-check-tip_icon" size={14} color="#e45c98" />
                <Text>请确认所填信息准确无误，提交后信息不可更改。如有疑问请联系客服。</Text>
              </View>
            ) : null}

            {fastPassRecommendations.length > 0 ? (
              <View className="_pg-card _pg-card--recommend">
                <View className="_pg-recommend">
                  <Text className="_pg-recommend_title">更多推荐</Text>
                  <ScrollView className="_pg-recommend_scroll" scrollX enhanced showScrollbar={false}>
                    <View className="_pg-recommend_list">
                      {fastPassRecommendations.map((product) => {
                        const quantity = resolveFastPassRecommendationQuantity(product.id);
                        const maxQuantity = resolveFastPassRecommendationMaxQuantity(product);
                        const reachedMaxQuantity = product.saleable && maxQuantity > 0 && quantity >= maxQuantity;
                        const disabled = !product.saleable || maxQuantity < 1;

                        return (
                          <View
                            className={`_pg-recommend_item ${disabled ? '_pg-recommend_item--disabled' : ''}`}
                            key={product.id}
                            onClick={disabled ? () => handleFastPassRecommendationUnavailableClick(product) : undefined}
                          >
                            <Text className="_pg-recommend_name">{product.title}</Text>
                            <View className="_pg-recommend_footer">
                              <Text className="_pg-recommend_price">{formatFastPassRecommendationPrice(product)}</Text>
                              <View className="_pg-recommend_stepper">
                                <QuantityStepper
                                  value={quantity}
                                  min={0}
                                  max={maxQuantity}
                                  disabled={disabled}
                                  onChange={(value) => void handleFastPassRecommendationQuantityChange(product, value)}
                                />
                                {reachedMaxQuantity ? (
                                  <View
                                    className="_pg-recommend_stepper-plus-mask"
                                    onClick={() => handleFastPassRecommendationMaxQuantityClick(product)}
                                  />
                                ) : null}
                                {disabled ? <View className="_pg-recommend_stepper-mask" /> : null}
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
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
              </View>

            <View className="_pg-card _pg-card--compact">
              <View className="_pg-amount-summary">
                <View className="_pg-amount-summary_header">
                  <Text className="_pg-amount-summary_title">共 {summaryItemCount} 件</Text>
                  {typeof summarySubtotalAmount === 'number' ? (
                    <>
                      <Text className="_pg-amount-summary_dot">·</Text>
                      <Text className="_pg-amount-summary_subtitle">小计 ¥{summarySubtotalAmount.toFixed(2)}</Text>
                    </>
                  ) : null}
                </View>
                {typeof ticketAmount === 'number' ? (
                  <View className="_pg-amount-summary_row">
                    <Text className="_pg-amount-summary_label">门票金额</Text>
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
                  <>
                    <View className="_pg-amount-summary_row">
                      <Text className="_pg-amount-summary_label">优惠金额</Text>
                      <Text className="_pg-amount-summary_value _pg-amount-summary_value--discount">
                        - ¥{discountAmount.toFixed(2)}
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
                <AppBottomSheet
                  visible={Boolean(noticeProduct)}
                  title="预定须知"
                  className="_pg-notice-sheet"
                  bodyMinHeight={260}
                  bodyMaxHeight="62vh"
                  showFooter={false}
                  onClose={() => setNoticeProduct(undefined)}
                >
                  {noticeProduct?.usageInstructionHtml ? (
                    <TicketRichText className="_pg-notice-rich-text" nodes={noticeProduct.usageInstructionHtml} />
                  ) : (
                    <Text className="_pg-notice-empty">暂无须知内容</Text>
                  )}
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
