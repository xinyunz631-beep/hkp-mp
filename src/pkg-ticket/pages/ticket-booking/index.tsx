import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { DateRangePanel, FixedSubmitBar, QuantityStepper } from '@/core/components/commerce';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
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
}

interface TicketBookingHeroProps {
  imageCount: number;
  imageSrc: string;
}

function showComingSoon(title: string) {
  Taro.showToast({ title, icon: 'none' });
}

function createInitialQuantities(products: TicketProduct[]) {
  return products.reduce<TicketQuantityMap>((result, product) => {
    result[product.id] = 0;
    return result;
  }, {});
}

function TicketBookingHero({ imageCount, imageSrc }: TicketBookingHeroProps) {
  return (
    <View className="_pg-hero">
      <AppImage className="_pg-hero_image" src={imageSrc} mode="aspectFill" />
      <View className="_pg-hero_share" onClick={() => showComingSoon('分享能力即将开放')}>
        <AppIcon name="share" className="_pg-hero_share-icon" size={28} color="#ffffff" />
      </View>
      <Text className="_pg-hero_count">图片{imageCount}张</Text>
    </View>
  );
}

function TicketBookingInfo({ data }: { data: TicketBookingData }) {
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
        <View className="_pg-info_link" onClick={() => showComingSoon('详情须知即将开放')}>
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
        <View className="_pg-info_link" onClick={() => showComingSoon('地图能力即将开放')}>
          地图
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
        <Text className="_pg-date_hint">点击后可切换出游日期</Text>
      </View>
      <View className="_pg-date_value">
        <Text>{travelDate}</Text>
        <Text className={`_pg-date_chevron ${expanded ? '_pg-date_chevron--expanded' : ''}`}>›</Text>
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

function ProductCard({ product, quantity, onQuantityChange }: ProductCardProps) {
  return (
    <View className="_pg-product">
      <View className="_pg-product_main">
        <Text className="_pg-product_title">{product.title}</Text>
        <Text className="_pg-product_desc">{product.description}</Text>
        <Text className="_pg-product_notice">{product.noticeText}</Text>
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
  const [datePanelVisible, setDatePanelVisible] = useState(false);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchTicketBookingData();
      setBookingData(nextData);
      setQuantities(createInitialQuantities(nextData.products));
      setSelectedDate(nextData.parkInfo.travelDate);
    },
  });
  const products = bookingData?.products ?? [];
  const tickets = products.filter((product) => product.category === 'ticket');
  const annualCards = products.filter((product) => product.category === 'annualCard');
  const totalAmount = products.reduce((total, product) => total + (quantities[product.id] ?? 0) * product.price, 0);

  function handleSubmit() {
    if (totalAmount <= 0) {
      showComingSoon('请选择门票数量');
      return;
    }

    Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.ticketCheckout });
  }

  const heroImageSrc = '';

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
            amountText={<Text className="_pg-submit_amount">¥{totalAmount.toFixed(2)}</Text>}
            buttonText="提交订单"
            disabled={totalAmount <= 0}
            onSubmit={handleSubmit}
          />
        )}
        scrollViewProps={{}}
      >
        {bookingData ? (
          <View className="_pg-content">
            <TicketBookingHero imageCount={bookingData.parkInfo.imageCount} imageSrc={heroImageSrc} />
            <TicketBookingInfo data={bookingData} />
            <View className="_pg-date-block">
              <TicketBookingDateRow
                travelDate={selectedDate}
                expanded={datePanelVisible}
                onToggle={() => setDatePanelVisible((current) => !current)}
              />
              {datePanelVisible ? (
                <DateRangePanel
                  className="_pg-date-block_panel"
                  dates={bookingData.dates}
                  activeDate={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setDatePanelVisible(false);
                  }}
                />
              ) : null}
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
                    />
                  ))}
                </View>
              </>
            ) : null}
          </View>
        ) : null}
      </PageShell>
    </View>
  ));
});

export default TicketBookingPage;
