import { useCallback, useEffect, useState } from 'react';
import { Canvas, Text, View } from '@tarojs/components';
import Taro, { useDidHide, useDidShow } from '@tarojs/taro';
import { observer } from 'mobx-react';
import drawQrcode from 'weapp-qrcode';
import { PageHeader, PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchMemberCode } from '@/pkg-member/services/member-code';
import './index.scss';

const MEMBER_CODE_CANVAS_ID = 'member-code-canvas';
const MEMBER_CODE_REFRESH_INTERVAL = 30_000;
const MEMBER_CODE_CANVAS_SIZE = 300;

// 渲染会员码页面，先用 mock 服务生成二维码内容，后续可直接替换为真实接口。
const MemberCodePage = observer(function MemberCodePage() {
  const [memberCode, setMemberCode] = useState('');
  const [pageVisible, setPageVisible] = useState(false);

  // 拉取会员码内容，页面初始化和定时刷新都复用这一条链路。
  const refreshMemberCode = useCallback(async () => {
    const nextMemberCode = await fetchMemberCode();
    setMemberCode(nextMemberCode);
  }, []);

  const pageRuntime = usePageRuntime({
    initPage: refreshMemberCode,
    loginRequired: true,
    loginReason: '登录后可查看会员码',
  });

  // 将会员码内容绘制到 canvas 上，二维码图形本身由成熟 npm 包负责。
  const drawMemberCode = useCallback((code: string) => {
    if (!code) return;

    Taro.nextTick(() => {
      drawQrcode({
        width: MEMBER_CODE_CANVAS_SIZE,
        height: MEMBER_CODE_CANVAS_SIZE,
        canvasId: MEMBER_CODE_CANVAS_ID,
        text: code,
        background: '#ffffff',
        foreground: '#111111',
        correctLevel: 2,
      });
    });
  }, []);

  // 每次会员码变化后重绘二维码，保证 30 秒刷新后画面同步更新。
  useEffect(() => {
    if (pageRuntime.phase !== 'ready' || !memberCode) return;
    drawMemberCode(memberCode);
  }, [drawMemberCode, memberCode, pageRuntime.phase]);

  // 页面可见且初始化完成后启动 30 秒刷新，离开页面时自动回收。
  useEffect(() => {
    if (!pageVisible || pageRuntime.phase !== 'ready') return undefined;

    const timer = setInterval(() => {
      void refreshMemberCode();
    }, MEMBER_CODE_REFRESH_INTERVAL);

    return () => {
      clearInterval(timer);
    };
  }, [pageRuntime.phase, pageVisible, refreshMemberCode]);

  // 页面展示时开启定时刷新能力。
  useDidShow(() => {
    setPageVisible(true);
  });

  // 页面隐藏时暂停刷新，避免后台继续跑定时器。
  useDidHide(() => {
    setPageVisible(false);
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="会员码" navbar={false} reserveTabBarSpace={false} className="_pg-shell">
        <PageHeader>
          <View className="_pg-safe-header" />
        </PageHeader>

        <View className="_pg-scene">
          <View className="_pg-card">
            <View className="_pg-card_halo _pg-card_halo--left" />
            <View className="_pg-card_halo _pg-card_halo--right" />
            <View className="_pg-qrcode_shell">
              <Canvas canvasId={MEMBER_CODE_CANVAS_ID} className="_pg-qrcode_canvas" />
            </View>
          </View>
          <Text className="_pg-hint">老会员需要绑定，请至“我的”-“老会员绑定”</Text>
        </View>
      </PageShell>
    </View>
  ));
});

export default MemberCodePage;
