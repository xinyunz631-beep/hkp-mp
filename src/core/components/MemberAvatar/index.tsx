import { AppImage, type AppImageProps } from '@/core/components/AppImage';
import './index.scss';

interface MemberAvatarProps extends Pick<AppImageProps, 'className' | 'src' | 'placeholderColor' | 'showErrorIcon'> {
  size?: number | string;
}

const DEFAULT_MEMBER_AVATAR_SIZE = 80;

// 统一会员头像尺寸，页面 class 只负责边框和阴影等装饰。
export function MemberAvatar({
  className,
  src,
  size = DEFAULT_MEMBER_AVATAR_SIZE,
  placeholderColor = '#ffffff',
  showErrorIcon = false,
}: MemberAvatarProps) {
  return (
    <AppImage
      className={['member-avatar', className].filter(Boolean).join(' ')}
      src={src}
      width={size}
      height={size}
      placeholderColor={placeholderColor}
      showErrorIcon={showErrorIcon}
    />
  );
}
