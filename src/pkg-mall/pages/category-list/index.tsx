import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchCategoryListData } from '@/pkg-mall/services/category-list';
import './index.scss';

// 渲染分类商品页面，具体业务内容按页面需求继续扩展。
const CategoryListPage = observer(function CategoryListPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchCategoryListData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="分类商品" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default CategoryListPage;
