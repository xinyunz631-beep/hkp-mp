import { useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { CouponSelectionPopup, DateSelectionPopup, FixedSubmitBar, QuantityStepper } from '@/core/components/commerce';
import { AppPopup } from '@/core/components/AppPopup';
import { PageShare, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import {
  callWechatPhone,
  openWechatLocation,
  previewWechatImages,
  showWechatShareGuide,
  showWechatToast,
} from '@/core/utils/wechat-actions';
import { createTicketOrderDraft } from '@/pkg-ticket/services/order-draft';
import {
  fetchTicketBookingData,
  type TicketBookingData,
  type TicketProduct,
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
  onShare: () => void;
}

function createInitialQuantities(products: TicketProduct[]) {
  return products.reduce<TicketQuantityMap>((result, product) => {
    result[product.id] = 0;
    return result;
  }, {});
}

function TicketBookingHero({ imageCount, imageSrcs, onPreview, onShare }: TicketBookingHeroProps) {
  const imageSrc = imageSrcs[0] || '';

  return (
    <View className="_pg-hero">
      <View className="_pg-hero_image-wrap" onClick={onPreview}>
        <AppImage className="_pg-hero_image" src={imageSrc} mode="aspectFill" />
      </View>
      <View className="_pg-hero_share" onClick={onShare}>
        <AppIcon name="share" className="_pg-hero_share-icon" size={16} color="#ffffff" />
      </View>
      <Text className="_pg-hero_count" onClick={onPreview}>图片{imageCount}张</Text>
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
      <View className="_pg-info_row _pg-info_row--top">
        <View className="_pg-info_content">
          <Text className="_pg-info_text">
            开放时间：
            <Text className="_pg-info_strong">{parkInfo.openTime}</Text>
            （详情请咨询{parkInfo.hotline}）
          </Text>
          <Text className="_pg-info_text">{parkInfo.notice}</Text>
        </View>
        <View className="_pg-info_link" onClick={onShowRules}>
          详情须知
          <Text className="_pg-info_chevron">›</Text>
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
          <Text className="_pg-info_chevron">›</Text>
        </View>
      </View>
      <View className="_pg-info_divider" />
      <View className="_pg-info_row">
        <View className="_pg-info_content">
          <Text className="_pg-info_text">客服热线：{parkInfo.hotline}</Text>
        </View>
        <View className="_pg-info_link" onClick={() => callWechatPhone(parkInfo.hotline)}>
          拨打
          <Text className="_pg-info_chevron">›</Text>
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
      <View>
        <Text className="_pg-date_label">游玩日期</Text>
        <Text className="_pg-date_hint">门票仅支持选择 1 天</Text>
      </View>
      <View className="_pg-date_value">
        <Text>{travelDate}</Text>
        <Text className={`_pg-date_chevron ${expanded ? '_pg-date_chevron--expanded' : ''}`}>›</Text>
      </View>
    </View>
  );
}

function TicketCouponRow({
  couponText,
  onClick,
}: {
  couponText: string;
  onClick: () => void;
}) {
  return (
    <View className="_pg-coupon" onClick={onClick}>
      <View>
        <Text className="_pg-coupon_label">优惠券</Text>
        <Text className="_pg-coupon_hint">可用券会自动参与金额计算</Text>
      </View>
      <View className="_pg-coupon_value">
        <Text>{couponText}</Text>
        <Text className="_pg-coupon_chevron">›</Text>
      </View>
    </View>
  );
}

function TicketSectionTitle({ title }: { title: string }) {
  return (
    <View className="_pg-section-title">
      <Text>{title}</Text>
    </View>
  );
}

function ProductCard({ product, quantity, onQuantityChange, onShowRules }: ProductCardProps) {
  return (
    <View className="_pg-product">
      <View className="_pg-product_main">
        <Text className="_pg-product_title">{product.title}</Text>
        <Text className="_pg-product_desc">{product.description}</Text>
        <Text className="_pg-product_notice" onClick={onShowRules}>{product.noticeText}</Text>
      </View>
      <View className="_pg-product_aside">
        <Text className="_pg-product_price-label">{product.priceLabel}</Text>
        <View className="_pg-product_buy-row">
          <Text className="_pg-product_price">¥{product.price}</Text>
          <QuantityStepper className="_pg-product_stepper" value={quantity} min={0} onChange={onQuantityChange} />
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
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchTicketBookingData();
      setBookingData(nextData);
      setQuantities(createInitialQuantities(nextData.products));
      setSelectedDate(nextData.parkInfo.travelDate);
      setSelectedCouponId(nextData.coupons[0]?.id);
    },
  });
  const products = bookingData?.products ?? [];
  const tickets = products.filter((product) => product.category === 'ticket');
  const annualCards = products.filter((product) => product.category === 'annualCard');
  const selectedProducts = useMemo(() => products.filter((product) => (quantities[product.id] ?? 0) > 0), [products, quantities]);
  const totalAmount = products.reduce((total, product) => total + (quantities[product.id] ?? 0) * product.price, 0);
  const selectedCoupon = bookingData?.coupons.find((coupon) => coupon.id === selectedCouponId);
  const discountAmount = selectedCoupon && totalAmount >= selectedCoupon.minimumAmount ? selectedCoupon.discountAmount : 0;
  const payableAmount = Math.max(0, totalAmount - discountAmount);
  const couponText = selectedCoupon ? `${selectedCoupon.amountText} ${selectedCoupon.thresholdText}` : '请选择优惠券';

  async function handleSubmit() {
    if (totalAmount <= 0) {
      showWechatToast('请选择门票数量');
      return;
    }

    if (!bookingData) return;
    const authed = await pageRuntime.ensureLogin('登录后可提交门票订单');
    if (!authed) return;

    const draft = createTicketOrderDraft({
      parkName: '杭州 Hello Kitty 乐园',
      selectedDate,
      selectedCouponId,
      coupons: bookingData.coupons,
      products: selectedProducts.map((product) => ({
        id: product.id,
        title: product.title,
        category: product.category,
        price: product.price,
        quantity: quantities[product.id] ?? 0,
        noticeText: product.noticeText,
      })),
    });

    Taro.navigateTo({ url: `${MINI_PACKAGE_ROUTES.ticketCheckout}?draftId=${encodeURIComponent(draft.id)}` });
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell
        title="门票预定"
        className="_pg-shell"
        reserveTabBarSpace={false}
        footer={(
          <FixedSubmitBar
            className="_pg-submit"
            label="订单总金额:"
            amountText={<Text className="_pg-submit_amount">¥{payableAmount.toFixed(2)}</Text>}
            buttonText="提交订单"
            disabled={totalAmount <= 0}
            extra={discountAmount > 0 ? <Text className="_pg-submit_discount">已优惠 ¥{discountAmount.toFixed(2)}</Text> : undefined}
            onSubmit={handleSubmit}
          />
        )}
        scrollViewProps={{}}
      >
        {bookingData ? (
          <View className="_pg-content">
            <TicketBookingHero
              imageCount={bookingData.parkInfo.imageCount}
              imageSrcs={bookingData.parkInfo.heroImages}
              onPreview={() => previewWechatImages({ urls: bookingData.parkInfo.heroImages })}
              onShare={showWechatShareGuide}
            />
            <TicketBookingInfo data={bookingData} onShowRules={() => setRulesPopupVisible(true)} />
            <View className="_pg-date-block">
              <TicketBookingDateRow
                travelDate={selectedDate}
                expanded={datePopupVisible}
                onToggle={() => setDatePopupVisible(true)}
              />
            </View>
            <View className="_pg-coupon-block">
              <TicketCouponRow couponText={couponText} onClick={() => setCouponPopupVisible(true)} />
            </View>
            {tickets.length > 0 ? (
              <>
                <TicketSectionTitle title="门票" />
                <View className="_pg-products">
                  {tickets.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      quantity={quantities[product.id] ?? 0}
                      onQuantityChange={(value) => setQuantities((current) => ({ ...current, [product.id]: value }))}
                      onShowRules={() => setRulesPopupVisible(true)}
                    />
                  ))}
                </View>
              </>
            ) : null}
            {annualCards.length > 0 ? (
              <>
                <TicketSectionTitle title="年卡" />
                <View className="_pg-products">
                  {annualCards.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      quantity={quantities[product.id] ?? 0}
                      onQuantityChange={(value) => setQuantities((current) => ({ ...current, [product.id]: value }))}
                      onShowRules={() => setRulesPopupVisible(true)}
                    />
                  ))}
                </View>
              </>
            ) : null}
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
                onConfirm={(value) => {
                  const nextDate = Array.isArray(value) ? value[0] : value;
                  if (nextDate) setSelectedDate(nextDate);
                  setDatePopupVisible(false);
                }}
              />
              <CouponSelectionPopup
                visible={couponPopupVisible}
                coupons={bookingData.coupons}
                selectedCouponId={selectedCouponId}
                onClose={() => setCouponPopupVisible(false)}
                onSelect={(coupon) => {
                  setSelectedCouponId(coupon.id);
                  setCouponPopupVisible(false);
                }}
              />
              <AppPopup
                visible={rulesPopupVisible}
                contentClassName="_pg-rules-popup"
                onClose={() => setRulesPopupVisible(false)}
              >
                <View className="_pg-rules-popup_header">
                  <Text className="_pg-rules-popup_title">预定须知</Text>
                  <Text className="_pg-rules-popup_close" onClick={() => setRulesPopupVisible(false)}>×</Text>
                </View>
                <View className="_pg-rules-popup_list">
                  {bookingData.parkInfo.rules.map((rule) => (
                    <Text className="_pg-rules-popup_item" key={rule}>{rule}</Text>
                  ))}
                </View>
              </AppPopup>
            </>
          ) : null}
        </PageShare>
      </PageShell>
    </View>
  ));
});

export default TicketBookingPage;
