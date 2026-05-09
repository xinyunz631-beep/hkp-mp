import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AuthAction } from '@/core/components/AuthAction';
import { PageShell } from '@/core/components/PageShell';
import { fetchCurrentPark, fetchHomeSummary } from '@/core/services/home';
import { rootStore } from '@/core/store';
import type { MiniPackageRoute } from '@/core/constants/routes';
import type { HomeSummary } from '@/core/types/home';

// 渲染主包首页，展示轻量聚合数据和分包业务入口。
const HomePage = observer(function HomePage() {
  const [summary, setSummary] = useState<HomeSummary>();

  useEffect(() => {
    // 加载首页聚合数据，并同步当前园区到全局 store。
    async function loadHomeSummary() {
      const [homeSummary, currentPark] = await Promise.all([fetchHomeSummary(), fetchCurrentPark()]);
      rootStore.park.setCurrentParkId(currentPark.id);
      setSummary(homeSummary);
    }

    loadHomeSummary();
  }, []);

  // 跳转到独立分包页面，主包只持有路径字符串不 import 业务代码。
  function navigateToSubPackage(path: MiniPackageRoute) {
    Taro.navigateTo({ url: path });
  }

  return (
    <PageShell title={summary?.parkName || '乐园首页'} description={summary?.notice || '加载乐园运营信息中'}>
      <View className="page-shell__section">
        <View className="page-shell__section-title">今日概览</View>
        <View className="home-metrics">
          {(summary?.metrics || []).map((item) => (
            <View className="home-metric" key={item.label}>
              <Text className="home-metric__value">
                {item.value}
                {item.unit || ''}
              </Text>
              <Text className="home-metric__label">{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="page-shell__section">
        <View className="page-shell__section-title">常用服务</View>
        <View className="home-services">
          {(summary?.services || []).map((item) => {
            const content = (
              <>
                <Text className="home-service__title">{item.title}</Text>
                <Text className="home-service__desc">{item.description}</Text>
              </>
            );

            if (item.requireLogin) {
              return (
                <AuthAction
                  className="home-service"
                  key={item.key}
                  reason={`登录后可进入${item.title}`}
                  onAuthed={() => navigateToSubPackage(item.path)}
                >
                  {content}
                </AuthAction>
              );
            }

            return (
              <View className="home-service" key={item.key} onClick={() => navigateToSubPackage(item.path)}>
                {content}
              </View>
            );
          })}
        </View>
      </View>
    </PageShell>
  );
});

export default HomePage;
