#!/usr/bin/env node

import { createHash, createHmac } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

const apiHost = process.env.COUPON_PROBE_API_HOST || 'https://hellokitty-uat.yoursite.xin';
const sessionFile = process.env.COUPON_PROBE_SESSION_FILE || '/tmp/hkitty-ticket-closure/mini-session.json';
const sceneType = process.env.COUPON_PROBE_SCENE_TYPE || 'TICKET';
const orderAmountCent = Number(process.env.COUPON_PROBE_ORDER_AMOUNT_CENT || 6800);
const itemIds = process.env.COUPON_PROBE_ITEM_IDS || undefined;
const skuIds = process.env.COUPON_PROBE_SKU_IDS || undefined;
const visitDate = process.env.COUPON_PROBE_VISIT_DATE || undefined;
const checkInDate = process.env.COUPON_PROBE_CHECK_IN_DATE || undefined;
const checkOutDate = process.env.COUPON_PROBE_CHECK_OUT_DATE || undefined;
const expectedCouponNo = process.env.COUPON_PROBE_EXPECT_COUPON_NO || undefined;
const orderNo = process.env.COUPON_PROBE_ORDER_NO || undefined;
const confirmPayloadFile = process.env.COUPON_PROBE_CONFIRM_PAYLOAD_FILE || undefined;
const claimTemplateNo = process.env.COUPON_PROBE_CLAIM_TEMPLATE_NO || undefined;
const couponExchangeCode = process.env.COUPON_PROBE_EXCHANGE_CODE || undefined;
const exchangeItemNo = process.env.COUPON_PROBE_KCOIN_ITEM_NO || undefined;
const exchangeQuantity = Number(process.env.COUPON_PROBE_KCOIN_QUANTITY || 1);
const refundOrderNo = process.env.COUPON_PROBE_REFUND_ORDER_NO || undefined;
const refundNo = process.env.COUPON_PROBE_REFUND_NO || undefined;
const refundCouponNos = process.env.COUPON_PROBE_REFUND_COUPON_NOS || undefined;
const refundAmountCent = process.env.COUPON_PROBE_REFUND_AMOUNT_CENT
  ? Number(process.env.COUPON_PROBE_REFUND_AMOUNT_CENT)
  : undefined;
const refundType = process.env.COUPON_PROBE_REFUND_TYPE || undefined;
const refundReason = process.env.COUPON_PROBE_REFUND_REASON || 'probe-refund-return';
const shouldClaim = process.env.COUPON_PROBE_CLAIM === '1';
const shouldExchangeCouponCode = process.env.COUPON_PROBE_COUPON_CODE_EXCHANGE === '1';
const shouldExchange = process.env.COUPON_PROBE_KCOIN_EXCHANGE === '1';
const shouldConfirmOrder = process.env.COUPON_PROBE_CONFIRM === '1';
const shouldRefundReturn = process.env.COUPON_PROBE_REFUND_RETURN === '1';
const strictMode = process.env.COUPON_PROBE_STRICT === '1';
const tracePrefix = process.env.COUPON_PROBE_TRACE_PREFIX || `coupon-closure-${Date.now().toString(36)}`;
let traceIndex = 0;

const refreshableCodes = new Set([
  401,
  '401',
  10008,
  '10008',
  'AUTH_TOKEN_INVALID',
  'AUTH_TOKEN_EXPIRED',
  'AUTH_TOKEN_SESSION_EXPIRED',
]);

function nextTraceId() {
  traceIndex += 1;
  return `${tracePrefix}-${String(traceIndex).padStart(2, '0')}`;
}

// 读取微信开发工具导出的小程序 session，不在输出中打印敏感 token。
function readSession() {
  if (!existsSync(sessionFile)) {
    throw new Error(`缺少小程序 session 文件：${sessionFile}`);
  }

  const session = JSON.parse(readFileSync(sessionFile, 'utf8'));
  if (!session.accessToken && session.csession) {
    session.accessToken = session.csession;
  }
  if (!session.csession && session.accessToken) {
    session.csession = session.accessToken;
  }
  if (!session.accessToken || !session.refreshToken || !session.signSecret) {
    throw new Error('小程序 session 缺少 accessToken、refreshToken 或 signSecret');
  }

  return session;
}

function saveSession(session) {
  writeFileSync(sessionFile, `${JSON.stringify(session, null, 2)}\n`, { mode: 0o600 });
}

function isBusinessSuccess(payload) {
  return Boolean(
    payload?.success === true
      || payload?.code === 200
      || payload?.code === '200'
      || payload?.code === 0
      || payload?.code === '0'
      || payload?.code === 'OK',
  );
}

function dataOf(payload) {
  return payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
}

function listOf(payload) {
  const data = dataOf(payload);
  if (Array.isArray(data)) return data;
  return data?.coupons || data?.list || data?.records || data?.items || data?.packages || [];
}

function appendQuery(path, params) {
  const query = Object.entries(params)
    .filter(([, value]) => typeof value !== 'undefined' && value !== '' && !Number.isNaN(value))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return query ? `${path}?${query}` : path;
}

function maskExchangeCode(value) {
  if (!value) return undefined;
  const text = String(value);
  if (text.length <= 8) return text;
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

function sendJson(method, path, bodyText, headers = {}) {
  const url = new URL(path, apiHost);
  const requestImpl = url.protocol === 'http:' ? httpRequest : httpsRequest;
  const sentTraceId = headers['X-Trace-Id'] || headers['x-trace-id'] || nextTraceId();
  const requestHeaders = {
    accept: 'application/json',
    'X-Trace-Id': sentTraceId,
    ...headers,
  };
  if (typeof bodyText === 'string') {
    requestHeaders['content-type'] = 'application/json';
    requestHeaders['content-length'] = Buffer.byteLength(bodyText);
  }

  return new Promise((resolve, reject) => {
    const req = requestImpl(url, { method, headers: requestHeaders, timeout: 20000 }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        raw += chunk;
      });
      res.on('end', () => {
        let payload = null;
        try {
          payload = raw ? JSON.parse(raw) : null;
        } catch {
          payload = { raw };
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          sentTraceId,
          traceId: res.headers['x-trace-id'] || sentTraceId,
          payload,
        });
      });
    });
    req.on('timeout', () => {
      req.destroy(new Error(`${method} ${url.origin}${url.pathname} 请求超时`));
    });
    req.on('error', reject);
    if (typeof bodyText === 'string') {
      req.write(bodyText);
    }
    req.end();
  });
}

function signHeaders(session, method, path, bodyText = '') {
  const url = new URL(path, apiHost);
  const timestamp = String(Date.now());
  const nonce = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  const bodySha256 = createHash('sha256').update(bodyText).digest('hex');
  const signingText = [
    method,
    url.pathname,
    url.search ? url.search.slice(1) : '',
    timestamp,
    nonce,
    bodySha256,
  ].join('\n');

  return {
    Authorization: `Bearer ${session.accessToken}`,
    'X-Timestamp': timestamp,
    'X-Nonce': nonce,
    'X-Body-Sha256': bodySha256,
    'X-Signature': createHmac('sha256', session.signSecret).update(signingText).digest('base64url'),
  };
}

async function refreshSession(session) {
  const bodyText = JSON.stringify({ refreshToken: session.refreshToken });
  const response = await sendJson('POST', '/api/bff/auth/refresh', bodyText, {
    Authorization: `Bearer ${session.accessToken}`,
  });
  const data = dataOf(response.payload);
  if (!isBusinessSuccess(response.payload) || !data?.accessToken || !data?.refreshToken || !data?.signSecret) {
    return false;
  }

  session.accessToken = data.accessToken;
  session.csession = data.accessToken;
  session.refreshToken = data.refreshToken;
  session.signSecret = data.signSecret;
  saveSession(session);
  return true;
}

async function authedRequest(session, method, path, body, signed = false) {
  const bodyText = typeof body === 'undefined' ? undefined : JSON.stringify(body);
  const headers = signed
    ? signHeaders(session, method, path, bodyText || '')
    : { Authorization: `Bearer ${session.accessToken}` };
  let response = await sendJson(method, path, bodyText, headers);
  if (response.statusCode === 401 || refreshableCodes.has(response.payload?.code)) {
    const refreshed = await refreshSession(session);
    if (refreshed) {
      const replayHeaders = signed
        ? signHeaders(session, method, path, bodyText || '')
        : { Authorization: `Bearer ${session.accessToken}` };
      response = await sendJson(method, path, bodyText, replayHeaders);
      response.refreshed = true;
    }
  }

  return response;
}

function couponNoOf(coupon) {
  return coupon?.couponNo || coupon?.couponCode || coupon?.instanceNo || coupon?.id;
}

function couponNosOf(coupons) {
  return Array.from(new Set(coupons.map(couponNoOf).filter(Boolean).map(String)));
}

function dataCouponNos(payload) {
  const data = dataOf(payload) || {};
  return couponNosOf([
    ...(Array.isArray(data.coupons) ? data.coupons : []),
    ...(Array.isArray(data.list) ? data.list : []),
    ...(Array.isArray(data.records) ? data.records : []),
    ...(data.coupon ? [data.coupon] : []),
  ]);
}

function explicitCouponNosFrom(payload) {
  const data = dataOf(payload) || {};
  return [
    ...(Array.isArray(data.couponNos) ? data.couponNos : []),
    ...(Array.isArray(data.returnedCouponNos) ? data.returnedCouponNos : []),
    ...dataCouponNos(payload),
  ].filter(Boolean).map(String);
}

function normalizeCouponNos(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean).map(String)));
}

function orderCouponFactsFrom(payload) {
  const data = dataOf(payload) || {};
  const rejectedCoupons = Array.isArray(data.rejectedCoupons) ? data.rejectedCoupons : [];
  return {
    selectedCouponNos: normalizeCouponNos(data.selectedCouponNos),
    appliedCouponNos: normalizeCouponNos(data.appliedCouponNos),
    lockedCouponNos: normalizeCouponNos(data.lockedCouponNos),
    releasedCouponNos: normalizeCouponNos(data.releasedCouponNos),
    refundReturnedCouponNos: normalizeCouponNos(data.refundReturnedCouponNos),
    rejectedCouponNos: normalizeCouponNos(rejectedCoupons.map((item) => item?.couponNo)),
  };
}

function flattenOrderCouponFacts(orderCouponFacts) {
  if (!orderCouponFacts) return [];
  return Array.from(new Set([
    ...orderCouponFacts.selectedCouponNos,
    ...orderCouponFacts.appliedCouponNos,
    ...orderCouponFacts.lockedCouponNos,
    ...orderCouponFacts.releasedCouponNos,
    ...orderCouponFacts.refundReturnedCouponNos,
    ...orderCouponFacts.rejectedCouponNos,
  ]));
}

function summarizeStep(name, response, extra = {}) {
  const payload = response.payload || {};
  return {
    name,
    http: response.statusCode,
    sentTraceId: response.sentTraceId,
    traceId: response.traceId,
    refreshed: Boolean(response.refreshed),
    success: payload.success,
    code: payload.code,
    message: payload.message || payload.msg || payload.errMsg,
    ...extra,
  };
}

function stepSucceeded(step) {
  return Boolean(
    step?.success === true
      || step?.code === 200
      || step?.code === '200'
      || step?.code === 0
      || step?.code === '0'
      || step?.code === 'OK',
  );
}

function isAuthExpiredStep(step) {
  return Boolean(
    step
      && (
        step.http === 401
          || refreshableCodes.has(step.code)
          || step.code === 'AUTH_TOKEN_EXPIRED'
      )
  );
}

function intersection(left, right) {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item));
}

function buildAvailablePath() {
  return appendQuery('/api/bff/promotion/coupons/available', {
    sceneType,
    orderAmountCent,
    itemIds,
    skuIds,
    visitDate,
    checkInDate,
    checkOutDate,
  });
}

function buildExchangePayload() {
  return {
    itemNo: exchangeItemNo,
    quantity: exchangeQuantity,
    idempotencyKey: `KEX-PROBE-${exchangeItemNo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
}

function readJsonFile(filePath, label) {
  if (!filePath) {
    throw new Error(`${label} 缺少文件路径`);
  }
  if (!existsSync(filePath)) {
    throw new Error(`${label} 文件不存在：${filePath}`);
  }

  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function buildRefundReturnPayload(targetCouponNos) {
  const couponNos = normalizeCouponNos(
    refundCouponNos ? refundCouponNos.split(',').map((item) => item.trim()) : targetCouponNos,
  );

  return {
    orderNo: refundOrderNo,
    refundNo,
    sceneType,
    couponNos,
    refundAmountCent,
    refundType,
    idempotencyKey: `CRR-PROBE-${refundNo || Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    reason: refundReason,
  };
}

async function fetchCouponState(session, suffix = '') {
  const memberResponse = await authedRequest(session, 'GET', '/api/bff/member/coupons');
  const memberCoupons = listOf(memberResponse.payload);
  const memberCouponNos = couponNosOf(memberCoupons);

  const availableResponse = await authedRequest(session, 'GET', buildAvailablePath());
  const availableCoupons = listOf(availableResponse.payload);
  const availableCouponNos = couponNosOf(availableCoupons);

  return {
    memberStep: summarizeStep(`memberCoupons${suffix}`, memberResponse, {
      couponCount: memberCoupons.length,
      couponNos: memberCouponNos,
    }),
    availableStep: summarizeStep(`availableCoupons${suffix}`, availableResponse, {
      sceneType,
      orderAmountCent,
      itemIds,
      skuIds,
      visitDate,
      checkInDate,
      checkOutDate,
      couponCount: availableCoupons.length,
      couponNos: availableCouponNos,
    }),
    memberCouponNos,
    availableCouponNos,
  };
}

async function fetchOrderCouponState(session, currentOrderNo) {
  const orderResponse = await authedRequest(session, 'GET', `/api/bff/orders/${encodeURIComponent(currentOrderNo)}`);
  const orderCouponFacts = orderCouponFactsFrom(orderResponse.payload);
  const orderCouponNos = flattenOrderCouponFacts(orderCouponFacts);

  return {
    orderStep: summarizeStep('orderDetailCoupons', orderResponse, {
      orderNo: currentOrderNo,
      ...orderCouponFacts,
      couponNos: orderCouponNos,
    }),
    orderCouponFacts,
    orderCouponNos,
  };
}

function buildClosureSummary(steps, latestState, targetCouponNos, orderState, currentOrderNo, confirmState, refundReturnState) {
  const findStep = (...names) => steps.find((step) => names.includes(step.name));
  const memberStep = steps.find((step) => step.name === 'memberCouponsAfterWrite')
    || findStep('memberCouponsAfterRefundReturn', 'memberCoupons');
  const availableStep = steps.find((step) => step.name === 'availableCouponsAfterWrite')
    || findStep('availableCouponsAfterRefundReturn', 'availableCoupons');
  const orderStep = findStep('orderDetailCouponsAfterRefundReturn', 'orderDetailCoupons');
  const confirmStep = findStep('orderConfirm');
  const couponCodeExchangeStep = findStep('exchangeCouponCode');
  const refundReturnStep = findStep('refundReturnCoupons');
  const sessionValid = !steps.some(isAuthExpiredStep);
  const sharedCouponNos = intersection(latestState.memberCouponNos, latestState.availableCouponNos);
  const normalizedTargets = Array.from(new Set(targetCouponNos.filter(Boolean).map(String)));
  const orderCouponNos = orderState?.orderCouponNos || [];
  const confirmCouponNos = confirmState?.confirmCouponNos || [];
  const refundReturnedCouponNos = refundReturnState?.returnedCouponNos || [];
  const targetPresence = normalizedTargets.map((couponNo) => ({
    couponNo,
    inMemberCoupons: latestState.memberCouponNos.includes(couponNo),
    inAvailableCoupons: latestState.availableCouponNos.includes(couponNo),
    inConfirm: confirmState ? confirmCouponNos.includes(couponNo) : undefined,
    inOrderDetail: currentOrderNo ? orderCouponNos.includes(couponNo) : undefined,
    inRefundReturn: refundReturnState ? refundReturnedCouponNos.includes(couponNo) : undefined,
  }));
  const targetCouponsAligned = normalizedTargets.length > 0
    && targetPresence.every((item) => item.inMemberCoupons && item.inAvailableCoupons);
  const targetCouponsConfirmAligned = confirmState
    ? normalizedTargets.length > 0 && targetPresence.every((item) => item.inConfirm)
    : undefined;
  const targetCouponsOrderAligned = currentOrderNo
    ? normalizedTargets.length > 0 && targetPresence.every((item) => item.inOrderDetail)
    : undefined;
  const targetCouponsRefundAligned = refundReturnState
    ? normalizedTargets.length > 0 && targetPresence.every((item) => item.inRefundReturn)
    : undefined;

  const blockers = [];
  if (!sessionValid) {
    blockers.push(`小程序登录态不可用：需刷新 ${sessionFile} 后复验`);
  }
  if (sessionValid && !stepSucceeded(memberStep)) {
    blockers.push('我的券接口未成功：需检查 GET /api/bff/member/coupons');
  }
  if (sessionValid && !stepSucceeded(availableStep)) {
    blockers.push('下单可用券接口未成功：需检查 GET /api/bff/promotion/coupons/available');
  }
  if (couponCodeExchangeStep && sessionValid && !stepSucceeded(couponCodeExchangeStep)) {
    blockers.push('券码兑换接口未成功：需检查 POST /api/bff/promotion/coupons/exchange、后台券码同步状态或券码是否已兑换');
  }
  if (couponCodeExchangeStep && stepSucceeded(couponCodeExchangeStep) && normalizedTargets.length === 0) {
    blockers.push('券码兑换接口已成功但响应未返回 couponNo：需设置 COUPON_PROBE_EXPECT_COUPON_NO 或让兑换响应回带发放券号后再做同券号闭环判断');
  }
  if (!couponCodeExchangeStep && stepSucceeded(memberStep) && stepSucceeded(availableStep) && normalizedTargets.length === 0) {
    blockers.push('未提供目标 couponNo，也未显式执行领券、券码兑换或 K 币兑换；只能得到候选交集，不能证明后台发券或兑换券闭环');
  }
  if (normalizedTargets.length > 0 && !targetCouponsAligned) {
    blockers.push('目标 couponNo 未同时出现在我的券和下单可用券，CRM/promotion 同源资产仍未闭环');
  }
  if (currentOrderNo && sessionValid && !stepSucceeded(orderStep)) {
    blockers.push(`订单详情接口未成功：需检查 GET /api/bff/orders/${currentOrderNo}`);
  }
  if (currentOrderNo && normalizedTargets.length === 0) {
    blockers.push('已提供订单号，但未提供目标 couponNo；无法证明订单详情里的券事实是否为同一张券');
  }
  if (currentOrderNo && normalizedTargets.length > 0 && targetCouponsOrderAligned === false) {
    blockers.push('目标 couponNo 未出现在订单详情券事实里，统一订单读模型仍未闭环');
  }
  if (confirmState && sessionValid && !stepSucceeded(confirmStep)) {
    blockers.push('订单确认接口未成功：需检查 POST /api/bff/orders/confirm');
  }
  if (confirmState && normalizedTargets.length === 0) {
    blockers.push('已执行订单确认探针，但未提供目标 couponNo；无法证明 confirm 是否采用了同一张券');
  }
  if (confirmState && normalizedTargets.length > 0 && targetCouponsConfirmAligned === false) {
    blockers.push('目标 couponNo 未在订单确认响应事实里出现，统一订单确认链仍未闭环');
  }
  if (refundReturnState && sessionValid && !stepSucceeded(refundReturnStep)) {
    blockers.push('退券返还接口未成功：需检查 POST /api/bff/promotion/coupons/refund-return');
  }
  if (refundReturnState && normalizedTargets.length > 0 && targetCouponsRefundAligned === false) {
    blockers.push('目标 couponNo 未在退券返还响应事实里出现，退款返还链仍未闭环');
  }

  return {
    closed: Boolean(
      sessionValid
      && stepSucceeded(memberStep)
      && stepSucceeded(availableStep)
      && (couponCodeExchangeStep ? stepSucceeded(couponCodeExchangeStep) : true)
      && targetCouponsAligned
      && (confirmState ? stepSucceeded(confirmStep) && targetCouponsConfirmAligned : true)
      && (currentOrderNo ? stepSucceeded(orderStep) && targetCouponsOrderAligned : true)
      && (refundReturnState ? stepSucceeded(refundReturnStep) && targetCouponsRefundAligned : true)
    ),
    readOnlySharedCouponNos: sharedCouponNos,
    targetCouponNos: normalizedTargets,
    orderNo: currentOrderNo,
    orderCouponNos,
    confirmCouponNos,
    refundReturnedCouponNos,
    targetPresence,
    checks: {
      sessionValid,
      memberCouponsReady: stepSucceeded(memberStep),
      availableCouponsReady: stepSucceeded(availableStep),
      hasReadOnlySharedCoupon: sharedCouponNos.length > 0,
      couponCodeExchangeReady: couponCodeExchangeStep ? stepSucceeded(couponCodeExchangeStep) : undefined,
      targetCouponsAligned,
      confirmCouponsReady: confirmState ? stepSucceeded(confirmStep) : undefined,
      targetCouponsConfirmAligned,
      orderCouponsReady: currentOrderNo ? stepSucceeded(orderStep) : undefined,
      targetCouponsOrderAligned,
      refundReturnReady: refundReturnState ? stepSucceeded(refundReturnStep) : undefined,
      targetCouponsRefundAligned,
    },
    blockers,
    nextAction: blockers[0] || (
      refundReturnState
        ? '目标券已贯穿我的券、可用券、订单确认、订单详情和退款返还，可继续做真机交易验收'
        : currentOrderNo
          ? '目标券已同时出现在我的券、下单可用券和订单详情，可继续验退款返还同券号链路'
          : confirmState
            ? '目标券已同时出现在我的券、下单可用券和订单确认，可继续校验订单详情同券号'
            : '目标券已同时出现在我的券和下单可用券，可继续用 selectedCouponNos 做订单确认验收'
    ),
  };
}

async function main() {
  const session = readSession();
  const steps = [];
  const targetCouponNos = expectedCouponNo ? [expectedCouponNo] : [];

  let latestState = await fetchCouponState(session);
  steps.push(latestState.memberStep, latestState.availableStep);

  const packagesResponse = await authedRequest(session, 'GET', '/api/bff/member/coupon-packages');
  const packages = listOf(packagesResponse.payload);
  steps.push(summarizeStep('couponPackages', packagesResponse, {
    packageCount: packages.length,
  }));

  const balanceResponse = await authedRequest(session, 'GET', '/api/bff/member/kcoin/balance');
  const balance = dataOf(balanceResponse.payload) || {};
  steps.push(summarizeStep('kcoinBalance', balanceResponse, {
    pointsBalance: balance.pointsBalance,
    availablePoints: balance.availablePoints,
    frozenPoints: balance.frozenPoints,
  }));

  if (shouldClaim) {
    if (!claimTemplateNo) {
      throw new Error('设置 COUPON_PROBE_CLAIM=1 时必须同时设置 COUPON_PROBE_CLAIM_TEMPLATE_NO');
    }
    const claimResponse = await authedRequest(
      session,
      'POST',
      '/api/bff/promotion/coupons/claim',
      { templateNo: claimTemplateNo },
      true,
    );
    const claimCouponNos = explicitCouponNosFrom(claimResponse.payload);
    targetCouponNos.push(...claimCouponNos);
    steps.push(summarizeStep('claimCoupon', claimResponse, {
      templateNo: claimTemplateNo,
      couponNos: claimCouponNos,
    }));
  }

  if (shouldExchangeCouponCode) {
    if (!couponExchangeCode) {
      throw new Error('设置 COUPON_PROBE_COUPON_CODE_EXCHANGE=1 时必须同时设置 COUPON_PROBE_EXCHANGE_CODE');
    }
    const couponCodeExchangeResponse = await authedRequest(
      session,
      'POST',
      '/api/bff/promotion/coupons/exchange',
      { exchangeCode: couponExchangeCode },
      true,
    );
    const couponCodeExchangeCouponNos = explicitCouponNosFrom(couponCodeExchangeResponse.payload);
    targetCouponNos.push(...couponCodeExchangeCouponNos);
    steps.push(summarizeStep('exchangeCouponCode', couponCodeExchangeResponse, {
      exchangeCode: maskExchangeCode(couponExchangeCode),
      couponNos: couponCodeExchangeCouponNos,
    }));
  }

  if (shouldExchange) {
    if (!exchangeItemNo) {
      throw new Error('设置 COUPON_PROBE_KCOIN_EXCHANGE=1 时必须同时设置 COUPON_PROBE_KCOIN_ITEM_NO');
    }
    const exchangePayload = buildExchangePayload();
    const exchangeResponse = await authedRequest(
      session,
      'POST',
      '/api/bff/member/kcoin/exchanges',
      exchangePayload,
      true,
    );
    const exchange = dataOf(exchangeResponse.payload) || {};
    const exchangeCouponNos = explicitCouponNosFrom(exchangeResponse.payload);
    targetCouponNos.push(...exchangeCouponNos);
    steps.push(summarizeStep('exchangeKcoin', exchangeResponse, {
      itemNo: exchangeItemNo,
      quantity: exchangeQuantity,
      exchangeNo: exchange.exchangeNo,
      couponNos: exchangeCouponNos,
      packageNos: exchange.packageNos,
      pointsCost: exchange.pointsCost,
      beforeBalance: exchange.beforeBalance,
      afterBalance: exchange.afterBalance,
    }));
  }

  if (shouldClaim || shouldExchangeCouponCode || shouldExchange) {
    latestState = await fetchCouponState(session, 'AfterWrite');
    steps.push(latestState.memberStep, latestState.availableStep);
  }

  let confirmState;
  if (shouldConfirmOrder) {
    if (!confirmPayloadFile) {
      throw new Error('设置 COUPON_PROBE_CONFIRM=1 时必须同时设置 COUPON_PROBE_CONFIRM_PAYLOAD_FILE');
    }
    const confirmPayload = readJsonFile(confirmPayloadFile, '订单确认探针 payload');
    const confirmResponse = await authedRequest(session, 'POST', '/api/bff/orders/confirm', confirmPayload);
    const confirmCouponFacts = orderCouponFactsFrom(confirmResponse.payload);
    const confirmCouponNos = flattenOrderCouponFacts(confirmCouponFacts);
    confirmState = {
      confirmCouponFacts,
      confirmCouponNos,
    };
    steps.push(summarizeStep('orderConfirm', confirmResponse, {
      payloadFile: confirmPayloadFile,
      selectedCouponNos: confirmCouponFacts.selectedCouponNos,
      appliedCouponNos: confirmCouponFacts.appliedCouponNos,
      rejectedCouponNos: confirmCouponFacts.rejectedCouponNos,
      couponNos: confirmCouponNos,
    }));
  }

  let orderState;
  if (orderNo) {
    orderState = await fetchOrderCouponState(session, orderNo);
    steps.push(orderState.orderStep);
  }

  let refundReturnState;
  if (shouldRefundReturn) {
    if (!refundOrderNo || !refundNo) {
      throw new Error('设置 COUPON_PROBE_REFUND_RETURN=1 时必须同时设置 COUPON_PROBE_REFUND_ORDER_NO 和 COUPON_PROBE_REFUND_NO');
    }
    const refundPayload = buildRefundReturnPayload(targetCouponNos);
    if (!refundPayload.couponNos.length) {
      throw new Error('退券返还探针缺少 couponNos：请设置 COUPON_PROBE_EXPECT_COUPON_NO 或 COUPON_PROBE_REFUND_COUPON_NOS');
    }
    targetCouponNos.push(...refundPayload.couponNos);
    const refundReturnResponse = await authedRequest(
      session,
      'POST',
      '/api/bff/promotion/coupons/refund-return',
      refundPayload,
      true,
    );
    const returnedCouponNos = explicitCouponNosFrom(refundReturnResponse.payload);
    refundReturnState = { returnedCouponNos };
    steps.push(summarizeStep('refundReturnCoupons', refundReturnResponse, {
      orderNo: refundOrderNo,
      refundNo,
      couponNos: refundPayload.couponNos,
      returnedCouponNos,
    }));

    latestState = await fetchCouponState(session, 'AfterRefundReturn');
    steps.push(latestState.memberStep, latestState.availableStep);

    const effectiveOrderNo = orderNo || refundOrderNo;
    if (effectiveOrderNo) {
      orderState = await fetchOrderCouponState(session, effectiveOrderNo);
      steps.push({ ...orderState.orderStep, name: 'orderDetailCouponsAfterRefundReturn' });
    }
  }

  const output = {
    apiHost,
    sessionFile,
    sceneType,
    orderAmountCent,
    itemIds,
    skuIds,
    visitDate,
    checkInDate,
    checkOutDate,
    expectedCouponNo,
    orderNo,
    confirmEnabled: shouldConfirmOrder,
    confirmPayloadFile,
    claimEnabled: shouldClaim,
    couponCodeExchangeEnabled: shouldExchangeCouponCode,
    couponExchangeCode: maskExchangeCode(couponExchangeCode),
    exchangeEnabled: shouldExchange,
    refundReturnEnabled: shouldRefundReturn,
    refundOrderNo,
    refundNo,
    steps,
  };
  output.closure = buildClosureSummary(
    steps,
    latestState,
    targetCouponNos,
    orderState,
    orderNo || refundOrderNo,
    confirmState,
    refundReturnState,
  );
  console.log(JSON.stringify(output, null, 2));

  if (strictMode && !output.closure.closed) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
