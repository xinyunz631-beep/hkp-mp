import { View } from '@tarojs/components';
import './index.scss';

interface PageLoadingProps {
  visible: boolean;
}

// 常驻渲染页面级 loading 遮罩，显示状态由当前页面宿主独立维护。
export function PageLoading({ visible }: PageLoadingProps) {
  const hidden = !visible;

  return (
    <View className={hidden ? 'page-loading page-loading--hidden' : 'page-loading'} aria-hidden={hidden}>
      <View className="page-loading__spinner" />
      <View className="page-loading__text">加载中</View>
    </View>
  );
}
