import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { rootStore } from '@/core/store';
import './index.scss';

// 渲染全局 loading 遮罩，用于请求和关键异步流程反馈。
export const GlobalLoading = observer(function GlobalLoading() {
  if (rootStore.ui.loadingCount <= 0) return null;

  return (
    <View className="global-loading">
      <View className="global-loading__spinner" />
      <View className="global-loading__text">加载中</View>
    </View>
  );
});
