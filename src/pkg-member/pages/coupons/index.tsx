import { useState } from 'react';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { PageFooter, PageHeader, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import {
  fetchCouponsData,
  type MemberCouponItem,
  type MemberCouponStatus,
  type MemberCouponsData,
} from '@/pkg-member/services/coupons';
import './index.scss';

function resolveEmptyStateCopy(activeTabKey: MemberCouponStatus) {
  if (activeTabKey === 'used') return '暂无已使用优惠券';
  if (activeTabKey === 'expired') return '暂无已过期优惠券';

  return '暂无已领取优惠券';
}

function resolveCouponClassName(coupon: MemberCouponItem) {
  return [
    '_pg-coupon',
    `_pg-coupon--${coupon.status}`,
  ].join(' ');
}

// 统一生成优惠券详情页路由，列表和后续其它入口都复用同一参数口径。
function resolveCouponDetailRoute(couponId: string) {
  return `${MINI_PACKAGE_ROUTES.memberCouponDetail}?id=${encodeURIComponent(couponId)}`;
}

function resolveCouponSideTextColumns(sideText: string) {
  const chars = Array.from(sideText.trim());
  if (chars.length <= 1) return [sideText];

  const columnSize = Math.ceil(chars.length / 2);

  return [
    chars.slice(0, columnSize).join(''),
    chars.slice(columnSize).join(''),
  ].filter(Boolean);
}

// 渲染我的优惠券页，页面只按接口字段承载券面信息和状态切换。
const CouponsPage = observer(function CouponsPage() {
  const [pageData, setPageData] = useState<MemberCouponsData>();
  const [activeTabKey, setActiveTabKey] = useState<MemberCouponStatus>('claimed');
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchCouponsData();
      setPageData(nextData);
      setActiveTabKey(nextData.tabs[0]?.key ?? 'claimed');
    },
    refreshOnShow: true,
    loginRequired: true,
    loginReason: '登录后可查看优惠券',
  });

  function handleCouponPress(coupon: MemberCouponItem) {
    navigateToMiniRoute(resolveCouponDetailRoute(coupon.id));
  }

  function handleMoreCouponPress() {
    navigateToMiniRoute(MINI_PACKAGE_ROUTES.memberCouponCenter);
  }

  function renderCoupon(coupon: MemberCouponItem) {
    return (
      <View className={resolveCouponClassName(coupon)} key={coupon.id} onClick={() => handleCouponPress(coupon)}>
        <View className="_pg-coupon_side">
          <View className="_pg-coupon_side-columns">
            {resolveCouponSideTextColumns(coupon.sideText).map((columnText, index) => (
              <Text className="_pg-coupon_side-text" key={`${coupon.id}-${index}`}>{columnText}</Text>
            ))}
          </View>
        </View>
        <View className="_pg-coupon_main">
          <View className="_pg-coupon_amount-row">
            <Text className="_pg-coupon_amount">{coupon.amountText}</Text>
            <View className="_pg-coupon_type">
              <Text>{coupon.couponTypeText}</Text>
              <Text>{coupon.currencyText}</Text>
            </View>
          </View>
          <View className="_pg-coupon_line" />
          <Text className="_pg-coupon_validity">{coupon.validityText}</Text>
          <Text className="_pg-coupon_title">{coupon.title}</Text>
        </View>
        <View className="_pg-coupon_cut _pg-coupon_cut--top" />
        <View className="_pg-coupon_cut _pg-coupon_cut--bottom" />
        <View className="_pg-coupon_dashed" />
        <View className="_pg-coupon_action">
          <Text>{coupon.actionText}</Text>
        </View>
      </View>
    );
  }

  return pageRuntime.renderPage(() => {
    if (!pageData) return null;

    const visibleCoupons = pageData.coupons.filter((coupon) => coupon.status === activeTabKey);

    return (
      <View className="_pg">
        <PageShell title="我的优惠券" className="_pg-shell" reserveTabBarSpace={false} scrollViewProps={{}}>
          <PageHeader>
            <View className="_pg-tabs">
              {pageData.tabs.map((tab) => (
                <View
                  className={`_pg-tab ${tab.key === activeTabKey ? '_pg-tab--active' : ''}`}
                  key={tab.key}
                  onClick={() => setActiveTabKey(tab.key)}
                >
                  <Text>{tab.text}</Text>
                  <View className="_pg-tab_line" />
                </View>
              ))}
            </View>
          </PageHeader>

          <View className="_pg-content">
            {visibleCoupons.length > 0 ? (
              <View className="_pg-list">
                {visibleCoupons.map(renderCoupon)}
              </View>
            ) : (
              <View className="_pg-empty">
                <BaseEmpty title={resolveEmptyStateCopy(activeTabKey)} description="更多会员好券敬请期待" />
              </View>
            )}
          </View>

          <PageFooter>
            <View className="_pg-footer">
              <View className="_pg-more-button" onClick={handleMoreCouponPress}>
                <Text>{pageData.moreButtonText}</Text>
              </View>
            </View>
          </PageFooter>
        </PageShell>
      </View>
    );
  });
});

export default CouponsPage;
