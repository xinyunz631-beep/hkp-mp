import { Button, View, type BaseEventOrig, type ButtonProps } from '@tarojs/components';
import { observer } from 'mobx-react';
import { useEffect, useRef, useState } from 'react';
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
  const visible = loginVisible;
  const loginLockedRef = useRef(false);
  const loginRequestingRef = useRef(false);
  const [phoneLoginLoading, setPhoneLoginLoading] = useState(false);
  const ghostClassName = [
    'login-popup__ghost',
    phoneLoginLoading ? 'login-popup__ghost--disabled' : '',
  ].filter(Boolean).join(' ');
  const panelClassName = [
    'login-popup__panel',
    phoneLoginLoading ? 'login-popup__panel--loading' : '',
  ].filter(Boolean).join(' ');

  function setLoginLocked(locked: boolean) {
    loginLockedRef.current = locked;
    if (!locked) loginRequestingRef.current = false;
    setPhoneLoginLoading(locked);
  }

  useEffect(() => {
    if (loginVisible && isLoggedIn) {
      rootStore.app.completeLogin();
    }
    if (!loginVisible || isLoggedIn) {
      setLoginLocked(false);
    }
  }, [isLoggedIn, loginVisible]);

  // 微信手机号授权会先拉起平台面板，点击瞬间先进入锁定态，避免用户误以为无反馈。
  function handlePhoneLoginPress() {
    if (loginLockedRef.current || !rootStore.app.loginVisible || rootStore.isLoggedIn) return;
    setLoginLocked(true);
  }

  // 处理微信手机号授权登录，优先走微信小程序推荐的手机号 code。
  async function handlePhoneLogin(event: BaseEventOrig<ButtonProps.onGetPhoneNumberEventDetail>) {
    if (!loginLockedRef.current) setLoginLocked(true);
    const credential = parseWechatPhoneCredential(event.detail);
    if (!credential) {
      setLoginLocked(false);
      await showWechatToast(resolveWechatPhoneCredentialMessage(event.detail));
      return;
    }

    if (loginRequestingRef.current) return;
    loginRequestingRef.current = true;

    const success = await loginWithPhoneNumber(credential).catch(() => false);
    if (!success) setLoginLocked(false);
  }

  // 处理取消登录，保留游客状态继续浏览。
  function handleCancel() {
    if (loginLockedRef.current) return;
    if (!rootStore.app.loginVisible || rootStore.isLoggedIn) return;
    rootStore.app.cancelLogin();
  }

  return (
    <AppPopup
      visible={visible}
      className="login-popup"
      contentClassName="login-popup__content"
      destroyOnClose
      closeOnOverlayClick={!phoneLoginLoading}
      onClose={handleCancel}
    >
      <View className={panelClassName}>
        <View className="login-popup__title">登录乐园会员</View>
        <View className="login-popup__desc">{rootStore.app.loginReason}</View>
        <View className="login-popup__benefits">
          <View>同步票务、酒店、点餐和商城订单</View>
          <View>查看会员等级、积分和专属权益</View>
          <View>保存常用游客与开票信息</View>
        </View>
        <Button
          className="login-popup__primary"
          openType="getPhoneNumber"
          onClick={handlePhoneLoginPress}
          onGetPhoneNumber={handlePhoneLogin}
        >
          {phoneLoginLoading ? '登录授权中...' : '手机号快捷登录'}
        </Button>
        <Button className={ghostClassName} disabled={phoneLoginLoading} onClick={handleCancel}>
          暂不登录
        </Button>
        {phoneLoginLoading ? <View className="login-popup__loading-cover" /> : null}
      </View>
    </AppPopup>
  );
});
