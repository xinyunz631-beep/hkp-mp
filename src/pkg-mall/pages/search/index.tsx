import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchSearchData } from '@/pkg-mall/services/search';
import './index.scss';

// 渲染商品搜索页面，具体业务内容按页面需求继续扩展。
const SearchPage = observer(function SearchPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchSearchData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="商品搜索" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default SearchPage;
