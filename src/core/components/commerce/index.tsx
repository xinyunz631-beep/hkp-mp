import { ScrollView, Text, View } from '@tarojs/components';
import { Calendar, Checkbox, InputNumber } from '@nutui/nutui-react-taro';
import classNames from 'classnames';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AppBottomSheet } from '@/core/components/AppBottomSheet';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { AppPopup } from '@/core/components/AppPopup';
import { formatCurrency } from '@/core/utils/money';
import type {
  HkpAddressSummary,
  HkpCouponSummary,
  HkpDateOption,
  HkpFilterTab,
  HkpOrderSummary,
  HkpProductSummary,
  HkpSkuGroup,
} from '@/core/types/hkp';
import './index.scss';

interface ProductCardProps {
  product: HkpProductSummary;
  layout?: 'list' | 'grid';
  className?: string;
  actionText?: string;
  onClick?: (product: HkpProductSummary) => void;
  onAction?: (product: HkpProductSummary) => void;
}

interface OrderCardProps {
  order: HkpOrderSummary;
  className?: string;
  onClick?: (order: HkpOrderSummary) => void;
  onPrimaryAction?: (order: HkpOrderSummary) => void;
  onSecondaryAction?: (order: HkpOrderSummary) => void;
}

interface CouponCardProps {
  coupon: HkpCouponSummary;
  className?: string;
  onClick?: (coupon: HkpCouponSummary) => void;
}

interface AddressCardProps {
  address: HkpAddressSummary;
  className?: string;
  selected?: boolean;
  onClick?: (address: HkpAddressSummary) => void;
}

interface FixedSubmitBarProps {
  className?: string;
  label?: ReactNode;
  amount?: number;
  amountText?: ReactNode;
  buttonText: ReactNode;
  disabled?: boolean;
  extra?: ReactNode;
  onSubmit?: () => void;
  onDisabledClick?: () => void;
}

interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  className?: string;
  disabled?: boolean;
  onChange?: (value: number) => void;
}

type DateSelectionMode = 'single' | 'range';
type DateSelectionValue = string | string[];
type DateSelectionRenderNode = ReactNode | ((value: DateSelectionValue) => ReactNode);

interface FilterTabsProps {
  tabs: HkpFilterTab[];
  activeKey: string;
  className?: string;
  onChange?: (key: string) => void;
}

interface StatusListTabsProps extends FilterTabsProps {
  sticky?: boolean;
}

interface SkuPopupProps {
  visible: boolean;
  product: HkpProductSummary;
  skuGroups: HkpSkuGroup[];
  quantity: number;
  totalAmount?: number;
  selectionText?: ReactNode;
  stockText?: ReactNode;
  maxQuantity?: number;
  submitDisabled?: boolean;
  submitText?: ReactNode;
  onClose: () => void;
  onSubmit?: () => void;
  onSelectSku?: (groupId: string, optionId: string) => void;
  onQuantityChange?: (value: number) => void;
}

interface DateRangePanelProps {
  dates: HkpDateOption[];
  activeDate?: string;
  className?: string;
  onSelect?: (date: string) => void;
}

interface DateSelectionPopupProps {
  visible: boolean;
  mode: DateSelectionMode;
  title: string;
  value?: string | string[];
  startDate?: string;
  endDate?: string;
  startText?: ReactNode;
  endText?: ReactNode;
  confirmText?: DateSelectionRenderNode;
  footerSummary?: DateSelectionRenderNode;
  onClose: () => void;
  onConfirm: (value: string | string[]) => void;
}

interface CouponSelectionPopupProps {
  visible: boolean;
  title?: string;
  coupons: HkpCouponSummary[];
  selectedCouponId?: string;
  onClose: () => void;
  onClear?: () => boolean | void | Promise<boolean | void>;
  onSelect: (coupon: HkpCouponSummary) => boolean | void | Promise<boolean | void>;
}

function isDateUnit(value: unknown): value is string | number {
  return typeof value === 'string' || typeof value === 'number';
}

function padDateUnit(value: string | number) {
  return `${value}`.padStart(2, '0');
}

function normalizeDateText(value: string) {
  const match = value.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);

  if (!match) return '';

  return `${match[1]}-${padDateUnit(match[2])}-${padDateUnit(match[3])}`;
}

function normalizeCalendarDate(value: unknown): string {
  if (typeof value === 'string') return normalizeDateText(value);
  if (!Array.isArray(value)) return '';

  const embeddedDate = value.find((item) => typeof item === 'string' && normalizeDateText(item));

  if (typeof embeddedDate === 'string') return normalizeDateText(embeddedDate);

  const [year, month, day] = value;

  if (!isDateUnit(year) || !isDateUnit(month) || !isDateUnit(day)) return '';

  return `${year}-${padDateUnit(month)}-${padDateUnit(day)}`;
}

function normalizeCalendarValue(value: unknown, mode: DateSelectionMode): string | string[] {
  if (mode === 'single') {
    return normalizeCalendarDate(value);
  }

  if (Array.isArray(value)) {
    const dates = value
      .map((item) => normalizeCalendarDate(item))
      .filter(Boolean);

    if (dates.length > 0) return dates;
  }

  const singleDate = normalizeCalendarDate(value);
  return singleDate ? [singleDate] : [];
}

function resolveDateSelectionNode(content: DateSelectionRenderNode | undefined, value: DateSelectionValue) {
  if (typeof content === 'function') return content(value);
  return content;
}

// 渲染提交栏文案，外部传入自定义节点时直接使用调用方样式。
function renderSubmitBarNode(content: ReactNode, className: string) {
  if (typeof content === 'string' || typeof content === 'number') {
    return <Text className={className}>{content}</Text>;
  }

  return content;
}

export function ProductCard({
  product,
  layout = 'list',
  className,
  actionText,
  onClick,
  onAction,
}: ProductCardProps) {
  return (
    <View
      className={classNames('hkp-product-card', `hkp-product-card--${layout}`, className)}
      onClick={() => onClick?.(product)}
    >
      <AppImage
        className="hkp-product-card__image"
        src={product.image.src}
        mode="aspectFill"
        emptyState="error"
      />
      <View className="hkp-product-card__body">
        {product.tag ? <Text className="hkp-product-card__tag">{product.tag}</Text> : null}
        <Text className="hkp-product-card__title">{product.title}</Text>
        {product.subtitle ? <Text className="hkp-product-card__subtitle">{product.subtitle}</Text> : null}
        <View className="hkp-product-card__footer">
          <Text className="hkp-product-card__price">{formatCurrency(product.price)}</Text>
          {product.salesText ? <Text className="hkp-product-card__sales">{product.salesText}</Text> : null}
        </View>
        {actionText ? (
          <View className="hkp-product-card__action" onClick={() => onAction?.(product)}>
            <Text>{actionText}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function OrderCard({
  order,
  className,
  onClick,
  onPrimaryAction,
  onSecondaryAction,
}: OrderCardProps) {
  const firstProduct = order.products[0];
  const summaryCountText = order.countText
    || (firstProduct?.quantity ? `共${firstProduct.quantity}件` : '');

  return (
    <View className={classNames('hkp-order-card', className)} onClick={() => onClick?.(order)}>
      <View className="hkp-order-card__header">
        <Text className="hkp-order-card__merchant">{order.merchantName || 'Hello Kitty Park'}</Text>
        <Text className="hkp-order-card__status">{order.statusText}</Text>
      </View>
      {firstProduct ? (
        <View className="hkp-order-card__product">
          <AppImage
            className="hkp-order-card__image"
            src={firstProduct.image.src}
            mode="aspectFill"
            emptyState="error"
          />
          <View className="hkp-order-card__product-body">
            <Text className="hkp-order-card__title">{firstProduct.title}</Text>
            {firstProduct.skuText ? <Text className="hkp-order-card__sku">{firstProduct.skuText}</Text> : null}
            <View className="hkp-order-card__product-footer">
              <Text className="hkp-order-card__price">{formatCurrency(firstProduct.price)}</Text>
              {firstProduct.quantity ? <Text className="hkp-order-card__quantity">x{firstProduct.quantity}</Text> : null}
            </View>
          </View>
        </View>
      ) : null}
      <View className="hkp-order-card__summary">
        <Text>{summaryCountText}</Text>
        <Text className="hkp-order-card__amount">{formatCurrency(order.totalAmount)}</Text>
      </View>
      {(order.secondaryActionText || order.primaryActionText) ? (
        <View className="hkp-order-card__actions">
          {order.secondaryActionText ? (
            <View className="hkp-order-card__button hkp-order-card__button--ghost" onClick={() => onSecondaryAction?.(order)}>
              <Text>{order.secondaryActionText}</Text>
            </View>
          ) : null}
          {order.primaryActionText ? (
            <View className="hkp-order-card__button" onClick={() => onPrimaryAction?.(order)}>
              <Text>{order.primaryActionText}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function CouponCard({ coupon, className, onClick }: CouponCardProps) {
  return (
    <View
      className={classNames('hkp-coupon-card', `hkp-coupon-card--${coupon.status}`, className)}
      onClick={() => onClick?.(coupon)}
    >
      <View className="hkp-coupon-card__amount">
        <Text>{coupon.amountText}</Text>
      </View>
      <View className="hkp-coupon-card__body">
        <Text className="hkp-coupon-card__title">{coupon.title}</Text>
        <Text className="hkp-coupon-card__threshold">{coupon.thresholdText}</Text>
        <Text className="hkp-coupon-card__validity">{coupon.validityText}</Text>
      </View>
      {coupon.tag ? <Text className="hkp-coupon-card__tag">{coupon.tag}</Text> : null}
    </View>
  );
}

export function AddressCard({ address, className, selected = false, onClick }: AddressCardProps) {
  return (
    <View
      className={classNames('hkp-address-card', selected && 'hkp-address-card--selected', className)}
      onClick={() => onClick?.(address)}
    >
      <View className="hkp-address-card__header">
        <Text className="hkp-address-card__name">{address.name}</Text>
        <Text className="hkp-address-card__mobile">{address.mobile}</Text>
        {address.isDefault ? <Text className="hkp-address-card__tag">默认</Text> : null}
      </View>
      <Text className="hkp-address-card__detail">{address.region}{address.detail}</Text>
    </View>
  );
}

export function FixedSubmitBar({
  className,
  label = '合计',
  amount,
  amountText,
  buttonText,
  disabled = false,
  extra,
  onSubmit,
  onDisabledClick,
}: FixedSubmitBarProps) {
  return (
    <View className={classNames('hkp-submit-bar', className)}>
      <View className="hkp-submit-bar__main">
        <View className="hkp-submit-bar__price-wrap">
          {renderSubmitBarNode(label, 'hkp-submit-bar__label')}
          {renderSubmitBarNode(amountText ?? formatCurrency(amount ?? 0), 'hkp-submit-bar__amount')}
        </View>
        {extra ? <View className="hkp-submit-bar__extra">{extra}</View> : null}
      </View>
      <View
        className={classNames('hkp-submit-bar__button', disabled && 'hkp-submit-bar__button--disabled')}
        onClick={() => {
          if (disabled) {
            onDisabledClick?.();
            return;
          }

          onSubmit?.();
        }}
      >
        <Text>{buttonText}</Text>
      </View>
    </View>
  );
}

export function QuantityStepper({
  value,
  min = 0,
  max = 99,
  className,
  disabled = false,
  onChange,
}: QuantityStepperProps) {
  return (
    <InputNumber
      className={classNames('hkp-stepper', disabled && 'hkp-stepper--disabled', className)}
      value={value}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(nextValue) => {
        const normalizedValue = Number(nextValue);
        if (!Number.isNaN(normalizedValue) && normalizedValue !== value) onChange?.(normalizedValue);
      }}
    />
  );
}

export function FilterTabs({ tabs, activeKey, className, onChange }: FilterTabsProps) {
  return (
    <View className={classNames('hkp-filter-tabs', className)}>
      {tabs.map((tab) => (
        <View
          className={classNames('hkp-filter-tabs__item', activeKey === tab.key && 'hkp-filter-tabs__item--active')}
          key={tab.key}
          onClick={() => onChange?.(tab.key)}
        >
          <Text>{tab.text}</Text>
          {typeof tab.count === 'number' ? <Text className="hkp-filter-tabs__count">{tab.count}</Text> : null}
        </View>
      ))}
    </View>
  );
}

export function StatusListTabs({ tabs, activeKey, sticky = false, className, onChange }: StatusListTabsProps) {
  return (
    <FilterTabs
      className={classNames('hkp-status-tabs', sticky && 'hkp-status-tabs--sticky', className)}
      tabs={tabs}
      activeKey={activeKey}
      onChange={onChange}
    />
  );
}

export function SkuPopup({
  visible,
  product,
  skuGroups,
  quantity,
  totalAmount,
  selectionText,
  stockText,
  maxQuantity = 99,
  submitDisabled = false,
  submitText = '确定',
  onClose,
  onSubmit,
  onSelectSku,
  onQuantityChange,
}: SkuPopupProps) {
  return (
    <AppPopup visible={visible} className="sku-popup" onClose={onClose}>
      <View className="hkp-sku-popup">
        <View className="hkp-sku-popup__summary">
          <AppImage
            className="hkp-sku-popup__image"
            src={product.image.src}
            mode="aspectFill"
            emptyState="error"
          />
          <View className="hkp-sku-popup__summary-body">
            <Text className="hkp-sku-popup__price">{formatCurrency(totalAmount ?? product.price * quantity)}</Text>
            <Text className="hkp-sku-popup__title">{product.title}</Text>
            {selectionText ? <Text className="hkp-sku-popup__selected">{selectionText}</Text> : null}
            {stockText ? <Text className="hkp-sku-popup__stock">{stockText}</Text> : null}
          </View>
          <View className="hkp-sku-popup__close" onClick={onClose}>
            <AppIcon name="close" size={16} color="#667085" />
          </View>
        </View>
        <ScrollView className="hkp-sku-popup__body" scrollY>
          {skuGroups.map((group) => (
            <View className="hkp-sku-popup__group" key={group.id}>
              <Text className="hkp-sku-popup__group-title">{group.title}</Text>
              <View className="hkp-sku-popup__options">
                {group.options.map((option) => (
                  <View
                    className={classNames(
                      'hkp-sku-popup__option',
                      group.selectedId === option.id && 'hkp-sku-popup__option--active',
                      option.disabled && 'hkp-sku-popup__option--disabled',
                    )}
                    key={option.id}
                    onClick={() => {
                      if (!option.disabled) onSelectSku?.(group.id, option.id);
                    }}
                  >
                    <Text>{option.label}</Text>
                    {option.disabledReason ? <Text className="hkp-sku-popup__option-tip">{option.disabledReason}</Text> : null}
                  </View>
                ))}
              </View>
            </View>
          ))}
          <View className="hkp-sku-popup__quantity">
            <Text>数量</Text>
            <QuantityStepper
              value={quantity}
              min={1}
              max={maxQuantity}
              disabled={submitDisabled}
              onChange={onQuantityChange}
            />
          </View>
        </ScrollView>
        <View
          className={classNames('hkp-sku-popup__submit', submitDisabled && 'hkp-sku-popup__submit--disabled')}
          onClick={onSubmit}
        >
          <Text>{submitText}</Text>
        </View>
      </View>
    </AppPopup>
  );
}

export function DateRangePanel({ dates, activeDate, className, onSelect }: DateRangePanelProps) {
  return (
    <View className={classNames('hkp-date-panel', className)}>
      {dates.map((item) => (
        <View
          className={classNames(
            'hkp-date-panel__item',
            activeDate === item.date && 'hkp-date-panel__item--active',
            item.disabled && 'hkp-date-panel__item--disabled',
          )}
          key={item.date}
          onClick={() => {
            if (!item.disabled) onSelect?.(item.date);
          }}
        >
          <Text className="hkp-date-panel__title">{item.title}</Text>
          {item.subtitle ? <Text className="hkp-date-panel__subtitle">{item.subtitle}</Text> : null}
        </View>
      ))}
    </View>
  );
}

export function DateSelectionPopup({
  visible,
  mode,
  title,
  value,
  startDate,
  endDate,
  startText,
  endText,
  confirmText,
  footerSummary,
  onClose,
  onConfirm,
}: DateSelectionPopupProps) {
  const [selectedValue, setSelectedValue] = useState<DateSelectionValue>(() => normalizeCalendarValue(value, mode));
  const calendarValue = typeof value === 'string' ? value : undefined;
  const resolvedConfirmText = resolveDateSelectionNode(confirmText, selectedValue) || '确定';
  const footerSummaryNode = resolveDateSelectionNode(footerSummary, selectedValue);

  useEffect(() => {
    setSelectedValue(normalizeCalendarValue(value, mode));
  }, [mode, value, visible]);

  return (
    <Calendar
      visible={visible}
      popup
      title={title}
      type={mode}
      viewMode="day"
      value={calendarValue}
      defaultValue={value}
      startDate={startDate}
      endDate={endDate}
      firstDayOfWeek={1}
      showToday
      showTitle
      showSubTitle
      startText={startText}
      endText={endText}
      confirmText={resolvedConfirmText}
      onClose={onClose}
      onDayClick={(nextValue) => {
        setSelectedValue(normalizeCalendarValue(nextValue, mode));
      }}
      onConfirm={(nextValue) => {
        const normalizedValue = normalizeCalendarValue(nextValue, mode);
        setSelectedValue(normalizedValue);
        onConfirm(normalizedValue);
      }}
    >
      {footerSummaryNode ? (
        <View className="hkp-date-selection-summary-shell">
          {footerSummaryNode}
        </View>
      ) : null}
    </Calendar>
  );
}

export function CouponSelectionPopup({
  visible,
  title = '选择优惠券',
  coupons,
  selectedCouponId,
  onClose,
  onClear,
  onSelect,
}: CouponSelectionPopupProps) {
  const [draftCouponId, setDraftCouponId] = useState<string | undefined>(selectedCouponId);
  const [couponUpdating, setCouponUpdating] = useState(false);
  const draftCoupon = coupons.find((coupon) => coupon.id === draftCouponId && coupon.status === 'available');
  const selectedCount = draftCoupon ? 1 : 0;
  const selectedDiscount = draftCoupon?.discountAmount ?? 0;
  const selectedDiscountText = selectedDiscount > 0
    ? `优惠 ${formatCurrency(selectedDiscount, { showSymbol: false })}元`
    : (draftCoupon ? '优惠以订单确认为准' : '优惠 0.00元');

  useEffect(() => {
    if (visible) setDraftCouponId(selectedCouponId);
  }, [selectedCouponId, visible]);

  // 选择/取消券时立即走确认单刷新，由后端返回真实优惠金额和可用状态。
  async function handleCouponPress(coupon: HkpCouponSummary) {
    if (coupon.status !== 'available' || couponUpdating) return;

    const previousCouponId = draftCouponId;
    const nextCouponId = draftCouponId === coupon.id ? undefined : coupon.id;
    setDraftCouponId(nextCouponId);
    setCouponUpdating(true);

    try {
      const result = nextCouponId ? await onSelect(coupon) : await onClear?.();
      if (result === false) setDraftCouponId(previousCouponId);
    } catch {
      setDraftCouponId(previousCouponId);
    } finally {
      setCouponUpdating(false);
    }
  }

  // 选券请求已在点击时完成，底部确认只负责收起弹窗。
  function handleConfirm() {
    onClose();
  }

  return (
    <AppBottomSheet
      visible={visible}
      title={title}
      className="coupon-popup"
      contentClassName="hkp-coupon-popup"
      bodyClassName="hkp-coupon-popup__body"
      footerClassName="hkp-coupon-popup__footer"
      bodyMinHeight={300}
      bodyMaxHeight="52vh"
      footer={(
        <View className="hkp-coupon-popup__footer-content">
          <View className="hkp-coupon-popup__summary">
            <View className="hkp-coupon-popup__summary-row">
              <Text className="hkp-coupon-popup__summary-count">已选 {selectedCount} 张</Text>
              <Text className="hkp-coupon-popup__summary-discount">{selectedDiscountText}</Text>
            </View>
            <Text className="hkp-coupon-popup__summary-name">
              {couponUpdating ? '正在更新优惠' : (draftCoupon ? draftCoupon.title : '请选择本次订单可使用的优惠券')}
            </Text>
          </View>
          <View className="hkp-coupon-popup__confirm" onClick={handleConfirm}>
            <Text>确认</Text>
          </View>
        </View>
      )}
      onClose={onClose}
    >
      <View className="hkp-coupon-popup__list">
        {coupons.map((coupon) => (
          <View
            className={classNames(
              'hkp-coupon-popup__item',
              draftCouponId === coupon.id && 'hkp-coupon-popup__item--active',
              coupon.status !== 'available' && 'hkp-coupon-popup__item--disabled',
              couponUpdating && 'hkp-coupon-popup__item--updating',
            )}
            key={coupon.id}
            onClick={() => handleCouponPress(coupon)}
          >
            <CouponCard coupon={coupon} />
            <View
              className="hkp-coupon-popup__checkbox"
              onClick={(event) => {
                event.stopPropagation();
                handleCouponPress(coupon);
              }}
            >
              <Checkbox
                checked={draftCouponId === coupon.id}
                disabled={couponUpdating || coupon.status !== 'available'}
              />
            </View>
          </View>
        ))}
        {coupons.length === 0 ? <Text className="hkp-coupon-popup__empty">暂无可用优惠券</Text> : null}
      </View>
    </AppBottomSheet>
  );
}
