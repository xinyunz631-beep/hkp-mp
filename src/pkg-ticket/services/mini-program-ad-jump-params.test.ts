import assert from 'node:assert/strict';

import {
  resolveMiniProgramAdNumberParam,
  resolveMiniProgramAdStringParam,
} from './mini-program-ad-jump-params';

assert.equal(
  resolveMiniProgramAdNumberParam(
    {
      jumpParams: { likeCount: 17934 },
      jumpTarget: '/pkg-ticket/pages/park-detail/index?likeCount=0',
    },
    'likeCount',
  ),
  17934,
);

assert.equal(
  resolveMiniProgramAdNumberParam(
    { jumpPath: '/pkg-ticket/pages/park-detail/index?likeCount=1450' },
    'likeCount',
  ),
  1450,
);

assert.equal(
  resolveMiniProgramAdStringParam(
    {
      jumpParams: { legacyType: 'ride' },
      jumpPath: '/pkg-ticket/pages/park-detail/index?legacyType=show',
    },
    'legacyType',
  ),
  'ride',
);

assert.equal(
  resolveMiniProgramAdStringParam(
    {
      jumpParams: { legacyLocation: '%E7%BC%A4%E7%BA%B7%E6%91%A9%E5%A4%A9%E8%BD%AE' },
      jumpPath: '/pkg-ticket/pages/park-detail/index?legacyLocation=fallback',
    },
    'legacyLocation',
  ),
  '缤纷摩天轮',
);

assert.equal(
  resolveMiniProgramAdStringParam(
    { jumpPath: '/pkg-ticket/pages/park-detail/index?legacyLocation=%E7%BC%A4%E7%BA%B7%E6%91%A9%E5%A4%A9%E8%BD%AE' },
    'legacyLocation',
  ),
  '缤纷摩天轮',
);
