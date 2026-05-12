import Taro from '@tarojs/taro';
import { Button, View, type BaseEventOrig, type ButtonProps } from '@tarojs/components';
import { observer } from 'mobx-react';
import { useEffect } from 'react';
import { loginWithPhoneNumber, loginWithProfile } from '@/core/services/auth';
import { rootStore } from '@/core/store';
import { parseWechatPhoneCredential } from '@/core/wechat/auth';
import './index.scss';

// 常驻渲染页面级登录弹窗，显示状态跟随全局登录态自动收口。
export const LoginPopup = observer(function LoginPopup() {
  const isLoggedIn = rootStore.member.isLoggedIn;
  const loginVisible = rootStore.app.loginVisible;
  const hidden = !loginVisible || isLoggedIn;

  useEffect(() => {
    if (loginVisible && isLoggedIn) {
      rootStore.app.finishLogin();
    }
  }, [isLoggedIn, loginVisible]);

  // 处理微信手机号授权登录，优先走微信小程序推荐的手机号 code。
  async function handlePhoneLogin(event: BaseEventOrig<ButtonProps.onGetPhoneNumberEventDetail>) {
    const credential = parseWechatPhoneCredential(event.detail);
    if (!credential) {
      Taro.showToast({
        title: '未完成手机号授权',
        icon: 'none',
      });
      return;
    }

    await loginWithPhoneNumber(credential);
  }

  // 处理微信资料授权登录，作为手机号授权不可用时的兜底。
  async function handleProfileLogin() {
    await loginWithProfile();
  }

  // 处理取消登录，保留游客状态继续浏览。
  function handleCancel() {
    rootStore.app.closeLogin();
  }

  return (
    <View className={hidden ? 'login-popup login-popup--hidden' : 'login-popup'} aria-hidden={hidden}>
      <View className="login-popup__mask" onClick={handleCancel} />
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
        <Button className="login-popup__secondary" onClick={handleProfileLogin}>
          使用微信资料登录
        </Button>
        <Button className="login-popup__ghost" onClick={handleCancel}>
          暂不登录
        </Button>
      </View>
    </View>
  );
});
