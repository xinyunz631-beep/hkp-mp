import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AuthAction } from '@/core/components/AuthAction';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { ensureLogin, logout, runAfterLogin, withLoginGuard } from '@/core/services/auth';
import { fetchCouponUsedCount } from '@/core/services/home';
import { rootStore } from '@/core/store';
import type { MiniPackageRoute } from '@/core/constants/routes';
import type { CouponUsedCountResponse, HomeServiceEntry } from '@/core/types/home';

const homeServices: HomeServiceEntry[] = [
  { key: 'ticket', title: '门票预订', description: '日场、夜场、套票统一入口', path: MINI_PACKAGE_ROUTES.ticketHome },
  { key: 'hotel', title: '酒店度假', description: '乐园酒店、亲子房和套餐', path: MINI_PACKAGE_ROUTES.hotelHome },
  { key: 'mall', title: '乐园商城', description: '纪念品、雨具、亲子周边', path: MINI_PACKAGE_ROUTES.mallHome },
  { key: 'dining', title: '园内点餐', description: '餐厅排队、套餐和自提', path: MINI_PACKAGE_ROUTES.diningHome },
  { key: 'order', title: '我的订单', description: '票务、酒店、点餐订单', path: MINI_PACKAGE_ROUTES.orderHome, requireLogin: true },
  { key: 'member', title: '会员中心', description: '积分、等级、权益和卡券', path: MINI_PACKAGE_ROUTES.memberHome, requireLogin: true },
];

// 归一化优惠券数量接口返回，兼容数字和对象两种轻量结构。
function resolveCouponCount(response: CouponUsedCountResponse) {
  if (!response) return 0;
  if (typeof response === 'number') return response;
  return response.count ?? response.usedCount ?? response.total ?? 0;
}

// 渲染主包首页，展示轻量聚合数据和分包业务入口。
const HomePage = observer(function HomePage() {
  const [couponCount, setCouponCount] = useState<number>();
  const memberProfile = rootStore.member.profile;
  const guardedMemberNavigate = withLoginGuard(
    () => navigateToSubPackage(MINI_PACKAGE_ROUTES.memberHome),
    '登录后可进入会员中心',
  );

  useEffect(() => {
    // 加载真实优惠券数量，用于验证 CSESSION 授权后的业务接口链路。
    async function loadCouponCount() {
      const response = await fetchCouponUsedCount();
      setCouponCount(resolveCouponCount(response));
    }

    loadCouponCount();
  }, []);

  // 跳转到独立分包页面，主包只持有路径字符串不 import 业务代码。
  function navigateToSubPackage(path: MiniPackageRoute) {
    Taro.navigateTo({ url: path });
  }

  // 打开当前页面登录弹窗，用于验证任意事件都能触发登录。
  function handleOpenLogin() {
    rootStore.app.openLogin('登录后可继续使用会员服务');
  }

  // 在页面方法内先等待登录，登录成功后继续原业务动作。
  async function handleMethodGuard() {
    const authed = await ensureLogin('登录后可继续完成当前操作');
    if (!authed) return;

    Taro.showToast({
      title: '操作已继续',
      icon: 'success',
    });
  }

  // 使用通用续执行封装验证登录后的自动回调。
  async function handleAutoContinue() {
    await runAfterLogin(async () => {
      Taro.showToast({
        title: '已继续处理',
        icon: 'success',
      });
    }, '登录后可继续处理');
  }

  // 退出当前会员态，用于反复验证未登录和已登录流程。
  function handleLogout() {
    logout();
    Taro.showToast({
      title: '已退出',
      icon: 'none',
    });
  }

  return (
    <PageShell title="乐园首页" description="票务、会员、商城和园区服务入口。">
      <View className="page-shell__section">
        <View className="page-shell__section-title">今日概览</View>
        <View className="home-metrics">
          <View className="home-metric">
            <Text className="home-metric__value">{couponCount ?? '-'}</Text>
            <Text className="home-metric__label">已用优惠券</Text>
          </View>
        </View>
      </View>

      <View className="page-shell__section">
        <View className="page-shell__section-title">登录能力验证</View>
        <View className="home-auth-panel">
          <View className="home-auth-panel__row">
            <Text className="home-auth-panel__label">会员状态</Text>
            <Text className="home-auth-panel__value">{rootStore.member.isLoggedIn ? '已登录' : '未登录'}</Text>
          </View>
          <View className="home-auth-panel__row">
            <Text className="home-auth-panel__label">会员手机</Text>
            <Text className="home-auth-panel__value">{memberProfile?.mobile || '登录后展示'}</Text>
          </View>
          <View className="home-auth-panel__row">
            <Text className="home-auth-panel__label">服务状态</Text>
            <Text className="home-auth-panel__value">{rootStore.member.hasCsession ? '已就绪' : '准备中'}</Text>
          </View>
          <View className="home-auth-actions">
            <View className="home-auth-action" onClick={handleOpenLogin}>
              <Text>打开登录</Text>
            </View>
            <View className="home-auth-action" onClick={handleMethodGuard}>
              <Text>操作前登录</Text>
            </View>
            <View className="home-auth-action" onClick={handleAutoContinue}>
              <Text>登录后继续</Text>
            </View>
            <View className="home-auth-action" onClick={guardedMemberNavigate}>
              <Text>守卫入口</Text>
            </View>
            <View className="home-auth-action home-auth-action--ghost" onClick={handleLogout}>
              <Text>退出登录</Text>
            </View>
          </View>
        </View>
      </View>
    </PageShell>
  );
});

export default HomePage;
