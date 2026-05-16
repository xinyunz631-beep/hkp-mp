import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { PageHeader, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES, type MiniPackageRoute } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateBackOrHome } from '@/core/utils/navigation';
import { fetchCategoryListData } from '@/pkg-mall/services/category-list';
import './index.scss';

interface MallFooterItem {
  key: string;
  title: string;
  icon: 'home' | 'cart' | 'order';
  path: MiniPackageRoute;
}

const mallFooterItems: MallFooterItem[] = [
  { key: 'home', title: '首页', icon: 'home', path: MINI_PACKAGE_ROUTES.mallHome },
  { key: 'cart', title: '购物车', icon: 'cart', path: MINI_PACKAGE_ROUTES.mallCart },
  { key: 'order', title: '我的订单', icon: 'order', path: MINI_PACKAGE_ROUTES.orderHome },
];

// 分类商品页按截图实现左侧分类和右侧品牌入口，继续承接到商品列表页。
const CategoryListPage = observer(function CategoryListPage() {
  const [categoryData, setCategoryData] = useState<Awaited<ReturnType<typeof fetchCategoryListData>>>();
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchCategoryListData();
      setCategoryData(nextData);
      setActiveCategoryId(nextData.activeCategoryId);
    },
  });

  const categories = categoryData?.categories ?? [];
  const brands = categoryData?.brands ?? [];
  const currentCategoryId = activeCategoryId || categoryData?.activeCategoryId || '';

  function openPackagePage(path: MiniPackageRoute) {
    Taro.navigateTo({ url: path });
  }

  function handleCategoryPress(categoryId: string) {
    setActiveCategoryId(categoryId);
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell
        title="分类商品"
        navbar={false}
        className="_pg-shell"
        reserveTabBarSpace={false}
        scrollViewProps={{}}
        footer={(
          <View className="_pg-footer">
            {mallFooterItems.map((item) => (
              <View className="_pg-footer_item" key={item.key} onClick={() => openPackagePage(item.path)}>
                <AppIcon
                  name={item.icon}
                  className="_pg-footer_icon"
                  size={28}
                  color={item.key === 'home' ? '#db2777' : '#222222'}
                />
                <Text className="_pg-footer_text">{item.title}</Text>
              </View>
            ))}
          </View>
        )}
      >
        <PageHeader>
          <View className="_pg-header">
            <View className="_pg-header_back" onClick={navigateBackOrHome}>
              <AppIcon name="back" size={20} color="#111111" />
            </View>
            <View className="_pg-header_search" onClick={() => Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.mallSearch })}>
              <AppIcon name="search" className="_pg-header_search-icon" size={22} color="#c0c4cc" />
              <Text className="_pg-header_search-placeholder">{categoryData?.query}</Text>
            </View>
          </View>
        </PageHeader>

        <View className="_pg-page">
          <View className="_pg-layout">
            <View className="_pg-sidebar">
              {categories.map((item) => (
                <View
                  className={`_pg-sidebar_item ${item.id === currentCategoryId ? '_pg-sidebar_item--active' : ''}`}
                  key={item.id}
                  onClick={() => handleCategoryPress(item.id)}
                >
                  <Text>{item.title}</Text>
                </View>
              ))}
            </View>

            <View className="_pg-main">
              <View className="_pg-main_header">
                <Text className="_pg-main_title">{categoryData?.sectionTitle}</Text>
                <Text className="_pg-main_more" onClick={() => openPackagePage(MINI_PACKAGE_ROUTES.mallProducts)}>查看更多 ›</Text>
              </View>

              <View className="_pg-brand">
                {brands.map((brand) => (
                  <View className="_pg-brand_item" key={brand.id} onClick={() => openPackagePage(brand.path as MiniPackageRoute)}>
                    <AppImage className="_pg-brand_image" src={brand.imageSrc} mode="aspectFit" emptyState="error" />
                    <Text className="_pg-brand_title">{brand.title}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </PageShell>
    </View>
  ));
});

export default CategoryListPage;
