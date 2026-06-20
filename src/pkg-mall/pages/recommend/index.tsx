import { useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { PageHeader, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { showWechatToast } from '@/core/utils/wechat-actions';
import { fetchRecommendData } from '@/pkg-mall/services/recommend';
import './index.scss';

type RecommendTabKey = 'comprehensive' | 'price' | 'filter';

function resolveRecommendSort(
  activeTab: RecommendTabKey,
  priceAscending: boolean,
): 'priceAsc' | 'priceDesc' | undefined {
  if (activeTab !== 'price') return undefined;
  return priceAscending ? 'priceAsc' : 'priceDesc';
}

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
  const recommendationId = recommendData?.recommendationId || '';

  const filteredProducts = useMemo(() => (
    filterActive
      ? products.filter((product) => product.labels.length > 0)
      : products
  ), [filterActive, products]);

  async function loadRecommendProducts(nextSort = resolveRecommendSort(activeTab, priceAscending)) {
    const nextData = await fetchRecommendData({ sort: nextSort });
    setRecommendData(nextData);
  }

  async function handleTabChange(nextKey: RecommendTabKey) {
    if (nextKey === 'filter') {
      const nextFilterActive = !filterActive;
      setFilterActive(nextFilterActive);
      setActiveTab(nextFilterActive ? 'filter' : 'comprehensive');
      void showWechatToast(nextFilterActive ? '已筛选带标签商品' : '已清除筛选');
      return;
    }

    const nextPriceAscending = nextKey === 'price'
      ? (activeTab === 'price' ? !priceAscending : true)
      : priceAscending;
    await pageRuntime.withLoading(() => loadRecommendProducts(resolveRecommendSort(nextKey, nextPriceAscending)));
    setActiveTab(nextKey);
    setPriceAscending(nextPriceAscending);
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
                <Text className="_pg-header_search-placeholder">{recommendData?.query || '热销推荐'}</Text>
              </View>
              <View
                className="_pg-header_switch"
                onClick={() => Taro.navigateTo({
                  url: recommendationId
                    ? `${MINI_PACKAGE_ROUTES.mallProducts}?recommendationId=${encodeURIComponent(recommendationId)}`
                    : MINI_PACKAGE_ROUTES.mallProducts,
                })}
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
                    onClick={() => {
                      void handleTabChange(tabKey);
                    }}
                  >
                    <Text>{tab.text}</Text>
                    {tabKey === 'price' ? (
                      <AppIcon
                        name="arrowRight"
                        className={`_pg-header_tab-sort ${priceAscending ? '_pg-header_tab-sort--asc' : '_pg-header_tab-sort--desc'}`}
                        size={13}
                        color={active ? '#2a2d34' : '#9ea4ad'}
                      />
                    ) : null}
                    {tabKey === 'filter' ? <AppIcon name="filter" className="_pg-header_tab-icon" size={16} color="#9ea4ad" /> : null}
                  </View>
                );
              })}
            </View>
          </View>
        </PageHeader>

        <View className="_pg-page">
          {filteredProducts.length > 0 ? (
            <View className="_pg-grid">
              {filteredProducts.map((product) => (
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
          ) : (
            <BaseEmpty
              className="_pg-empty"
              title="暂无热销推荐"
              description="后台推荐位生效后会在这里展示"
            />
          )}
        </View>
      </PageShell>
    </View>
  ));
});

export default RecommendPage;
