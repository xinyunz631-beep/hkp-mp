import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchProductDetailData } from '@/pkg-mall/services/product-detail';
import './index.scss';

// 渲染商品详情页面，具体业务内容按页面需求继续扩展。
const ProductDetailPage = observer(function ProductDetailPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchProductDetailData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="商品详情" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default ProductDetailPage;
