import type { BffOrderUnifiedRequest } from '@/core/services/bff-order-api';
import { buildSelectedCouponNos } from '@/core/services/checkout-flow';
import type {
  SubmitTicketOrderDraftPayload,
  TicketOrderDraft,
  TicketOrderDraftProduct,
} from './order-draft';

// 归一化票务 SKU 编号，兼容购票菜单同步到票务商品后的标准票种编号。
function resolveTicketSkuId(product: TicketOrderDraftProduct) {
  const productCode = product.productCode || product.id;
  return product.skuId || `${productCode}_standard`;
}

// 生成门票统一订单请求，票种、实名游客和游玩日期由票务 adapter 独立承接。
export function buildTicketCheckoutOrderRequest(
  draft: TicketOrderDraft,
  payload: SubmitTicketOrderDraftPayload,
): BffOrderUnifiedRequest {
  const certificateNo = payload.travelers.find((traveler) => Boolean(traveler.idCard))?.idCard || payload.contact.idCard;
  const travelerSummary = payload.travelers
    .map((traveler) => `${traveler.name}/${traveler.idCard}/${traveler.productId}`)
    .join(';');

  return {
    sceneType: 'TICKET',
    channel: 'MINI_PROGRAM',
    paymentChannel: 'WECHAT',
    selectedCouponNos: buildSelectedCouponNos(payload.selectedCouponId),
    contactName: payload.contact.name,
    contactPhone: payload.contact.mobile,
    context: {
      visitDate: payload.selectedDate,
      parkName: draft.parkName,
      certificateNo,
      travelerSummary,
    },
    items: draft.products.map((product, index) => ({
      lineNo: String(index + 1),
      itemId: product.productCode || product.id,
      skuId: resolveTicketSkuId(product),
      itemType: product.category === 'annualCard' ? 'TICKET_CARD' : 'TICKET_PRODUCT',
      quantity: product.quantity,
      attributes: {
        visitDate: payload.selectedDate,
        productCode: product.productCode || product.id,
        productTitle: product.title,
        skuId: resolveTicketSkuId(product),
        skuName: product.skuName || '',
        travelers: JSON.stringify(payload.travelers.filter((traveler) => traveler.productId === product.id)),
        travelerIds: payload.travelers
          .filter((traveler) => traveler.productId === product.id)
          .map((traveler) => traveler.idCard)
          .join(','),
      },
    })),
  };
}
