import { Text, View } from '@tarojs/components';
import classNames from 'classnames';
import { AppIcon } from '@/core/components/AppIcon';
import './index.scss';

type MallCartActionBarButtonVariant = 'primary' | 'danger' | 'ghost';
type MallCartActionBarSummaryValueKind = 'amount' | 'count';

interface MallCartActionBarSummaryLine {
  label: string;
  value: string | number;
  suffix?: string;
  valueKind?: MallCartActionBarSummaryValueKind;
}

interface MallCartActionBarSelectControl {
  checked: boolean;
  label: string;
  onClick: () => void | Promise<void>;
}

interface MallCartActionBarProps {
  summaryLines: MallCartActionBarSummaryLine[];
  buttonText: string;
  onButtonClick: () => void | Promise<void>;
  buttonVariant?: MallCartActionBarButtonVariant;
  selectControl?: MallCartActionBarSelectControl;
  className?: string;
}

// 商城购物车底部操作栏，统一承接商品列表入口和购物车结算/编辑操作。
export function MallCartActionBar({
  summaryLines,
  buttonText,
  onButtonClick,
  buttonVariant = 'primary',
  selectControl,
  className,
}: MallCartActionBarProps) {
  const stackedSummary = summaryLines.length > 1;
  const compactButton = buttonVariant !== 'primary';
  const buttonNode = (
    <View
      className={classNames('mall-cart-action-bar__button', `mall-cart-action-bar__button--${buttonVariant}`)}
      onClick={() => void onButtonClick()}
    >
      <Text>{buttonText}</Text>
    </View>
  );

  return (
    <View className={classNames('mall-cart-action-bar', className)}>
      {selectControl ? (
        <View className="mall-cart-action-bar__select" onClick={() => void selectControl.onClick()}>
          <View className={classNames(
            'mall-cart-action-bar__checkbox',
            selectControl.checked ? 'mall-cart-action-bar__checkbox--checked' : '',
          )}
          >
            {selectControl.checked ? <AppIcon name="check" size={10} color="#ffffff" /> : null}
          </View>
          <Text className="mall-cart-action-bar__select-text">{selectControl.label}</Text>
        </View>
      ) : null}

      <View className={classNames(
        'mall-cart-action-bar__summary',
        stackedSummary ? 'mall-cart-action-bar__summary--stacked' : '',
      )}
      >
        {summaryLines.map((line, index) => (
          <View className="mall-cart-action-bar__summary-line" key={`${line.label}-${index}`}>
            <Text className="mall-cart-action-bar__summary-label">{line.label}</Text>
            <Text className={classNames(
              'mall-cart-action-bar__summary-value',
              line.valueKind ? `mall-cart-action-bar__summary-value--${line.valueKind}` : '',
            )}
            >
              {line.value}
            </Text>
            {line.suffix ? <Text className="mall-cart-action-bar__summary-label">{line.suffix}</Text> : null}
          </View>
        ))}
      </View>

      {compactButton ? (
        <View className="mall-cart-action-bar__actions">{buttonNode}</View>
      ) : buttonNode}
    </View>
  );
}
