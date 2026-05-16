import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchProductsData } from '@/pkg-mall/services/products';
import './index.scss';

// 渲染商品列表页面，具体业务内容按页面需求继续扩展。
const ProductsPage = observer(function ProductsPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchProductsData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="商品列表" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default ProductsPage;
