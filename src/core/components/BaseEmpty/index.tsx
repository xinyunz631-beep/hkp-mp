import { Empty } from '@nutui/nutui-react-taro';
import classNames from 'classnames';
import type { ReactNode } from 'react';
import './index.scss';

type BaseEmptyStatus = 'empty' | 'error' | 'network';
type BaseEmptySize = 'small' | 'base';

const DEFAULT_EMPTY_IMAGE = 'https://wx.qlogo.cn/mmhead/AhLk989Zrl2foUe0CrwzoKJpCozr2Kw28TVCpLBf4Ch0eicHphDdfPWkkOpyKCQmcM9ia49iac4svM/0';

interface BaseEmptyProps {
  className?: string;
  title?: ReactNode;
  description?: ReactNode;
  image?: ReactNode;
  status?: BaseEmptyStatus;
  size?: BaseEmptySize;
  actionText?: ReactNode;
  actionDisabled?: boolean;
  onAction?: () => void | Promise<void | boolean>;
}

// 渲染应用级统一空态/失败态封装，页面通过业务文案和动作配置复用 NutUI Empty。
export function BaseEmpty({
  className,
  title,
  description,
  image,
  status = 'empty',
  size = 'base',
  actionText,
  actionDisabled = false,
  onAction,
}: BaseEmptyProps) {
  const emptyClassName = classNames('base-empty', className);
  const actions = actionText
    ? [{
        text: actionText,
        type: 'primary' as const,
        fill: 'solid' as const,
        disabled: actionDisabled,
        onClick: handleAction,
      }]
    : [];

  // 执行空态主操作，异步结果交给调用方自身流程处理。
  async function handleAction() {
    if (actionDisabled || !onAction) return;
    await onAction();
  }

  return (
    <Empty
      className={emptyClassName}
      image={image || (status === 'empty' ? DEFAULT_EMPTY_IMAGE : undefined)}
      status={status}
      size={size}
      title={title}
      description={description}
      actions={actions}
    />
  );
}
