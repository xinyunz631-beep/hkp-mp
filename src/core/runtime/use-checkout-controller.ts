import { useCallback, useRef, useState } from 'react';
import Taro from '@tarojs/taro';
import { syncBffPaymentStatusSilently } from '@/core/services/bff-api';
import { cancelBffOrder, payBffOrder } from '@/core/services/bff-order-api';
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
  onPaymentCanceled?: (data: TData, payload: TSubmitPayload, result: CheckoutSubmitResult) => Promise<void> | void;
  onCheckoutCompleted?: (data: TData, result: CheckoutSubmitResult) => Promise<void> | void;
  buildSuccessRoute: (result: CheckoutSubmitResult) => string;
  isOrderComplete?: (result: CheckoutSubmitResult) => boolean;
  submitErrorText: string;
  emptySubmitText?: string;
  completeSuccessText?: string;
  zeroPaySuccessText?: string;
  paymentSuccessText?: string;
  paymentSuccessRedirectDelayMs?: number;
  paymentSuccessLoadingText?: string;
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

async function cancelCheckoutPayment<TData, TSubmitPayload, TLoadParams extends CheckoutLoadParams>(
  adapter: CheckoutControllerAdapter<TData, TSubmitPayload, TLoadParams>,
  data: TData,
  payload: TSubmitPayload,
  result: CheckoutSubmitResult,
) {
  try {
    await cancelBffOrder(result.orderNo, { reason: 'USER_PAYMENT_CANCEL' }, { showErrorToast: false });
  } catch (error) {
    await showWechatToast('支付取消');
    return;
  }

  try {
    await adapter.onPaymentCanceled?.(data, payload, result);
  } catch {
    // 后端订单已取消时，本地待支付快照清理失败不能阻断用户重新提交。
  }
}

function readPaymentParams(result: CheckoutSubmitResult) {
  return result.payment?.prepay?.paymentParams || result.payment?.prepay?.payParams;
}

// 等待固定时长，给支付回调和后端异步履约留出落库窗口。
function waitForCheckoutRedirect(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function runCheckoutRedirectTask(task?: () => Promise<void>) {
  if (!task) return;

  try {
    task().catch(() => undefined);
  } catch {
    // 支付后清理任务失败不能影响 2s 后进入订单详情。
  }
}

// 支付成功后可用全屏 loading 锁住页面，避免立即跳详情读到后端旧状态。
async function waitPaymentSuccessRedirect(
  delayMs: number | undefined,
  loadingText = '加载中',
  task?: () => Promise<void>,
) {
  const normalizedDelayMs = Number(delayMs);
  if (!Number.isFinite(normalizedDelayMs) || normalizedDelayMs <= 0) {
    await task?.();
    return;
  }

  try {
    Taro.showLoading({
      title: loadingText,
      mask: true,
    }).catch(() => undefined);
  } catch {
    // loading 只是支付成功后的体验保护，失败不能阻断订单详情跳转。
  }

  runCheckoutRedirectTask(task);

  try {
    await waitForCheckoutRedirect(normalizedDelayMs);
  } finally {
    try {
      Taro.hideLoading();
    } catch {
      // 关闭 loading 失败时继续跳订单详情，避免支付完成后停在确认单。
    }
  }
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
    let result: CheckoutSubmitResult | undefined;
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

    if (adapter.isOrderComplete?.(result)) {
      await completeCheckout(adapter, submitData, result);
      await showWechatToast(adapter.completeSuccessText || '下单成功', 'success');
      navigateToMiniRoute(adapter.buildSuccessRoute(result), {
        loginMode: 'none',
        method: 'redirectTo',
      });
      return result;
    }

    if (result.payableAmount <= 0) {
      await completeCheckout(adapter, submitData, result);
      await showWechatToast(adapter.zeroPaySuccessText || '下单成功', 'success');
      navigateToMiniRoute(adapter.buildSuccessRoute(result), {
        loginMode: 'none',
        method: 'redirectTo',
      });
      return result;
    }

    if (!readPaymentParams(result)) {
      const currentResult = result;
      try {
        const payment = await runCheckoutTask(() => payBffOrder(currentResult.orderNo, 'WECHAT'), options);
        result = mergePaymentResult(currentResult, payment);
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
    if (paymentStatus === 'canceled') {
      await cancelCheckoutPayment(adapter, submitData, payload, result);
      return result;
    }
    if (paymentStatus !== 'success') {
      return result;
    }

    if (adapter.paymentSuccessRedirectDelayMs && adapter.paymentSuccessRedirectDelayMs > 0) {
      await waitPaymentSuccessRedirect(adapter.paymentSuccessRedirectDelayMs, adapter.paymentSuccessLoadingText, async () => {
        await syncBffPaymentStatusSilently(result.payment?.prepay?.payNo ?? result.order?.payNo);
        await completeCheckout(adapter, submitData, result);
      });
    } else {
      await syncBffPaymentStatusSilently(result.payment?.prepay?.payNo ?? result.order?.payNo);
      await completeCheckout(adapter, submitData, result);
      await showWechatToast(adapter.paymentSuccessText || '支付成功', 'success');
    }
    navigateToMiniRoute(adapter.buildSuccessRoute(result), {
      loginMode: 'none',
      method: 'redirectTo',
    });
    return result;
    } finally {
      submitLockRef.current = false;
    }
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
