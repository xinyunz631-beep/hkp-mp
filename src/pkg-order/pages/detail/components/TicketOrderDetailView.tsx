import { Canvas, Text, View } from '@tarojs/components';
import { AppImage } from '@/core/components/AppImage';
import {
  ContactCard,
  FulfillmentCard,
  ProductCard,
  SceneActionBar,
  SharedTail,
  StatusCard,
} from './order-detail-sections';
import type {
  OrderDetailSceneViewProps,
  TicketQrRenderOptions,
} from './order-detail-scene-types';
import './TicketOrderDetailView.scss';

// 票务券码卡片由票务详情自己维护，避免核销 UI 被公共订单详情吞掉。
function TicketVoucherCard({ detailData, ticketQr }: {
  detailData: OrderDetailSceneViewProps['detailData'];
  ticketQr: TicketQrRenderOptions;
}) {
  if (!detailData.ticketInstances.length) return null;

  return (
    <View className="_pg-card _pg-ticket-voucher-card">
      <Text className="_pg-card_section-title">入园凭证</Text>
      {detailData.ticketInstances.map((ticket, index) => {
        const localQrImageSrc = ticketQr.getLocalImageSrc(ticket, index);
        const qrImageSrc = ticket.qrImageSrc || localQrImageSrc;

        return (
          <View className="_pg-ticket-code" key={ticketQr.getQrKey(ticket, index)}>
            <View className="_pg-ticket-code_header">
              <Text className="_pg-ticket-code_title">{ticket.productName}</Text>
              <Text className="_pg-ticket-code_status">{ticket.statusText}</Text>
            </View>
            {qrImageSrc ? (
              <AppImage className="_pg-ticket-code_qr" src={qrImageSrc} mode="aspectFit" emptyState="error" />
            ) : null}
            {!ticket.qrImageSrc && ticket.qrCodePayload ? (
              <View className="_pg-ticket-code_canvas-host" style={ticketQr.canvasStyle}>
                <Canvas
                  canvasId={ticketQr.getCanvasId(index)}
                  className="_pg-ticket-code_canvas"
                  style={ticketQr.canvasStyle}
                />
              </View>
            ) : null}
            {ticket.qrCodePayload ? (
              <Text className="_pg-ticket-code_payload">{ticket.qrCodePayload}</Text>
            ) : null}
            {ticket.ticketNo ? (
              <View className="_pg-line-row">
                <Text className="_pg-line-row_label">票码</Text>
                <Text className="_pg-line-row_value">{ticket.ticketNo}</Text>
              </View>
            ) : null}
            {ticket.skuName ? (
              <View className="_pg-line-row">
                <Text className="_pg-line-row_label">票种</Text>
                <Text className="_pg-line-row_value">{ticket.skuName}</Text>
              </View>
            ) : null}
            {ticket.visitDate ? (
              <View className="_pg-line-row">
                <Text className="_pg-line-row_label">游玩日期</Text>
                <Text className="_pg-line-row_value">{ticket.visitDate}</Text>
              </View>
            ) : null}
            {ticket.validTimeText ? (
              <View className="_pg-line-row">
                <Text className="_pg-line-row_label">有效期</Text>
                <Text className="_pg-line-row_value">{ticket.validTimeText}</Text>
              </View>
            ) : null}
            {ticket.useTimesText ? (
              <View className="_pg-line-row">
                <Text className="_pg-line-row_label">次数</Text>
                <Text className="_pg-line-row_value">{ticket.useTimesText}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

// 票务订单详情独立视图：优先展示券码和核销相关信息。
export function TicketOrderDetailView(props: OrderDetailSceneViewProps) {
  const { detailData, ticketQr, onCouponPress, onPrimaryAction, onSceneAction, onViewAftersale } = props;

  return (
    <>
      <StatusCard detailData={detailData} sceneVariant="ticket" />
      <TicketVoucherCard detailData={detailData} ticketQr={ticketQr} />
      <ProductCard detailData={detailData} title="门票信息" />
      <FulfillmentCard detailData={detailData} title="使用信息" />
      <ContactCard detailData={detailData} title="取票信息" />
      <SceneActionBar detailData={detailData} onSceneAction={onSceneAction} />
      <SharedTail
        detailData={detailData}
        onCouponPress={onCouponPress}
        onPrimaryAction={onPrimaryAction}
        onViewAftersale={onViewAftersale}
      />
    </>
  );
}
