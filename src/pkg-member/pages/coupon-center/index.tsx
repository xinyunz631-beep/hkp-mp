import { useMemo, useState } from 'react';
import { Input, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageHeader, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { resolveErrorMessage } from '@/core/utils/error-message';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { showWechatToast } from '@/core/utils/wechat-actions';
import {
  claimMemberCoupon,
  exchangeMemberCouponCode,
  fetchMemberCouponCenterData,
  resolveClaimedMemberCouponNo,
  type MemberCouponCenterActivityGift,
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

// 统一生成优惠券详情页路由，领券成功后直接承接到我的券详情。
function resolveCouponDetailRoute(couponNo: string) {
  return `${MINI_PACKAGE_ROUTES.memberCouponDetail}?id=${encodeURIComponent(couponNo)}`;
}

// 渲染领券中心，承接首页第二个导航入口和后端券列表配置。
const MemberCouponCenterPage = observer(function MemberCouponCenterPage() {
  const [pageData, setPageData] = useState<MemberCouponCenterData>();
  const [activeTabKey, setActiveTabKey] = useState<MemberCouponCenterTabKey>(DEFAULT_TAB_KEY);
  const [exchangeCode, setExchangeCode] = useState('');

  // 读取领券中心真实数据，初始化时对齐后端返回的第一个 tab。
  async function loadPageData(options: { resetTab?: boolean } = {}) {
    const nextData = await fetchMemberCouponCenterData();
    setPageData(nextData);
    if (options.resetTab) {
      setActiveTabKey(nextData.tabs[0]?.key ?? DEFAULT_TAB_KEY);
    }
  }

  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await loadPageData({ resetTab: true });
    },
    refreshOnShow: true,
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

  // 读取领取/兑换返回的第一张券号，成功后跳到券详情核对真实资产。
  function resolveFirstCouponNo(response: Awaited<ReturnType<typeof claimMemberCoupon>>) {
    return response.coupons?.[0]?.couponNo
      || response.coupon?.couponNo
      || response.couponNos?.[0]
      || response.claimedGiftItems?.find((item) => item.couponNo)?.couponNo
      || response.claimedGiftItems?.flatMap((item) => item.couponInstances ?? []).find((item) => item.couponNo)?.couponNo;
  }

  // 后端活动一键领取允许 200 返回部分或全部失败，这里把零发券结果转成可见失败提示。
  function resolveClaimFailureMessage(response: Awaited<ReturnType<typeof claimMemberCoupon>>) {
    const issuedCount = Number(response.issuedCount ?? response.couponNos?.length ?? response.couponInstances?.length ?? response.coupons?.length ?? (response.coupon ? 1 : 0));
    if (issuedCount > 0) return '';

    const firstFailedGift = response.failedGiftItems?.[0];
    return firstFailedGift?.errorMessage
      || firstFailedGift?.message
      || response.failedGiftItems?.map((item) => item.errorMessage || item.message).find(Boolean)
      || '';
  }

  async function handleCouponPress(coupon: MemberCouponCenterCoupon, gift?: MemberCouponCenterActivityGift) {
    if (coupon.source === 'kcoin' && coupon.targetRoute) {
      navigateToMiniRoute(coupon.targetRoute);
      return;
    }

    const claimable = gift ? gift.claimable : coupon.claimable;
    const disabledReason = gift?.disabledReason || coupon.disabledReason;
    if (gift?.claimed || coupon.claimed) {
      const couponNo = await pageRuntime.withLoading(() => resolveClaimedMemberCouponNo(coupon, gift));
      if (couponNo) {
        navigateToMiniRoute(resolveCouponDetailRoute(couponNo));
        return;
      }
      await showWechatToast('已领取，可在我的优惠券查看');
      navigateToMiniRoute(MINI_PACKAGE_ROUTES.memberCoupons);
      return;
    }

    if (!claimable) {
      await showWechatToast(disabledReason || '当前优惠券暂不可领取');
      return;
    }

    try {
      const response = await pageRuntime.withLoading(async () => {
        const claimResponse = await claimMemberCoupon(coupon, { giftId: gift?.giftId, templateNo: gift?.templateNo });
        await loadPageData();
        return claimResponse;
      });
      const failureMessage = resolveClaimFailureMessage(response);
      if (failureMessage) {
        await showWechatToast(failureMessage);
        return;
      }
      await showWechatToast('领取成功', 'success');
      const firstCouponNo = resolveFirstCouponNo(response);
      if (firstCouponNo) {
        navigateToMiniRoute(resolveCouponDetailRoute(firstCouponNo));
      }
    } catch (error) {
      await showWechatToast(resolveErrorMessage(error, '领取失败，请稍后再试'));
    }
  }

  // 提交优惠券兑换码，兑换结果以后端写入的会员券资产为准。
  async function handleExchangeSubmit() {
    const normalizedCode = exchangeCode.trim();
    if (!normalizedCode) {
      await showWechatToast('请输入兑换码');
      return;
    }

    try {
      const response = await pageRuntime.withLoading(async () => {
        const exchangeResponse = await exchangeMemberCouponCode(normalizedCode);
        await loadPageData();
        return exchangeResponse;
      });
      setExchangeCode('');
      await showWechatToast('兑换成功', 'success');
      const firstCouponNo = resolveFirstCouponNo(response);
      if (firstCouponNo) {
        navigateToMiniRoute(resolveCouponDetailRoute(firstCouponNo));
      }
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
                {visibleCoupons.map((coupon) => {
                  const isActivityCard = coupon.source === 'activity' && coupon.giftItems?.length;

                  if (isActivityCard) {
                    return (
                      <View className="_pg-activity-card" key={coupon.id}>
                        <View className="_pg-activity-card_header">
                          <View className="_pg-activity-card_main">
                            <Text className="_pg-activity-card_amount">{coupon.amountText}</Text>
                            <Text className="_pg-activity-card_title">{coupon.title}</Text>
                            <Text className="_pg-activity-card_date">{coupon.validityText}</Text>
                            {!coupon.claimed && !coupon.claimable && coupon.disabledReason ? (
                              <Text className="_pg-activity-card_reason">{coupon.disabledReason}</Text>
                            ) : null}
                          </View>
                          <Text
                            className={`_pg-activity-card_action ${coupon.claimable || coupon.claimed ? '' : '_pg-activity-card_action--disabled'}`}
                            onClick={() => void handleCouponPress(coupon)}
                          >
                            {coupon.actionText}
                          </Text>
                        </View>
                        <View className="_pg-activity-card_gifts">
                          {coupon.giftItems?.map((gift) => (
                            <View className="_pg-gift-row" key={gift.id}>
                              <View className="_pg-gift-row_main">
                                <Text className="_pg-gift-row_title">{gift.title}</Text>
                                <Text className="_pg-gift-row_desc">{gift.amountText}</Text>
                                {!gift.claimed && !gift.claimable && gift.disabledReason ? (
                                  <Text className="_pg-gift-row_reason">{gift.disabledReason}</Text>
                                ) : null}
                              </View>
                              <Text
                                className={`_pg-gift-row_action ${gift.claimable || gift.claimed ? '' : '_pg-gift-row_action--disabled'}`}
                                onClick={() => void handleCouponPress(coupon, gift)}
                              >
                                {gift.actionText}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  }

                  return (
                    <View className="_pg-coupon-card" key={coupon.id}>
                      <View className="_pg-coupon-card_main">
                        <Text className="_pg-coupon-card_amount">{coupon.amountText}</Text>
                        <Text className="_pg-coupon-card_title">{coupon.title}</Text>
                        <Text className="_pg-coupon-card_desc">{coupon.thresholdText}</Text>
                        <Text className="_pg-coupon-card_date">{coupon.validityText}</Text>
                      </View>
                      <Text className="_pg-coupon-card_action" onClick={() => void handleCouponPress(coupon)}>{coupon.actionText}</Text>
                    </View>
                  );
                })}
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
