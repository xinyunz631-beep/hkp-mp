import { useEffect, useMemo, useRef, useState } from 'react';
import Taro from '@tarojs/taro';
import { ScrollView, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { SkuPopup } from '@/core/components/commerce';
import { PageHeader, PageShare, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES, type MiniPackageRoute } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import type { HkpProductSummary, HkpSkuGroup } from '@/core/types/hkp';
import { formatCurrency } from '@/core/utils/money';
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
import { fetchCategoryData } from '@/pkg-mall/services/category';
import { fetchProductDetailData } from '@/pkg-mall/services/product-detail';
import type { MallProductDetailData, MallSkuVariant } from '@/pkg-mall/services/types';
import './index.scss';

interface MallFooterItem {
  key: string;
  title: string;
  icon: 'home' | 'cart' | 'order';
  path: MiniPackageRoute;
}

interface CategorySectionOffset {
  id: string;
  top: number;
}

interface CategorySectionRect {
  id?: string;
  top?: number;
}

const mallFooterItems: MallFooterItem[] = [
  { key: 'home', title: '首页', icon: 'home', path: MINI_PACKAGE_ROUTES.mallHome },
  { key: 'cart', title: '购物车', icon: 'cart', path: MINI_PACKAGE_ROUTES.mallCart },
  { key: 'order', title: '我的订单', icon: 'order', path: MINI_PACKAGE_ROUTES.orderHome },
];

const SECTION_SCROLL_THRESHOLD = 72;
const CATEGORY_SECTION_ID_PREFIX = 'mall-category-section';
const CATEGORY_NAV_ID_PREFIX = 'mall-category-nav';

function resolveCategorySectionId(categoryId: string) {
  return `${CATEGORY_SECTION_ID_PREFIX}-${categoryId}`;
}

function resolveCategoryNavId(categoryId: string) {
  return `${CATEGORY_NAV_ID_PREFIX}-${categoryId}`;
}

// 商城分类页使用左右独立滚动结构，右侧按当前分类展示商品列表并支持快捷加购。
const CategoryPage = observer(function CategoryPage() {
  const [categoryData, setCategoryData] = useState<Awaited<ReturnType<typeof fetchCategoryData>>>();
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const [mainScrollIntoView, setMainScrollIntoView] = useState('');
  const [skuVisible, setSkuVisible] = useState(false);
  const [skuDetailData, setSkuDetailData] = useState<MallProductDetailData>();
  const [skuGroups, setSkuGroups] = useState<HkpSkuGroup[]>([]);
  const [skuQuantity, setSkuQuantity] = useState(1);
  const sectionOffsetsRef = useRef<CategorySectionOffset[]>([]);
  const { cartCount } = useMallCartCount();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchCategoryData();
      setCategoryData(nextData);
      setActiveCategoryId(nextData.activeCategoryId);
    },
  });

  const categories = categoryData?.categories ?? [];
  const panels = categoryData?.panels ?? [];
  const currentCategoryId = activeCategoryId || categoryData?.activeCategoryId || '';
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

  function measureCategorySections() {
    Taro.nextTick(() => {
      const query = Taro.createSelectorQuery();
      query.selectAll('._pg-category-section').boundingClientRect();
      query.exec((results) => {
        const rects = (results?.[0] || []) as CategorySectionRect[];
        const firstTop = rects[0]?.top ?? 0;

        sectionOffsetsRef.current = rects
          .filter((rect): rect is Required<CategorySectionRect> => Boolean(rect.id && typeof rect.top === 'number'))
          .map((rect) => ({
            id: rect.id.replace(`${CATEGORY_SECTION_ID_PREFIX}-`, ''),
            top: Math.max(0, rect.top - firstTop),
          }));
      });
    });
  }

  useEffect(() => {
    if (panels.length === 0) return undefined;

    const measureTimer = setTimeout(measureCategorySections, 120);

    return () => {
      clearTimeout(measureTimer);
    };
  }, [categoryData?.panels]);

  function openPackagePage(path: MiniPackageRoute) {
    navigateToMiniRoute(path);
  }

  function handleCategoryPress(categoryId: string) {
    setActiveCategoryId(categoryId);
    setMainScrollIntoView(resolveCategorySectionId(categoryId));
  }

  function handleMainScroll(scrollTop: number) {
    const offsets = sectionOffsetsRef.current;
    if (offsets.length === 0) return;

    const matchedOffset = [...offsets]
      .reverse()
      .find((offset) => scrollTop + SECTION_SCROLL_THRESHOLD >= offset.top);

    if (matchedOffset && matchedOffset.id !== activeCategoryId) {
      setActiveCategoryId(matchedOffset.id);
    }
  }

  function handleProductPress(productId: string) {
    Taro.navigateTo({
      url: `${MINI_PACKAGE_ROUTES.mallProductDetail}?productId=${encodeURIComponent(productId)}`,
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
      skuId: variant?.id,
      skuText: variant?.skuText || detailData.product.subtitle || '',
      giftText: variant?.giftText,
      shippingRule: variant?.shippingRule,
    });
    await showWechatToast('已加入购物车', 'success');
  }

  async function handleChooseSkuFromCategory(product: HkpProductSummary) {
    let nextDetailData: MallProductDetailData | undefined;

    await pageRuntime.withLoading(async () => {
      nextDetailData = await fetchProductDetailData(product.id);
    });

    if (!nextDetailData) return;

    const salableVariants = getSalableSkuVariants(nextDetailData.skuVariants);

    if (nextDetailData.skuVariants.length > 0 && salableVariants.length === 0) {
      await showWechatToast('当前商品暂时无货');
      return;
    }

    if (!shouldOpenQuickSkuPopup(nextDetailData.skuVariants)) {
      await addDetailSkuToCart(nextDetailData, salableVariants[0], 1);
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
        title="商城分类"
        navbar={false}
        className="_pg-shell"
        reserveTabBarSpace={false}
        scrollView={false}
        footer={(
          <View className="_pg-footer">
            {mallFooterItems.map((item) => (
              <View className="_pg-footer_item" key={item.key} onClick={() => openPackagePage(item.path)}>
                <View className="_pg-footer_icon-wrap">
                  <AppIcon
                    name={item.icon}
                    className="_pg-footer_icon"
                    size={16}
                    color={item.key === 'home' ? '#ec6d9c' : '#222222'}
                  />
                  {item.key === 'cart' ? <MallCartBadge count={cartCount} /> : null}
                </View>
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
              <Text className="_pg-header_search-placeholder">{categoryData?.query || '搜索商品'}</Text>
            </View>
          </View>
        </PageHeader>

        <View className="_pg-page">
          <View className="_pg-layout">
            <ScrollView
              className="_pg-sidebar-scroll"
              scrollY
              enhanced
              showScrollbar={false}
              scrollIntoView={currentCategoryId ? resolveCategoryNavId(currentCategoryId) : undefined}
              scrollWithAnimation
            >
              <View className="_pg-sidebar">
                {categories.map((item) => {
                  const active = item.id === currentCategoryId;

                  return (
                    <View
                      className={`_pg-sidebar_item ${active ? '_pg-sidebar_item--active' : ''}`}
                      id={resolveCategoryNavId(item.id)}
                      key={item.id}
                      onClick={() => handleCategoryPress(item.id)}
                    >
                      {active ? <View className="_pg-sidebar_indicator" /> : null}
                      <Text>{item.title}</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            <ScrollView
              className="_pg-main-scroll"
              scrollY
              enhanced
              showScrollbar={false}
              scrollIntoView={mainScrollIntoView || undefined}
              scrollWithAnimation
              onScroll={(event) => handleMainScroll(Number(event.detail.scrollTop || 0))}
            >
              <View className="_pg-main">
                {panels.map((panel) => (
                  <View className="_pg-category-section" id={resolveCategorySectionId(panel.id)} key={panel.id}>
                    <View className="_pg-category-section_header">
                      <View>
                        <Text className="_pg-category-section_title">{panel.title}</Text>
                        <Text className="_pg-category-section_subtitle">{panel.subtitle}</Text>
                      </View>
                      <Text className="_pg-category-section_count">{panel.products.length}件</Text>
                    </View>

                    <View className="_pg-product-list">
                      {panel.products.map((product, productIndex) => (
                        <View
                          className="_pg-product"
                          key={`${panel.id}-${product.id}-${productIndex}`}
                          onClick={() => handleProductPress(product.id)}
                        >
                          <AppImage className="_pg-product_image" src={product.image.src} mode="aspectFit" emptyState="error" />
                          <View className="_pg-product_body">
                            {product.tag ? <Text className="_pg-product_tag">{product.tag}</Text> : null}
                            <Text className="_pg-product_title">{product.title}</Text>
                            {product.subtitle ? <Text className="_pg-product_subtitle">{product.subtitle}</Text> : null}
                            {product.salesText ? <Text className="_pg-product_sales">{product.salesText}</Text> : null}
                            <View className="_pg-product_footer">
                              <View className="_pg-product_price-row">
                                <Text className="_pg-product_price-symbol">¥</Text>
                                <Text className="_pg-product_price">{formatCurrency(product.price, { showSymbol: false })}</Text>
                                {typeof product.marketPrice === 'number' ? (
                                  <Text className="_pg-product_market">{formatCurrency(product.marketPrice)}</Text>
                                ) : null}
                              </View>
                              <View
                                className="_pg-product_cart"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleChooseSkuFromCategory(product);
                                }}
                              >
                                <AppIcon name="cartAdd" size={16} color="#ffffff" />
                              </View>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
        <PageShare>
          {skuProduct ? (
            <SkuPopup
              visible={skuVisible}
              product={skuProduct}
              skuGroups={skuState.groups}
              quantity={skuQuantity}
              totalAmount={selectedVariant?.price ?? skuProduct.price}
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

export default CategoryPage;
