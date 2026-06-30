import assert from 'node:assert/strict';

import { normalizeTicketRichTextHtml } from './rich-text-fit';

const fittedImage = normalizeTicketRichTextHtml('<p><img src="https://image.hellokittypark.cn/eat.png"></p>');

assert.match(fittedImage, /data-hkp-mini-program-fit="true"/);
assert.match(fittedImage, /<img[^>]*style="[^"]*width:100%!important/);
assert.match(fittedImage, /<img[^>]*style="[^"]*height:auto!important/);

const fixedImage = normalizeTicketRichTextHtml('<p><img src="https://image.hellokittypark.cn/eat.png" style="width:1312px;height:2469px;"></p>');

assert.match(fixedImage, /width:1312px;height:2469px;display:block!important;width:100%!important;max-width:100%!important;height:auto!important/);

const alreadyFitted = '<div data-hkp-mini-program-fit="true" style="width:100%">已适配</div>';

assert.equal(normalizeTicketRichTextHtml(alreadyFitted), alreadyFitted);
