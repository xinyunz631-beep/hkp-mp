import assert from 'node:assert/strict';

import { CUSTOMER_SERVICE_CONFIG } from '../config/customer-service';
import {
  createQiyuCustomerServiceAdapter,
  QIYU_CHAT_PLUGIN_URL,
  QIYU_PLUGIN_NAME,
} from './qiyu-customer-service-adapter';

const configCalls: string[] = [];
const pluginNames: string[] = [];
const navigatedUrls: string[] = [];
const setUserInfoCalls: unknown[] = [];
const openCallOrder: string[] = [];

const adapter = createQiyuCustomerServiceAdapter({
  loadPlugin(pluginName) {
    pluginNames.push(pluginName);

    return {
      _$configAppKey(appKey: string) {
        configCalls.push(`appKey:${appKey}`);
      },
      __configAppId(appId: string) {
        configCalls.push(`appId:${appId}`);
      },
      _$configFullScreen(enabled: boolean) {
        configCalls.push(`fullScreen:${String(enabled)}`);
      },
      _$configAutoCopy(enabled: boolean) {
        configCalls.push(`autoCopy:${String(enabled)}`);
      },
      _$setUserInfo(userInfo: unknown) {
        openCallOrder.push('setUserInfo');
        setUserInfoCalls.push(userInfo);
      },
    };
  },
  navigateToChat(url) {
    openCallOrder.push('navigate');
    navigatedUrls.push(url);
  },
});

assert.equal(CUSTOMER_SERVICE_CONFIG.appKey, '3a64f8e1cf82e1d4a22bee6f8dbca68a');
assert.equal(CUSTOMER_SERVICE_CONFIG.appId, 'wx72b9e08ce45d3e79');

void adapter.init({
  appKey: CUSTOMER_SERVICE_CONFIG.appKey,
  config: CUSTOMER_SERVICE_CONFIG,
});

void adapter.open({
  appKey: CUSTOMER_SERVICE_CONFIG.appKey,
  source: 'home',
  visitor: {
    userId: 'member-1001',
    nickname: '微信用户',
    mobile: '13800000000',
    levelName: '初级会员',
    points: 128,
  },
});
void adapter.open({
  appKey: CUSTOMER_SERVICE_CONFIG.appKey,
  source: 'member',
});

assert.deepEqual(pluginNames, [QIYU_PLUGIN_NAME]);
assert.deepEqual(configCalls, [
  'appKey:3a64f8e1cf82e1d4a22bee6f8dbca68a',
  'appId:wx72b9e08ce45d3e79',
  'fullScreen:true',
  'autoCopy:false',
]);
assert.deepEqual(setUserInfoCalls, [
  {
    userId: 'member-1001',
    data: [
      { index: 0, key: 'real_name', label: '昵称', value: '微信用户' },
      { index: 1, key: 'mobile_phone', label: '手机号', value: '13800000000' },
      { index: 2, key: 'member_level', label: '会员等级', value: '初级会员' },
      { index: 3, key: 'points', label: '积分', value: '128' },
    ],
  },
  {
    userId: '',
    data: [],
  },
]);
assert.deepEqual(openCallOrder, ['setUserInfo', 'navigate', 'setUserInfo', 'navigate']);
assert.deepEqual(navigatedUrls, [QIYU_CHAT_PLUGIN_URL, QIYU_CHAT_PLUGIN_URL]);
