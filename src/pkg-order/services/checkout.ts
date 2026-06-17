import { resolveMockData } from '@/core/services/mock';
import {
  createLocalOrderId,
  createLocalOrderTime,
  saveLocalOrder,
  updateLocalOrder,
  type LocalOrderRecord,
} from '@/core/services/local-order';
import {
  getMallCheckoutDraft,
  getMallCheckoutSelectedAddressId,
  setMallCheckoutSelectedAddressId,
  validateMallCheckoutDelivery,
  type MallCheckoutDraft,
} from '@/core/services/mall-checkout-draft';
import { formatCurrency } from '@/core/utils/money';
import { orderCheckoutData, orderList, type OrderCheckoutData, type OrderHomeActionData } from './mock-data';
import { fetchAddressData, formatOrderAddress } from './address';

export type { OrderCheckoutData } from './mock-data';

interface FetchCheckoutDataOptions {
  draftId?: string;
  addressId?: string;
}

interface SubmitOrderCheckoutOptions {
  paymentStatus: 'pending' | 'paid';
}

function createPayExpireAt() {
  return new Date(Date.now() + 30 * 60 * 1000).toISOString();
}

function formatPayExpireText(payExpireAt?: string) {
  if (!payExpireAt) return '30分钟内';

  const expireDate = new Date(payExpireAt);
  if (Number.isNaN(expireDate.getTime())) return '30分钟内';

  const pad = (value: number) => `${value}`.padStart(2, '0');
  return `${pad(expireDate.getHours())}:${pad(expireDate.getMinutes())}前`;
}

async function resolveCheckoutAddress(options: FetchCheckoutDataOptions) {
  const selectedAddressId = options.addressId ?? getMallCheckoutSelectedAddressId(options.draftId);
  const { addresses } = await fetchAddressData();
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId);
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
  const address = selectedAddress ?? defaultAddress;
  if (!address) throw new Error('请先维护收货地址');
  return address;
}

async function createCheckoutDataFromDraft(
  draft: MallCheckoutDraft,
  options: FetchCheckoutDataOptions,
): Promise<OrderCheckoutData> {
  const address = await resolveCheckoutAddress(options);
  if (options.addressId) {
    setMallCheckoutSelectedAddressId(draft.id, options.addressId);
  }

  const deliveryCheck = validateMallCheckoutDelivery(draft, address);
  const productsAmount = draft.products.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discountAmount = 0;
  const totalAmount = Number((productsAmount + deliveryCheck.freightAmount - discountAmount).toFixed(2));

  return {
    ...orderCheckoutData,
    draftId: draft.id,
    address,
    products: draft.products.map((item) => ({
      id: item.id,
      title: item.title,
      specText: item.specText,
      quantity: item.quantity,
      priceText: formatCurrency(item.unitPrice),
      imageSrc: item.imageSrc,
      giftText: item.giftText,
      canRefund: item.canRefund,
      canAfterSale: item.canAfterSale,
    })),
    shippingText: deliveryCheck.shippingText,
    canSubmit: deliveryCheck.canSubmit,
    deliveryErrors: deliveryCheck.errors,
    couponText: '',
    discountText: '',
    amountFields: [
      { label: '商品金额', value: formatCurrency(productsAmount) },
      { label: '运费', value: deliveryCheck.freightAmount > 0 ? formatCurrency(deliveryCheck.freightAmount) : '¥0.00' },
    ],
    totalAmount,
    discountAmount,
  };
}

function formatMallOrderProductSummary(products: OrderCheckoutData['products']) {
  return products
    .map((product) => `${product.title} ${product.specText} x${product.quantity}`)
    .join('\n');
}

// 根据商品售后能力生成订单列表操作按钮，后续接真实接口时可直接映射后端操作字段。
function createMallOrderHomeActions(isPendingPay: boolean, canAfterSale: boolean) {
  if (isPendingPay) {
    return [{ text: '继续支付', tone: 'primary' as const }];
  }

  const actions: OrderHomeActionData[] = [
    { text: '查看物流', tone: 'default' as const },
    { text: '查看详情', tone: 'default' as const },
  ];

  if (canAfterSale) {
    actions.push({ text: '申请售后', tone: 'primary' as const });
  }

  return actions;
}

function createStaticPaidMallOrder(orderId: string) {
  const pendingOrder = orderList.find((order) => order.id === orderId && order.statusText === '待付款');
  if (!pendingOrder) return undefined;

  const now = createLocalOrderTime();
  const totalQuantity = pendingOrder.products.reduce((total, product) => total + product.quantity, 0);
  const record: LocalOrderRecord = {
    id: pendingOrder.id,
    source: 'mall',
    tabKey: 'pendingShip',
    paymentStatus: 'paid',
    primaryActionType: 'aftersale',
    dateText: now.split(' ')[0],
    statusText: '待发货',
    paidAmountText: formatCurrency(pendingOrder.totalAmount),
    title: pendingOrder.products[0]?.title || '乐园商城订单',
    quantityText: `x${totalQuantity}`,
    totalText: `共${totalQuantity}件商品 合计:${formatCurrency(pendingOrder.totalAmount)}`,
    productFields: [
      {
        label: '商品信息',
        value: pendingOrder.products
          .map((product) => `${product.title} ${product.skuText ?? '默认规格'} x${product.quantity}`)
          .join('\n'),
      },
      { label: '配送方式', value: '快递配送 包邮' },
    ],
    ticketFields: [
      { label: '支付方式', value: '微信支付' },
      { label: '发货说明', value: '商家将在 48 小时内安排发货' },
      { label: '售后规则', value: '未发货支持取消，发货后按商品规则申请售后' },
    ],
    contactFields: [
      { label: '收货人', value: '晓晓 15512345697' },
      { label: '收货地址', value: '上海市浦东新区张江路368号开文大厦22号楼1201室' },
    ],
    amountFields: [
      { label: '商品金额', value: formatCurrency(pendingOrder.totalAmount) },
      { label: '运费', value: '¥0.00' },
      { label: '实付款', value: formatCurrency(pendingOrder.totalAmount) },
    ],
    orderFields: [
      { label: '订单编号', value: pendingOrder.id },
      { label: '下单时间', value: '2026-05-16 15:20' },
      { label: '支付方式', value: '微信支付' },
      { label: '支付时间', value: now },
    ],
    refundButtonText: '申请售后',
    homeItems: pendingOrder.products.map((product) => ({
      id: `${pendingOrder.id}-${product.id}`,
      orderId: pendingOrder.id,
      title: product.title,
      subtitle: product.skuText,
      imageSrc: product.image.src,
      quantity: product.quantity,
      priceText: formatCurrency(product.price),
      actionText: '查看详情',
      actions: createMallOrderHomeActions(false, true),
    })),
    createdAt: now,
  };

  return saveLocalOrder(record);
}

// 获取确认订单页面数据，后续接真实接口时在这里处理字段归一和异常态/空态转译。
export function fetchCheckoutData(options: FetchCheckoutDataOptions = {}) {
  const draft = getMallCheckoutDraft(options.draftId);
  if (draft) {
    return createCheckoutDataFromDraft(draft, options);
  }

  return resolveCheckoutAddress(options).then((address) => resolveMockData<OrderCheckoutData>({
    ...orderCheckoutData,
    address,
    canSubmit: true,
    deliveryErrors: [],
  }));
}

// 模拟商城确认订单提交，写入本地订单中心；支付成功和暂不支付都保留可恢复状态。
export function submitOrderCheckoutOrder(data: OrderCheckoutData, options: SubmitOrderCheckoutOptions) {
  const orderId = createLocalOrderId('MALL-');
  const now = createLocalOrderTime();
  const payExpireAt = options.paymentStatus === 'pending' ? createPayExpireAt() : undefined;
  const firstProduct = data.products[0];
  const hasCouponDiscount = data.discountAmount > 0 && data.couponText.trim().length > 0;
  const isPendingPay = options.paymentStatus === 'pending';
  const canAfterSale = data.products.some((product) => product.canAfterSale !== false);
  const totalQuantity = data.products.reduce((total, item) => total + item.quantity, 0);
  const record: LocalOrderRecord = {
    id: orderId,
    source: 'mall',
    tabKey: isPendingPay ? 'pendingPay' : 'pendingShip',
    paymentStatus: options.paymentStatus,
    payExpireAt,
    primaryActionType: isPendingPay ? 'pay' : canAfterSale ? 'aftersale' : 'none',
    dateText: now.split(' ')[0],
    statusText: isPendingPay ? '待付款' : '待发货',
    paidAmountText: `¥${data.totalAmount.toFixed(2)}`,
    title: firstProduct?.title || '乐园商城订单',
    quantityText: `x${totalQuantity}`,
    totalText: `共${totalQuantity}件商品 合计:¥${data.totalAmount.toFixed(2)}`,
    productFields: [
      { label: '商品信息', value: formatMallOrderProductSummary(data.products) },
      { label: '配送方式', value: data.shippingText },
    ],
    ticketFields: [
      { label: '支付方式', value: data.paymentMethodText },
      { label: '发货说明', value: isPendingPay ? `请在${formatPayExpireText(payExpireAt)}完成支付` : '商家将在 48 小时内安排发货' },
      { label: '售后规则', value: isPendingPay ? '未支付订单可继续支付或超时自动关闭' : '未发货支持取消，发货后按商品规则申请售后' },
    ],
    contactFields: [
      { label: '收货人', value: `${data.address.name} ${data.address.mobile}` },
      { label: '收货地址', value: formatOrderAddress(data.address) },
    ],
    amountFields: [
      ...data.amountFields,
      ...(hasCouponDiscount ? [{ label: '优惠券', value: data.couponText }] : []),
      { label: '实付款', value: `¥${data.totalAmount.toFixed(2)}` },
    ],
    orderFields: [
      { label: '订单编号', value: orderId },
      { label: '下单时间', value: now },
      { label: '支付方式', value: data.paymentMethodText },
      ...(isPendingPay
        ? [{ label: '支付剩余时间', value: `请在${formatPayExpireText(payExpireAt)}完成支付` }]
        : [{ label: '支付时间', value: now }]),
    ],
    refundButtonText: isPendingPay ? '继续支付' : canAfterSale ? '申请售后' : '',
    homeItems: data.products.map((product) => ({
      id: `${orderId}-${product.id}`,
      orderId,
      title: product.title,
      subtitle: product.specText,
      extraText: product.giftText,
      imageSrc: product.imageSrc,
      quantity: product.quantity,
      priceText: product.priceText,
      actionText: isPendingPay ? '继续支付' : '查看详情',
      actions: createMallOrderHomeActions(isPendingPay, canAfterSale),
    })),
    createdAt: now,
  };

  return saveLocalOrder(record);
}

export function payPendingMallOrder(orderId: string) {
  const now = createLocalOrderTime();
  const localOrder = updateLocalOrder(orderId, (order) => ({
    ...order,
    tabKey: 'pendingShip',
    paymentStatus: 'paid',
    payExpireAt: undefined,
    primaryActionType: 'aftersale',
    statusText: '待发货',
    refundButtonText: '申请售后',
    ticketFields: order.ticketFields.map((field) => (
      field.label === '发货说明'
        ? { ...field, value: '商家将在 48 小时内安排发货' }
        : field.label === '售后规则'
          ? { ...field, value: '未发货支持取消，发货后按商品规则申请售后' }
          : field
    )),
    orderFields: [
      ...order.orderFields.filter((field) => field.label !== '支付剩余时间' && field.label !== '支付时间'),
      { label: '支付时间', value: now },
    ],
    homeItems: order.homeItems.map((item) => ({
      ...item,
      actionText: '查看详情',
      actions: createMallOrderHomeActions(false, true),
    })),
  }));

  return localOrder ?? createStaticPaidMallOrder(orderId);
}
