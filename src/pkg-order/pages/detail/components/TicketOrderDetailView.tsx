import { Canvas, RichText, Swiper, SwiperItem, Text, View } from '@tarojs/components';
import { AppImage } from '@/core/components/AppImage';
import { AppIcon } from '@/core/components/AppIcon';
import { copyWechatText } from '@/core/utils/wechat-actions';
import { useState } from 'react';
import {
  ContactCard,
  SceneActionBar,
  SharedTail,
  StatusCard,
} from './order-detail-sections';
import type {
  OrderDetailSceneViewProps,
  OrderTicketDetailPopupData,
  TicketQrRenderOptions,
} from './order-detail-scene-types';
import './TicketOrderDetailView.scss';

type TicketDetailMode = 'icon' | 'preview';

function resolveTicketTotalText(quantityText: string) {
  const countText = quantityText.replace(/^x/, '');
  return countText ? `共 ${countText} 张` : '';
}

function splitTicketDetailField(fields: OrderDetailSceneViewProps['detailData']['productFields']) {
  const normalFields = fields.filter((field) => field.label !== '详情');
  const detailField = fields.find((field) => field.label === '详情');

  return { normalFields, detailField };
}

function stripTicketDetailText(content: string) {
  return content
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function TicketDetailFieldRow({ content, mode, rich, onPress }: {
  content: string;
  mode: TicketDetailMode;
  rich?: boolean;
  onPress: () => void;
}) {
  if (!content) return null;

  if (mode === 'icon') {
    const previewText = rich ? stripTicketDetailText(content) : content;

    return (
      <View className="_pg-ticket-field _pg-ticket-field--detail-action" onClick={onPress}>
        <Text className="_pg-ticket-field_label">详情</Text>
        <View className="_pg-ticket-field_detail-action-value">
          <Text className="_pg-ticket-field_value _pg-ticket-field_value--detail-action">{previewText}</Text>
        </View>
        <Text className="_pg-ticket-field_more _pg-ticket-field_more--inline">更多</Text>
      </View>
    );
  }

  return (
    <View className="_pg-ticket-field _pg-ticket-field--detail-preview">
      <Text className="_pg-ticket-field_label">详情</Text>
      <View className="_pg-ticket-field_value-wrap _pg-ticket-field_value-wrap--preview">
        {rich ? (
          <View className="_pg-ticket-field_rich-preview">
            <RichText className="_pg-ticket-field_rich-content" nodes={content} />
          </View>
        ) : (
          <Text className="_pg-ticket-field_value _pg-ticket-field_value--preview">{content}</Text>
        )}
        <Text className="_pg-ticket-field_more" onClick={onPress}>更多</Text>
      </View>
    </View>
  );
}

function TicketFieldRows({ fields, detailContent, detailMode, detailRich, onDetailPress }: {
  fields: OrderDetailSceneViewProps['detailData']['productFields'];
  detailContent?: string;
  detailMode?: TicketDetailMode;
  detailRich?: boolean;
  onDetailPress?: (detail: OrderTicketDetailPopupData) => void;
}) {
  const { normalFields } = splitTicketDetailField(fields);
  const resolvedDetailContent = detailContent || '';
  if (!normalFields.length && !resolvedDetailContent) return null;

  function handleDetailPress() {
    if (!resolvedDetailContent) return;
    onDetailPress?.({
      title: '详情',
      content: resolvedDetailContent,
      rich: detailRich,
    });
  }

  return (
    <View className="_pg-ticket-fields">
      {normalFields.map((field) => (
        <View className="_pg-ticket-field" key={`${field.label}-${field.value}`}>
          <Text className="_pg-ticket-field_label">{field.label}</Text>
          <View className="_pg-ticket-field_value-wrap">
            <Text className="_pg-ticket-field_value">{field.value}</Text>
            {field.copyValue ? (
              <View
                className="_pg-ticket-field_copy"
                onClick={() => {
                  void copyWechatText(field.copyValue || '', '已复制');
                }}
              >
                <AppIcon name="copy" size={14} color="#98a2b3" />
              </View>
            ) : null}
          </View>
        </View>
      ))}
      {detailMode && resolvedDetailContent ? (
        <TicketDetailFieldRow
          content={resolvedDetailContent}
          mode={detailMode}
          rich={detailRich}
          onPress={handleDetailPress}
        />
      ) : null}
    </View>
  );
}

function mergeTicketFieldRows(
  primaryFields: OrderDetailSceneViewProps['detailData']['productFields'] | undefined,
  fallbackFields: OrderDetailSceneViewProps['detailData']['productFields'],
) {
  const fieldMap = new Map<string, OrderDetailSceneViewProps['detailData']['productFields'][number]>();

  primaryFields?.forEach((field) => {
    if (field.value && !fieldMap.has(field.label)) {
      fieldMap.set(field.label, field);
    }
  });

  fallbackFields.forEach((field) => {
    if (field.value && !fieldMap.has(field.label)) {
      fieldMap.set(field.label, field);
    }
  });

  return Array.from(fieldMap.values());
}

function resolveTicketGroupStatusText(group: OrderDetailSceneViewProps['detailData']['ticketGroups'][number]) {
  if (group.statusText) return group.statusText;
  const statusTexts = Array.from(new Set(group.vouchers.map((ticket) => ticket.statusText).filter(Boolean)));
  return statusTexts.length === 1 ? statusTexts[0] : '';
}

function resolveTicketGroupStatusClassName(statusText: string) {
  const tone = statusText.includes('核销') || statusText.includes('作废') || statusText.includes('退款') || statusText.includes('过期')
    ? 'neutral'
    : 'available';
  return `_pg-ticket-group_status _pg-ticket-group_status--${tone}`;
}

function resolveTicketPanelMetaText(
  group: OrderDetailSceneViewProps['detailData']['ticketGroups'][number],
  ticket?: OrderDetailSceneViewProps['detailData']['ticketInstances'][number],
) {
  if (ticket) return '';
  const visitDate = group.entryFields.find((field) => field.label === '使用日期')?.value || '';
  return [visitDate, group.quantityText].filter(Boolean).join(' · ');
}

function isDisabledTicket(ticket: OrderDetailSceneViewProps['detailData']['ticketInstances'][number]) {
  return ticket.statusText.includes('核销')
    || ticket.statusText.includes('作废')
    || ticket.statusText.includes('退款')
    || ticket.statusText.includes('过期');
}

function resolveTicketFieldValue(
  fields: OrderDetailSceneViewProps['detailData']['productFields'],
  labels: string[],
) {
  return fields.find((field) => labels.includes(field.label))?.value || '';
}

function resolveTicketUseCountText(ticket: OrderDetailSceneViewProps['detailData']['ticketInstances'][number]) {
  if (typeof ticket.totalNum === 'number') {
    return `共 ${ticket.totalNum} 张${typeof ticket.usedNum === 'number' ? `，已用 ${ticket.usedNum} 张` : ''}`;
  }

  return resolveTicketFieldValue(ticket.fields, ['次数']) || ticket.useTimesText;
}

function resolveTicketCodeText(ticket: OrderDetailSceneViewProps['detailData']['ticketInstances'][number]) {
  return resolveTicketFieldValue(ticket.fields, ['票码']) || ticket.ticketNo;
}

function TicketVoucherContent({ ticket, ticketQr, index, entryFields, detailContent, detailRich, onDetailPress }: {
  ticket: OrderDetailSceneViewProps['detailData']['ticketInstances'][number];
  ticketQr: TicketQrRenderOptions;
  index: number;
  entryFields: OrderDetailSceneViewProps['detailData']['productFields'];
  detailContent?: string;
  detailRich?: boolean;
  onDetailPress?: (detail: OrderTicketDetailPopupData) => void;
}) {
  const localQrImageSrc = ticketQr.getLocalImageSrc(ticket, index);
  const qrImageSrc = ticket.qrImageSrc || localQrImageSrc;
  const ticketCode = resolveTicketCodeText(ticket);
  const useTimesText = resolveTicketUseCountText(ticket);
  const disabled = isDisabledTicket(ticket);

  return (
    <>
      {(ticket.statusText || useTimesText) ? (
        <View className="_pg-ticket-voucher_state-row">
          {ticket.statusText ? <Text className={resolveTicketGroupStatusClassName(ticket.statusText)}>{ticket.statusText}</Text> : null}
          {useTimesText ? <Text className="_pg-ticket-voucher_count">{useTimesText}</Text> : null}
        </View>
      ) : null}
      {qrImageSrc ? (
        <View className={`_pg-ticket-voucher_qr-wrap ${disabled ? '_pg-ticket-voucher_qr-wrap--disabled' : ''}`}>
          <AppImage
            className="_pg-ticket-voucher_qr"
            src={qrImageSrc}
            mode="aspectFit"
            emptyState="error"
          />
        </View>
      ) : null}
      {ticketCode ? (
        <View className="_pg-ticket-voucher_code-row">
          <Text className="_pg-ticket-voucher_code">{ticketCode}</Text>
          <View
            className="_pg-ticket-voucher_code-copy"
            onClick={() => {
              void copyWechatText(ticketCode, '已复制');
            }}
          >
            <AppIcon name="copy" size={14} color="#98a2b3" />
          </View>
        </View>
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
      <TicketFieldRows
        fields={entryFields}
        detailContent={detailContent}
        detailMode="icon"
        detailRich={detailRich}
        onDetailPress={onDetailPress}
      />
    </>
  );
}

type TicketPanelData = {
  id: string;
  group: OrderDetailSceneViewProps['detailData']['ticketGroups'][number];
  ticket?: OrderDetailSceneViewProps['detailData']['ticketInstances'][number];
};

function resolveTicketPanels(detailData: OrderDetailSceneViewProps['detailData']): TicketPanelData[] {
  return detailData.ticketGroups.flatMap((group) => {
    if (!group.vouchers.length) return [{ id: group.id, group }];
    return group.vouchers.map((ticket) => ({
      id: `${group.id}-${ticket.id}`,
      group,
      ticket,
    }));
  });
}

function TicketGroupPanel({ group, ticket, detailData, ticketQr, onDetailPress, onSceneAction }: {
  group: OrderDetailSceneViewProps['detailData']['ticketGroups'][number];
  ticket?: OrderDetailSceneViewProps['detailData']['ticketInstances'][number];
  detailData: OrderDetailSceneViewProps['detailData'];
  ticketQr: TicketQrRenderOptions;
  onDetailPress?: (detail: OrderTicketDetailPopupData) => void;
  onSceneAction: OrderDetailSceneViewProps['onSceneAction'];
}) {
  const statusText = ticket?.statusText || resolveTicketGroupStatusText(group);
  const metaText = resolveTicketPanelMetaText(group, ticket);
  const entryFields = ticket ? mergeTicketFieldRows(ticket.entryFields, group.entryFields) : group.entryFields;
  const ticketUsageInstructionHtml = ticket?.usageInstructionHtml || '';
  const groupUsageInstructionHtml = group.usageInstructionHtml || '';
  const detailContent = ticket
    ? ticketUsageInstructionHtml || groupUsageInstructionHtml
    : groupUsageInstructionHtml;
  const detailRich = Boolean(detailContent);
  const groupAction = group.action;

  return (
    <View className="_pg-ticket-slide-card">
      <View className="_pg-ticket-group_header">
        <View className="_pg-ticket-group_title-wrap">
          <View className="_pg-ticket-group_title-box">
            <View className="_pg-ticket-group_title-row">
              <Text className="_pg-ticket-group_title">{group.title}</Text>
              {ticket ? <Text className="_pg-ticket-group_title-quantity">x1</Text> : null}
            </View>
            {metaText ? <Text className="_pg-ticket-group_subtitle">{metaText}</Text> : null}
          </View>
        </View>
        {!ticket && statusText ? <Text className={resolveTicketGroupStatusClassName(statusText)}>{statusText}</Text> : null}
      </View>
      {ticket ? (
        <View className="_pg-ticket-voucher">
          <TicketVoucherContent
            detailContent={detailContent}
            detailRich={detailRich}
            entryFields={entryFields}
            index={Math.max(detailData.ticketInstances.findIndex((item) => item.id === ticket.id), 0)}
            onDetailPress={onDetailPress}
            ticket={ticket}
            ticketQr={ticketQr}
          />
        </View>
      ) : (
        <View className="_pg-ticket-voucher _pg-ticket-voucher--usage">
          <TicketFieldRows
            fields={entryFields}
            detailContent={detailContent}
            detailMode="preview"
            detailRich={detailRich}
            onDetailPress={onDetailPress}
          />
        </View>
      )}
      {groupAction ? (
        <View
          className="_pg-ticket-group_card-action"
          onClick={() => onSceneAction(groupAction)}
        >
          <Text className="_pg-ticket-group_card-action-text">{groupAction.text}</Text>
          <AppIcon name="arrowRight" size={14} color="#667085" />
        </View>
      ) : null}
    </View>
  );
}

// 票务详情主体由票务页自己维护，避免一票一码和无凭证富文本被通用订单卡片吞掉。
function TicketInfoCard({ detailData, ticketQr, onTicketDetailPress, onSceneAction }: {
  detailData: OrderDetailSceneViewProps['detailData'];
  ticketQr: TicketQrRenderOptions;
  onTicketDetailPress?: (detail: OrderTicketDetailPopupData) => void;
  onSceneAction: OrderDetailSceneViewProps['onSceneAction'];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  if (!detailData.ticketGroups.length) return null;
  const ticketPanels = resolveTicketPanels(detailData);
  const multipleTickets = ticketPanels.length > 1;

  return (
    <View className="_pg-card _pg-ticket-detail-card">
      <View className="_pg-ticket-detail-card_header">
        <Text className="_pg-card_section-title">门票信息</Text>
        {multipleTickets ? (
          <View className="_pg-ticket-detail-card_hint">
            <Text className="_pg-ticket-detail-card_count">{resolveTicketTotalText(detailData.quantityText)} 左右滑动</Text>
            <AppIcon name="arrowRight" size={12} color="#98a2b3" />
          </View>
        ) : detailData.quantityText ? (
          <Text className="_pg-ticket-detail-card_count">{resolveTicketTotalText(detailData.quantityText)}</Text>
        ) : null}
      </View>
      {multipleTickets ? (
        <>
          <Swiper
            className="_pg-ticket-swiper"
            current={activeIndex}
            duration={240}
            nextMargin="120rpx"
            snapToEdge
            onChange={(event) => {
              setActiveIndex(event.detail.current);
            }}
          >
            {ticketPanels.map((panel, index) => (
              <SwiperItem
                className={[
                  '_pg-ticket-swiper_item',
                  index === 0 ? '_pg-ticket-swiper_item--first' : '',
                  index === ticketPanels.length - 1 ? '_pg-ticket-swiper_item--last' : '',
                ].filter(Boolean).join(' ')}
                key={panel.id}
              >
                <TicketGroupPanel
                  detailData={detailData}
                  group={panel.group}
                  onDetailPress={onTicketDetailPress}
                  onSceneAction={onSceneAction}
                  ticket={panel.ticket}
                  ticketQr={ticketQr}
                />
              </SwiperItem>
            ))}
          </Swiper>
          <View className="_pg-ticket-swiper_dots">
            {ticketPanels.map((panel, index) => (
              <View
                className={`_pg-ticket-swiper_dot ${index === activeIndex ? '_pg-ticket-swiper_dot--active' : ''}`}
                key={panel.id}
              />
            ))}
          </View>
        </>
      ) : (
        <View className="_pg-ticket-single">
          <TicketGroupPanel
            detailData={detailData}
            group={ticketPanels[0].group}
            onDetailPress={onTicketDetailPress}
            onSceneAction={onSceneAction}
            ticket={ticketPanels[0].ticket}
            ticketQr={ticketQr}
          />
        </View>
      )}
    </View>
  );
}

// 票务订单详情独立视图：优先展示入园凭证和核销相关信息。
export function TicketOrderDetailView(props: OrderDetailSceneViewProps) {
  const { detailData, ticketQr, onCouponPress, onPrimaryAction, onSceneAction, onTicketDetailPress, onViewAftersale } = props;

  return (
    <>
      <StatusCard detailData={detailData} sceneVariant="ticket" />
      <TicketInfoCard
        detailData={detailData}
        onSceneAction={onSceneAction}
        onTicketDetailPress={onTicketDetailPress}
        ticketQr={ticketQr}
      />
      <ContactCard detailData={detailData} title="出游人信息" />
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
