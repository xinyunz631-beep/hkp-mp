import type { CSSProperties } from 'react';
import type { OrderDetailData } from '@/pkg-order/services/detail';

export type OrderSceneVariant = 'ticket' | 'mall' | 'hotel' | 'default';

export interface TicketQrRenderOptions {
  canvasStyle: CSSProperties;
  getCanvasId: (index: number) => string;
  getLocalImageSrc: (ticket: OrderDetailData['ticketInstances'][number], index: number) => string | undefined;
  getQrKey: (ticket: OrderDetailData['ticketInstances'][number], index: number) => string;
}

export interface OrderDetailSceneViewProps {
  detailData: OrderDetailData;
  ticketQr: TicketQrRenderOptions;
  onCouponPress: (couponNo: string) => void;
  onPrimaryAction: () => void;
  onSceneAction: (route: string) => void;
  onViewAftersale: () => void;
}

// 按后端订单业态选择详情模板，未知类型继续走通用模板兜底。
export function resolveSceneVariant(sceneType?: string): OrderSceneVariant {
  const normalizedSceneType = String(sceneType || '').toUpperCase();
  if (normalizedSceneType === 'TICKET') return 'ticket';
  if (normalizedSceneType === 'MALL') return 'mall';
  if (normalizedSceneType === 'HOTEL') return 'hotel';
  return 'default';
}
