const SHA256_BLOCK_SIZE = 64;
const SHA256_HASH_SIZE = 32;
const BYTE_MASK = 0xff;
const BASE64_URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

const SHA256_INITIAL_HASH = [
  0x6a09e667,
  0xbb67ae85,
  0x3c6ef372,
  0xa54ff53a,
  0x510e527f,
  0x9b05688c,
  0x1f83d9ab,
  0x5be0cd19,
];

const SHA256_ROUND_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

// 将字符串编码成 UTF-8 字节，避免依赖不同小程序运行时的 TextEncoder。
function encodeUtf8(value: string) {
  const bytes: number[] = [];

  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0;

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }

  return bytes;
}

// 按 SHA-256 规则循环右移 32 位整数。
function rotateRight(value: number, shift: number) {
  return (value >>> shift) | (value << (32 - shift));
}

// 将若干 32 位整数相加，并保持无符号 32 位范围。
function add32(...values: number[]) {
  return values.reduce((total, value) => (total + value) >>> 0, 0);
}

// 生成 SHA-256 填充后的消息字节。
function padSha256Message(bytes: number[]) {
  const message = [...bytes];
  const bitLength = bytes.length * 8;
  message.push(0x80);

  while (message.length % SHA256_BLOCK_SIZE !== 56) {
    message.push(0);
  }

  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  for (let shift = 24; shift >= 0; shift -= 8) message.push((high >>> shift) & BYTE_MASK);
  for (let shift = 24; shift >= 0; shift -= 8) message.push((low >>> shift) & BYTE_MASK);

  return message;
}

// 计算字节数组的 SHA-256 摘要字节。
function sha256Bytes(bytes: number[]) {
  const message = padSha256Message(bytes);
  const hash = [...SHA256_INITIAL_HASH];
  const words = new Array<number>(64);

  for (let offset = 0; offset < message.length; offset += SHA256_BLOCK_SIZE) {
    for (let index = 0; index < 16; index += 1) {
      const wordOffset = offset + index * 4;
      words[index] = (
        (message[wordOffset] << 24)
        | (message[wordOffset + 1] << 16)
        | (message[wordOffset + 2] << 8)
        | message[wordOffset + 3]
      ) >>> 0;
    }

    for (let index = 16; index < 64; index += 1) {
      const s0 = rotateRight(words[index - 15], 7) ^ rotateRight(words[index - 15], 18) ^ (words[index - 15] >>> 3);
      const s1 = rotateRight(words[index - 2], 17) ^ rotateRight(words[index - 2], 19) ^ (words[index - 2] >>> 10);
      words[index] = add32(words[index - 16], s0, words[index - 7], s1);
    }

    let [a, b, c, d, e, f, g, h] = hash;

    for (let index = 0; index < 64; index += 1) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = add32(h, s1, ch, SHA256_ROUND_CONSTANTS[index], words[index]);
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = add32(s0, maj);

      h = g;
      g = f;
      f = e;
      e = add32(d, temp1);
      d = c;
      c = b;
      b = a;
      a = add32(temp1, temp2);
    }

    hash[0] = add32(hash[0], a);
    hash[1] = add32(hash[1], b);
    hash[2] = add32(hash[2], c);
    hash[3] = add32(hash[3], d);
    hash[4] = add32(hash[4], e);
    hash[5] = add32(hash[5], f);
    hash[6] = add32(hash[6], g);
    hash[7] = add32(hash[7], h);
  }

  return hash.flatMap((word) => [
    (word >>> 24) & BYTE_MASK,
    (word >>> 16) & BYTE_MASK,
    (word >>> 8) & BYTE_MASK,
    word & BYTE_MASK,
  ]);
}

// 将字节数组转成小写十六进制文本。
function bytesToHex(bytes: number[]) {
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

// 将字节数组转成 Base64URL 且不带 padding。
function bytesToBase64Url(bytes: number[]) {
  let output = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const chunk = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);

    output += BASE64_URL_ALPHABET[(chunk >>> 18) & 0x3f];
    output += BASE64_URL_ALPHABET[(chunk >>> 12) & 0x3f];
    if (typeof second !== 'undefined') output += BASE64_URL_ALPHABET[(chunk >>> 6) & 0x3f];
    if (typeof third !== 'undefined') output += BASE64_URL_ALPHABET[chunk & 0x3f];
  }

  return output;
}

// 计算字符串的 SHA-256 小写十六进制摘要。
export function sha256Hex(value: string) {
  return bytesToHex(sha256Bytes(encodeUtf8(value)));
}

// 计算 HMAC-SHA256，并输出后端要求的 Base64URL 无 padding 签名。
export function hmacSha256Base64Url(secret: string, value: string) {
  const keyBytes = encodeUtf8(secret);
  const normalizedKey = keyBytes.length > SHA256_BLOCK_SIZE ? sha256Bytes(keyBytes) : [...keyBytes];
  while (normalizedKey.length < SHA256_BLOCK_SIZE) normalizedKey.push(0);

  const outerKey = normalizedKey.map((byte) => byte ^ 0x5c);
  const innerKey = normalizedKey.map((byte) => byte ^ 0x36);
  const innerHash = sha256Bytes([...innerKey, ...encodeUtf8(value)]);

  return bytesToBase64Url(sha256Bytes([...outerKey, ...innerHash]));
}

// 生成后端签名校验使用的随机 nonce。
export function createSignatureNonce() {
  const randomText = Math.random().toString(36).slice(2);
  return `${Date.now().toString(36)}${randomText}`;
}
