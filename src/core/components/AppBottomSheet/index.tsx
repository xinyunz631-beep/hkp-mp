import { ScrollView, Text, View } from '@tarojs/components';
import classNames from 'classnames';
import type { CSSProperties, PropsWithChildren, ReactNode } from 'react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppPopup } from '@/core/components/AppPopup';
import './index.scss';

interface AppBottomSheetProps extends PropsWithChildren {
  visible: boolean;
  title: ReactNode;
  className?: string;
  contentClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  bodyMinHeight?: number | string;
  bodyMaxHeight?: number | string;
  showFooter?: boolean;
  footer?: ReactNode;
  confirmText?: ReactNode;
  confirmDisabled?: boolean;
  closeOnOverlayClick?: boolean;
  zIndex?: number;
  onClose: () => void;
  onConfirm?: () => void;
}

function renderSheetNode(content: ReactNode, className: string) {
  if (typeof content === 'string' || typeof content === 'number') {
    return <Text className={className}>{content}</Text>;
  }

  return content;
}

function resolveCssLength(value?: number | string) {
  if (typeof value === 'number') return `${value}px`;
  return value;
}

// AppPopup 的通用底部业务弹层：头部固定、内容滚动、底部操作可选。
export function AppBottomSheet({
  visible,
  title,
  children,
  className,
  contentClassName,
  bodyClassName,
  footerClassName,
  bodyMinHeight,
  bodyMaxHeight,
  showFooter = true,
  footer,
  confirmText = '确定',
  confirmDisabled = false,
  closeOnOverlayClick,
  zIndex,
  onClose,
  onConfirm,
}: AppBottomSheetProps) {
  const panelStyle = {
    ...(resolveCssLength(bodyMinHeight) ? { '--app-bottom-sheet-body-min-height': resolveCssLength(bodyMinHeight) } : {}),
    ...(resolveCssLength(bodyMaxHeight) ? { '--app-bottom-sheet-body-max-height': resolveCssLength(bodyMaxHeight) } : {}),
  } as CSSProperties;

  function handleConfirm() {
    if (confirmDisabled) return;
    if (onConfirm) {
      onConfirm();
      return;
    }

    onClose();
  }

  return (
    <AppPopup
      visible={visible}
      className={classNames('app-bottom-sheet-popup', className)}
      contentClassName={classNames('app-bottom-sheet', contentClassName)}
      position="bottom"
      closeOnOverlayClick={closeOnOverlayClick}
      zIndex={zIndex}
      onClose={onClose}
    >
      <View className="app-bottom-sheet__panel" style={panelStyle}>
        <View className="app-bottom-sheet__header">
          {renderSheetNode(title, 'app-bottom-sheet__title')}
          <View className="app-bottom-sheet__close" onClick={onClose}>
            <AppIcon name="close" size={16} color="#667085" />
          </View>
        </View>
        <ScrollView
          className={classNames('app-bottom-sheet__body', bodyClassName)}
          scrollY
          enhanced
          showScrollbar={false}
        >
          <View className="app-bottom-sheet__body-inner">
            {children}
          </View>
        </ScrollView>
        {showFooter ? (
          <View className={classNames('app-bottom-sheet__footer', footerClassName)}>
            {footer ?? (
              <View
                className={classNames(
                  'app-bottom-sheet__confirm',
                  confirmDisabled && 'app-bottom-sheet__confirm--disabled',
                )}
                onClick={handleConfirm}
              >
                {renderSheetNode(confirmText, 'app-bottom-sheet__confirm-text')}
              </View>
            )}
          </View>
        ) : null}
      </View>
    </AppPopup>
  );
}
