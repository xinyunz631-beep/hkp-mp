import { useCallback, useRef, useState } from 'react';
import Taro from '@tarojs/taro';
import { syncBffPaymentStatusSilently } from '@/core/services/bff-api';
import { payBffOrder } from '@/core/services/bff-order-api';
import type { CheckoutSubmitResult } from '@/core/services/checkout-flow';
import { resolveErrorMessage } from '@/core/utils/error-message';
import { centToYuan, parseNumberLike } from '@/core/utils/money';
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
  onPaymentPrepared?: (data: TData, payload: TSubmitPayload, result: CheckoutSubmitResult) => Promise<void> | void;
  onCheckoutCompleted?: (data: TData, result: CheckoutSubmitResult) => Promise<void> | void;
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

async function completeCheckout<TData, TSubmitPayload, TLoadParams extends CheckoutLoadParams>(
  adapter: CheckoutControllerAdapter<TData, TSubmitPayload, TLoadParams>,
  data: TData,
  result: CheckoutSubmitResult,
) {
  try {
    await result.completeCheckout?.();
    await adapter.onCheckoutCompleted?.(data, result);
  } catch {
    // 支付已完成时，清理草稿或购物车失败不能阻断用户查看订单。
  }
}

function readPaymentParams(result: CheckoutSubmitResult) {
  return result.payment?.prepay?.paymentParams || result.payment?.prepay?.payParams;
}

function mergePaymentResult(result: CheckoutSubmitResult, payment: Awaited<ReturnType<typeof payBffOrder>>): CheckoutSubmitResult {
  const payableAmountCent = parseNumberLike(payment.order?.payableAmountCent ?? result.payableAmountCent);
  const nextPayableAmountCent = typeof payableAmountCent === 'number' && payableAmountCent >= 0
    ? payableAmountCent
    : result.payableAmountCent;

  return {
    ...result,
    orderStatus: payment.order?.orderStatus ?? result.orderStatus,
    payableAmount: centToYuan(nextPayableAmountCent),
    payableAmountCent: nextPayableAmountCent,
    order: payment.order ?? result.order,
    payment,
  };
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
  const [createdOrderResult, setCreatedOrderResult] = useState<CheckoutSubmitResult>();
  const submitLockRef = useRef(false);

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
    if (submitLockRef.current) return undefined;
    submitLockRef.current = true;

    try {
    if (!data) {
      await showWechatToast(adapter.emptySubmitText || '订单信息已失效，请重新选择');
      return undefined;
    }

    let submitData: TData = data;
    const shouldRefreshExistingPayment = Boolean(createdOrderResult);
    let result: CheckoutSubmitResult | undefined = createdOrderResult;
    const revalidateBeforeSubmit = adapter.revalidateBeforeSubmit;
    if (!result && revalidateBeforeSubmit) {
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

    if (!result) {
      try {
        result = await runCheckoutTask(() => adapter.submit(submitData, payload), options);
      } catch (error) {
        await showWechatToast(resolveErrorMessage(error, adapter.submitErrorText));
        return undefined;
      }
    }

    if (!result) {
      await showWechatToast(adapter.emptySubmitText || '订单信息已失效，请重新选择');
      return undefined;
    }

    setCreatedOrderResult(result);

    if (adapter.isOrderComplete?.(result)) {
      await completeCheckout(adapter, submitData, result);
      setCreatedOrderResult(undefined);
      await showWechatToast(adapter.completeSuccessText || '下单成功', 'success');
      navigateToMiniRoute(adapter.buildSuccessRoute(result), {
        loginMode: 'none',
        method: 'redirectTo',
      });
      return result;
    }

    if (result.payableAmount <= 0) {
      await completeCheckout(adapter, submitData, result);
      setCreatedOrderResult(undefined);
      await showWechatToast(adapter.zeroPaySuccessText || '下单成功', 'success');
      navigateToMiniRoute(adapter.buildSuccessRoute(result), {
        loginMode: 'none',
        method: 'redirectTo',
      });
      return result;
    }

    if (shouldRefreshExistingPayment || !readPaymentParams(result)) {
      const currentResult = result;
      try {
        const payment = await runCheckoutTask(() => payBffOrder(currentResult.orderNo, 'WECHAT'), options);
        result = mergePaymentResult(currentResult, payment);
        setCreatedOrderResult(result);
        await adapter.onPaymentPrepared?.(submitData, payload, result);
      } catch (error) {
        await showWechatToast(resolveErrorMessage(error, '支付参数暂不可用，请稍后重试'));
        return result;
      }
    }

    const paymentParams = readPaymentParams(result);
    if (!paymentParams) {
      await showWechatToast('支付参数缺失，请稍后重试');
      return result;
    }

    const paymentStatus = await requestWechatPayment({
      amount: result.payableAmount || adapter.readPayableAmount(submitData),
      paymentParams: paymentParams as unknown as Parameters<typeof Taro.requestPayment>[0],
    });
    if (paymentStatus !== 'success') {
      return result;
    }

    await syncBffPaymentStatusSilently(result.payment?.prepay?.payNo ?? result.order?.payNo);
    await completeCheckout(adapter, submitData, result);
    setCreatedOrderResult(undefined);
    await showWechatToast(adapter.paymentSuccessText || '支付成功', 'success');
    navigateToMiniRoute(adapter.buildSuccessRoute(result), {
      loginMode: 'none',
      method: 'redirectTo',
    });
    return result;
    } finally {
      submitLockRef.current = false;
    }
  }, [adapter, createdOrderResult, data]);

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
