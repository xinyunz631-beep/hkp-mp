import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchCategoryData } from '@/pkg-mall/services/category';
import './index.scss';

// 渲染商城分类页面，具体业务内容按页面需求继续扩展。
const CategoryPage = observer(function CategoryPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchCategoryData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="商城分类" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default CategoryPage;
