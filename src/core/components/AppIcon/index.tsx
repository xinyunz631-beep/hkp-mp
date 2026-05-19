import { Image } from '@tarojs/components';
import {
  ArrowLeft,
  ArrowRight,
  Ask,
  Calendar,
  Cart,
  CartAdd,
  Check,
  Close,
  Copy,
  Coupon,
  Del,
  Edit,
  List,
  Filter,
  Gift,
  Heart,
  Home,
  ImageError,
  Location,
  Orderlist,
  Phone,
  Photograph,
  QrCode,
  Scan,
  Search,
  Service,
  Share,
  Shop,
  Ticket,
  User,
} from '@nutui/icons-react-taro';
import classNames from 'classnames';
import type { CSSProperties, ComponentType } from 'react';
import './index.scss';

export type AppIconName =
  | 'arrowRight'
  | 'ask'
  | 'back'
  | 'calendar'
  | 'cart'
  | 'cartAdd'
  | 'check'
  | 'code'
  | 'close'
  | 'copy'
  | 'coupon'
  | 'delete'
  | 'edit'
  | 'filter'
  | 'gift'
  | 'heart'
  | 'hotel'
  | 'home'
  | 'imageError'
  | 'list'
  | 'location'
  | 'order'
  | 'phone'
  | 'photograph'
  | 'profile'
  | 'scan'
  | 'search'
  | 'service'
  | 'share'
  | 'ticket';

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
  ask: Ask,
  back: ArrowLeft,
  calendar: Calendar,
  cart: Cart,
  cartAdd: CartAdd,
  check: Check,
  code: QrCode,
  close: Close,
  copy: Copy,
  coupon: Coupon,
  delete: Del,
  edit: Edit,
  filter: Filter,
  gift: Gift,
  heart: Heart,
  hotel: Shop,
  home: Home,
  imageError: ImageError,
  list: List,
  location: Location,
  order: Orderlist,
  phone: Phone,
  photograph: Photograph,
  profile: User,
  scan: Scan,
  search: Search,
  service: Service,
  share: Share,
  ticket: Ticket,
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
  if(name == 'arrowRight') {
    size = 13
  }

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
