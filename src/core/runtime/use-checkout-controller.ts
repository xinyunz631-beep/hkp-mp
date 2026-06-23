import { useCallback, useState } from 'react';
import Taro from '@tarojs/taro';
import { syncBffPaymentStatusSilently } from '@/core/services/bff-api';
import type { CheckoutSubmitResult } from '@/core/services/checkout-flow';
import { resolveErrorMessage } from '@/core/utils/error-message';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { requestWechatPayment, showWechatToast } from '@/core/utils/wechat-actions';

export interface CheckoutLoadParams {
  selectedCouponId?: string | null;
  [key: string]: unknown;
}

export interface CheckoutRunOptions {
  withLoading?: <TResult>(task: () => Promise<TResult>) => Promise<TResult>;
}

export interface CheckoutRevalidateResult<TData> {
  data: TData;
  changed: boolean;
  message?: string;
}

export interface CheckoutControllerAdapter<
  TData,
  TSubmitPayload,
  TLoadParams extends CheckoutLoadParams = CheckoutLoadParams,
> {
  load: (params: TLoadParams) => Promise<TData>;
  readSelectedCouponId: (data: TData) => string | undefined;
  readCouponNoticeText?: (data: TData) => string | undefined;
  readPayableAmount: (data: TData) => number;
  revalidateBeforeSubmit?: (data: TData, payload: TSubmitPayload) => Promise<CheckoutRevalidateResult<TData>>;
  submit: (data: TData, payload: TSubmitPayload) => Promise<CheckoutSubmitResult | undefined>;
  onOrderCreated?: (data: TData, result: CheckoutSubmitResult) => Promise<void> | void;
  buildSuccessRoute: (result: CheckoutSubmitResult) => string;
  isOrderComplete?: (result: CheckoutSubmitResult) => boolean;
  submitErrorText: string;
  emptySubmitText?: string;
  completeSuccessText?: string;
  zeroPaySuccessText?: string;
  paymentSuccessText?: string;
}

function runCheckoutTask<TResult>(
  task: () => Promise<TResult>,
  options?: CheckoutRunOptions,
) {
  return options?.withLoading ? options.withLoading(task) : task();
}

// 已创建订单但未完成支付时，统一引导到订单详情继续待支付流程。
function navigateToCreatedOrder<TData, TSubmitPayload, TLoadParams extends CheckoutLoadParams>(
  adapter: CheckoutControllerAdapter<TData, TSubmitPayload, TLoadParams>,
  result: CheckoutSubmitResult,
) {
  navigateToMiniRoute(adapter.buildSuccessRoute(result), {
    loginMode: 'none',
  });
}

// 统一结算页加载、选券重算和真实微信支付流程；业务字段仍由各业态 adapter/page 独立维护。
export function useCheckoutController<
  TData,
  TSubmitPayload = undefined,
  TLoadParams extends CheckoutLoadParams = CheckoutLoadParams,
>(adapter: CheckoutControllerAdapter<TData, TSubmitPayload, TLoadParams>) {
  const [data, setData] = useState<TData>();
  const [selectedCouponId, setSelectedCouponId] = useState<string>();
  const [couponPopupVisible, setCouponPopupVisible] = useState(false);

  const applyLoadedData = useCallback((nextData: TData) => {
    setData(nextData);
    setSelectedCouponId(adapter.readSelectedCouponId(nextData));
    return nextData;
  }, [adapter]);

  const load = useCallback(async (params: TLoadParams) => {
    const nextData = await adapter.load(params);
    setCouponPopupVisible(false);
    return applyLoadedData(nextData);
  }, [adapter, applyLoadedData]);

  const refreshByCoupon = useCallback(async (
    nextCouponId: string | null | undefined,
    options?: CheckoutRunOptions,
    extraParams?: Omit<TLoadParams, 'selectedCouponId'>,
  ) => {
    try {
      const nextData = await runCheckoutTask(() => adapter.load({
        ...(extraParams as object),
        selectedCouponId: nextCouponId,
      } as TLoadParams), options);
      applyLoadedData(nextData);

      const noticeText = adapter.readCouponNoticeText?.(nextData);
      if (noticeText) await showWechatToast(noticeText);
      return nextData;
    } catch (error) {
      await showWechatToast(resolveErrorMessage(error, '优惠券暂不可用，请稍后再试'));
      return false;
    }
  }, [adapter, applyLoadedData]);

  const submitAndPay = useCallback(async (
    payload: TSubmitPayload,
    options?: CheckoutRunOptions,
  ) => {
    if (!data) {
      await showWechatToast(adapter.emptySubmitText || '订单信息已失效，请重新选择');
      return undefined;
    }

    let submitData: TData = data;
    const revalidateBeforeSubmit = adapter.revalidateBeforeSubmit;
    if (revalidateBeforeSubmit) {
      try {
        const revalidateResult = await runCheckoutTask(() => revalidateBeforeSubmit(submitData, payload), options);
        submitData = revalidateResult.data;
        applyLoadedData(revalidateResult.data);

        if (revalidateResult.changed) {
          await showWechatToast(revalidateResult.message || '订单信息已更新，请确认后重新提交');
          return undefined;
        }
      } catch (error) {
        await showWechatToast(resolveErrorMessage(error, adapter.submitErrorText));
        return undefined;
      }
    }

    let result: CheckoutSubmitResult | undefined;
    try {
      result = await runCheckoutTask(() => adapter.submit(submitData, payload), options);
    } catch (error) {
      await showWechatToast(resolveErrorMessage(error, adapter.submitErrorText));
      return undefined;
    }

    if (!result) {
      await showWechatToast(adapter.emptySubmitText || '订单信息已失效，请重新选择');
      return undefined;
    }

    try {
      await adapter.onOrderCreated?.(submitData, result);
    } catch {
      // 业务侧成功回调不能影响已创建订单的后续支付和跳转。
    }

    if (adapter.isOrderComplete?.(result)) {
      await showWechatToast(adapter.completeSuccessText || '下单成功', 'success');
      navigateToMiniRoute(adapter.buildSuccessRoute(result), {
        loginMode: 'none',
      });
      return result;
    }

    if (result.payableAmount <= 0) {
      await showWechatToast(adapter.zeroPaySuccessText || '下单成功', 'success');
      navigateToMiniRoute(adapter.buildSuccessRoute(result), {
        loginMode: 'none',
      });
      return result;
    }

    const paymentParams = result.payment?.prepay?.paymentParams || result.payment?.prepay?.payParams;
    if (!paymentParams) {
      await showWechatToast('支付参数缺失，订单已创建，可稍后继续支付');
      navigateToCreatedOrder(adapter, result);
      return result;
    }

    const paymentStatus = await requestWechatPayment({
      amount: result.payableAmount || adapter.readPayableAmount(submitData),
      paymentParams: paymentParams as unknown as Parameters<typeof Taro.requestPayment>[0],
    });
    if (paymentStatus !== 'success') {
      navigateToCreatedOrder(adapter, result);
      return result;
    }

    await syncBffPaymentStatusSilently(result.payment?.prepay?.payNo);
    await showWechatToast(adapter.paymentSuccessText || '支付成功', 'success');
    navigateToMiniRoute(adapter.buildSuccessRoute(result), {
      loginMode: 'none',
    });
    return result;
  }, [adapter, data]);

  return {
    data,
    setData: applyLoadedData,
    selectedCouponId,
    couponPopupVisible,
    setCouponPopupVisible,
    openCouponPopup: () => setCouponPopupVisible(true),
    closeCouponPopup: () => setCouponPopupVisible(false),
    load,
    refreshByCoupon,
    submitAndPay,
  };
}
