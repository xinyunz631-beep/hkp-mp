import { Popup } from '@nutui/nutui-react-taro';
import { View, type ITouchEvent } from '@tarojs/components';
import classNames from 'classnames';
import type { CSSProperties, PropsWithChildren } from 'react';
import './index.scss';

type AppPopupPosition = 'bottom' | 'center' | 'left' | 'right' | 'top';

interface AppPopupProps extends PropsWithChildren {
  visible: boolean;
  className?: string;
  contentClassName?: string;
  style?: CSSProperties;
  position?: AppPopupPosition;
  zIndex?: number;
  duration?: number;
  overlay?: boolean;
  overlayClassName?: string;
  overlayStyle?: CSSProperties;
  closeOnOverlayClick?: boolean;
  lockScroll?: boolean;
  round?: boolean;
  destroyOnClose?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  afterShow?: () => void;
  afterClose?: () => void;
  onOverlayClick?: (event: ITouchEvent) => boolean | void;
}

const DEFAULT_POPUP_Z_INDEX = 1100;
const DEFAULT_POPUP_DURATION = 300;

// 项目级 Popup 封装，统一 NutUI 弹层的层级、遮罩关闭和常驻渲染策略。
export function AppPopup({
  visible,
  children,
  className,
  contentClassName,
  style,
  position = 'bottom',
  zIndex = DEFAULT_POPUP_Z_INDEX,
  duration = DEFAULT_POPUP_DURATION,
  overlay = true,
  overlayClassName,
  overlayStyle,
  closeOnOverlayClick = true,
  lockScroll = true,
  round,
  destroyOnClose = false,
  onOpen,
  onClose,
  afterShow,
  afterClose,
  onOverlayClick,
}: AppPopupProps) {
  const popupClassName = classNames('app-popup', `app-popup--${position}`, className);
  const popupContentClassName = classNames('app-popup__content', contentClassName);
  const popupOverlayClassName = classNames('app-popup__overlay', overlayClassName);
  const durationStyle = { '--app-popup-duration': `${duration}ms` } as CSSProperties;
  const popupStyle = { ...style, ...durationStyle };
  const popupOverlayStyle = { ...overlayStyle, ...durationStyle };
  const shouldRound = round ?? position === 'bottom';

  function handleOverlayClick(event: ITouchEvent) {
    return onOverlayClick?.(event) ?? true;
  }

  return (
    <Popup
      visible={visible}
      className={popupClassName}
      position={position}
      zIndex={zIndex}
      duration={duration}
      style={popupStyle}
      overlay={overlay}
      overlayClassName={popupOverlayClassName}
      overlayStyle={popupOverlayStyle}
      closeOnOverlayClick={closeOnOverlayClick}
      lockScroll={lockScroll}
      round={shouldRound}
      destroyOnClose={destroyOnClose}
      onOpen={onOpen}
      onClose={onClose}
      afterShow={afterShow}
      afterClose={afterClose}
      onOverlayClick={handleOverlayClick}
    >
      <View className={popupContentClassName}>{children}</View>
    </Popup>
  );
}
