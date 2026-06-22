# 小程序商用收尾闭环清单（2026-06-22）

## 本轮已执行

- 删除运行态 mock 入口：`src/core/services/mock.ts`、`src/pkg-member/services/mock-data.ts`、分享/提现相关 mock service 已删除。
- 会员首页优惠券数量不再写死 `5`，改读 `GET /api/bff/member/coupons?page=1&size=1` 的真实 `total/statusCounts/list`。
- 会员成长页不再使用本地 `memberGrowthData`，改读 `GET /api/bff/crm/center`，恢复当前成长值展示，并按真实等级门槛计算底部进度条。
- 成长值明细页没有真实流水接口时只展示空态，不再展示本地“门票预订/商城消费/会员任务”样例记录。
- 微信支付封装不再在缺少 `paymentParams` 时弹窗模拟成功，统一按失败或待支付阻断处理。
- 微信支付封装已识别 `requestPayment:fail jsapi has no permission` 这类微信 JSAPI 权限失败，用户侧展示业务提示，不再透出原始平台错误。
- 分享收益、邀请、提现按用户最新口径后置：入口只弹窗拦截，不跳转到未闭环业务，不请求假数据。

## 必须继续闭环

| 链路 | 当前状态 | 后续动作 |
| --- | --- | --- |
| 会员成长权益图和规则 | 已能展示真实成长值、等级和权益文本；权益图字段语义不完整，成长规则/流水接口缺失 | 等后端补 `crm/growth`、`crm/growth/records` 或等价字段后再接入 |
| 订单支付 | 前端已禁止本地支付假闭环 | 继续用真实微信支付样本验证门票、商城、酒店订单支付后状态 |
| 优惠券严格样本 | 页面链路已打通，缺目标券和订单详情同券号事实样本 | 后端补样本后跑 `yarn probe:coupon-closure` 严格模式 |
| 商城交易 | 列表、详情、购物车、确认单已接 BFF | 仍需后台真实商品、目标券和订单样本完成写链路验收 |
| 门票出票核销 | 支付前置和订单详情轮询已接真实链路 | 仍需真实支付成功后出票、票码、核销、退款样本 |

## 微信开发工具验收记录

- 已复用本对话已有微信开发者工具窗口，项目路径为 `mini-program/dist`，AppID 为 `wx72b9e08ce45d3e79`。
- `pages/member/index` 已进入并读到渲染树：优惠券数量展示为当前接口态 `2`，不是历史硬编码 `5`；分销收益展示为 `-`。
- 分销收益入口源码和 `dist/pages/member/index.js` 均确认只调用弹窗拦截，文案为“分享收益服务正在整理中，开放后可在会员中心查看。”。
- 真实微信支付成功链路当前不能由 Codex 代测：需要小程序微信支付权限、真实商户配置和真实支付动作；本轮只验证前端不会模拟支付成功，并修复平台原始错误透出。
- 微信开发者工具当前存在 home/member 双 webview 叠层，Computer Use 点击 `会员权益` 未能稳定触发跳转；会员成长页改动已通过源码、`dist/pkg-member/pages/member-growth/index.js` 和类型检查确认，后续需人工或自动化工具补一次 GUI 跳转复验。

## 待你决策的可优化项

| 模块 | 建议 | 是否阻断当前收尾 |
| --- | --- | --- |
| 分享/提现 | 当前按后置处理；后续若恢复，需要重新定义分销收益和提现业务域 | 否 |
| 餐饮 | 当前只保留业务空态；若要商用，需要整条点餐交易链路 | 否 |
| 园区导览 | 当前为空态/内容待配置；若要上线导览，需要公开导览内容 BFF 或 CMS 适配读接口 | 否 |
| 收藏 | 会员首页展示真实 `favoriteCount`，收藏列表仍需确认是否必须跨设备同步 | 否 |
| 搜索热词/历史 | 商品搜索结果走真实 BFF，热词和历史是否服务端化待定 | 否 |

## 验收口径

- 源码扫描不得再出现 `resolveMockData`、`withServiceFallback`、运行态 `services/mock-data.ts` 或 `src/core/services/mock.ts`。
- 用户可见页面不得展示本地样例成长值、样例权益、样例收益、样例邀请、样例提现记录或本地模拟支付成功。
- 后端缺口统一维护在 `admin-frontend/docs/codex/admin-api-requirements/mp-bff-requirements/mini-program-bff-closure-final-2026-06-22.md`。
