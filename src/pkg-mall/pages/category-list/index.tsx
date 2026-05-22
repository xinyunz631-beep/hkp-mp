import Taro from '@tarojs/taro';
import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';

// 兼容旧分类商品路由，统一跳到新的“左侧分类 + 右侧联动内容”分类页。
const CategoryListCompatPage = observer(function CategoryListCompatPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      Taro.redirectTo({ url: MINI_PACKAGE_ROUTES.mallCategory });
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="商城分类" className="_pg-shell" reserveTabBarSpace={false}>
        <View className="_pg-page" />
      </PageShell>
    </View>
  ));
});

export default CategoryListCompatPage;
