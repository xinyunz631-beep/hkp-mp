import { useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { PageHeader, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES, type MiniPackageRoute } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateBackOrHome } from '@/core/utils/navigation';
import { fetchCategoryData } from '@/pkg-mall/services/category';
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

const shortcutAccentClassMap = {
  all: '_pg-shortcut_card--pink',
  curated: '_pg-shortcut_card--yellow',
  hot: '_pg-shortcut_card--orange',
} as const;

// 商城分类首页按截图实现左侧类目、推荐 Banner、快捷入口和底部商城导航。
const CategoryPage = observer(function CategoryPage() {
  const [categoryData, setCategoryData] = useState<Awaited<ReturnType<typeof fetchCategoryData>>>();
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchCategoryData();
      setCategoryData(nextData);
      setActiveCategoryId(nextData.activeCategoryId);
    },
  });

  const categories = categoryData?.categories ?? [];
  const shortcuts = categoryData?.shortcuts ?? [];
  const currentCategoryId = activeCategoryId || categoryData?.activeCategoryId || '';

  function openPackagePage(path: MiniPackageRoute) {
    if (path === MINI_PACKAGE_ROUTES.mallHome) {
      Taro.navigateTo({ url: path });
      return;
    }

    Taro.navigateTo({ url: path });
  }

  function handleCategoryPress(categoryId: string) {
    if (categoryId === 'digital-home') {
      Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.mallCategoryList });
      return;
    }

    setActiveCategoryId(categoryId);
  }

  const activeCategoryTitle = useMemo(
    () => categories.find((item) => item.id === currentCategoryId)?.title,
    [categories, currentCategoryId],
  );

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell
        title="商城分类"
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
                  size={16}
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
              <AppIcon name="back" size={16} color="#111111" />
            </View>
            <View className="_pg-header_search" onClick={() => Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.mallSearch })}>
              <AppIcon name="search" className="_pg-header_search-icon" size={16} color="#c0c4cc" />
              <Text className="_pg-header_search-placeholder">{categoryData?.query}</Text>
            </View>
          </View>
        </PageHeader>

        <View className="_pg-page">
          <View className="_pg-layout">
            <View className="_pg-sidebar">
              {categories.map((item) => {
                const active = item.id === currentCategoryId;

                return (
                  <View
                    className={`_pg-sidebar_item ${active ? '_pg-sidebar_item--active' : ''}`}
                    key={item.id}
                    onClick={() => handleCategoryPress(item.id)}
                  >
                    {active ? <View className="_pg-sidebar_indicator" /> : null}
                    <Text>{item.title}</Text>
                  </View>
                );
              })}
            </View>

            <View className="_pg-main">
              <View className="_pg-hero">
                <AppImage className="_pg-hero_image" src={categoryData?.heroImageSrc} mode="aspectFill" emptyState="error" />
                <View className="_pg-hero_mask" />
                <View className="_pg-hero_copy">
                  <Text className="_pg-hero_title">{categoryData?.heroTitle}</Text>
                  <Text className="_pg-hero_subtitle">{categoryData?.heroSubtitle}</Text>
                </View>
              </View>

              <View className="_pg-shortcut">
                {shortcuts.map((item) => (
                  <View
                    className={`_pg-shortcut_card ${shortcutAccentClassMap[item.id as keyof typeof shortcutAccentClassMap]}`}
                    key={item.id}
                    onClick={() => openPackagePage(item.path as MiniPackageRoute)}
                  >
                    <View className="_pg-shortcut_icon-wrap">
                      <AppImage className="_pg-shortcut_icon" src={item.iconSrc} mode="aspectFit" emptyState="error" />
                    </View>
                    <Text className="_pg-shortcut_title">{item.title}</Text>
                  </View>
                ))}
              </View>

              <Text className="_pg-main_tip">当前类目：{activeCategoryTitle}</Text>
            </View>
          </View>
        </View>
      </PageShell>
    </View>
  ));
});

export default CategoryPage;
