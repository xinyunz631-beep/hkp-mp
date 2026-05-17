import { useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { PageHeader, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { showWechatToast } from '@/core/utils/wechat-actions';
import { fetchRecommendData } from '@/pkg-mall/services/recommend';
import './index.scss';

type RecommendTabKey = 'comprehensive' | 'sales' | 'price' | 'filter';

// 热销推荐页按截图补齐搜索头、排序条、宫格商品和跳到列表页的入口。
const RecommendPage = observer(function RecommendPage() {
  const [recommendData, setRecommendData] = useState<Awaited<ReturnType<typeof fetchRecommendData>>>();
  const [activeTab, setActiveTab] = useState<RecommendTabKey>('comprehensive');
  const [priceAscending, setPriceAscending] = useState(true);
  const [filterActive, setFilterActive] = useState(false);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchRecommendData();
      setRecommendData(nextData);
    },
  });

  const tabs = recommendData?.tabs ?? [];
  const products = recommendData?.products ?? [];

  const sortedProducts = useMemo(() => {
    const filteredProducts = filterActive
      ? products.filter((product) => product.tag || product.price <= 200)
      : products;
    const nextProducts = [...filteredProducts];

    if (activeTab === 'sales') return nextProducts.reverse();
    if (activeTab === 'price') {
      return nextProducts.sort((prev, next) => (
        priceAscending ? prev.price - next.price : next.price - prev.price
      ));
    }

    return nextProducts;
  }, [activeTab, filterActive, priceAscending, products]);

  function handleTabChange(nextKey: RecommendTabKey) {
    if (nextKey === 'filter') {
      const nextFilterActive = !filterActive;
      setFilterActive(nextFilterActive);
      setActiveTab(nextFilterActive ? 'filter' : 'comprehensive');
      void showWechatToast(nextFilterActive ? '已筛选热卖权益商品' : '已清除筛选');
      return;
    }

    if (nextKey === 'price') {
      setPriceAscending((currentValue) => !currentValue);
    }

    setActiveTab(nextKey);
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell
        title="热销推荐"
        className="_pg-shell"
        reserveTabBarSpace={false}
        scrollViewProps={{}}
      >
        <PageHeader>
          <View className="_pg-header">
            <View className="_pg-header_search-row">
              <View
                className="_pg-header_search"
                onClick={() => Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.mallSearch })}
              >
                <AppIcon name="search" className="_pg-header_search-icon" size={16} color="#c0c4cc" />
                <Text className="_pg-header_search-placeholder">{recommendData?.query}</Text>
              </View>
              <View
                className="_pg-header_switch"
                onClick={() => Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.mallProducts })}
              >
                <AppIcon name="list" size={16} color="#111111" />
              </View>
            </View>

            <View className="_pg-header_tabs">
              {tabs.map((tab) => {
                const tabKey = tab.key as RecommendTabKey;
                const active = activeTab === tabKey;

                return (
                  <View
                    className={`_pg-header_tab ${active ? '_pg-header_tab--active' : ''}`}
                    key={tab.key}
                    onClick={() => handleTabChange(tabKey)}
                  >
                    <Text>{tab.text}</Text>
                    {tabKey === 'price' ? <Text className="_pg-header_tab-indicator">{priceAscending ? '↑' : '↓'}</Text> : null}
                    {tabKey === 'filter' ? <AppIcon name="filter" className="_pg-header_tab-icon" size={16} color="#9ea4ad" /> : null}
                  </View>
                );
              })}
            </View>
          </View>
        </PageHeader>

        <View className="_pg-page">
          <View className="_pg-grid">
            {sortedProducts.map((product) => (
              <View
                className="_pg-item"
                key={product.id}
                onClick={() => {
                  Taro.navigateTo({ url: `${MINI_PACKAGE_ROUTES.mallProductDetail}?productId=${product.id}` });
                }}
              >
                <AppImage className="_pg-item_image" src={product.image.src} mode="aspectFit" emptyState="error" />
                <Text className="_pg-item_title">{product.title}</Text>
                <View className="_pg-item_labels">
                  {product.labels.map((label) => (
                    <View className="_pg-item_label" key={label}>
                      <Text>{label}</Text>
                    </View>
                  ))}
                </View>
                <View className="_pg-item_footer">
                  <Text className="_pg-item_price">¥ {product.price}</Text>
                  <Text className="_pg-item_sales">{product.salesText}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </PageShell>
    </View>
  ));
});

export default RecommendPage;
