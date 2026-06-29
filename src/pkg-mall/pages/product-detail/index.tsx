import { useMemo, useState } from 'react';
import Taro, { useShareAppMessage } from '@tarojs/taro';
import { RichText, Swiper, SwiperItem, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { AppShareButton } from '@/core/components/AppShareButton';
import { SkuPopup } from '@/core/components/commerce';
import { PageShare, PageShell } from '@/core/components/PageShell';
import { MINI_MAIN_ROUTES, MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { createMallCheckoutDraft } from '@/core/services/mall-checkout-draft';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import type { HkpSkuGroup } from '@/core/types/hkp';
import { formatCurrency } from '@/core/utils/money';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import {
  clampSkuQuantity,
  resolveInitialSkuGroups,
  resolveNextSkuGroupsAfterSelect,
  resolveSkuState,
} from '@/core/utils/sku';
import {
  callWechatPhone,
  previewWechatImages,
  showWechatConfirm,
  showWechatToast,
} from '@/core/utils/wechat-actions';
import { MallCartBadge } from '@/pkg-mall/components/MallCartBadge';
import { useMallCartCount } from '@/pkg-mall/hooks/use-mall-cart-count';
import { addMallCartItem } from '@/pkg-mall/services/cart';
import {
  addMallFavoriteItem,
} from '@/pkg-mall/services/favorites';
import { fetchProductDetailData } from '@/pkg-mall/services/product-detail';
import type { MallProductDetailData, MallSkuVariant } from '@/pkg-mall/services/types';
import './index.scss';

type MallSkuAction = 'cart' | 'buy';

function resolveProductRouteId() {
  return Taro.getCurrentInstance().router?.params?.productId;
}

function resolveProductRouteCouponId() {
  return Taro.getCurrentInstance().router?.params?.couponId || '';
}

// 商品详情首版按截图补齐图集、价格、优惠、评价、推荐和购买底栏，并复用 SKU 弹层闭环。
const ProductDetailPage = observer(function ProductDetailPage() {
  const [detailData, setDetailData] = useState<MallProductDetailData>();
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [skuVisible, setSkuVisible] = useState(false);
  const [skuAction, setSkuAction] = useState<MallSkuAction>('cart');
  const [skuGroups, setSkuGroups] = useState<HkpSkuGroup[]>([]);
  const { cartCount } = useMallCartCount();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchProductDetailData(resolveProductRouteId());
      setDetailData(nextData);
      setSkuGroups(resolveInitialSkuGroups(nextData.skuGroups, nextData.skuVariants));
      setQuantity(1);
    },
  });

  const product = detailData?.product;
  const coupons = detailData?.coupons ?? [];
  const reviews = detailData?.reviews ?? [];
  const recommendProducts = detailData?.recommendProducts ?? [];
  const detailImages = detailData?.detailImages ?? [];
  const detailHtml = detailData?.detailHtml?.trim() || '';
  const gallery = detailData?.gallery ?? [];
  const galleryItems = gallery.length > 0 ? gallery : [''];
  const skuVariants = detailData?.skuVariants ?? [];
  const skuState = useMemo(
    () => resolveSkuState<MallSkuVariant>(skuGroups, skuVariants),
    [skuGroups, skuVariants],
  );
  const selectedVariant = skuState.selectedVariant;
  const skuProduct = product && selectedVariant
    ? {
        ...product,
        image: { src: selectedVariant.imageSrc || product.image.src },
        price: selectedVariant.price,
        subtitle: selectedVariant.skuText,
      }
    : product;
  const displayPrice = selectedVariant?.price ?? product?.price;
  const servicePhone = detailData?.servicePhone?.trim();
  const merchantName = detailData?.merchantName?.trim() || '';
  const attributeLines = detailData?.attributeLines ?? [];
  const hasSkuConfig = skuVariants.length > 0;
  const productUnavailableText = detailData?.unavailableReasons?.[0] || '';
  const productCanBuy = detailData?.canBuy !== false;
  const hasCouponCards = coupons.length > 0;
  const reviewTitle = detailData?.reviewCountText?.trim()
    ? `评论（${detailData.reviewCountText.trim()}）`
    : '评论';
  const hasReviewData = reviews.length > 0;
  const promoText = detailData?.promoText?.trim() || '优惠信息以下单结算页为准';
  const hasDetailContent = Boolean(detailHtml || detailImages.length);

  useShareAppMessage(() => ({
    title: product?.title || '商品详情',
    path: product?.id
      ? `${MINI_PACKAGE_ROUTES.mallProductDetail}?productId=${encodeURIComponent(product.id)}`
      : MINI_PACKAGE_ROUTES.mallHome,
    imageUrl: gallery.find(Boolean) || undefined,
  }));

  const selectedSkuText = skuState.selectedText;

  function openSkuPopup(nextAction: MallSkuAction) {
    if (!productCanBuy) {
      void showWechatToast(productUnavailableText || '当前商品暂不可购买');
      return;
    }
    if (!hasSkuConfig) {
      void showWechatToast('当前商品暂不可下单');
      return;
    }
    setSkuAction(nextAction);
    setSkuVisible(true);
  }

  function handleSelectSku(groupId: string, optionId: string) {
    const nextGroups = resolveNextSkuGroupsAfterSelect(skuGroups, skuVariants, groupId, optionId);
    const nextSkuState = resolveSkuState<MallSkuVariant>(nextGroups, skuVariants);

    setSkuGroups(nextGroups);
    setQuantity((currentQuantity) => clampSkuQuantity(currentQuantity, 1, nextSkuState.maxQuantity));
  }

  async function handleSkuSubmit() {
    if (skuState.submitTip) {
      await showWechatToast(skuState.submitTip);
      return;
    }

    if (!productCanBuy) {
      await showWechatToast(productUnavailableText || '当前商品暂不可购买');
      return;
    }

    if (!product || !selectedVariant) {
      await showWechatToast('当前规格暂时无货，请更换规格');
      return;
    }

    if (skuAction !== 'buy') {
      const authed = await pageRuntime.ensureLogin('登录后可加入购物车');
      if (!authed) return;
    }

    setSkuVisible(false);

    if (skuAction === 'buy') {
      const routeCouponId = resolveProductRouteCouponId();
      const draft = createMallCheckoutDraft({
        selectedCouponId: routeCouponId || undefined,
        products: [{
          id: selectedVariant.id,
          productId: product.id,
          title: product.title,
          specText: selectedVariant.skuText,
          quantity,
          unitPrice: selectedVariant.price,
          imageSrc: selectedVariant.imageSrc || product.image.src,
          merchantName,
          giftText: selectedVariant.giftText,
          canRefund: true,
          canAfterSale: true,
          shippingRule: selectedVariant.shippingRule,
        }],
      });

      if (!draft) {
        await showWechatToast('当前商品暂不可购买');
        return;
      }

      navigateToMiniRoute(`${MINI_PACKAGE_ROUTES.orderCheckout}?draftId=${encodeURIComponent(draft.id)}`);
      return;
    }

    await addMallCartItem({
      ...product,
      image: { src: selectedVariant.imageSrc || product.image.src },
      price: selectedVariant.price,
      subtitle: selectedVariant.skuText,
    }, {
      quantity,
      skuId: selectedVariant.id,
      skuText: selectedVariant.skuText,
      giftText: selectedVariant.giftText,
      shippingRule: selectedVariant.shippingRule,
    });
    await showWechatToast('已加入购物车', 'success');
  }

  async function handleCouponPress() {
    const couponText = coupons
      .map((coupon) => `${coupon.amountText}：${coupon.thresholdText}`)
      .join('\n');

    await showWechatConfirm({
      title: '商品优惠券',
      content: couponText || '当前商品优惠以下单结算页可用结果为准',
      confirmText: '知道了',
      cancelText: '关闭',
    });
  }

  async function handleParamsPress() {
    const paramsContent = [
      ...attributeLines,
      detailData?.shippingSummary ? `配送：${detailData.shippingSummary}` : '',
      detailData?.afterSaleRule ? `售后：${detailData.afterSaleRule}` : '',
    ].filter(Boolean).join('\n');
    await showWechatConfirm({
      title: '商品参数',
      content: paramsContent || (selectedSkuText ? `规格：${selectedSkuText}` : '当前暂无更多参数说明'),
      confirmText: '知道了',
      cancelText: '关闭',
    });
  }

  function handlePreviewGallery(current?: string) {
    void previewWechatImages({
      urls: gallery,
      current,
      emptyText: '暂无商品大图',
    });
  }

  function handlePreviewReviewImages(imageSrcs: string[], current?: string) {
    void previewWechatImages({
      urls: imageSrcs,
      current,
      emptyText: '暂无评价图片',
    });
  }

  function handlePreviewDetailImages(current?: string) {
    void previewWechatImages({
      urls: detailImages,
      current,
      emptyText: '暂无详情图片',
    });
  }

  async function handleFavoritePress() {
    if (!product) return;

    const authed = await pageRuntime.ensureLogin('登录后可收藏商品');
    if (!authed) return;

    try {
      await addMallFavoriteItem(product);
      await showWechatToast('已收藏', 'success');
    } catch (error) {
      await showWechatToast(error instanceof Error ? error.message : '收藏失败，请稍后再试');
    }
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell
        title="商品详情"
        className="_pg-shell"
        reserveTabBarSpace={false}
        scrollViewProps={{}}
        footer={(
          <View className="_pg-footer">
            <View className="_pg-footer_actions">
              <View
                className="_pg-footer_action"
                onClick={() => {
                  navigateToMiniRoute(MINI_MAIN_ROUTES.home);
                }}
              >
                <AppIcon name="home" size={16} color="#6b7280" />
                <Text className="_pg-footer_action-text">首页</Text>
              </View>
              <View
                className="_pg-footer_action"
                onClick={() => {
                  if (!servicePhone) {
                    void showWechatToast('当前商品暂未配置客服电话');
                    return;
                  }
                  void callWechatPhone(servicePhone);
                }}
              >
                <AppIcon name="service" size={16} color="#6b7280" />
                <Text className="_pg-footer_action-text">客服</Text>
              </View>
              <View
                className="_pg-footer_action"
                onClick={() => {
                  navigateToMiniRoute(MINI_PACKAGE_ROUTES.mallCart);
                }}
              >
                <View className="_pg-footer_icon-wrap">
                  <AppIcon name="cart" size={16} color="#6b7280" />
                  <MallCartBadge count={cartCount} />
                </View>
                <Text className="_pg-footer_action-text">购物车</Text>
              </View>
            </View>
            <View className="_pg-footer_buttons">
              <View
                className={`_pg-footer_button _pg-footer_button--cart ${!productCanBuy ? '_pg-footer_button--disabled' : ''}`}
                onClick={() => openSkuPopup('cart')}
              >
                <Text>加入购物车</Text>
              </View>
              <View
                className={`_pg-footer_button _pg-footer_button--buy ${!productCanBuy ? '_pg-footer_button--disabled' : ''}`}
                onClick={() => openSkuPopup('buy')}
              >
                <Text>立即购买</Text>
              </View>
            </View>
          </View>
        )}
      >
          <View className="_pg-page">
            <View className="_pg-gallery">
              <Swiper
                className="_pg-gallery_swiper"
                circular={galleryItems.length > 1}
                onChange={(event) => {
                  setGalleryIndex(event.detail.current);
                }}
              >
                {galleryItems.map((imageSrc, index) => (
                  <SwiperItem key={`${imageSrc}-${index}`}>
                    <View className="_pg-gallery_preview" onClick={() => handlePreviewGallery(imageSrc)}>
                      <AppImage className="_pg-gallery_image" src={imageSrc} mode="aspectFit" emptyState="error" />
                    </View>
                  </SwiperItem>
                ))}
              </Swiper>
              {gallery.length > 1 ? (
                <View className="_pg-gallery_dots">
                  {gallery.map((imageSrc, index) => (
                    <View
                      className={`_pg-gallery_dot ${index === galleryIndex ? '_pg-gallery_dot--active' : ''}`}
                      key={`${imageSrc}-${index}`}
                    />
                  ))}
                </View>
              ) : null}
            </View>

          <View className="_pg-info">
            <View className="_pg-info_price-row">
              <View className="_pg-info_price">
                <Text className="_pg-info_price-current">{formatCurrency(displayPrice ?? 0)}</Text>
                {typeof product?.marketPrice === 'number' ? <Text className="_pg-info_price-origin">{formatCurrency(product.marketPrice)}</Text> : null}
              </View>
              <View className="_pg-info_icons">
                <View
                  className="_pg-info_icon"
                  onClick={() => void handleFavoritePress()}
                >
                  <AppIcon name="heart" size={16} color="#a1a1aa" />
                </View>
                <AppShareButton className="_pg-info_icon" iconColor="#a1a1aa" />
              </View>
            </View>
            <Text className="_pg-info_title">{product?.title}</Text>
          </View>

          <View className="_pg-benefit">
            {!productCanBuy ? (
              <View className="_pg-benefit_row _pg-benefit_row--warning">
                <Text className="_pg-benefit_label">状态</Text>
                <Text className="_pg-benefit_text">{productUnavailableText || '当前商品暂不可购买'}</Text>
              </View>
            ) : null}
            <View className="_pg-benefit_row">
              <Text className="_pg-benefit_label">优惠</Text>
              <View className="_pg-benefit_tag">折扣</View>
              <Text className="_pg-benefit_text">{promoText}</Text>
            </View>
            {hasCouponCards ? (
              <View className="_pg-benefit_row" onClick={() => void handleCouponPress()}>
                <Text className="_pg-benefit_label">领券</Text>
                <View className="_pg-benefit_coupon-list">
                  {coupons.map((coupon) => (
                    <View className="_pg-benefit_coupon" key={coupon.id}>
                      <Text>{coupon.amountText}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View className="_pg-benefit_row">
                <Text className="_pg-benefit_label">优惠券</Text>
                <Text className="_pg-benefit_text">以下单结算页可用优惠为准</Text>
              </View>
            )}
          </View>

          <View className="_pg-cells">
            <View className="_pg-cell" onClick={() => openSkuPopup('cart')}>
              <Text className="_pg-cell_label">选择</Text>
              <Text className="_pg-cell_value">{selectedSkuText || (hasSkuConfig ? '请选择规格' : '查看商品规格')}</Text>
              <AppIcon name="arrowRight" className="_pg-cell_arrow" size={16} color="#a1a1aa" />
            </View>
            <View className="_pg-cell" onClick={() => void handleParamsPress()}>
              <Text className="_pg-cell_label">参数</Text>
              <Text className="_pg-cell_value">{attributeLines[0] || detailData?.shippingSummary || '查看商品参数与配送说明'}</Text>
              <AppIcon name="arrowRight" className="_pg-cell_arrow" size={16} color="#a1a1aa" />
            </View>
          </View>

          <View className="_pg-review">
            <View className="_pg-section_header">
              <Text className="_pg-section_title">{reviewTitle}</Text>
              {hasReviewData ? (
                <View
                  className="_pg-section_more"
                  onClick={() => Taro.navigateTo({ url: `${MINI_PACKAGE_ROUTES.orderReviewList}?productId=${encodeURIComponent(product?.id || '')}` })}
                >
                  <Text>查看更多</Text>
                  <AppIcon name="arrowRight" className="_pg-section_more-icon" size={14} color="#a1a1aa" />
                </View>
              ) : null}
            </View>
            {hasReviewData ? reviews.map((review) => (
              <View className="_pg-review_card" key={review.id}>
                <View className="_pg-review_tags">
                  {review.tags.map((tag) => (
                    <View className="_pg-review_tag" key={tag}>
                      <Text>{tag}</Text>
                    </View>
                  ))}
                </View>
                <Text className="_pg-review_author">{review.author}</Text>
                <Text className="_pg-review_meta">
                  {[typeof review.rating === 'number' ? `${review.rating}分` : '', review.createdAt ? review.createdAt.slice(0, 10) : '']
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                <Text className="_pg-review_content">{review.content}</Text>
                <View className="_pg-review_images">
                  {review.imageSrcs.map((imageSrc, index) => (
                    <AppImage
                      className="_pg-review_image"
                      src={imageSrc}
                      mode="aspectFill"
                      emptyState="error"
                      key={`${review.id}-${index}`}
                      onClick={() => handlePreviewReviewImages(review.imageSrcs, imageSrc)}
                    />
                  ))}
                </View>
              </View>
            )) : (
              <BaseEmpty
                className="_pg-review_empty"
                title="暂无商品评价"
                description="该商品暂时还没有可展示的评价内容"
              />
            )}
          </View>

          <View className="_pg-recommend">
            <View className="_pg-section_header">
              <Text className="_pg-section_title">为你推荐</Text>
            </View>
            <View className="_pg-recommend_list">
              {recommendProducts.map((recommendProduct) => (
                <View
                  className="_pg-recommend_item"
                  key={recommendProduct.id}
                  onClick={() => {
                    Taro.navigateTo({ url: `${MINI_PACKAGE_ROUTES.mallProductDetail}?productId=${recommendProduct.id}` });
                  }}
                >
                  <AppImage className="_pg-recommend_image" src={recommendProduct.image.src} mode="aspectFit" emptyState="error" />
                  <Text className="_pg-recommend_title">{recommendProduct.title}</Text>
                  <Text className="_pg-recommend_price">{formatCurrency(recommendProduct.price)}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="_pg-detail">
            <View className="_pg-section_header">
              <Text className="_pg-section_title">商品详情</Text>
            </View>
            {detailHtml ? (
              <View className="_pg-detail_card">
                <RichText className="_pg-detail_rich-text" nodes={detailHtml} />
              </View>
            ) : null}
            {detailImages.map((imageSrc, index) => (
              <AppImage
                className="_pg-detail_image _pg-detail_image--extra"
                src={imageSrc}
                mode="aspectFill"
                emptyState="error"
                key={`${imageSrc}-${index}`}
                onClick={() => handlePreviewDetailImages(imageSrc)}
              />
            ))}
            {!hasDetailContent ? (
              <View className="_pg-detail_card _pg-detail_card--fallback">
                <AppImage className="_pg-detail_image _pg-detail_image--fallback" src="" mode="aspectFit" emptyState="error" />
              </View>
            ) : null}
          </View>
        </View>

        <PageShare>
          {skuProduct ? (
            <SkuPopup
              visible={skuVisible}
              product={skuProduct}
              skuGroups={skuState.groups}
              quantity={quantity}
              totalAmount={selectedVariant?.price ?? skuProduct.price}
              selectionText={skuState.missingSelectionText || (skuState.selectedText ? `已选 ${skuState.selectedText}` : '')}
              stockText={skuState.stockText}
              maxQuantity={skuState.maxQuantity}
              submitDisabled={!productCanBuy || !hasSkuConfig || !skuState.isPurchasable}
              submitText={skuAction === 'buy' ? '立即购买' : '加入购物车'}
              onClose={() => setSkuVisible(false)}
              onSubmit={() => void handleSkuSubmit()}
              onSelectSku={handleSelectSku}
              onQuantityChange={setQuantity}
            />
          ) : null}
        </PageShare>
      </PageShell>
    </View>
  ));
});

export default ProductDetailPage;
