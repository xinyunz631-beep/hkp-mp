import { useMemo, useState, type ReactNode } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppBottomSheet } from '@/core/components/AppBottomSheet';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { AppSearchBar } from '@/core/components/AppSearchBar';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { SkuPopup } from '@/core/components/commerce';
import { PageHeader, PageShare, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import type { HkpSkuGroup } from '@/core/types/hkp';
import { navigateBackOrHome, navigateToMiniRoute } from '@/core/utils/navigation';
import {
  clampSkuQuantity,
  getSalableSkuVariants,
  resolveInitialSkuGroups,
  resolveNextSkuGroupsAfterSelect,
  resolveSkuState,
  shouldOpenQuickSkuPopup,
} from '@/core/utils/sku';
import { showWechatToast } from '@/core/utils/wechat-actions';
import { MallCartBadge } from '@/pkg-mall/components/MallCartBadge';
import { useMallCartCount } from '@/pkg-mall/hooks/use-mall-cart-count';
import { addMallCartItem } from '@/pkg-mall/services/cart';
import { fetchProductDetailData } from '@/pkg-mall/services/product-detail';
import { fetchProductsData } from '@/pkg-mall/services/products';
import { saveMallSearchKeyword } from '@/pkg-mall/services/search';
import type { MallProductDetailData, MallProductListData, MallSkuVariant } from '@/pkg-mall/services/mock-data';
import './index.scss';

type MallProductsTabKey = 'comprehensive' | 'sales' | 'price' | 'filter';
type MallProductsPriceRangeKey = 'all' | 'under100' | '100to200' | 'over200';
type MallProductsTagKey = 'all' | 'new' | 'hot' | 'limited';

interface MallProductsFilterState {
  priceRange: MallProductsPriceRangeKey;
  tag: MallProductsTagKey;
}

const defaultFilterState: MallProductsFilterState = {
  priceRange: 'all',
  tag: 'all',
};

const priceRangeOptions: Array<{ key: MallProductsPriceRangeKey; label: string }> = [
  { key: 'all', label: '全部价格' },
  { key: 'under100', label: '100元以下' },
  { key: '100to200', label: '100-200元' },
  { key: 'over200', label: '200元以上' },
];

const tagOptions: Array<{ key: MallProductsTagKey; label: string }> = [
  { key: 'all', label: '全部商品' },
  { key: 'new', label: '新品' },
  { key: 'hot', label: '热卖' },
  { key: 'limited', label: '乐园限定' },
];

// 读取商品列表路由关键词，承接搜索页键盘提交后的结果页。
function resolveProductsRouteKeyword() {
  const keyword = Taro.getCurrentInstance().router?.params?.keyword || '';

  try {
    return decodeURIComponent(keyword);
  } catch {
    return keyword;
  }
}

function resolveProductsRouteCategoryId() {
  return Taro.getCurrentInstance().router?.params?.categoryId || '';
}

function resolveProductsRouteCouponId() {
  return Taro.getCurrentInstance().router?.params?.couponId || '';
}

function isDefaultFilterState(filterState: MallProductsFilterState) {
  return filterState.priceRange === 'all' && filterState.tag === 'all';
}

function getFilterCount(filterState: MallProductsFilterState) {
  return Number(filterState.priceRange !== 'all') + Number(filterState.tag !== 'all');
}

function matchPriceRange(price: number, priceRange: MallProductsPriceRangeKey) {
  if (priceRange === 'under100') return price < 100;
  if (priceRange === '100to200') return price >= 100 && price <= 200;
  if (priceRange === 'over200') return price > 200;
  return true;
}

function matchProductTag(product: MallProductListData['products'][number], tag: MallProductsTagKey) {
  if (tag === 'new') return product.tag === '新品';
  if (tag === 'hot') return product.tag === '热卖' || /已售|付款/.test(product.salesText || '');
  if (tag === 'limited') return product.tag === '乐园限定' || product.title.includes('乐园');
  return true;
}

// 将列表商品名中命中的关键词分段渲染，搜索结果页命中片段用主题色标红。
function renderHighlightedProductTitle(text: string, keyword?: string) {
  const trimmedKeyword = (keyword || '').trim();
  if (!trimmedKeyword) return text;

  const nodes: ReactNode[] = [];
  const lowerText = text.toLowerCase();
  const lowerKeyword = trimmedKeyword.toLowerCase();
  let cursor = 0;
  let matchIndex = lowerText.indexOf(lowerKeyword, cursor);

  while (matchIndex >= 0) {
    if (matchIndex > cursor) nodes.push(text.slice(cursor, matchIndex));

    const nextCursor = matchIndex + trimmedKeyword.length;
    nodes.push(
      <Text className="_pg-product_highlight" key={`${matchIndex}-${nextCursor}`}>
        {text.slice(matchIndex, nextCursor)}
      </Text>,
    );
    cursor = nextCursor;
    matchIndex = lowerText.indexOf(lowerKeyword, cursor);
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));

  return nodes;
}

// 商品列表承接商城搜索结果、排序筛选、商品详情和购物车加购闭环。
const ProductsPage = observer(function ProductsPage() {
  const [listData, setListData] = useState<MallProductListData>();
  const [activeTab, setActiveTab] = useState<MallProductsTabKey>('comprehensive');
  const [priceAscending, setPriceAscending] = useState(true);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterState, setFilterState] = useState<MallProductsFilterState>(defaultFilterState);
  const [filterDraft, setFilterDraft] = useState<MallProductsFilterState>(defaultFilterState);
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [couponId, setCouponId] = useState('');
  const [skuVisible, setSkuVisible] = useState(false);
  const [skuDetailData, setSkuDetailData] = useState<MallProductDetailData>();
  const [skuGroups, setSkuGroups] = useState<HkpSkuGroup[]>([]);
  const [skuQuantity, setSkuQuantity] = useState(1);
  const { cartCount } = useMallCartCount();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextKeyword = resolveProductsRouteKeyword();
      const nextCategoryId = resolveProductsRouteCategoryId();
      const nextCouponId = resolveProductsRouteCouponId();
      const nextData = await fetchProductsData({
        keyword: nextKeyword,
        categoryId: nextCategoryId,
        couponId: nextCouponId,
      });
      setListData(nextData);
      setKeyword(nextKeyword);
      setCategoryId(nextCategoryId);
      setCouponId(nextCouponId);
    },
  });

  const tabs = listData?.tabs ?? [];
  const products = listData?.products ?? [];
  const activeKeyword = listData?.keyword || '';
  const filterCount = getFilterCount(filterState);
  const skuVariants = skuDetailData?.skuVariants ?? [];
  const skuState = useMemo(
    () => resolveSkuState<MallSkuVariant>(skuGroups, skuVariants),
    [skuGroups, skuVariants],
  );
  const selectedVariant = skuState.selectedVariant;
  const skuProduct = skuDetailData?.product && selectedVariant
    ? {
        ...skuDetailData.product,
        image: { src: selectedVariant.imageSrc || skuDetailData.product.image.src },
        price: selectedVariant.price,
        subtitle: selectedVariant.skuText,
      }
    : skuDetailData?.product;

  const sortedProducts = useMemo(() => {
    const filteredProducts = products.filter((product) => (
      matchPriceRange(product.price, filterState.priceRange)
      && matchProductTag(product, filterState.tag)
    ));
    const nextProducts = [...filteredProducts];

    if (activeTab === 'sales') {
      return nextProducts.reverse();
    }

    if (activeTab === 'price') {
      return nextProducts.sort((prev, next) => (
        priceAscending ? prev.price - next.price : next.price - prev.price
      ));
    }

    return nextProducts;
  }, [activeTab, filterState, priceAscending, products]);

  async function loadProducts(nextKeyword: string) {
    const nextData = await fetchProductsData({ keyword: nextKeyword, categoryId, couponId });
    setListData(nextData);
    setKeyword(nextKeyword);
  }

  async function handleSearch(nextKeyword = keyword) {
    const trimmedKeyword = nextKeyword.trim();

    if (!trimmedKeyword) {
      await showWechatToast('请输入搜索关键词');
      return;
    }

    saveMallSearchKeyword(trimmedKeyword);
    await pageRuntime.withLoading(() => loadProducts(trimmedKeyword));
  }

  async function handleClearSearch() {
    setFilterState(defaultFilterState);
    setFilterDraft(defaultFilterState);
    setActiveTab('comprehensive');
    setPriceAscending(true);
    await pageRuntime.withLoading(() => loadProducts(''));
  }

  function handleTabChange(nextKey: MallProductsTabKey) {
    if (nextKey === 'filter') {
      setFilterDraft(filterState);
      setFilterVisible(true);
      return;
    }

    if (nextKey === 'price') {
      setPriceAscending((currentValue) => !currentValue);
    }

    setActiveTab(nextKey);
  }

  async function handleFilterConfirm() {
    const nextFilterActive = !isDefaultFilterState(filterDraft);
    setFilterState(filterDraft);
    setActiveTab(nextFilterActive ? 'filter' : 'comprehensive');
    setFilterVisible(false);
    await showWechatToast(nextFilterActive ? '已按条件筛选商品' : '已清除筛选');
  }

  function handleResetFilterDraft() {
    setFilterDraft(defaultFilterState);
  }

  function handleOpenDetail(productId: string) {
    Taro.navigateTo({
      url: `${MINI_PACKAGE_ROUTES.mallProductDetail}?productId=${productId}`,
    });
  }

  async function addDetailSkuToCart(detailData: MallProductDetailData, variant?: MallSkuVariant, quantity = 1) {
    const authed = await pageRuntime.ensureLogin('登录后可加入购物车');
    if (!authed) return;

    await addMallCartItem(variant ? {
      ...detailData.product,
      image: { src: variant.imageSrc || detailData.product.image.src },
      price: variant.price,
      subtitle: variant.skuText,
    } : detailData.product, {
      quantity,
      skuText: variant?.skuText || detailData.product.subtitle || '默认规格',
      giftText: variant?.giftText,
      shippingRule: variant?.shippingRule,
    });
    await showWechatToast('已加入购物车', 'success');
  }

  async function handleChooseSkuFromList(product: MallProductListData['products'][number]) {
    let nextDetailData: MallProductDetailData | undefined;

    await pageRuntime.withLoading(async () => {
      nextDetailData = await fetchProductDetailData(product.id);
    });

    if (!nextDetailData) return;

    const availableVariants = getSalableSkuVariants(nextDetailData.skuVariants);

    if (nextDetailData.skuVariants.length > 0 && availableVariants.length === 0) {
      await showWechatToast('当前商品暂时无货');
      return;
    }

    if (!shouldOpenQuickSkuPopup(nextDetailData.skuVariants)) {
      await addDetailSkuToCart(nextDetailData, availableVariants[0], 1);
      return;
    }

    setSkuDetailData(nextDetailData);
    setSkuGroups(resolveInitialSkuGroups(nextDetailData.skuGroups, nextDetailData.skuVariants));
    setSkuQuantity(1);
    setSkuVisible(true);
  }

  function handleSelectSku(groupId: string, optionId: string) {
    const nextGroups = resolveNextSkuGroupsAfterSelect(skuGroups, skuVariants, groupId, optionId);
    const nextSkuState = resolveSkuState<MallSkuVariant>(nextGroups, skuVariants);

    setSkuGroups(nextGroups);
    setSkuQuantity((currentQuantity) => clampSkuQuantity(currentQuantity, 1, nextSkuState.maxQuantity));
  }

  async function handleSkuSubmit() {
    if (skuState.submitTip) {
      await showWechatToast(skuState.submitTip);
      return;
    }

    if (!skuDetailData || !selectedVariant) {
      await showWechatToast('当前规格暂时无货，请更换规格');
      return;
    }

    await addDetailSkuToCart(skuDetailData, selectedVariant, skuQuantity);
    setSkuVisible(false);
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell
        title="商品列表"
        navbar={false}
        className="_pg-shell"
        reserveTabBarSpace={false}
        scrollViewProps={{}}
        footer={(
          <View className="_pg-footer">
            <View className="_pg-footer_summary">
              <View className="_pg-footer_price">
                <Text className="_pg-footer_label">金额:</Text>
                <Text className="_pg-footer_amount">¥{(listData?.previewAmount ?? 0).toFixed(2)}</Text>
              </View>
              <Text className="_pg-footer_discount">已优惠: ¥{(listData?.discountAmount ?? 0).toFixed(2)}</Text>
            </View>
            <View
              className="_pg-footer_button"
              onClick={() => {
                navigateToMiniRoute(MINI_PACKAGE_ROUTES.mallCart);
              }}
            >
              <MallCartBadge count={cartCount} className="_pg-footer_cart-badge" />
              <Text>去购物车</Text>
            </View>
          </View>
        )}
      >
        <PageHeader>
          <View className="_pg-header">
            <View className="_pg-header_nav">
              <View className="_pg-header_back" onClick={navigateBackOrHome}>
                <AppIcon name="back" size={16} color="#111111" />
              </View>
              <AppSearchBar
                className="_pg-header_search"
                value={keyword}
                placeholder="搜索商品"
                onChange={setKeyword}
                onSearch={(nextValue) => {
                  void handleSearch(nextValue);
                }}
                onClear={() => {
                  void handleClearSearch();
                }}
              />
            </View>

            <View className="_pg-header_tabs">
              {tabs.map((tab) => {
                const tabKey = tab.key as MallProductsTabKey;
                const active = activeTab === tabKey;

                return (
                  <View
                    className={`_pg-header_tab ${active ? '_pg-header_tab--active' : ''}`}
                    key={tab.key}
                    onClick={() => handleTabChange(tabKey)}
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
                    {tabKey === 'filter' ? (
                      <>
                        {filterCount > 0 ? <Text className="_pg-header_tab-count">{filterCount}</Text> : null}
                        <AppIcon name="filter" className="_pg-header_tab-icon" size={16} color="#9ea4ad" />
                      </>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        </PageHeader>

        <View className="_pg-page">
          <View className="_pg-discount">
            <Text>{listData?.discountText}</Text>
          </View>

          {sortedProducts.length > 0 ? (
            <View className="_pg-list">
              {sortedProducts.map((product) => (
                <View className="_pg-product" key={product.id} onClick={() => handleOpenDetail(product.id)}>
                  <AppImage className="_pg-product_image" src={product.image.src} mode="aspectFit" emptyState="error" />
                  <View className="_pg-product_body">
                    <Text className="_pg-product_title">{renderHighlightedProductTitle(product.title, activeKeyword)}</Text>
                    <Text className="_pg-product_size">{product.subtitle}</Text>
                    <Text className="_pg-product_price">¥ {product.price}</Text>
                  </View>
                  <View
                    className="_pg-product_cart"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleChooseSkuFromList(product);
                    }}
                  >
                    <AppIcon name="cartAdd" size={16} color="#ffffff" />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <BaseEmpty
              className="_pg-empty"
              title={activeKeyword ? `没有找到“${activeKeyword}”` : '暂无商品'}
              description="换个关键词或清除筛选试试"
              actionText={activeKeyword ? '清除搜索' : undefined}
              onAction={handleClearSearch}
            />
          )}
        </View>
        <PageShare>
          <AppBottomSheet
            visible={filterVisible}
            title="筛选商品"
            className="_pg-filter-popup"
            confirmText="查看商品"
            onClose={() => setFilterVisible(false)}
            onConfirm={() => void handleFilterConfirm()}
          >
            <View className="_pg-filter-panel">
              <View className="_pg-filter-panel_header">
                <Text className="_pg-filter-panel_hint">按当前分类和关键词继续筛选</Text>
                <View className="_pg-filter-panel_reset" onClick={handleResetFilterDraft}>
                  <Text>重置</Text>
                </View>
              </View>

              <View className="_pg-filter-panel_group">
                <Text className="_pg-filter-panel_title">价格区间</Text>
                <View className="_pg-filter-panel_options">
                  {priceRangeOptions.map((option) => {
                    const active = filterDraft.priceRange === option.key;

                    return (
                      <View
                        className={`_pg-filter-panel_option ${active ? '_pg-filter-panel_option--active' : ''}`}
                        key={option.key}
                        onClick={() => setFilterDraft((currentValue) => ({ ...currentValue, priceRange: option.key }))}
                      >
                        <Text>{option.label}</Text>
                        {active ? <AppIcon name="check" size={10} color="#db2777" /> : null}
                      </View>
                    );
                  })}
                </View>
              </View>

              <View className="_pg-filter-panel_group">
                <Text className="_pg-filter-panel_title">商品标签</Text>
                <View className="_pg-filter-panel_options">
                  {tagOptions.map((option) => {
                    const active = filterDraft.tag === option.key;

                    return (
                      <View
                        className={`_pg-filter-panel_option ${active ? '_pg-filter-panel_option--active' : ''}`}
                        key={option.key}
                        onClick={() => setFilterDraft((currentValue) => ({ ...currentValue, tag: option.key }))}
                      >
                        <Text>{option.label}</Text>
                        {active ? <AppIcon name="check" size={10} color="#db2777" /> : null}
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </AppBottomSheet>
          {skuProduct ? (
            <SkuPopup
              visible={skuVisible}
              product={skuProduct}
              skuGroups={skuState.groups}
              quantity={skuQuantity}
              totalAmount={(selectedVariant?.price ?? skuProduct.price) * skuQuantity}
              selectionText={skuState.missingSelectionText || (skuState.selectedText ? `已选 ${skuState.selectedText}` : '')}
              stockText={skuState.stockText}
              maxQuantity={skuState.maxQuantity}
              submitDisabled={!skuState.isPurchasable}
              submitText="加入购物车"
              onClose={() => setSkuVisible(false)}
              onSubmit={() => void handleSkuSubmit()}
              onSelectSku={handleSelectSku}
              onQuantityChange={setSkuQuantity}
            />
          ) : null}
        </PageShare>
      </PageShell>
    </View>
  ));
});

export default ProductsPage;
