import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');

function readSource(path) {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}

function assertIncludes(source, needle, message) {
  if (!source.includes(needle)) {
    throw new Error(message);
  }
}

const wechatActions = readSource('src/core/utils/wechat-actions.ts');
const checkoutController = readSource('src/core/runtime/use-checkout-controller.ts');
const orderDetail = readSource('src/pkg-order/pages/detail/index.tsx');

assertIncludes(
  wechatActions,
  "'canceled'",
  'requestWechatPayment must return a distinct canceled status for WeChat payment X/cancel',
);
assertIncludes(
  checkoutController,
  'cancelBffOrder(result.orderNo',
  'checkout payment cancel must call BFF order cancel for the just-created order',
);
assertIncludes(
  checkoutController,
  'adapter.onPaymentCanceled',
  'checkout payment cancel must clear local pending order snapshots through the adapter',
);
assertIncludes(
  orderDetail,
  'cancelBffOrder(detailData.id',
  'order detail continue-pay cancel must call BFF order cancel for the old order',
);

console.log('payment cancel flow check passed');
