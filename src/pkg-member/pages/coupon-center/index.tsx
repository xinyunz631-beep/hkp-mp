import { useMemo, useState } from 'react';
import { Input, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageHeader, PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { resolveErrorMessage } from '@/core/utils/error-message';
import { showWechatToast } from '@/core/utils/wechat-actions';
import {
  claimMemberCouponCenterCoupon,
  exchangeMemberCouponCode,
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
  const [exchangeCode, setExchangeCode] = useState('');

  async function loadPageData() {
    const nextData = await fetchMemberCouponCenterData();
    setPageData(nextData);
    setActiveTabKey(nextData.tabs[0]?.key ?? DEFAULT_TAB_KEY);
  }

  const pageRuntime = usePageRuntime({
    initPage: loadPageData,
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

  // 点击券项时调用真实领券接口，成功后刷新可领取列表和会员券资产。
  async function handleCouponPress(coupon: MemberCouponCenterCoupon) {
    if (!coupon.claimable) {
      await showWechatToast(coupon.reason || '当前优惠券不可领取');
      return;
    }

    try {
      await pageRuntime.withLoading(async () => {
        await claimMemberCouponCenterCoupon(coupon);
        await loadPageData();
      });
      await showWechatToast('领取成功', 'success');
    } catch (error) {
      await showWechatToast(resolveErrorMessage(error, '领取失败，请稍后再试'));
    }
  }

  // 提交优惠券兑换码，兑换成功后进入我的优惠券资产。
  async function handleExchangeSubmit() {
    const nextExchangeCode = exchangeCode.trim();
    if (!nextExchangeCode) {
      await showWechatToast('请输入兑换码');
      return;
    }

    try {
      await pageRuntime.withLoading(async () => {
        await exchangeMemberCouponCode(nextExchangeCode);
        await loadPageData();
      });
      setExchangeCode('');
      await showWechatToast('兑换成功', 'success');
    } catch (error) {
      await showWechatToast(resolveErrorMessage(error, '兑换失败，请稍后再试'));
    }
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
            {activeTabKey === 'exchangeCode' ? (
              <View className="_pg-exchange">
                <Text className="_pg-exchange_title">输入兑换码</Text>
                <View className="_pg-exchange_field">
                  <Input
                    className="_pg-exchange_input"
                    value={exchangeCode}
                    placeholder="请输入优惠券兑换码"
                    maxlength={32}
                    onInput={(event) => setExchangeCode(event.detail.value)}
                  />
                </View>
                <View className="_pg-exchange_button" onClick={() => void handleExchangeSubmit()}>
                  <Text>立即兑换</Text>
                </View>
              </View>
            ) : visibleCoupons.length > 0 ? (
              <View className="_pg-list">
                {visibleCoupons.map((coupon) => (
                  <View
                    className={`_pg-coupon-card ${coupon.claimable ? '' : '_pg-coupon-card--disabled'}`}
                    key={coupon.id}
                    onClick={() => void handleCouponPress(coupon)}
                  >
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
