import type {
  BffOrder,
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

function formatCouponNos(values?: string[]) {
  return normalizeCouponNos(values).join('、');
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

function buildCouponLinks(values?: string[]) {
  return compactCouponLinks(
    normalizeCouponNos(values).map((couponNo) => ({ couponNo })),
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
    mapCouponField('下单选择', formatCouponNos(order.selectedCouponNos), buildCouponLinks(order.selectedCouponNos)),
    mapCouponField('实际使用', formatCouponNos(order.appliedCouponNos), buildCouponLinks(order.appliedCouponNos)),
    mapCouponField('锁定中', formatCouponNos(order.lockedCouponNos), buildCouponLinks(order.lockedCouponNos)),
    mapCouponField('未生效', rejectedCoupons, rejectedCouponLinks),
    mapCouponField('已释放', formatCouponNos(order.releasedCouponNos), buildCouponLinks(order.releasedCouponNos)),
    mapCouponField('退款返还', formatCouponNos(order.refundReturnedCouponNos), buildCouponLinks(order.refundReturnedCouponNos)),
  ]);
}
