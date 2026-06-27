# 小程序全量代码 Review 总览

## 基本信息

- Review 日期：2026-06-27
- Review 分支：`review/mp-full-code-audit-20260627`
- Review 范围：`src/`、`config/`、`types/`、`docs/codex`、`docs/ui` 中与小程序运行态、页面注册、分包边界、mock 治理和交互体验相关的内容。
- Review 方式：静态代码 Review、引用关系扫描、页面注册矩阵扫描、关键调用链人工复核。
- 未执行项：按用户要求，本次未启动本地服务、未运行微信开发工具、未运行 `yarn dev:weapp`、`yarn build:weapp`、`yarn typecheck` 或浏览器自动化验收。
- 产出文档：
  - `docs/codex/reviews/mp-full-code-review-summary-2026-06-27.md`
  - `docs/codex/reviews/mp-full-code-review-pages-2026-06-27.md`
  - `docs/codex/reviews/mp-full-code-review-cleanup-2026-06-27.md`
  - `docs/codex/reviews/mp-full-code-review-risk-register-2026-06-27.md`

## 当前工作树边界

本次只新增 Review 文档，不修改业务代码。

执行过程中发现当前小程序工作树存在并行改动痕迹：

- 当前分支历史已有代码提交 `069c86a 替换页面加载素材并补充轻量动效`，涉及 `KittySvgLoading`、SVG 素材和 `types/taro-env.d.ts`。
- 当前工作树还有未提交改动：`src/components/KittySvgLoading/index.tsx` 将素材 import 指向 `src/assets/loading/hello-kitty-kt-tp-4-outline-draw.svg`。
- `src/assets/loading/hello-kitty-kt-tp-4-outline-draw.svg` 当前为未跟踪文件。

这些内容不属于本次 Review 文档改动。后续如果要提交加载素材改动，必须确保组件 import 和 SVG 文件成对提交，避免只提交 import 导致构建期资源缺失。

## 执行保障

为确保任务一次性执行到底并且不丢上下文，本次采用以下方式收口：

- 先读取根项目和小程序项目入口规则：`AGENTS.md`、`CONSTRAINTS.md`、`context-map.yaml`、`mini-program/AGENTS.md`、`mini-program/CONSTRAINTS.md`。
- 读取小程序当前状态与分包规则：`codex/current/current-mini-program.md`、`codex/rules/rules-mini-program-packaging.md`、`codex/rules/rules-codex-operating-model.md`。
- 使用专用分支承接报告，避免在主线或其它功能分支上混写。
- 只新增 `docs/codex/reviews/` 下的报告，不暂存、不回滚、不覆盖并行源码改动。
- 关键扫描先用 `rg`、`find`、`git status`、`git show` 批量完成，再对高风险证据文件人工复核。
- 稳定结论写入文档，后续对话可从本报告恢复，不依赖当前对话记忆。

## 架构结论

当前小程序采用 `Taro 4.2.0 + React 18.3.1 + MobX + NutUI Taro React`，页面注册集中在 `src/app.config.ts`。本次识别到 60 个注册页面：

- 主包：3 页，承接 `home`、`park`、`member` 三个 tab 页面。
- 商城分包：10 页。
- 会员分包：19 页。
- 酒店分包：3 页。
- 票务分包：9 页。
- 餐饮分包：3 页。
- 订单分包：13 页。

整体架构方向是正确的：

- `src/core/request` 已集中承接鉴权、token 刷新、签名和错误处理。
- `src/core/runtime/use-page-runtime.tsx` 已统一页面初始化、登录拦截、异常态和刷新。
- `src/core/utils/navigation.ts` 已沉淀统一登录守卫和分包跳转入口。
- `src/core/runtime/use-checkout-controller.ts` 与 `src/core/utils/wechat-actions.ts` 已统一支付提交和微信支付参数校验。
- 商城、会员、酒店、票务、餐饮、订单分包边界总体清晰，业务实现基本放在对应 `src/pkg-*`。

## mock 与假数据结论

运行态源码没有发现仍在使用的 `src/core/services/mock.ts`、`services/mock-data.ts`、`resolveMockData` 或 `withServiceFallback`。

支付链路没有发现模拟支付成功逻辑。当前微信支付入口会校验真实 `timeStamp`、`nonceStr`、`package`、`paySign` 和 `signType`，缺支付参数时进入失败或待支付阻断，不会本地冒充支付成功。

仍需关注三类残留：

- `src/core/utils/mall-runtime.ts` 仍保留旧占位文本和旧 mock 图片 URL 清洗逻辑，这是防污染能力，不是 mock 数据源。
- 多个服务调用 `sanitizeMallRuntimeUrl(..., { allowMockImage: true })`，会绕过旧 mock 图片过滤，存在旧占位图进入订单、酒店或票务草稿链路的风险。
- `docs/ui/**` 中仍保留大量早期 mock、本地订单和模拟支付说明。它们不影响运行态，但会误导后续 Codex 或人工恢复任务。

## 最高优先级问题

| 编号 | 严重级别 | 问题 | 证据 | 建议 |
| --- | --- | --- | --- | --- |
| P0-01 | 高 | 订单分包直接引用商城分包 service，违反分包禁止互引规则 | `src/pkg-order/services/checkout.ts` import `@/pkg-mall/services/cart`；`mini-program/CONSTRAINTS.md` MP-104 | 将购物车清理能力下沉到 `core` 的交易后置清理 adapter，或由商城分包暴露事件/轻量协议，不让订单分包直接依赖商城 service |
| P0-02 | 高 | 票务确认单入口声明为可选登录，但页面强制 `loginRequired: true` | `src/core/utils/navigation.ts` 将 `ticketCheckout` 放入可选登录；`src/pkg-ticket/pages/checkout/index.tsx` 设置 `loginRequired: true` | 二选一收口：要么票务确认单入口改为强登录，要么页面初始化允许未登录浏览并在提交时强登录 |
| P0-03 | 高 | 票务实名联系人会兜底为会员昵称或“微信用户”，可能把非实名文本带入实名游客表单 | `src/pkg-ticket/pages/checkout/index.tsx` `resolveMemberContactSeed()` 和 `normalizeSingleTravelerForm()` | 证件实名场景不要用昵称或“微信用户”预填姓名；姓名应空置并要求用户显式填写真实姓名 |
| P1-01 | 中 | 旧 mock 图片清洗存在白名单绕过 | `allowMockImage: true` 出现在酒店确认、票务确认、票务草稿、票务预订、订单适配等位置 | 限定白名单只允许确认为真实 CDN 或后端历史合法图源；默认不要绕过旧 mock URL 过滤 |
| P1-02 | 中 | K 币兑换详情“爱心”是纯本地状态且 service 固定 `liked: false` | `src/pkg-member/services/exchange.ts`、`src/pkg-member/pages/exchange-detail/index.tsx` | 若无真实收藏能力，隐藏爱心或改成纯分享/收藏到微信能力；若保留，接真实接口 |
| P1-03 | 中 | 多个注册页仍是“准备中”占位页，直达会形成未完成体验 | `pkg-dining/**`、会员分享/提现相关页 | 当前无业务入口可保留；若商用发布严格，应从 app.config 下线或加统一运营开关 |

## 可删与待确认清理方向

详细清单见 `mp-full-code-review-cleanup-2026-06-27.md`。总览如下：

- 可直接清理的空目录：`src/app`、`src/core/mock`、`src/core/router`、多个空的旧组件目录、`src/pkg-dining/services`。
- 可评估删除的未引用文件：`src/core/utils/date.ts`、`src/pkg-ticket/services/purchase-api.ts`、`src/pkg-mall/services/category-list.ts`、各分包占位 `store/index.ts`、`src/core/components/BaseException/index.scss`。
- 可评估下线的注册页：`pkg-mall/pages/category-list` 旧兼容壳、餐饮 3 个占位页、会员分享和提现 6 个占位页。
- 不建议贸然删除：后台广告、扫码、运营配置可能直达的页面，例如 `pkg-mall/pages/recommend`。

## 体验与架构优化方向

- 统一所有分包跳转入口，受登录策略影响的页面优先走 `navigateToMiniRoute()`。
- 把扫码直达 `/pkg-*` 的路径也纳入登录守卫、白名单和业务路由解析，不直接 `Taro.navigateTo()`。
- 把历史 mock 文档从 `docs/ui` 中归档或标注为废弃，避免后续恢复任务继续参考旧本地订单或模拟支付描述。
- 将会员首页缺字段兜底从“看似真实的会员等级/昵称”改为更中性的待同步态，避免真实接口字段缺失被默认值掩盖。
- 对 `PageLayout` 的 header/footer 动态测量做真机性能观察，复杂页面建议避免频繁测量造成布局抖动。

## 完成标准

本次 Review 文档完成后，建议下一轮按以下顺序闭环：

1. 修复 P0-01 分包互引和 P0-02 登录策略冲突。
2. 修复 P0-03 票务实名默认值问题。
3. 收敛 `allowMockImage` 白名单。
4. 统一处理占位页注册策略和历史 mock 文档归档。
5. 再跑 `yarn check:package-boundary`、`yarn typecheck`、`yarn check:page-convention`，必要时再进入微信开发工具真机验收。
