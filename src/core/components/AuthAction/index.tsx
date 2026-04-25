import { PropsWithChildren } from 'react';
import { View } from '@tarojs/components';
import { requireLogin } from '@/core/services/auth';

interface AuthActionProps extends PropsWithChildren {
  reason?: string;
  className?: string;
  onAuthed: () => void;
}

// 渲染鉴权动作容器，未登录时统一拉起登录弹窗。
export function AuthAction({ reason, className, onAuthed, children }: AuthActionProps) {
  // 处理点击动作，已登录则继续执行业务回调。
  function handleClick() {
    if (!requireLogin(reason)) return;
    onAuthed();
  }

  return (
    <View className={className} onClick={handleClick}>
      {children}
    </View>
  );
}
