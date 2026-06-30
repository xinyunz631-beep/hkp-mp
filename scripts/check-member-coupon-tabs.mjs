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

const couponsService = readSource('src/pkg-member/services/coupons.ts');
const couponsPage = readSource('src/pkg-member/pages/coupons/index.tsx');

assertIncludes(
  couponsService,
  'MEMBER_COUPON_STATUS_TO_BFF',
  'coupon service must map member coupon tabs to backend status filters',
);
assertIncludes(
  couponsService,
  "claimed: 'AVAILABLE'",
  'claimed tab must query AVAILABLE coupons explicitly',
);
assertIncludes(
  couponsService,
  "used: 'USED'",
  'used tab must query USED coupons explicitly',
);
assertIncludes(
  couponsService,
  "expired: 'EXPIRED'",
  'expired tab must query EXPIRED coupons explicitly',
);
assertIncludes(
  couponsPage,
  'fetchCouponsData(tabKey)',
  'coupon tab click must reload data for the clicked tab',
);
assertIncludes(
  couponsPage,
  'handleTabPress',
  'coupon page must handle tab switching through a reload function',
);

console.log('member coupon tab status check passed');
