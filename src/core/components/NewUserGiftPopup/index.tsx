import { Button, Image, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { useRef, useState } from 'react';
import { AppPopup } from '@/core/components/AppPopup';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { confirmBffNewUserGift } from '@/core/services/bff-new-user-gift-api';
import { rootStore } from '@/core/store';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import './index.scss';

// 常驻渲染新人注册礼到账弹窗，登录链路发现新用户礼包后展示全部券项。
// 按优先级拼装新人礼券名，避免后端缺漏导致全部落到同一默认文案。
function firstText(value?: string) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || '';
}

function resolveNewUserGiftName(item: {
  couponName?: string;
  displayName?: string;
  templateName?: string;
  giftObjectName?: string;
  giftName?: string;
  couponTemplateId?: string;
}, index: number) {
  return (
    firstText(item.couponName)
    || firstText(item.displayName)
    || firstText(item.templateName)
    || firstText(item.giftObjectName)
    || firstText(item.giftName)
    || firstText(item.couponTemplateId)
    || `新人券 ${index + 1}`
  );
}

export const NewUserGiftPopup = observer(function NewUserGiftPopup() {
  const gift = rootStore.app.newUserGift;
  const visible = rootStore.app.newUserGiftVisible && Boolean(gift);
  const couponItems = gift?.giftItems ?? [];
  const shownRecordRef = useRef('');
  const [submitting, setSubmitting] = useState(false);

  async function markPopup(action: 'shown' | 'closed') {
    if (!gift?.activityId || !gift.recordId) return;
    await confirmBffNewUserGift(gift.activityId, {
      recordId: gift.recordId,
      action,
    });
  }

  async function handleAfterShow() {
    if (!gift?.recordId || shownRecordRef.current === gift.recordId) return;
    shownRecordRef.current = gift.recordId;
    await markPopup('shown').catch(() => undefined);
  }

  async function handleClose() {
    await markPopup('closed').catch(() => undefined);
    rootStore.app.clearNewUserGift();
  }

  async function handleViewCoupons() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await markPopup('closed').catch(() => undefined);
    } finally {
      setSubmitting(false);
      rootStore.app.clearNewUserGift();
      navigateToMiniRoute(MINI_PACKAGE_ROUTES.memberCoupons, { loginMode: 'none' });
    }
  }

  return (
    <AppPopup
      visible={visible}
      className="new-user-gift-popup"
      contentClassName="new-user-gift-popup__content"
      position="center"
      zIndex={1180}
      safeArea={false}
      destroyOnClose
      onClose={handleClose}
      afterShow={handleAfterShow}
    >
      {gift ? (
        <View className="new-user-gift-popup__panel">
          <View className="new-user-gift-popup__badge">新人专享</View>
          {gift.popupImageUrl ? (
            <Image className="new-user-gift-popup__hero" src={gift.popupImageUrl} mode="aspectFill" />
          ) : null}
          <Text className="new-user-gift-popup__title">{gift.popupTitle || '新人礼已到账'}</Text>
          <Text className="new-user-gift-popup__desc">
            {gift.popupSubtitle || `${couponItems.length}张新人专享券已放入你的账户。`}
          </Text>
          <View className="new-user-gift-popup__coupons">
            {couponItems.map((item, index) => (
              <View className="new-user-gift-popup__coupon" key={item.couponNo || item.couponTemplateId || String(index)}>
                {item.imageUrl ? <Image className="new-user-gift-popup__coupon-image" src={item.imageUrl} mode="aspectFill" /> : null}
                <View className="new-user-gift-popup__coupon-main">
                  <Text className="new-user-gift-popup__coupon-name">
                    {resolveNewUserGiftName(item, index)}
                  </Text>
                  <Text className="new-user-gift-popup__coupon-rule">{item.thresholdText || '门槛以券详情为准'}</Text>
                  <Text className="new-user-gift-popup__coupon-time">{item.validityText || '有效期以券详情为准'}</Text>
                </View>
                <Text className="new-user-gift-popup__coupon-amount">{item.amountText || '专享'}</Text>
              </View>
            ))}
          </View>
          <Button className="new-user-gift-popup__primary" loading={submitting} onClick={handleViewCoupons}>
            {gift.popupButtonText || '去查看优惠券'}
          </Button>
          <Button className="new-user-gift-popup__ghost" disabled={submitting} onClick={handleClose}>
            稍后再看
          </Button>
        </View>
      ) : null}
    </AppPopup>
  );
});
