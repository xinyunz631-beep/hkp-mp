import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Canvas, Text, View } from '@tarojs/components';
import Taro, { useDidHide, useDidShow } from '@tarojs/taro';
import { observer } from 'mobx-react';
import drawQrcode from 'weapp-qrcode';
import { AppImage } from '@/core/components/AppImage';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { fetchMemberCode } from '@/pkg-member/services/member-code';
import './index.scss';

const MEMBER_CODE_CANVAS_ID = 'member-code-canvas';
const MEMBER_CODE_REFRESH_INTERVAL = 30_000;
const MEMBER_CODE_CANVAS_SIZE_PX = 300;
const MEMBER_CODE_DISPLAY_SIZE_RPX = 300;
const WEAPP_DESIGN_WIDTH = 750;

function resolveCanvasSizeRpx() {
  try {
    const systemInfo = Taro.getSystemInfoSync();
    if (!systemInfo.windowWidth) return MEMBER_CODE_CANVAS_SIZE_PX * 2;

    return Math.round((MEMBER_CODE_CANVAS_SIZE_PX * WEAPP_DESIGN_WIDTH) / systemInfo.windowWidth);
  } catch {
    return MEMBER_CODE_CANVAS_SIZE_PX * 2;
  }
}

function convertCanvasToImage() {
  return new Promise<string>((resolve, reject) => {
    Taro.canvasToTempFilePath({
      canvasId: MEMBER_CODE_CANVAS_ID,
      x: 0,
      y: 0,
      width: MEMBER_CODE_CANVAS_SIZE_PX,
      height: MEMBER_CODE_CANVAS_SIZE_PX,
      destWidth: MEMBER_CODE_CANVAS_SIZE_PX,
      destHeight: MEMBER_CODE_CANVAS_SIZE_PX,
      success: (result) => resolve(result.tempFilePath),
      fail: reject,
    });
  });
}

// 渲染会员码页面，先用 mock 服务生成二维码内容，后续可直接替换为真实接口。
const MemberCodePage = observer(function MemberCodePage() {
  const [canvasSizeRpx] = useState(resolveCanvasSizeRpx);
  const [memberCode, setMemberCode] = useState('');
  const [memberCodeImageSrc, setMemberCodeImageSrc] = useState('');
  const [pageVisible, setPageVisible] = useState(false);
  const hiddenCanvasStyle: CSSProperties = {
    width: `${canvasSizeRpx}rpx`,
    height: `${canvasSizeRpx}rpx`,
  };

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

  // 先在隐藏 canvas 中生成二维码，再转成图片给页面展示，避免 canvas 直接渲染被裁切。
  const drawMemberCode = useCallback((code: string) => {
    if (!code) return;

    Taro.nextTick(() => {
      drawQrcode({
        width: MEMBER_CODE_CANVAS_SIZE_PX,
        height: MEMBER_CODE_CANVAS_SIZE_PX,
        canvasId: MEMBER_CODE_CANVAS_ID,
        text: code,
        background: '#ffffff',
        foreground: '#111111',
        correctLevel: 2,
        callback: () => {
          void convertCanvasToImage()
            .then(setMemberCodeImageSrc)
            .catch(() => setMemberCodeImageSrc(''));
        },
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
      <PageShell title="会员码" reserveTabBarSpace={false} className="_pg-shell">
        <AppImage
          className="_pg-bg"
          src=""
          mode="aspectFill"
          placeholderColor="#f5f7fa"
          showErrorIcon={false}
        />
        <View className="_pg-scene">
          <AppImage
            className="_pg-logo"
            src=""
            mode="aspectFit"
            placeholderColor="#d9e0e8"
            showErrorIcon={false}
          />
          <View className="_pg-card">
            <View className="_pg-qrcode_shell">
              {memberCodeImageSrc ? (
                <AppImage
                  className="_pg-qrcode_image"
                  src={memberCodeImageSrc}
                  mode="aspectFit"
                  width={`${MEMBER_CODE_DISPLAY_SIZE_RPX}rpx`}
                  height={`${MEMBER_CODE_DISPLAY_SIZE_RPX}rpx`}
                  showLoading={false}
                  showErrorIcon={false}
                />
              ) : (
                <Text className="_pg-qrcode_loading">会员码生成中</Text>
              )}
            </View>
          </View>
          <Text
            className="_pg-hint"
            onClick={() => navigateToMiniRoute(MINI_PACKAGE_ROUTES.memberLegacyBind)}
          >
            老会员需要绑定，请至“我的”-“老会员绑定”
          </Text>
        </View>
        <View className="_pg-qrcode_canvas-host" style={hiddenCanvasStyle}>
          <Canvas canvasId={MEMBER_CODE_CANVAS_ID} className="_pg-qrcode_canvas" style={hiddenCanvasStyle} />
        </View>
      </PageShell>
    </View>
  ));
});

export default MemberCodePage;
