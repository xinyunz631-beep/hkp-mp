import type {
  BffOrder,
  BffOrderCouponView,
  BffOrderRejectedCoupon,
} from '@/core/services/bff-order-api';
import type {
  OrderDetailCouponFieldData,
  OrderDetailCouponLinkData,
} from './model';

function normalizeString(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeRejectedStatus(value?: string) {
  return normalizeString(value).replace(/[_\s-]/g, '').toUpperCase();
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

function resolveCouponDisplayText(coupon: BffOrderCouponView) {
  return [coupon.displayName, coupon.couponName, coupon.couponNo]
    .map(normalizeString)
    .find(Boolean) || '';
}

function normalizeCouponViews(coupons?: BffOrderCouponView[]) {
  if (!Array.isArray(coupons)) return [];

  const couponMap = new Map<string, BffOrderCouponView>();
  coupons.forEach((coupon) => {
    const couponNo = normalizeString(coupon?.couponNo);
    const displayText = resolveCouponDisplayText(coupon);
    if (!couponNo && !displayText) return;

    const key = couponNo || displayText;
    if (!couponMap.has(key)) {
      couponMap.set(key, {
        ...coupon,
        couponNo,
        displayName: displayText,
      });
    }
  });

  return Array.from(couponMap.values());
}

function formatCouponViews(coupons?: BffOrderCouponView[]) {
  return normalizeCouponViews(coupons)
    .map(resolveCouponDisplayText)
    .filter(Boolean)
    .join('、');
}

function buildCouponViewLinks(coupons?: BffOrderCouponView[]) {
  return compactCouponLinks(
    normalizeCouponViews(coupons).map((coupon) => {
      const couponNo = normalizeString(coupon.couponNo);
      if (!couponNo) return undefined;

      return {
        couponNo,
        displayText: resolveCouponDisplayText(coupon) || couponNo,
      } satisfies OrderDetailCouponLinkData;
    }),
  );
}

function formatCouponFieldValue(coupons?: BffOrderCouponView[], fallbackCouponNos?: string[]) {
  return formatCouponViews(coupons) || formatCouponNos(fallbackCouponNos);
}

function buildCouponFieldLinks(coupons?: BffOrderCouponView[], fallbackCouponNos?: string[]) {
  const couponLinks = buildCouponViewLinks(coupons);
  return couponLinks.length ? couponLinks : buildCouponLinks(fallbackCouponNos);
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

function filterRejectedCoupons(
  coupons: BffOrderRejectedCoupon[] | undefined,
  statuses: string[],
  matched: boolean,
) {
  const statusSet = new Set(statuses.map(normalizeRejectedStatus));
  return (coupons || []).filter((coupon) => {
    const status = normalizeRejectedStatus(coupon.status);
    const hasMatchedStatus = statusSet.has(status);
    return matched ? hasMatchedStatus : !hasMatchedStatus;
  });
}

function formatRejectedCoupons(coupons: BffOrderRejectedCoupon[]) {
  return Array.from(new Set(
    coupons.map(resolveRejectedCouponText).filter(Boolean),
  )).join('；');
}

function buildRejectedCouponLinks(coupons: BffOrderRejectedCoupon[]) {
  return compactCouponLinks(coupons.map(buildRejectedCouponLink));
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
  const ineffectiveCoupons = filterRejectedCoupons(order.rejectedCoupons, ['pendingReview', 'notReturned'], false);
  const pendingReviewCoupons = filterRejectedCoupons(order.rejectedCoupons, ['pendingReview'], true);
  const notReturnedCoupons = filterRejectedCoupons(order.rejectedCoupons, ['notReturned'], true);

  return compactCouponFields([
    mapCouponField('下单选择', formatCouponFieldValue(order.selectedCoupons, order.selectedCouponNos), buildCouponFieldLinks(order.selectedCoupons, order.selectedCouponNos)),
    mapCouponField('实际使用', formatCouponFieldValue(order.appliedCoupons, order.appliedCouponNos), buildCouponFieldLinks(order.appliedCoupons, order.appliedCouponNos)),
    mapCouponField('锁定中', formatCouponFieldValue(order.lockedCoupons, order.lockedCouponNos), buildCouponFieldLinks(order.lockedCoupons, order.lockedCouponNos)),
    mapCouponField('未生效', formatRejectedCoupons(ineffectiveCoupons), buildRejectedCouponLinks(ineffectiveCoupons)),
    mapCouponField('退款待审核', formatRejectedCoupons(pendingReviewCoupons), buildRejectedCouponLinks(pendingReviewCoupons)),
    mapCouponField('退款未返还', formatRejectedCoupons(notReturnedCoupons), buildRejectedCouponLinks(notReturnedCoupons)),
    mapCouponField('已释放', formatCouponFieldValue(order.releasedCoupons, order.releasedCouponNos), buildCouponFieldLinks(order.releasedCoupons, order.releasedCouponNos)),
    mapCouponField('退款返还', formatCouponFieldValue(order.refundReturnedCoupons, order.refundReturnedCouponNos), buildCouponFieldLinks(order.refundReturnedCoupons, order.refundReturnedCouponNos)),
  ]);
}
