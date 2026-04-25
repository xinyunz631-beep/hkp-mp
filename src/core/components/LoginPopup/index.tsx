import { Button, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { loginWithProfile } from '@/core/services/auth';
import { rootStore } from '@/core/store';
import './index.scss';

// 渲染可复用登录弹窗，页面只需要打开 rootStore.ui.openLogin 即可触发。
export const LoginPopup = observer(function LoginPopup() {
  if (!rootStore.ui.loginVisible) return null;

  // 处理主动登录按钮点击，统一走 mock 登录服务。
  async function handleLogin() {
    await loginWithProfile();
  }

  // 处理取消登录，保留游客状态继续浏览。
  function handleCancel() {
    rootStore.ui.closeLogin();
  }

  return (
    <View className="login-popup">
      <View className="login-popup__mask" onClick={handleCancel} />
      <View className="login-popup__panel">
        <View className="login-popup__title">登录乐园会员</View>
        <View className="login-popup__desc">{rootStore.ui.loginReason}</View>
        <View className="login-popup__benefits">
          <View>同步票务、酒店、点餐和商城订单</View>
          <View>查看会员等级、积分和专属权益</View>
          <View>保存常用游客与开票信息</View>
        </View>
        <Button className="login-popup__primary" onClick={handleLogin}>
          一键授权登录
        </Button>
        <Button className="login-popup__ghost" onClick={handleCancel}>
          暂不登录
        </Button>
      </View>
    </View>
  );
});
