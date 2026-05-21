import { useEffect, useMemo, useState } from 'react';
import Taro, { useShareAppMessage } from '@tarojs/taro';
import { ScrollView, Text, View } from '@tarojs/components';
import type { ScrollViewProps } from '@tarojs/components';
import { Badge, Sticky } from '@nutui/nutui-react-taro';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { AppShareButton } from '@/core/components/AppShareButton';
import { CouponSelectionPopup, DateSelectionPopup, QuantityStepper } from '@/core/components/commerce';
import { AppPopup } from '@/core/components/AppPopup';
import { PageShare, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import {
  callWechatPhone,
  openWechatLocation,
  previewWechatImages,
  showWechatConfirm,
  showWechatToast,
} from '@/core/utils/wechat-actions';
import { TicketSubmitFooter } from '@/pkg-ticket/components/TicketSubmitFooter';
import { createTicketOrderDraft } from '@/pkg-ticket/services/order-draft';
import {
  fetchTicketBookingData,
  type TicketBookingData,
  type TicketPackageProduct,
  type TicketProduct,
  type TicketBookingSection,
  type TicketBookingSectionKey,
} from '@/pkg-ticket/services/ticket-booking';
import './index.scss';

interface TicketQuantityMap {
  [productId: string]: number;
}

interface ProductCardProps {
  product: TicketProduct;
  quantity: number;
  onQuantityChange: (value: number) => void;
  onShowRules: () => void;
}

interface TicketBookingHeroProps {
  imageCount: number;
  imageSrcs: string[];
  onPreview: () => void;
}

interface TicketPackageCardProps {
  product: TicketPackageProduct;
  onReserve: (product: TicketPackageProduct) => void;
}

type TicketScrollHandler = NonNullable<ScrollViewProps['onScroll']>;

type TicketSectionOffsets = Partial<Record<TicketBookingSectionKey, number>>;

function getTicketSectionId(key: TicketBookingSectionKey) {
  return `ticket-booking-section-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function TicketShareButton() {
  return (
    <AppShareButton className="_pg-share-button" iconSize={18} iconColor="#555" />
  );
}

function TicketBookingTabs({
  sections,
  activeKey,
  onChange,
}: {
  sections: TicketBookingSection[];
  activeKey: TicketBookingSectionKey;
  onChange: (key: TicketBookingSectionKey) => void;
}) {
  const scrollable = sections.length > 3;
  const tabItems = sections.map((item) => {
    const tabText = <Text className="_pg-tabs_text">{item.title}</Text>;

    return (
      <View
        className={`_pg-tabs_item ${activeKey === item.key ? '_pg-tabs_item--active' : ''}`}
        key={item.key}
        onClick={() => onChange(item.key)}
      >
        {item.badge ? (
          <Badge
            className="_pg-tabs_badge"
            value={item.badge.text}
            color={item.badge.color}
            top={-6}
            right={-6}
          >
            {tabText}
          </Badge>
        ) : tabText}
      </View>
    );
  });

  if (!scrollable) {
    return (
      <View className="_pg-tabs _pg-tabs--spread">
        {tabItems}
      </View>
    );
  }

  return (
    <ScrollView className="_pg-tabs-scroll" scrollX enhanced showScrollbar={false}>
      <View className="_pg-tabs-scroll_inner">
        {tabItems}
      </View>
    </ScrollView>
  );
}

function getProductsForSection(section: TicketBookingSection, products: TicketProduct[]) {
  if (section.type === 'package') return [];

  const sectionProducts = products.filter((product) => product.category === section.type);

  if (!section.productIds?.length) return sectionProducts;

  return section.productIds
    .map((productId) => products.find((product) => product.id === productId))
    .filter((product): product is TicketProduct => Boolean(product));
}

function getPackagesForSection(section: TicketBookingSection, packages: TicketPackageProduct[]) {
  if (!section.packageIds?.length) return packages;

  return section.packageIds
    .map((packageId) => packages.find((product) => product.id === packageId))
    .filter((product): product is TicketPackageProduct => Boolean(product));
}

function hasTicketSectionContent(
  section: TicketBookingSection,
  products: TicketProduct[],
  packages: TicketPackageProduct[],
) {
  if (section.type === 'package') return getPackagesForSection(section, packages).length > 0;

  return getProductsForSection(section, products).length > 0;
}

function createInitialQuantities(products: TicketProduct[]) {
  return products.reduce<TicketQuantityMap>((result, product) => {
    result[product.id] = product.defaultQuantity ?? 0;
    return result;
  }, {});
}

function TicketBookingHero({ imageCount, imageSrcs, onPreview }: TicketBookingHeroProps) {
  const imageSrc = imageSrcs[0] || '';
  const hasPreviewImages = imageSrcs.some(Boolean);
  const resolvedImageCount = hasPreviewImages ? imageCount : 0;

  return (
    <View className="_pg-hero">
      <View className="_pg-hero_image-wrap" onClick={onPreview}>
        <AppImage className="_pg-hero_image" src={imageSrc} mode="aspectFill" />
      </View>
      {resolvedImageCount > 0 ? (
        <Text className="_pg-hero_count" onClick={onPreview}>图片{resolvedImageCount}张</Text>
      ) : null}
    </View>
  );
}

function TicketBookingInfo({
  data,
  onShowRules,
}: {
  data: TicketBookingData;
  onShowRules: () => void;
}) {
  const { parkInfo } = data;

  return (
    <View className="_pg-info">
      <View className="_pg-info_row">
        <View className="_pg-info_content">
          <Text className="_pg-info_text">
            开放时间：
            <Text className="_pg-info_strong">{parkInfo.openTime}</Text>
          </Text>
        </View>
        <View className="_pg-info_link" onClick={onShowRules}>
          详情须知
          <AppIcon name="arrowRight" className="_pg-info_chevron" size={16} color="#c0c5cf" />
        </View>
      </View>
      <View className="_pg-info_divider" />
      <View className="_pg-info_row">
        <View className="_pg-info_content">
          <Text className="_pg-info_text">
            客服电话：
            <Text>{parkInfo.hotline}</Text>
          </Text>
        </View>
        <View
          className="_pg-info_link"
          onClick={() => {
            void callWechatPhone(parkInfo.hotline);
          }}
        >
          拨打
          <AppIcon name="arrowRight" className="_pg-info_chevron" size={16} color="#c0c5cf" />
        </View>
      </View>
      <View className="_pg-info_divider" />
      <View className="_pg-info_row">
        <View className="_pg-info_content">
          <Text className="_pg-info_text">
            地址：
            <Text>{parkInfo.address}</Text>
          </Text>
        </View>
        <View
          className="_pg-info_link"
          onClick={() => openWechatLocation(parkInfo.mapLocation)}
        >
          地图
          <AppIcon name="arrowRight" className="_pg-info_chevron" size={16} color="#c0c5cf" />
        </View>
      </View>
    </View>
  );
}

function TicketBookingDateRow({
  travelDate,
  expanded,
  onToggle,
}: {
  travelDate: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View className="_pg-date" onClick={onToggle}>
      <Text className="_pg-date_label">游玩日期</Text>
      <View className="_pg-date_value">
        <Text>{travelDate}</Text>
        <AppIcon
          name="arrowRight"
          className={`_pg-date_chevron ${expanded ? '_pg-date_chevron--expanded' : ''}`}
          size={16}
          color="#c0c5cf"
        />
      </View>
    </View>
  );
}

function TicketBookingCouponRow({
  couponText,
  onClick,
}: {
  couponText: string;
  onClick: () => void;
}) {
  return (
    <View className="_pg-coupon" onClick={onClick}>
      <Text className="_pg-coupon_label">优惠券</Text>
      <View className="_pg-coupon_value">
        <Text>{couponText}</Text>
        <AppIcon name="arrowRight" className="_pg-coupon_chevron" size={16} color="#c0c5cf" />
      </View>
    </View>
  );
}

function TicketSectionTitle({
  title,
  rightText,
  onRightClick,
}: {
  title: string;
  rightText?: string;
  onRightClick?: () => void;
}) {
  return (
    <View className="_pg-section-title">
      <Text className="_pg-section-title_left">{title}</Text>
      {rightText ? (
        <Text className="_pg-section-title_right" onClick={onRightClick}>{rightText}</Text>
      ) : null}
    </View>
  );
}

function ProductCard({ product, quantity, onQuantityChange, onShowRules }: ProductCardProps) {
  return (
    <View className="_pg-product">
      <View className="_pg-product_main">
        <Text className="_pg-product_title">{product.title}</Text>
        <Text className="_pg-product_desc">{product.description}</Text>
        <View className="_pg-product_tags">
          {product.tags.map((tag) => (
            <Text className="_pg-product_tag" key={tag}>{tag}</Text>
          ))}
        </View>
        <View className="_pg-product_notice" onClick={onShowRules}>
          <Text>{product.noticeText}</Text>
          <AppIcon name="ask" className="_pg-product_notice-icon" size={10} color="#999999" />
        </View>
      </View>
      <View className="_pg-product_price-box">
        <Text className="_pg-product_price-label">{product.priceLabel}</Text>
        <Text className="_pg-product_price">¥{product.price}</Text>
      </View>
      <View className="_pg-product_stepper-wrap">
        <QuantityStepper className="_pg-product_stepper" value={quantity} min={0} onChange={onQuantityChange} />
      </View>
    </View>
  );
}

function TicketPackageCard({ product, onReserve }: TicketPackageCardProps) {
  return (
    <View className="_pg-package-card">
      <AppImage className="_pg-package-card_image" src={product.imageSrc} mode="aspectFill" />
      <View className="_pg-package-card_body">
        <Text className="_pg-package-card_title">{product.title}</Text>
        <Text className="_pg-package-card_sold">{product.soldText}</Text>
        <View className="_pg-package-card_footer">
          <Text className="_pg-package-card_price">{product.priceText}</Text>
          <View className="_pg-package-card_button" onClick={() => onReserve(product)}>
            <Text>立即预订</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const TicketBookingPage = observer(function TicketBookingPage() {
  const [bookingData, setBookingData] = useState<TicketBookingData>();
  const [quantities, setQuantities] = useState<TicketQuantityMap>({});
  const [selectedDate, setSelectedDate] = useState('');
  const [datePopupVisible, setDatePopupVisible] = useState(false);
  const [couponPopupVisible, setCouponPopupVisible] = useState(false);
  const [rulesPopupVisible, setRulesPopupVisible] = useState(false);
  const [selectedCouponId, setSelectedCouponId] = useState<string>();
  const [activeSectionKey, setActiveSectionKey] = useState<TicketBookingSectionKey>('ticket');
  const [sectionOffsets, setSectionOffsets] = useState<TicketSectionOffsets>({});
  const [stickyPanelHeight, setStickyPanelHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await loadBookingData(selectedDate || undefined);
    },
  });
  const shareTitle = `${bookingData?.parkInfo.name || '杭州 Hello Kitty 乐园'}门票预定`;
  const shareImageUrl = bookingData?.parkInfo.heroImages.find(Boolean) || undefined;
  const products = useMemo(() => bookingData?.products ?? [], [bookingData]);
  const packages = useMemo(() => bookingData?.packages ?? [], [bookingData]);
  const visibleSections = useMemo(() => {
    if (!bookingData) return [];

    return bookingData.sections.filter((section) => hasTicketSectionContent(section, products, packages));
  }, [bookingData, packages, products]);
  const selectedProducts = useMemo(() => products.filter((product) => (quantities[product.id] ?? 0) > 0), [products, quantities]);
  const totalAmount = products.reduce((total, product) => total + (quantities[product.id] ?? 0) * product.price, 0);
  const selectedCoupon = bookingData?.coupons.find((coupon) => coupon.id === selectedCouponId);
  const selectedCouponUsable = Boolean(
    selectedCoupon
    && selectedCoupon.status === 'available'
    && totalAmount >= selectedCoupon.minimumAmount,
  );
  const discountAmount = selectedCouponUsable && selectedCoupon ? selectedCoupon.discountAmount : 0;
  const payableAmount = Math.max(0, totalAmount - discountAmount);
  const couponText = selectedCouponUsable && selectedCoupon
    ? `${selectedCoupon.amountText} ${selectedCoupon.thresholdText}`
    : selectedCoupon
      ? '未满足使用门槛'
      : '请选择优惠券';
  const couponOptions = useMemo(() => {
    if (!bookingData) return [];

    return bookingData.coupons.map((coupon) => {
      const usable = coupon.status === 'available' && totalAmount >= coupon.minimumAmount;

      return {
        ...coupon,
        status: usable ? coupon.status : 'disabled' as const,
        tag: usable ? coupon.tag : '未满足',
      };
    });
  }, [bookingData, totalAmount]);
  const hasCoupons = couponOptions.length > 0;

  useShareAppMessage(() => ({
    title: shareTitle,
    path: MINI_PACKAGE_ROUTES.ticketBooking,
    imageUrl: shareImageUrl,
  }));

  async function loadBookingData(travelDate?: string) {
    const nextData = await fetchTicketBookingData({ travelDate });
    const nextActiveSectionKey = nextData.sections[0]?.key ?? 'ticket';

    setBookingData(nextData);
    setQuantities(createInitialQuantities(nextData.products));
    setSelectedDate(nextData.parkInfo.travelDate);
    setSelectedCouponId(undefined);
    setActiveSectionKey(nextActiveSectionKey);
    setSectionOffsets({});
    setStickyPanelHeight(0);
    setScrollTop((currentScrollTop) => (Math.abs(currentScrollTop) < 1 ? 0.5 : 0));
  }

  function measureSections() {
    Taro.nextTick(() => {
      const query = Taro.createSelectorQuery();

      query.select('._pg-content').boundingClientRect();
      query.select('._pg-sticky-content').boundingClientRect();
      visibleSections.forEach((item) => {
        query.select(`#${getTicketSectionId(item.key)}`).boundingClientRect();
      });

      query.exec((results) => {
        const [contentRect, stickyRect, ...sectionRects] = results as Array<{ top: number; height?: number } | null | undefined>;

        if (!contentRect) return;

        const nextOffsets = visibleSections.reduce<TicketSectionOffsets>((result, item, index) => {
          const sectionRect = sectionRects[index];

          if (sectionRect) {
            result[item.key] = Math.max(0, sectionRect.top - contentRect.top);
          }

          return result;
        }, {});

        setSectionOffsets(nextOffsets);
        setStickyPanelHeight(stickyRect?.height ?? 0);
      });
    });
  }

  useEffect(() => {
    if (!bookingData) return undefined;

    measureSections();
    const measureTimer = setTimeout(measureSections, 120);

    return () => {
      clearTimeout(measureTimer);
    };
  }, [bookingData, visibleSections]);

  useEffect(() => {
    const firstSectionKey = visibleSections[0]?.key;

    if (firstSectionKey && !visibleSections.some((section) => section.key === activeSectionKey)) {
      setActiveSectionKey(firstSectionKey);
    }
  }, [activeSectionKey, visibleSections]);

  function resolveActiveSection(nextScrollTop: number) {
    const markerTop = nextScrollTop + stickyPanelHeight + 18;
    const firstSectionKey = visibleSections[0]?.key ?? 'ticket';

    return visibleSections.reduce<TicketBookingSectionKey>((currentKey, item) => {
      const sectionTop = sectionOffsets[item.key];

      if (sectionTop === undefined) return currentKey;

      return markerTop >= sectionTop ? item.key : currentKey;
    }, firstSectionKey);
  }

  const handlePageScroll: TicketScrollHandler = (event) => {
    const nextActiveKey = resolveActiveSection(event.detail.scrollTop);

    if (nextActiveKey !== activeSectionKey) {
      setActiveSectionKey(nextActiveKey);
    }
  };

  function handleSectionTabChange(key: TicketBookingSectionKey) {
    const targetTop = sectionOffsets[key] ?? 0;
    const nextScrollTop = Math.max(0, targetTop - stickyPanelHeight - 8);

    setActiveSectionKey(key);
    setScrollTop((currentScrollTop) => (
      Math.abs(currentScrollTop - nextScrollTop) < 1 ? nextScrollTop + 0.5 : nextScrollTop
    ));
  }

  function renderBookingSection(section: TicketBookingSection) {
    if (section.type !== 'package') {
      const sectionProducts = getProductsForSection(section, products);

      return (
        <View className="_pg-package-section" id={getTicketSectionId(section.key)} key={section.key}>
          <TicketSectionTitle title={section.title} />
          <View className="_pg-products">
            {sectionProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                quantity={quantities[product.id] ?? 0}
                onQuantityChange={(value) => setQuantities((current) => ({ ...current, [product.id]: value }))}
                onShowRules={() => setRulesPopupVisible(true)}
              />
            ))}
          </View>
        </View>
      );
    }

    const sectionPackages = getPackagesForSection(section, packages);

    return (
      <View className="_pg-package-section" id={getTicketSectionId(section.key)} key={section.key}>
        <TicketSectionTitle title={section.title} />
        <View className="_pg-package-list">
          {sectionPackages.map((product) => (
            <TicketPackageCard key={product.id} product={product} onReserve={handlePackageReserve} />
          ))}
        </View>
      </View>
    );
  }

  async function submitSelectedProducts(addonQuantity = 0) {
    if (totalAmount <= 0) {
      showWechatToast('请选择门票数量');
      return;
    }

    if (!bookingData) return;
    const authed = await pageRuntime.ensureLogin('登录后可提交门票订单');
    if (!authed) return;

    const draft = createTicketOrderDraft({
      parkName: bookingData.parkInfo.name,
      selectedDate,
      selectedCouponId: selectedCouponUsable ? selectedCouponId : undefined,
      coupons: bookingData.coupons,
      addonQuantity,
      products: selectedProducts.map((product) => ({
        id: product.id,
        title: product.title,
        category: product.category,
        price: product.price,
        quantity: quantities[product.id] ?? 0,
        noticeText: product.noticeText,
      })),
    });

    navigateToMiniRoute(`${MINI_PACKAGE_ROUTES.ticketCheckout}?draftId=${encodeURIComponent(draft.id)}`);
  }

  async function handleSubmit() {
    await submitSelectedProducts();
  }

  async function handlePackageReserve(product: TicketPackageProduct) {
    if (totalAmount <= 0) {
      await showWechatToast('请先选择门票或年卡数量');
      return;
    }

    const shouldSubmit = await showWechatConfirm({
      title: '预订套餐',
      content: `${product.title} 可在确认订单页随票加购，是否先提交当前门票订单？`,
      confirmText: '提交订单',
      cancelText: '继续看看',
    });

    if (shouldSubmit) await submitSelectedProducts(1);
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell
        title={'门票预订'}
        className="_pg-shell"
        navbarRight={<TicketShareButton />}
        // reserveTabBarSpace={false}
        footer={(
          <TicketSubmitFooter
            label="订单总金额:"
            amountText={`¥${payableAmount}`}
            buttonText="提交订单"
            disabled={totalAmount <= 0}
            discountText={discountAmount > 0 ? `已优惠 ¥${discountAmount.toFixed(2)}` : undefined}
            onSubmit={handleSubmit}
          />
        )}
        scrollViewProps={{
          scrollTop,
          scrollWithAnimation: true,
          onScroll: handlePageScroll,
        }}
      >
        {bookingData ? (
          <View className="_pg-content">
            <View className="_pg-package-section">
              <TicketBookingHero
                imageCount={bookingData.parkInfo.imageCount}
                imageSrcs={bookingData.parkInfo.heroImages}
                onPreview={() => previewWechatImages({ urls: bookingData.parkInfo.heroImages })}
              />
              <TicketBookingInfo data={bookingData} onShowRules={() => setRulesPopupVisible(true)} />
            </View>
            <Sticky className="_pg-sticky" threshold={0} zIndex={12}>
              <View className="_pg-sticky-content">
                <View className="_pg-package-section_top">
                  <View className="_pg-date-block">
                    <TicketBookingDateRow
                      travelDate={selectedDate}
                      expanded={datePopupVisible}
                      onToggle={() => setDatePopupVisible(true)}
                    />
                {hasCoupons ? (
                  <TicketBookingCouponRow
                    couponText={couponText}
                    onClick={() => setCouponPopupVisible(true)}
                  />
                ) : null}
                  </View>
                </View>
                <View className="_pg-sticky-panel">
                  {visibleSections.length > 1 ? (
                    <TicketBookingTabs
                      sections={visibleSections}
                      activeKey={activeSectionKey}
                      onChange={handleSectionTabChange}
                    />
                  ) : null}
                </View>
              </View>
            </Sticky>

            {visibleSections.map((section) => renderBookingSection(section))}
            <View className="_pg-tips">
              <Text className="_pg-tips_title">温馨提示</Text>
              <View className="_pg-tips_list">
                {bookingData.parkInfo.warmTips.map((tip, index) => (
                  <Text className="_pg-tips_item" key={tip}>{index + 1}. {tip}</Text>
                ))}
              </View>
            </View>
          </View>
        ) : null}
        <PageShare>
          {bookingData ? (
            <>
              <DateSelectionPopup
                visible={datePopupVisible}
                mode="single"
                title="选择游玩日期"
                value={selectedDate}
                startDate={bookingData.dates[0]?.date}
                endDate={bookingData.dates[bookingData.dates.length - 1]?.date}
                onClose={() => setDatePopupVisible(false)}
                onConfirm={async (value) => {
                  const nextDate = Array.isArray(value) ? value[0] : value;
                  setDatePopupVisible(false);
                  if (nextDate) {
                    await pageRuntime.withLoading(() => loadBookingData(nextDate));
                  }
                }}
              />
              <AppPopup
                visible={rulesPopupVisible}
                className="_pg-rules-popup-shell"
                contentClassName="_pg-rules-popup"
                onClose={() => setRulesPopupVisible(false)}
              >
                <View className="_pg-rules-popup_header">
                  <Text className="_pg-rules-popup_title">预定须知</Text>
                  <View className="_pg-rules-popup_close" onClick={() => setRulesPopupVisible(false)}>
                    <AppIcon name="close" size={16} color="#8b909a" />
                  </View>
                </View>
                <View className="_pg-rules-popup_list">
                  {bookingData.parkInfo.rules.map((rule) => (
                    <Text className="_pg-rules-popup_item" key={rule}>{rule}</Text>
                  ))}
                </View>
              </AppPopup>
              {hasCoupons ? (
                <CouponSelectionPopup
                  visible={couponPopupVisible}
                  coupons={couponOptions}
                  selectedCouponId={selectedCouponUsable ? selectedCouponId : undefined}
                  clearText="不使用优惠券"
                  onClose={() => setCouponPopupVisible(false)}
                  onClear={() => {
                    setSelectedCouponId(undefined);
                    setCouponPopupVisible(false);
                  }}
                  onSelect={(coupon) => {
                    setSelectedCouponId(coupon.id);
                    setCouponPopupVisible(false);
                  }}
                />
              ) : null}
            </>
          ) : null}
        </PageShare>
      </PageShell>
    </View>
  ));
});

export default TicketBookingPage;
