import { Button, View, type BaseEventOrig, type ButtonProps } from '@tarojs/components';
import { observer } from 'mobx-react';
import { useEffect } from 'react';
import { AppPopup } from '@/core/components/AppPopup';
import { loginWithPhoneNumber } from '@/core/services/auth';
import { rootStore } from '@/core/store';
import { showWechatToast } from '@/core/utils/wechat-actions';
import { parseWechatPhoneCredential, resolveWechatPhoneCredentialMessage } from '@/core/wechat/auth';
import './index.scss';

// 常驻渲染页面级登录弹窗，显示状态跟随全局登录态自动收口。
export const LoginPopup = observer(function LoginPopup() {
  const isLoggedIn = rootStore.isLoggedIn;
  const loginVisible = rootStore.app.loginVisible;
  const visible = loginVisible && !isLoggedIn;

  useEffect(() => {
    if (loginVisible && isLoggedIn) {
      rootStore.app.finishLogin();
    }
  }, [isLoggedIn, loginVisible]);

  // 处理微信手机号授权登录，优先走微信小程序推荐的手机号 code。
  async function handlePhoneLogin(event: BaseEventOrig<ButtonProps.onGetPhoneNumberEventDetail>) {
    const credential = parseWechatPhoneCredential(event.detail);
    if (!credential) {
      await showWechatToast(resolveWechatPhoneCredentialMessage(event.detail));
      return;
    }

    await loginWithPhoneNumber(credential).catch(() => undefined);
  }

  // 处理取消登录，保留游客状态继续浏览。
  function handleCancel() {
    rootStore.app.closeLogin();
  }

  return (
    <AppPopup
      visible={visible}
      className="login-popup"
      contentClassName="login-popup__content"
      destroyOnClose
      onClose={handleCancel}
    >
      <View className="login-popup__panel">
        <View className="login-popup__title">登录乐园会员</View>
        <View className="login-popup__desc">{rootStore.app.loginReason}</View>
        <View className="login-popup__benefits">
          <View>同步票务、酒店、点餐和商城订单</View>
          <View>查看会员等级、积分和专属权益</View>
          <View>保存常用游客与开票信息</View>
        </View>
        <Button className="login-popup__primary" openType="getPhoneNumber" onGetPhoneNumber={handlePhoneLogin}>
          手机号快捷登录
        </Button>
        <Button className="login-popup__ghost" onClick={handleCancel}>
          暂不登录
        </Button>
      </View>
    </AppPopup>
  );
});
