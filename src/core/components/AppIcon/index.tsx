import { Image } from '@tarojs/components';
import {
  ArrowLeft,
  ArrowRight,
  Cart,
  CartAdd,
  Check,
  Close,
  Del,
  Edit,
  List,
  Filter,
  Heart,
  Home,
  ImageError,
  Orderlist,
  Photograph,
  Search,
  Service,
  Share,
} from '@nutui/icons-react-taro';
import classNames from 'classnames';
import type { CSSProperties, ComponentType } from 'react';
import './index.scss';

export type AppIconName =
  | 'arrowRight'
  | 'back'
  | 'cart'
  | 'cartAdd'
  | 'check'
  | 'close'
  | 'delete'
  | 'edit'
  | 'filter'
  | 'heart'
  | 'home'
  | 'imageError'
  | 'list'
  | 'order'
  | 'photograph'
  | 'search'
  | 'service'
  | 'share';

interface AppIconProps {
  name: AppIconName;
  className?: string;
  size?: number | string;
  color?: string;
  imageSrc?: string;
}

type NutIconComponent = ComponentType<{
  className?: string;
  size?: number | string;
  color?: string;
}>;

const nutIconMap: Record<AppIconName, NutIconComponent | undefined> = {
  arrowRight: ArrowRight,
  back: ArrowLeft,
  cart: Cart,
  cartAdd: CartAdd,
  check: Check,
  close: Close,
  delete: Del,
  edit: Edit,
  filter: Filter,
  heart: Heart,
  home: Home,
  imageError: ImageError,
  list: List,
  order: Orderlist,
  photograph: Photograph,
  search: Search,
  service: Service,
  share: Share,
};

// 统一项目内图标入口：先封装 NutUI icon，找不到匹配项时再退化为空地址 Image。
export function AppIcon({
  name,
  className,
  size = 16,
  color = '#667085',
  imageSrc = '',
}: AppIconProps) {
  const iconClassName = classNames('app-icon', `app-icon--${name}`, className);
  const IconComponent = nutIconMap[name];

  if (IconComponent) {
    return <IconComponent className={iconClassName} size={size} color={color} />;
  }

  const imageSize = typeof size === 'number' ? `${size}px` : size;
  const imageStyle: CSSProperties = {
    width: imageSize,
    height: imageSize,
  };

  return <Image className={iconClassName} src={imageSrc} mode="aspectFit" style={imageStyle} />;
}
