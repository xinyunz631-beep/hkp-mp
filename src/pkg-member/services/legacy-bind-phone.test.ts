import assert from 'node:assert/strict';

import { resolveLegacyBindAuthorizedPhone } from './legacy-bind-phone';

assert.equal(
  resolveLegacyBindAuthorizedPhone({
    profile: { phone: ' 156 1878 9180 ' },
    purePhoneNumber: '13900000000',
  }),
  '15618789180',
);

assert.equal(
  resolveLegacyBindAuthorizedPhone({
    phoneNumber: '+86 15618789180',
  }),
  '15618789180',
);

assert.equal(
  resolveLegacyBindAuthorizedPhone({
    profile: { phone: '021-12345678' },
    purePhoneNumber: 'not-a-phone',
  }),
  '',
);
