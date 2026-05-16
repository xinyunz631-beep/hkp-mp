import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchFavoritesData } from '@/pkg-mall/services/favorites';
import './index.scss';

// 渲染我的收藏页面，具体业务内容按页面需求继续扩展。
const FavoritesPage = observer(function FavoritesPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchFavoritesData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="我的收藏" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default FavoritesPage;
