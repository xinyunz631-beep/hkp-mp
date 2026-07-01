import assert from 'node:assert/strict';

import { MEMBER_COUPON_CENTER_TABS } from './coupon-center-tabs';

const tabKeys = MEMBER_COUPON_CENTER_TABS.map((tab) => String(tab.key));
const tabTitles = MEMBER_COUPON_CENTER_TABS.map((tab) => tab.title);

assert.deepEqual(
  tabKeys,
  ['recommend'],
);

assert.equal(
  tabKeys.includes('kcoin') || tabTitles.some((title) => title.includes('K币')),
  false,
);
