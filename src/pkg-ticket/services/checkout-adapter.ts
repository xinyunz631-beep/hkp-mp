import type { BffOrderUnifiedRequest } from '@/core/services/bff-order-api';
import { buildSelectedCouponNos } from '@/core/services/checkout-flow';
import { sanitizeMallRuntimeUrl } from '@/core/utils/mall-runtime';
import type {
  SubmitTicketOrderDraftPayload,
  TicketOrderDraft,
  TicketOrderDraftProduct,
} from './order-draft';
import { isTicketDraftProductIdentityRequired, isTicketOrderIdentityRequired } from './order-draft';

// 归一化票务 SKU 编号，兼容购票菜单同步到票务商品后的标准票种编号。
function resolveTicketSkuId(product: TicketOrderDraftProduct) {
  const productCode = product.productCode || product.id;
  return product.skuId || `${productCode}_standard`;
}

// 仅实名票种向后端提交游客快照，快速通等免实名票种传空数组。
function stringifyTicketTravelers(product: TicketOrderDraftProduct, payload: SubmitTicketOrderDraftPayload) {
  if (!isTicketDraftProductIdentityRequired(product)) return '[]';

  return JSON.stringify(payload.travelers);
}

// 仅实名票种提交证件号索引，避免快速通订单携带无关身份信息。
function joinTicketTravelerIds(product: TicketOrderDraftProduct, payload: SubmitTicketOrderDraftPayload) {
  if (!isTicketDraftProductIdentityRequired(product)) return '';

  return payload.travelers
    .map((traveler) => traveler.idCard)
    .filter(Boolean)
    .join(',');
}

// 构建票务订单上下文，实名字段只在当前订单确实需要校验时写入。
function buildTicketOrderContext(
  draft: TicketOrderDraft,
  payload: SubmitTicketOrderDraftPayload,
  identityRequired: boolean,
) {
  const context: Record<string, string> = {
    visitDate: payload.selectedDate,
    parkName: draft.parkName,
    identityRequired: identityRequired ? 'true' : 'false',
  };

  if (identityRequired) {
    const certificateNo = payload.travelers.find((traveler) => Boolean(traveler.idCard))?.idCard || payload.contact.idCard;
    const travelerSummary = payload.travelers
      .map((traveler) => `${traveler.name}/${traveler.idCard}/${traveler.productId}`)
      .join(';');

    if (certificateNo) context.certificateNo = certificateNo;
    if (travelerSummary) context.travelerSummary = travelerSummary;
  }

  return context;
}

// 生成门票统一订单请求，票种、实名游客和游玩日期由票务 adapter 独立承接。
export function buildTicketCheckoutOrderRequest(
  draft: TicketOrderDraft,
  payload: SubmitTicketOrderDraftPayload,
): BffOrderUnifiedRequest {
  const identityRequired = isTicketOrderIdentityRequired(draft.products);

  return {
    sceneType: 'TICKET',
    channel: 'MINI_PROGRAM',
    paymentChannel: 'WECHAT',
    selectedCouponNos: buildSelectedCouponNos(payload.selectedCouponId),
    contactName: identityRequired ? payload.contact.name : undefined,
    contactPhone: identityRequired ? payload.contact.mobile : undefined,
    context: buildTicketOrderContext(draft, payload, identityRequired),
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
        imageUrl: sanitizeMallRuntimeUrl(product.imageSrc, { allowMockImage: true }),
        skuId: resolveTicketSkuId(product),
        skuName: product.skuName || '',
        fulfillmentType: product.fulfillmentType || '',
        realNameRequired: isTicketDraftProductIdentityRequired(product) ? 'true' : 'false',
        requiredFields: JSON.stringify(product.requiredFields || []),
        verificationMethods: JSON.stringify(product.verificationMethods || (product.verificationMethod ? [product.verificationMethod] : [])),
        entryMethods: JSON.stringify(product.entryMethods || []),
        usageInstructionHtml: product.usageInstructionHtml || '',
        travelers: stringifyTicketTravelers(product, payload),
        travelerIds: joinTicketTravelerIds(product, payload),
      },
    })),
  };
}
