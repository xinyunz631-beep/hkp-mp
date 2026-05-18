import { SearchBar as NutSearchBar, type SearchBarProps } from '@nutui/nutui-react-taro';
import classNames from 'classnames';
import './index.scss';

export interface AppSearchBarProps extends Omit<Partial<SearchBarProps>, 'className' | 'value' | 'onChange' | 'onSearch' | 'onClear' | 'shape' | 'clearable'> {
  className?: string;
  value: string;
  shape?: SearchBarProps['shape'];
  clearable?: boolean;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
}

// 项目级搜索框封装，统一承接 NutUI SearchBar，页面不再手写输入和清除图标。
export function AppSearchBar({
  className,
  value,
  shape = 'round',
  clearable = true,
  onChange,
  onSearch,
  onClear,
  ...props
}: AppSearchBarProps) {
  return (
    <NutSearchBar
      {...props}
      className={classNames('app-search-bar', className)}
      value={value}
      shape={shape}
      clearable={clearable}
      onChange={(nextValue) => onChange?.(nextValue)}
      onSearch={(nextValue) => onSearch?.(nextValue)}
      onClear={(event) => {
        event.stopPropagation();
        onClear?.();
      }}
    />
  );
}
