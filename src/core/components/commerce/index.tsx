import { Text, View } from '@tarojs/components';
import { Calendar, InputNumber } from '@nutui/nutui-react-taro';
import classNames from 'classnames';
import type { ReactNode } from 'react';
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
  onClose: () => void;
  onConfirm: (value: string | string[]) => void;
}

interface CouponSelectionPopupProps {
  visible: boolean;
  title?: string;
  coupons: HkpCouponSummary[];
  selectedCouponId?: string;
  onClose: () => void;
  onSelect: (coupon: HkpCouponSummary) => void;
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
              <Text className="hkp-order-card__quantity">x{firstProduct.quantity}</Text>
            </View>
          </View>
        </View>
      ) : null}
      <View className="hkp-order-card__summary">
        <Text>{order.countText || `共${order.products.length}件`}</Text>
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
}: FixedSubmitBarProps) {
  return (
    <View className={classNames('hkp-submit-bar', className)}>
      <View className="hkp-submit-bar__main">
        <View className="hkp-submit-bar__price-wrap">
          <Text className="hkp-submit-bar__label">{label}</Text>
          <Text className="hkp-submit-bar__amount">
            {amountText ?? formatCurrency(amount ?? 0)}
          </Text>
        </View>
        {extra ? <View className="hkp-submit-bar__extra">{extra}</View> : null}
      </View>
      <View
        className={classNames('hkp-submit-bar__button', disabled && 'hkp-submit-bar__button--disabled')}
        onClick={() => {
          if (!disabled) onSubmit?.();
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
  submitText = '确定',
  onClose,
  onSubmit,
  onSelectSku,
  onQuantityChange,
}: SkuPopupProps) {
  return (
    <AppPopup visible={visible} onClose={onClose}>
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
          </View>
          <View className="hkp-sku-popup__close" onClick={onClose}>
            <Text>×</Text>
          </View>
        </View>
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
                </View>
              ))}
            </View>
          </View>
        ))}
        <View className="hkp-sku-popup__quantity">
          <Text>数量</Text>
          <QuantityStepper value={quantity} min={1} onChange={onQuantityChange} />
        </View>
        <View className="hkp-sku-popup__submit" onClick={onSubmit}>
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
  onClose,
  onConfirm,
}: DateSelectionPopupProps) {
  return (
    <Calendar
      visible={visible}
      popup
      title={title}
      type={mode}
      viewMode="day"
      defaultValue={value}
      startDate={startDate}
      endDate={endDate}
      firstDayOfWeek={1}
      showToday
      showTitle
      showSubTitle
      confirmText="确定"
      onClose={onClose}
      onConfirm={(nextValue) => {
        const confirmedValue = Array.isArray(nextValue)
          ? nextValue
          : nextValue
            ? [nextValue]
            : [];
        onConfirm(mode === 'single' ? confirmedValue[0] || '' : confirmedValue);
      }}
    />
  );
}

export function CouponSelectionPopup({
  visible,
  title = '选择优惠券',
  coupons,
  selectedCouponId,
  onClose,
  onSelect,
}: CouponSelectionPopupProps) {
  return (
    <AppPopup visible={visible} contentClassName="hkp-coupon-popup" onClose={onClose}>
      <View className="hkp-coupon-popup__header">
        <Text className="hkp-coupon-popup__title">{title}</Text>
        <Text className="hkp-coupon-popup__close" onClick={onClose}>×</Text>
      </View>
      <View className="hkp-coupon-popup__list">
        {coupons.map((coupon) => (
          <View
            className={classNames(
              'hkp-coupon-popup__item',
              selectedCouponId === coupon.id && 'hkp-coupon-popup__item--active',
            )}
            key={coupon.id}
            onClick={() => onSelect(coupon)}
          >
            <CouponCard coupon={coupon} />
            {selectedCouponId === coupon.id ? <Text className="hkp-coupon-popup__checked">已选</Text> : null}
          </View>
        ))}
        {coupons.length === 0 ? <Text className="hkp-coupon-popup__empty">暂无可用优惠券</Text> : null}
      </View>
    </AppPopup>
  );
}
