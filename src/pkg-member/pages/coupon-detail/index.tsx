import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { fetchCouponDetailData, type MemberCouponItem } from '@/pkg-member/services/coupons';
import './index.scss';

interface CouponDetailRow {
  label: string;
  value: string;
  actionText?: string;
  targetRoute?: string;
}

// 从路由参数里读取当前券号，详情页只接受列表里透传的 id。
function resolveCouponId() {
  return Taro.getCurrentInstance().router?.params?.id || '';
}

// 订单详情继续作为交易事实源，券详情只按已有 orderNo 回跳，不在这里复制订单状态。
function resolveCouponOrderDetailRoute(orderNo?: string) {
  if (!orderNo) return '';
  return `${MINI_PACKAGE_ROUTES.orderDetail}?orderId=${encodeURIComponent(orderNo)}`;
}

// 退款返还链路优先回到同订单的售后记录，再从具体售后单查看处理进度。
function resolveCouponAftersaleListRoute(orderNo?: string) {
  if (!orderNo) return '';
  return `${MINI_PACKAGE_ROUTES.orderAftersaleList}?orderId=${encodeURIComponent(orderNo)}`;
}

// 组装优惠券详情里的基础信息，页面层只负责按业务字段渲染。
function buildCouponInfoRows(coupon: MemberCouponItem): CouponDetailRow[] {
  return [
    { label: '优惠内容', value: coupon.benefitText },
    { label: '使用门槛', value: coupon.thresholdText },
    { label: '适用场景', value: coupon.sceneText },
    { label: '获取方式', value: coupon.sourceText },
  ].filter((row) => row.value);
}

// 汇总状态记录字段，避免页面散写多段显隐判断。
function buildCouponRecordRows(coupon: MemberCouponItem): CouponDetailRow[] {
  return [
    { label: '券号', value: coupon.couponNo },
    { label: '领取时间', value: coupon.issuedAtText },
    { label: '有效期', value: coupon.validityPeriodText },
    {
      label: '关联订单',
      value: coupon.orderNoText,
      actionText: coupon.orderNoText ? '查看订单' : undefined,
      targetRoute: resolveCouponOrderDetailRoute(coupon.orderNoText) || undefined,
    },
    { label: '锁定时间', value: coupon.lockedAtText },
    { label: '使用时间', value: coupon.usedAtText },
    { label: '返还状态', value: coupon.refundReturnStatusText },
  ].filter((row) => row.value);
}

// 统一渲染单行说明，保证详情页信息密度稳定。
function renderCouponDetailRow(row: CouponDetailRow) {
  return (
    <View className="_pg-row" key={row.label}>
      <Text className="_pg-row_label">{row.label}</Text>
      <View className="_pg-row_main">
        <Text className="_pg-row_value">{row.value}</Text>
        {row.targetRoute && row.actionText ? (
          <View className="_pg-row_action" onClick={() => navigateToMiniRoute(row.targetRoute!)}>
            <Text className="_pg-row_action-text">{row.actionText}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// 统一生成券面状态类名，沿用项目里我的券列表的写法，避免动态模板字符串误伤页面规范检查。
function resolveCouponCardClassName(coupon: MemberCouponItem) {
  return [
    '_pg-card',
    `_pg-card--${coupon.status}`,
  ].join(' ');
}

// 统一生成底部按钮状态类名，保持 disabled 态和可用态结构稳定。
function resolveCouponFooterButtonClassName(coupon: MemberCouponItem) {
  return [
    '_pg-footer_button',
    coupon.useEnabled ? '' : '_pg-footer_button--disabled',
  ].filter(Boolean).join(' ');
}

function resolveCouponOrderButtonClassName() {
  return [
    '_pg-footer_button',
    '_pg-footer_button--ghost',
  ].join(' ');
}

function resolveCouponAftersaleButtonClassName() {
  return [
    '_pg-footer_button',
    '_pg-footer_button--ghost',
  ].join(' ');
}

// 会员优惠券详情页：承接真实 BFF 券资产，并给可使用券提供去下单入口。
const CouponDetailPage = observer(function CouponDetailPage() {
  const [coupon, setCoupon] = useState<MemberCouponItem | null | undefined>();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextCoupon = await fetchCouponDetailData(resolveCouponId(), { retryTimes: 2 });
      setCoupon(nextCoupon);
    },
    refreshOnShow: true,
    loginRequired: true,
    loginReason: '登录后可查看优惠券详情',
  });

  // 可使用状态下跳转到对应下单或会员码场景，其它状态只做详情展示。
  function handleUseCoupon() {
    if (!coupon?.useEnabled) return;
    navigateToMiniRoute(coupon.targetRoute);
  }

  function handleViewOrder() {
    if (!coupon?.orderNoText) return;
    navigateToMiniRoute(resolveCouponOrderDetailRoute(coupon.orderNoText));
  }

  function handleViewAftersale() {
    if (!coupon?.orderNoText || !coupon.refundReturnStatusText) return;
    navigateToMiniRoute(resolveCouponAftersaleListRoute(coupon.orderNoText));
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell
        title="优惠券详情"
        className="_pg-shell"
        reserveTabBarSpace={false}
        footer={coupon ? (
          <View className="_pg-footer">
            {coupon.orderNoText ? (
              <View
                className={resolveCouponOrderButtonClassName()}
                onClick={handleViewOrder}
              >
                <Text>查看订单</Text>
              </View>
            ) : null}
            {coupon.orderNoText && coupon.refundReturnStatusText ? (
              <View
                className={resolveCouponAftersaleButtonClassName()}
                onClick={handleViewAftersale}
              >
                <Text>查看售后</Text>
              </View>
            ) : null}
            <View
              className={resolveCouponFooterButtonClassName(coupon)}
              onClick={handleUseCoupon}
            >
              <Text>{coupon.useEnabled ? coupon.actionText : coupon.statusText}</Text>
            </View>
          </View>
        ) : undefined}
      >
        {typeof coupon === 'undefined' ? null : coupon ? (
          <View className="_pg-content">
            <View className={resolveCouponCardClassName(coupon)}>
              <View className="_pg-card_header">
                <View className="_pg-card_status">
                  <Text>{coupon.statusText}</Text>
                </View>
                <Text className="_pg-card_scene">{coupon.sceneText}</Text>
              </View>
              <View className="_pg-card_amount-row">
                <Text className="_pg-card_amount">{coupon.amountText}</Text>
                <View className="_pg-card_type">
                  <Text>{coupon.couponTypeText}</Text>
                  <Text>{coupon.currencyText}</Text>
                </View>
              </View>
              <Text className="_pg-card_title">{coupon.title}</Text>
              <Text className="_pg-card_validity">{coupon.validityText}</Text>
            </View>

            <View className="_pg-section">
              <Text className="_pg-section_title">优惠信息</Text>
              <View className="_pg-section_body">
                {buildCouponInfoRows(coupon).map(renderCouponDetailRow)}
              </View>
            </View>

            <View className="_pg-section">
              <Text className="_pg-section_title">使用记录</Text>
              <View className="_pg-section_body">
                {buildCouponRecordRows(coupon).map(renderCouponDetailRow)}
              </View>
            </View>

            <View className="_pg-section">
              <Text className="_pg-section_title">使用提醒</Text>
              <View className="_pg-tip">
                <Text className="_pg-tip_text">{coupon.reasonText}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View className="_pg-empty">
            <BaseEmpty
              title="未找到这张优惠券"
              description="可返回我的优惠券重新查看"
            />
          </View>
        )}
      </PageShell>
    </View>
  ));
});

export default CouponDetailPage;
