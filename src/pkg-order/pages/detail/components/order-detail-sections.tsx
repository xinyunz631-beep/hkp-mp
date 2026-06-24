import { Text, View } from '@tarojs/components';
import type { OrderDetailData } from '@/pkg-order/services/detail';
import type {
  OrderDetailSceneViewProps,
  OrderSceneVariant,
} from './order-detail-scene-types';
import { formatOrderClockTime } from '@/pkg-order/services/time';

// 解析支付截止时间，后端没有稳定时间时保留产品默认文案。
function formatPayExpireAt(payExpireAt?: string) {
  const clockText = formatOrderClockTime(payExpireAt);
  return clockText ? `${clockText}前` : '30分钟内';
}

// 根据主动作切换金额标题，避免待支付订单误显示实付。
function resolveAmountLabel(detailData: OrderDetailData) {
  return detailData.primaryActionType === 'pay' ? '待支付金额' : '实付金额';
}

// 统一底部操作样式，后续每个业态可只调整布局而不重复按钮规则。
function resolveOrderFooterActionClassName(type: 'primary' | 'ghost' = 'primary') {
  return [
    '_pg-footer-action',
    type === 'ghost' ? '_pg-footer-action--ghost' : '',
  ].filter(Boolean).join(' ');
}

// 渲染订单状态和金额主卡片，所有业态共享但支持主题化。
export function StatusCard({ detailData, sceneVariant }: {
  detailData: OrderDetailData;
  sceneVariant: OrderSceneVariant;
}) {
  return (
    <View className={`_pg-status-card _pg-status-card--${sceneVariant}`}>
      <Text className="_pg-status-card_title">{detailData.statusText}</Text>
      {detailData.primaryActionType === 'pay' ? (
        <Text className="_pg-status-card_deadline">请在{formatPayExpireAt(detailData.payExpireAt)}完成支付，超时订单将自动关闭</Text>
      ) : null}
      <View className="_pg-status-card_amount">
        <Text className="_pg-status-card_label">{resolveAmountLabel(detailData)}</Text>
        <Text className="_pg-status-card_value">{detailData.paidAmountText}</Text>
      </View>
    </View>
  );
}

// 渲染一组普通字段行，保证不同业务卡片复用同一行间距。
function FieldRows({ fields }: { fields: OrderDetailData['productFields'] }) {
  return (
    <>
      {fields.map((item) => (
        <View className="_pg-line-row" key={item.label}>
          <Text className="_pg-line-row_label">{item.label}</Text>
          <Text className="_pg-line-row_value">{item.value}</Text>
        </View>
      ))}
    </>
  );
}

// 渲染订单商品摘要，业态标题由模板决定。
export function ProductCard({ detailData, title }: { detailData: OrderDetailData; title: string }) {
  return (
    <View className="_pg-card _pg-product-card">
      <Text className="_pg-card_section-title">{title}</Text>
      <View className="_pg-card_header">
        <Text className="_pg-card_title">{detailData.title}</Text>
        {detailData.quantityText ? <Text className="_pg-card_quantity">{detailData.quantityText}</Text> : null}
      </View>
      <FieldRows fields={detailData.productFields} />
    </View>
  );
}

// 渲染履约信息，不同业态用不同标题承接字段。
export function FulfillmentCard({ detailData, title }: { detailData: OrderDetailData; title: string }) {
  if (!detailData.fulfillmentFields.length) return null;

  return (
    <View className="_pg-card _pg-fulfillment-card">
      <Text className="_pg-card_section-title">{title}</Text>
      <FieldRows fields={detailData.fulfillmentFields} />
    </View>
  );
}

// 渲染联系人、收货或入住人信息。
export function ContactCard({ detailData, title }: { detailData: OrderDetailData; title: string }) {
  if (!detailData.contactFields.length) return null;

  return (
    <View className="_pg-card _pg-contact-card">
      <Text className="_pg-card_section-title">{title}</Text>
      <FieldRows fields={detailData.contactFields} />
    </View>
  );
}

// 渲染业态专属动作，例如商城物流和评价入口。
export function SceneActionBar({ detailData, onSceneAction }: {
  detailData: OrderDetailData;
  onSceneAction: OrderDetailSceneViewProps['onSceneAction'];
}) {
  if (!detailData.sceneActions.length) return null;

  return (
    <View className="_pg-scene-actions">
      {detailData.sceneActions.map((action) => (
        <View
          className={[
            '_pg-scene-actions_button',
            action.tone === 'primary' ? '_pg-scene-actions_button--primary' : '',
          ].filter(Boolean).join(' ')}
          key={`${action.text}-${action.actionType || action.route || 'action'}`}
          onClick={() => onSceneAction(action)}
        >
          {action.text}
        </View>
      ))}
    </View>
  );
}

// 渲染优惠字段，并保留券号跳转能力。
function CouponCard({ detailData, onCouponPress }: {
  detailData: OrderDetailData;
  onCouponPress: OrderDetailSceneViewProps['onCouponPress'];
}) {
  if (!detailData.couponFields.length) return null;

  return (
    <View className="_pg-card _pg-coupon-card">
      <Text className="_pg-card_section-title">优惠信息</Text>
      {detailData.couponFields.map((item) => (
        <View className="_pg-line-row" key={item.label}>
          <Text className="_pg-line-row_label">{item.label}</Text>
          <View className="_pg-line-row_content">
            {item.couponLinks?.length ? (
              <View className="_pg-coupon-links">
                {item.couponLinks.map((link) => (
                  <View className="_pg-coupon-links_item" key={`${item.label}-${link.couponNo}-${link.detailText || ''}`}>
                    <View className="_pg-coupon-links_chip" onClick={() => onCouponPress(link.couponNo)}>
                      <Text className="_pg-coupon-links_chip-text">{link.couponNo}</Text>
                    </View>
                    {link.detailText ? <Text className="_pg-coupon-links_desc">{link.detailText}</Text> : null}
                  </View>
                ))}
              </View>
            ) : (
              <Text className="_pg-line-row_value">{item.value}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

// 渲染金额明细，保持账务字段在页面底部统一出现。
function AmountCard({ detailData }: { detailData: OrderDetailData }) {
  return (
    <View className="_pg-card _pg-amount-card">
      <FieldRows fields={detailData.amountFields} />
    </View>
  );
}

// 渲染订单元信息和底部动作，所有业态共享同一套行为。
function OrderMetaCard({ detailData, onPrimaryAction, onViewAftersale }: {
  detailData: OrderDetailData;
  onPrimaryAction: OrderDetailSceneViewProps['onPrimaryAction'];
  onViewAftersale: OrderDetailSceneViewProps['onViewAftersale'];
}) {
  return (
    <View className="_pg-card _pg-card--last _pg-order-meta-card">
      {detailData.orderFields.map((item) => (
        <View className="_pg-order-meta" key={item.label}>
          <Text className="_pg-order-meta_label">{item.label}：</Text>
          <Text className="_pg-order-meta_value">{item.value}</Text>
        </View>
      ))}
      {detailData.refundButtonText || detailData.aftersaleEntryRoute ? (
        <View className="_pg-footer-actions">
          {detailData.aftersaleEntryRoute ? (
            <View
              className={resolveOrderFooterActionClassName('ghost')}
              onClick={onViewAftersale}
            >
              {detailData.aftersaleEntryText}
            </View>
          ) : null}
          {detailData.refundButtonText ? (
            <View
              className={resolveOrderFooterActionClassName()}
              onClick={onPrimaryAction}
            >
              {detailData.refundButtonText}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

interface SharedTailProps {
  detailData: OrderDetailData;
  onCouponPress: OrderDetailSceneViewProps['onCouponPress'];
  onPrimaryAction: OrderDetailSceneViewProps['onPrimaryAction'];
  onViewAftersale: OrderDetailSceneViewProps['onViewAftersale'];
}

// 渲染公共的金额、优惠和元信息尾部区。
export function SharedTail({ detailData, onCouponPress, onPrimaryAction, onViewAftersale }: SharedTailProps) {
  return (
    <>
      <CouponCard detailData={detailData} onCouponPress={onCouponPress} />
      <AmountCard detailData={detailData} />
      <OrderMetaCard
        detailData={detailData}
        onPrimaryAction={onPrimaryAction}
        onViewAftersale={onViewAftersale}
      />
    </>
  );
}
