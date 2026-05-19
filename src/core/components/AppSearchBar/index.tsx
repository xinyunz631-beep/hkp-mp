import { Input, View } from '@tarojs/components';
import type { InputProps } from '@tarojs/components';
import classNames from 'classnames';
import { AppIcon } from '@/core/components/AppIcon';
import './index.scss';

export interface AppSearchBarProps {
  className?: string;
  value: string;
  placeholder?: string;
  shape?: 'square' | 'round';
  clearable?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  focus?: boolean;
  maxLength?: number;
  confirmType?: InputProps['confirmType'];
  type?: InputProps['type'];
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  onInputClick?: InputProps['onClick'];
}

// 项目级搜索框封装，统一承接微信 search 键盘提交和项目 AppIcon，不在页面散写输入框。
export function AppSearchBar({
  className,
  value,
  placeholder = '搜索',
  shape = 'round',
  clearable = true,
  disabled = false,
  readOnly = false,
  autoFocus = false,
  focus = false,
  maxLength = 9999,
  confirmType = 'search',
  type = 'text',
  onChange,
  onSearch,
  onClear,
  onInputClick,
}: AppSearchBarProps) {
  return (
    <View className={classNames('app-search-bar', `app-search-bar--${shape}`, className)}>
      <View className="app-search-bar__content">
        <AppIcon name="search" className="app-search-bar__search-icon" size={14} color="#a8adb6" />
        <Input
          className="app-search-bar__input"
          value={value}
          placeholder={placeholder}
          placeholderClass="app-search-bar__placeholder"
          disabled={disabled || readOnly}
          maxlength={maxLength}
          autoFocus={autoFocus}
          focus={focus}
          confirmType={confirmType}
          type={type}
          cursorSpacing={24}
          onClick={onInputClick}
          onInput={(event) => {
            const nextValue = event.detail.value;
            onChange?.(nextValue);
            return nextValue;
          }}
          onConfirm={(event) => {
            onSearch?.(event.detail.value);
          }}
        />
        {clearable && value ? (
          <View
            className="app-search-bar__clear"
            onClick={(event) => {
              event.stopPropagation();
              onChange?.('');
              onClear?.();
            }}
          >
            <AppIcon name="close" size={12} color="#9da3ad" />
          </View>
        ) : null}
      </View>
    </View>
  );
}
