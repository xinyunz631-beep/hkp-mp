import assert from 'node:assert/strict';

import { resolveFirstRichTextImage } from './rich-text-image';

assert.equal(
  resolveFirstRichTextImage('<p>< img src="https://image.hellokittypark.cn/public_SummerNote_0cc908d0-465f-4513-8823-089ca91379fb.png" data-filename="img" style="width: 100%;"><br></p >'),
  'https://image.hellokittypark.cn/public_SummerNote_0cc908d0-465f-4513-8823-089ca91379fb.png',
);

assert.equal(
  resolveFirstRichTextImage('<p><img alt="cover" src="https://image.hellokittypark.cn/cover.png?x=1&amp;y=2"></p>'),
  'https://image.hellokittypark.cn/cover.png?x=1&y=2',
);

assert.equal(resolveFirstRichTextImage('<p>No image</p>'), '');
