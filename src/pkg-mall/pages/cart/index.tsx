import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchCartData } from '@/pkg-mall/services/cart';
import './index.scss';

// 渲染购物车页面，具体业务内容按页面需求继续扩展。
const CartPage = observer(function CartPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchCartData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="购物车" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default CartPage;
