import { Button, Image, ScrollView, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { useEffect, useRef, useState } from 'react';
import { AppPopup } from '@/core/components/AppPopup';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import {
  fetchBffMemberCoupons,
  getBffCouponTitle,
  getBffMemberCouponList,
} from '@/core/services/bff-coupon-api';
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

function visibleNameText(value?: string) {
  const text = firstText(value);
  const normalizedText = text
    .replace(/^注册新人礼[-_\s]*/, '')
    .replace(/^新人注册礼[-_\s]*/, '');
  if (['专享', '优惠券', '权益', '券', 'RMB'].includes(normalizedText)) return '';
  const normalizedAmount = normalizedText.replace(/[￥¥\s,]/g, '');
  if (/^\d+(?:\.\d+)?(?:元)?$/i.test(normalizedAmount)) return '';
  if (/^满?\d+(?:\.\d+)?(?:减\d+(?:\.\d+)?)?$/.test(normalizedAmount)) return '';
  return normalizedText;
}

function visibleAmountText(value?: string) {
  const text = firstText(value);
  if (!text) return '';
  if (['新人礼-小礼物', '专享'].includes(text)) return '';
  const normalized = text.replace(/[￥¥\s,]/g, '');
  return /^0(?:\.0+)?$/.test(normalized) ? '' : text;
}

function toCouponNoSet(items: Array<{ couponNo?: string }>) {
  return items
    .map((item) => item.couponNo?.trim())
    .filter((value): value is string => Boolean(value));
}

function resolveNewUserGiftName(item: {
  amountText?: string;
  couponName?: string;
  displayName?: string;
  templateName?: string;
  title?: string;
  giftObjectName?: string;
  giftName?: string;
  couponTemplateId?: string;
  giftTemplateName?: string;
  memberCouponName?: string;
}, index: number) {
  return (
    visibleNameText(item.giftObjectName)
    || visibleNameText(item.giftName)
    || visibleNameText(item.amountText)
    || visibleNameText(item.displayName)
    || visibleNameText(item.couponName)
    || visibleNameText(item.templateName)
    || visibleNameText(item.giftTemplateName)
    || visibleNameText(item.title)
    || visibleNameText(item.memberCouponName)
    || visibleNameText(item.couponTemplateId)
    || `新人专享券 ${index + 1}`
  );
}

function resolveNewUserGiftAmountText(amountText?: string) {
  return visibleAmountText(amountText);
}

function resolvePopupSubtitle(subtitle: string | undefined, couponCount: number) {
  const text = firstText(subtitle);
  const fallback = `${couponCount}张新人专享券已放入你的账户。`;
  if (!text) return fallback;
  return text
    .replace(/[一二三四五六七八九十0-9]+张/g, `${couponCount}张`);
}

export const NewUserGiftPopup = observer(function NewUserGiftPopup() {
  const gift = rootStore.app.newUserGift;
  const visible = rootStore.app.newUserGiftVisible && Boolean(gift);
  const couponItems = gift?.giftItems ?? [];
  const couponSignature = `${gift?.activityId || ''}|${gift?.recordId || ''}|${toCouponNoSet(couponItems).join(',')}`;
  const [memberCouponTitleMap, setMemberCouponTitleMap] = useState<Record<string, string>>({});
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

  useEffect(() => {
    let cancelled = false;
    const couponNos = toCouponNoSet(couponItems);
    if (!visible || !gift || couponNos.length === 0) {
      setMemberCouponTitleMap({});
      return;
    }

    (async () => {
      try {
        const response = await fetchBffMemberCoupons({
          size: Math.max(100, couponItems.length * 20),
        });
        if (cancelled) return;

        const memberCoupons = getBffMemberCouponList(response)
          .filter((coupon) => couponNos.includes(coupon.couponNo));
        const titlesByNo = memberCoupons.reduce<Record<string, string>>((result, coupon) => {
          const title = getBffCouponTitle(coupon);
          if (coupon.couponNo) result[coupon.couponNo] = title;
          return result;
        }, {});

        if (!cancelled) setMemberCouponTitleMap(titlesByNo);
      } catch {
        if (!cancelled) setMemberCouponTitleMap({});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [couponSignature, couponItems.length, visible]);

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
            {resolvePopupSubtitle(gift.popupSubtitle, couponItems.length)}
          </Text>
          <ScrollView
            className="new-user-gift-popup__coupons"
            scrollY
            enhanced
            showScrollbar={false}
          >
            {couponItems.map((item, index) => {
              const amountText = resolveNewUserGiftAmountText(item.amountText);
              return (
                <View className="new-user-gift-popup__coupon" key={item.couponNo || item.couponTemplateId || String(index)}>
                  {item.imageUrl ? <Image className="new-user-gift-popup__coupon-image" src={item.imageUrl} mode="aspectFill" /> : null}
                  <View className="new-user-gift-popup__coupon-main">
                    <Text className="new-user-gift-popup__coupon-name">
                      {resolveNewUserGiftName({
                        ...item,
                        memberCouponName: memberCouponTitleMap[item.couponNo || ''],
                      }, index)}
                    </Text>
                    <Text className="new-user-gift-popup__coupon-rule">{item.thresholdText || '门槛以券详情为准'}</Text>
                    <Text className="new-user-gift-popup__coupon-time">{item.validityText || '有效期以券详情为准'}</Text>
                  </View>
                  {amountText ? <Text className="new-user-gift-popup__coupon-amount">{amountText}</Text> : null}
                </View>
              );
            })}
          </ScrollView>
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
