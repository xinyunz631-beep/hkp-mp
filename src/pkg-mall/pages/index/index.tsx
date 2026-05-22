import { useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Swiper, SwiperItem, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { SkuPopup } from '@/core/components/commerce';
import { PageHeader, PageShare, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES, type MiniPackageRoute } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import type { HkpSkuGroup } from '@/core/types/hkp';
import { navigateToMiniRoute } from '@/core/utils/navigation';
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
import { fetchMallHomeData } from '@/pkg-mall/services';
import { addMallCartItem } from '@/pkg-mall/services/cart';
import { fetchProductDetailData } from '@/pkg-mall/services/product-detail';
import type {
  MallCategoryItem,
  MallHomeData,
  MallProductDetailData,
  MallPromoCard,
  MallSkuVariant,
} from '@/pkg-mall/services/mock-data';
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

const promoAccentClassMap = {
  purple: '_pg-promo_card--purple',
  orange: '_pg-promo_card--orange',
  pink: '_pg-promo_card--pink',
} as const;

// 商城首页首版按截图还原搜索、轮播、分类、活动卡和推荐商品，并串起核心购买入口。
const MallIndexPage = observer(function MallIndexPage() {
  const [homeData, setHomeData] = useState<MallHomeData>();
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [skuVisible, setSkuVisible] = useState(false);
  const [skuDetailData, setSkuDetailData] = useState<MallProductDetailData>();
  const [skuGroups, setSkuGroups] = useState<HkpSkuGroup[]>([]);
  const [skuQuantity, setSkuQuantity] = useState(1);
  const { cartCount } = useMallCartCount();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchMallHomeData();
      setHomeData(nextData);
    },
  });

  const banners = homeData?.banners ?? [];
  const categories = homeData?.categories ?? [];
  const promos = homeData?.promos ?? [];
  const products = homeData?.products ?? [];
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

  function openPackagePage(path: MiniPackageRoute) {
    if (path === MINI_PACKAGE_ROUTES.mallHome) return;
    navigateToMiniRoute(path);
  }

  function handleSearch() {
    Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.mallSearch });
  }

  function handleCategoryPress(item: MallCategoryItem) {
    openPackagePage(item.path as MiniPackageRoute);
  }

  function handlePromoPress(card: MallPromoCard) {
    openPackagePage(card.path as MiniPackageRoute);
  }

  function handleProductPress(productId: string) {
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

  async function handleAddToCart(product: MallHomeData['products'][number]) {
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

  function handleFooterPress(item: MallFooterItem) {
    openPackagePage(item.path);
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell
        title="购物"
        className="_pg-shell"
        reserveTabBarSpace={false}
        scrollViewProps={{}}
        footer={(
          <View className="_pg-footer">
            {mallFooterItems.map((item) => {
              const active = item.key === 'home';

              return (
                <View
                  className={`_pg-footer_item ${active ? '_pg-footer_item--active' : ''}`}
                  key={item.key}
                  onClick={() => handleFooterPress(item)}
                >
                  <View className="_pg-footer_icon-wrap">
                    <AppIcon
                      name={item.icon}
                      className="_pg-footer_icon"
                      size={16}
                      color={active ? '#db2777' : '#222222'}
                    />
                    {item.key === 'cart' ? <MallCartBadge count={cartCount} /> : null}
                  </View>
                  <Text className="_pg-footer_text">{item.title}</Text>
                </View>
              );
            })}
          </View>
        )}
      >
        <PageHeader>
          <View className="_pg-header">
            <View className="_pg-search" onClick={handleSearch}>
              <AppIcon name="search" className="_pg-search_icon" size={16} color="#c0c4cc" />
              <Text className="_pg-search_placeholder">搜索乐园好物</Text>
            </View>
          </View>
        </PageHeader>

        <View className="_pg-page">
          <View className="_pg-hero">
            <Swiper
              className="_pg-hero_swiper"
              autoplay
              circular
              interval={4500}
              onChange={(event) => {
                setActiveBannerIndex(event.detail.current);
              }}
            >
              {banners.map((banner) => (
                <SwiperItem key={banner.id}>
                  <View className="_pg-hero_item" onClick={() => openPackagePage(banner.path as MiniPackageRoute)}>
                    <AppImage className="_pg-hero_image" src={banner.imageSrc} mode="aspectFill" emptyState="error" />
                    <View className="_pg-hero_mask" />
                    <View className="_pg-hero_copy">
                      <Text className="_pg-hero_title">{banner.title}</Text>
                      <Text className="_pg-hero_subtitle">{banner.subtitle}</Text>
                    </View>
                  </View>
                </SwiperItem>
              ))}
            </Swiper>
            <View className="_pg-hero_dots">
              {banners.map((banner, index) => (
                <View
                  className={`_pg-hero_dot ${index === activeBannerIndex ? '_pg-hero_dot--active' : ''}`}
                  key={banner.id}
                />
              ))}
            </View>
          </View>

          <View className="_pg-category">
            {categories.map((item) => (
              <View className="_pg-category_item" key={item.id} onClick={() => handleCategoryPress(item)}>
                <View className="_pg-category_icon">
                  <AppImage
                    className="_pg-category_icon-image"
                    src={item.iconSrc}
                    mode="aspectFit"
                    emptyState="error"
                  />
                </View>
                <Text className="_pg-category_text">{item.title}</Text>
              </View>
            ))}
          </View>

          <View className="_pg-promo">
            {promos.map((card, index) => (
              <View
                className={`_pg-promo_card ${promoAccentClassMap[card.accent]} ${index === 0 ? '_pg-promo_card--large' : '_pg-promo_card--small'}`}
                key={card.id}
                onClick={() => handlePromoPress(card)}
              >
                <View className="_pg-promo_content">
                  <Text className="_pg-promo_title">{card.title}</Text>
                  <Text className="_pg-promo_subtitle">{card.subtitle}</Text>
                  <View className="_pg-promo_arrow">
                    <AppIcon name="arrowRight" size={14} color="#ffffff" />
                  </View>
                </View>
                <AppImage className="_pg-promo_image" src={card.imageSrc} mode="aspectFit" emptyState="error" />
              </View>
            ))}
          </View>

          <View className="_pg-section">
            <View className="_pg-section_header">
              <View className="_pg-section_mark" />
              <Text className="_pg-section_title">好物推荐</Text>
            </View>
            <View className="_pg-product-grid">
              {products.map((product) => (
                <View className="_pg-product-card" key={product.id} onClick={() => handleProductPress(product.id)}>
                  <AppImage className="_pg-product-card_image" src={product.image.src} mode="aspectFit" emptyState="error" />
                  <View className="_pg-product-card_body">
                    <Text className="_pg-product-card_title">{product.title}</Text>
                    <View className="_pg-product-card_footer">
                      <Text className="_pg-product-card_price">¥{product.price}</Text>
                      <View
                        className="_pg-product-card_cart"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleAddToCart(product);
                        }}
                      >
                        <AppIcon name="cartAdd" size={14} color="#ffffff" />
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
        <PageShare>
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

export default MallIndexPage;
