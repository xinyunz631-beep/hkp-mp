import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { CouponCard, FilterTabs } from '@/core/components/commerce';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchCouponsData, type MemberCouponsData } from '@/pkg-member/services/coupons';
import './index.scss';

// 根据当前筛选标签生成优惠券空态文案，避免页面散写条件文案。
function resolveEmptyStateCopy(activeTabKey: string) {
  if (activeTabKey === 'used') {
    return {
      title: '还没有已使用卡券',
      description: '完成一次乐园、酒店或商城下单后，再回来这里查看使用记录。',
    };
  }

  if (activeTabKey === 'expired') {
    return {
      title: '还没有过期卡券',
      description: '已失效卡券会自动归档到这里，方便你回看领取记录。',
    };
  }

  return {
    title: '当前暂无可用优惠券',
    description: '关注会员福利和活动中心，新的卡券到账后会第一时间展示在这里。',
  };
}

// 渲染优惠券页面，收口筛选、卡券列表和空态反馈首版。
const CouponsPage = observer(function CouponsPage() {
  const [pageData, setPageData] = useState<MemberCouponsData>();
  const [activeTabKey, setActiveTabKey] = useState('available');
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchCouponsData();
      setPageData(nextData);
      setActiveTabKey(nextData.tabs[0]?.key ?? 'available');
    },
    loginRequired: true,
    loginReason: '登录后可查看优惠券',
  });

  return pageRuntime.renderPage(() => {
    if (!pageData) return null;

    const visibleCoupons = pageData.coupons.filter((coupon) => coupon.status === activeTabKey);
    const activeTab = pageData.tabs.find((tab) => tab.key === activeTabKey);
    const emptyStateCopy = resolveEmptyStateCopy(activeTabKey);

    return (
      <View className="_pg">
        <PageShell title="优惠券" className="_pg-shell" reserveTabBarSpace={false} scrollViewProps={{}}>
          <View className="_pg-content">
            <View className="_pg-summary">
              <Text className="_pg-summary_title">我的卡券</Text>
              <Text className="_pg-summary_desc">
                当前
                {activeTab?.count ?? 0}
                张
                {activeTab?.text || '可用'}
                卡券，出行和下单前记得先挑一张合适的权益。
              </Text>
            </View>

            <FilterTabs
              tabs={pageData.tabs}
              activeKey={activeTabKey}
              className="_pg-tabs"
              onChange={setActiveTabKey}
            />

            {visibleCoupons.length > 0 ? (
              <View className="_pg-list">
                {visibleCoupons.map((coupon) => (
                  <CouponCard
                    className="_pg-list_item"
                    coupon={coupon}
                    key={coupon.id}
                    onClick={() => {
                      Taro.showToast({
                        title: `${coupon.title}详情整理中`,
                        icon: 'none',
                        duration: 1800,
                      });
                    }}
                  />
                ))}
              </View>
            ) : (
              <BaseEmpty
                className="_pg-empty"
                title={emptyStateCopy.title}
                description={emptyStateCopy.description}
              />
            )}

            <Text className="_pg-tip">
              卡券使用规则以对应下单页结算说明为准，已失效卡券仅保留记录展示。
            </Text>
          </View>
        </PageShell>
      </View>
    );
  });
});

export default CouponsPage;
