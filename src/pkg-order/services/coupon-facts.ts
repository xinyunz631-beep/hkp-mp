import type {
  BffOrder,
  BffOrderCoupon,
  BffOrderRejectedCoupon,
} from '@/core/services/bff-order-api';
import type {
  OrderDetailCouponFieldData,
  OrderDetailCouponLinkData,
} from './model';

function normalizeString(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeCouponNos(values?: string[]) {
  if (!values?.length) return [];

  return Array.from(new Set(
    values
      .map((value) => normalizeString(value))
      .filter(Boolean),
  ));
}

function normalizeCouponEntries(coupons?: BffOrderCoupon[], fallbackCouponNos?: string[]) {
  const source: BffOrderCoupon[] = coupons?.length
    ? coupons
    : normalizeCouponNos(fallbackCouponNos).map((couponNo) => ({ couponNo } satisfies BffOrderCoupon));
  const entryMap = new Map<string, { couponNo?: string; displayText: string }>();

  source.forEach((coupon, index) => {
    const couponNo = normalizeString(coupon.couponNo);
    const displayText = normalizeString(coupon.displayName || coupon.couponName || couponNo);
    if (!couponNo && !displayText) return;
    const key = couponNo || `${displayText}_${index}`;
    if (!entryMap.has(key)) entryMap.set(key, { couponNo: couponNo || undefined, displayText });
  });

  return Array.from(entryMap.values());
}

function formatCoupons(coupons?: BffOrderCoupon[], fallbackCouponNos?: string[]) {
  return normalizeCouponEntries(coupons, fallbackCouponNos)
    .map((coupon) => coupon.displayText)
    .join('、');
}

function compactCouponLinks(links: Array<OrderDetailCouponLinkData | undefined>) {
  const linkMap = new Map<string, OrderDetailCouponLinkData>();

  links.forEach((link) => {
    if (!link?.couponNo) return;
    const key = `${link.couponNo}__${link.detailText || ''}`;
    if (!linkMap.has(key)) linkMap.set(key, link);
  });

  return Array.from(linkMap.values());
}

function buildCouponDisplayLinks(coupons?: BffOrderCoupon[], fallbackCouponNos?: string[]) {
  return compactCouponLinks(
    normalizeCouponEntries(coupons, fallbackCouponNos).map((coupon) => (
      coupon.couponNo
        ? { couponNo: coupon.couponNo, displayText: coupon.displayText }
        : undefined
    )),
  );
}

function resolveRejectedCouponText(coupon: BffOrderRejectedCoupon) {
  const couponNo = normalizeString(coupon.couponNo);
  const reason = normalizeString(coupon.unavailableReason || coupon.reason);
  const status = normalizeString(coupon.status);
  const detail = reason || status;

  if (couponNo && detail) return `${couponNo}（${detail}）`;
  if (couponNo) return couponNo;
  return detail;
}

function buildRejectedCouponLink(coupon: BffOrderRejectedCoupon) {
  const couponNo = normalizeString(coupon.couponNo);
  if (!couponNo) return undefined;

  return {
    couponNo,
    detailText: normalizeString(coupon.unavailableReason || coupon.reason || coupon.status) || undefined,
  } satisfies OrderDetailCouponLinkData;
}

function compactCouponFields(fields: OrderDetailCouponFieldData[]) {
  return fields.filter((field) => Boolean(field.value && field.value !== '-'));
}

function mapCouponField(
  label: string,
  value: string,
  couponLinks?: OrderDetailCouponLinkData[],
): OrderDetailCouponFieldData {
  return {
    label,
    value,
    couponLinks: couponLinks?.length ? couponLinks : undefined,
  };
}

export function mapOrderCouponFields(order: BffOrder) {
  const rejectedCoupons = Array.from(new Set(
    (order.rejectedCoupons || [])
      .map(resolveRejectedCouponText)
      .filter(Boolean),
  )).join('；');
  const rejectedCouponLinks = compactCouponLinks(
    (order.rejectedCoupons || []).map(buildRejectedCouponLink),
  );

  return compactCouponFields([
    mapCouponField('下单选择', formatCoupons(order.selectedCoupons, order.selectedCouponNos), buildCouponDisplayLinks(order.selectedCoupons, order.selectedCouponNos)),
    mapCouponField('实际使用', formatCoupons(order.appliedCoupons, order.appliedCouponNos), buildCouponDisplayLinks(order.appliedCoupons, order.appliedCouponNos)),
    mapCouponField('锁定中', formatCoupons(order.lockedCoupons, order.lockedCouponNos), buildCouponDisplayLinks(order.lockedCoupons, order.lockedCouponNos)),
    mapCouponField('未生效', rejectedCoupons, rejectedCouponLinks),
    mapCouponField('已释放', formatCoupons(order.releasedCoupons, order.releasedCouponNos), buildCouponDisplayLinks(order.releasedCoupons, order.releasedCouponNos)),
    mapCouponField('退款返还', formatCoupons(order.refundReturnedCoupons, order.refundReturnedCouponNos), buildCouponDisplayLinks(order.refundReturnedCoupons, order.refundReturnedCouponNos)),
  ]);
}
