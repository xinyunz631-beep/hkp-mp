import type { ReactNode } from 'react';
import { View } from '@tarojs/components';
import classNames from 'classnames';
import { LoginPopup } from '@/core/components/LoginPopup';
import { PageLoading } from '@/core/components/loading';
import './index.scss';

interface PageRuntimeHostProps {
  loadingVisible: boolean;
  loadingNode?: ReactNode;
}

// 渲染页面显式接入的运行时节点，实际控制逻辑由 usePageRuntime 管理。
export function PageRuntimeHost({ loadingVisible, loadingNode }: PageRuntimeHostProps) {
  const loadingHostClassName = classNames(
    'page-runtime-host__loading',
    !loadingVisible && 'page-runtime-host__loading--hidden',
  );

  return (
    <View className="page-runtime-host">
      <View className="page-runtime-host__login">
        <LoginPopup />
      </View>
      <View className={loadingHostClassName} aria-hidden={!loadingVisible}>
        {loadingNode ?? <PageLoading visible={loadingVisible} />}
      </View>
    </View>
  );
}
