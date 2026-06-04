import { useMemo, useState } from 'react';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageHeader, PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { showWechatToast } from '@/core/utils/wechat-actions';
import {
  fetchMemberCouponCenterData,
  type MemberCouponCenterCoupon,
  type MemberCouponCenterData,
  type MemberCouponCenterTabKey,
} from '@/pkg-member/services/coupon-center';
import './index.scss';

const DEFAULT_TAB_KEY: MemberCouponCenterTabKey = 'recommend';

// 根据当前 tab 从接口券列表中筛出可展示数据。
function resolveVisibleCoupons(coupons: MemberCouponCenterCoupon[], activeTabKey: MemberCouponCenterTabKey) {
  return coupons.filter((coupon) => coupon.tabKey === activeTabKey);
}

// 渲染领券中心，承接首页第二个导航入口和后端券列表配置。
const MemberCouponCenterPage = observer(function MemberCouponCenterPage() {
  const [pageData, setPageData] = useState<MemberCouponCenterData>();
  const [activeTabKey, setActiveTabKey] = useState<MemberCouponCenterTabKey>(DEFAULT_TAB_KEY);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchMemberCouponCenterData();
      setPageData(nextData);
      setActiveTabKey(nextData.tabs[0]?.key ?? DEFAULT_TAB_KEY);
    },
    loginRequired: true,
    loginReason: '登录后可进入领券中心',
  });

  const visibleCoupons = useMemo(
    () => resolveVisibleCoupons(pageData?.coupons ?? [], activeTabKey),
    [activeTabKey, pageData?.coupons],
  );

  // 切换领券中心顶部 tab，顶部切换固定在 PageHeader 内。
  function handleTabPress(tabKey: MemberCouponCenterTabKey) {
    setActiveTabKey(tabKey);
  }

  // 点击券项时按当前券类型给出领取或兑换反馈，真实接口接入后替换为提交动作。
  async function handleCouponPress(coupon: MemberCouponCenterCoupon) {
    await showWechatToast(coupon.tabKey === 'kcoin' ? '兑换成功' : '领取成功', 'success');
  }

  return pageRuntime.renderPage(() => {
    if (!pageData) return null;

    return (
      <View className="_pg">
        <PageShell title="领券中心" className="_pg-shell">
          <PageHeader>
            <View className="_pg-tabs">
              {pageData.tabs.map((tab) => {
                const active = tab.key === activeTabKey;

                return (
                  <View
                    className={`_pg-tabs_item ${active ? '_pg-tabs_item--active' : ''}`}
                    key={tab.key}
                    onClick={() => handleTabPress(tab.key)}
                  >
                    <Text>{tab.title}</Text>
                    {active ? <View className="_pg-tabs_underline" /> : null}
                  </View>
                );
              })}
            </View>
          </PageHeader>

          <View className="_pg-content">
            {visibleCoupons.length > 0 ? (
              <View className="_pg-list">
                {visibleCoupons.map((coupon) => (
                  <View className="_pg-coupon-card" key={coupon.id} onClick={() => void handleCouponPress(coupon)}>
                    <View className="_pg-coupon-card_main">
                      <Text className="_pg-coupon-card_amount">{coupon.amountText}</Text>
                      <Text className="_pg-coupon-card_title">{coupon.title}</Text>
                      <Text className="_pg-coupon-card_desc">{coupon.thresholdText}</Text>
                      <Text className="_pg-coupon-card_date">{coupon.validityText}</Text>
                    </View>
                    <Text className="_pg-coupon-card_action">{coupon.actionText}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className="_pg-empty">
                <Text className="_pg-empty_title">{pageData.emptyTitle}</Text>
                <Text className="_pg-empty_desc">{pageData.emptyDescription}</Text>
              </View>
            )}
          </View>
        </PageShell>
      </View>
    );
  });
});

export default MemberCouponCenterPage;
