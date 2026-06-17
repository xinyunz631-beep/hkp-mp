import { useMemo, useState } from 'react';
import Taro, { useShareAppMessage } from '@tarojs/taro';
import { RichText, Swiper, SwiperItem, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { AppShareButton } from '@/core/components/AppShareButton';
import { SkuPopup } from '@/core/components/commerce';
import { PageShare, PageShell } from '@/core/components/PageShell';
import { MINI_MAIN_ROUTES, MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { createMallCheckoutDraft } from '@/core/services/mall-checkout-draft';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import type { HkpSkuGroup } from '@/core/types/hkp';
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
import { addMallFavoriteItem } from '@/pkg-mall/services/favorites';
import { fetchProductDetailData } from '@/pkg-mall/services/product-detail';
import type { MallProductDetailData, MallSkuVariant } from '@/pkg-mall/services/mock-data';
import './index.scss';

type MallSkuAction = 'cart' | 'buy';

const MALL_SERVICE_PHONE = '4009778899';

function resolveProductRouteId() {
  return Taro.getCurrentInstance().router?.params?.productId;
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
  const gallery = detailData?.gallery ?? [];
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

  useShareAppMessage(() => ({
    title: product?.title || 'Hello Kitty 乐园官方商城',
    path: product?.id
      ? `${MINI_PACKAGE_ROUTES.mallProductDetail}?productId=${encodeURIComponent(product.id)}`
      : MINI_PACKAGE_ROUTES.mallHome,
    imageUrl: gallery.find(Boolean) || undefined,
  }));

  const selectedSkuText = skuState.selectedText;

  function openSkuPopup(nextAction: MallSkuAction) {
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
      const draft = createMallCheckoutDraft({
        products: [{
          id: selectedVariant.id,
          productId: product.id,
          title: product.title,
          specText: selectedVariant.skuText,
          quantity,
          unitPrice: selectedVariant.price,
          imageSrc: selectedVariant.imageSrc || product.image.src,
          merchantName: 'Hello Kitty 官方商城',
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
      content: couponText || '当前暂无可领取优惠券',
      confirmText: '知道了',
      cancelText: '关闭',
    });
  }

  async function handleParamsPress() {
    await showWechatConfirm({
      title: '商品参数',
      content: `品牌：Hello Kitty Park\n规格：${selectedSkuText || '默认规格'}\n材质：亲肤毛绒面料`,
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

    addMallFavoriteItem(product);
    await showWechatToast('已收藏', 'success');
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
                  Taro.switchTab({ url: MINI_MAIN_ROUTES.home });
                }}
              >
                <AppIcon name="home" size={16} color="#6b7280" />
                <Text className="_pg-footer_action-text">首页</Text>
              </View>
              <View
                className="_pg-footer_action"
                onClick={() => {
                  void callWechatPhone(MALL_SERVICE_PHONE);
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
              <View className="_pg-footer_button _pg-footer_button--cart" onClick={() => openSkuPopup('cart')}>
                <Text>加入购物车</Text>
              </View>
              <View className="_pg-footer_button _pg-footer_button--buy" onClick={() => openSkuPopup('buy')}>
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
              circular
              onChange={(event) => {
                setGalleryIndex(event.detail.current);
              }}
            >
              {gallery.map((imageSrc, index) => (
                <SwiperItem key={`${imageSrc}-${index}`}>
                  <View className="_pg-gallery_preview" onClick={() => handlePreviewGallery(imageSrc)}>
                    <AppImage className="_pg-gallery_image" src={imageSrc} mode="aspectFit" emptyState="error" />
                  </View>
                </SwiperItem>
              ))}
            </Swiper>
            <View className="_pg-gallery_dots">
              {gallery.map((imageSrc, index) => (
                <View
                  className={`_pg-gallery_dot ${index === galleryIndex ? '_pg-gallery_dot--active' : ''}`}
                  key={`${imageSrc}-${index}`}
                />
              ))}
            </View>
          </View>

          <View className="_pg-info">
            <View className="_pg-info_price-row">
              <View className="_pg-info_price">
                <Text className="_pg-info_price-current">¥{displayPrice}</Text>
                <Text className="_pg-info_price-origin">¥{product?.marketPrice}</Text>
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
            <View className="_pg-benefit_row">
              <Text className="_pg-benefit_label">优惠</Text>
              <View className="_pg-benefit_tag">折扣</View>
              <Text className="_pg-benefit_text">{detailData?.promoText}</Text>
            </View>
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
          </View>

          <View className="_pg-cells">
            <View className="_pg-cell" onClick={() => openSkuPopup('cart')}>
              <Text className="_pg-cell_label">选择</Text>
              <Text className="_pg-cell_value">{selectedSkuText || '颜色、尺码'}</Text>
              <AppIcon name="arrowRight" className="_pg-cell_arrow" size={16} color="#a1a1aa" />
            </View>
            <View className="_pg-cell" onClick={() => void handleParamsPress()}>
              <Text className="_pg-cell_label">参数</Text>
              <Text className="_pg-cell_value">品牌、型号、材质...</Text>
              <AppIcon name="arrowRight" className="_pg-cell_arrow" size={16} color="#a1a1aa" />
            </View>
          </View>

          <View className="_pg-review">
            <View className="_pg-section_header">
              <Text className="_pg-section_title">评论（{detailData?.reviewCountText || reviews.length}）</Text>
              <View className="_pg-section_more" onClick={() => Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.orderReviewList })}>
                <Text>查看更多</Text>
                <AppIcon name="arrowRight" className="_pg-section_more-icon" size={14} color="#a1a1aa" />
              </View>
            </View>
            {reviews.map((review) => (
              <View className="_pg-review_card" key={review.id}>
                <View className="_pg-review_tags">
                  {review.tags.map((tag) => (
                    <View className="_pg-review_tag" key={tag}>
                      <Text>{tag}</Text>
                    </View>
                  ))}
                </View>
                <Text className="_pg-review_author">{review.author}</Text>
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
            ))}
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
                  <Text className="_pg-recommend_price">¥ {recommendProduct.price}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="_pg-detail">
            <View className="_pg-section_header">
              <Text className="_pg-section_title">商品详情</Text>
            </View>
            <View className="_pg-detail_card">
              <RichText className="_pg-detail_rich-text" nodes={detailData?.detailHtml || ''} />
            </View>
            {detailImages.slice(1).map((imageSrc, index) => (
              <AppImage
                className="_pg-detail_image _pg-detail_image--extra"
                src={imageSrc}
                mode="aspectFill"
                emptyState="error"
                key={`${imageSrc}-${index}`}
                onClick={() => handlePreviewDetailImages(imageSrc)}
              />
            ))}
          </View>
        </View>

        <PageShare>
          {skuProduct ? (
            <SkuPopup
              visible={skuVisible}
              product={skuProduct}
              skuGroups={skuState.groups}
              quantity={quantity}
              totalAmount={(selectedVariant?.price ?? skuProduct.price) * quantity}
              selectionText={skuState.missingSelectionText || (skuState.selectedText ? `已选 ${skuState.selectedText}` : '')}
              stockText={skuState.stockText}
              maxQuantity={skuState.maxQuantity}
              submitDisabled={!skuState.isPurchasable}
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
