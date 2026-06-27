# 小程序风险、Bug 与优化建议台账

## 分级

- 高：可能影响交易、登录、分包构建、真实数据可信度或商用发布。
- 中：影响用户体验、后续维护、运营配置或局部功能可信度。
- 低：治理债、代码整洁度、文档一致性或长期演进建议。

## 风险与 Bug

| 编号 | 级别 | 类型 | 问题 | 证据 | 影响 | 建议 |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | 高 | 架构 | 订单分包直接引用商城分包 service | `src/pkg-order/services/checkout.ts` import `@/pkg-mall/services/cart`；MP-104 禁止分包互引 | 分包边界被打穿，后续包体、依赖循环和业务复用都会变脆 | 抽到 `src/core` 的交易后置清理协议，或让商城通过事件/轻量 adapter 提供购物车清理 |
| R-002 | 高 | 登录 | 票务确认单导航层是可选登录，页面层却强制登录 | `src/core/utils/navigation.ts` 配置 `ticketCheckout` 为 optional；`src/pkg-ticket/pages/checkout/index.tsx` 设置 `loginRequired: true` | 用户在入口选择“暂不登录”后，进入页面仍会被强制登录，体验和策略冲突 | 统一策略。建议票务确认单明确强登录，入口文案改成“登录后可提交门票订单” |
| R-003 | 高 | 数据真实性 | 票务实名姓名可能被昵称或“微信用户”兜底 | `resolveMemberContactSeed()` 使用 `memberInfo.nickname || '微信用户'`；游客表单会合并联系人 | 实名购票可能提交非真实姓名，影响入园核验和售后 | 实名游客姓名默认空置；仅手机号可从会员资料带入；提交前要求用户填写真实姓名 |
| R-004 | 中 | mock 治理 | 旧 mock 图片过滤存在白名单绕过 | 多个 adapter 使用 `sanitizeMallRuntimeUrl(..., { allowMockImage: true })` | 旧占位图可能进入订单、酒店或票务链路，影响商用观感 | 删除默认绕过；确需兼容时改为真实 CDN 白名单 |
| R-005 | 中 | 交互 Bug | K 币兑换详情爱心是假状态 | `src/pkg-member/services/exchange.ts` 固定 `liked: false`；页面只 `setLiked()` 本地切换 | 用户以为收藏成功，刷新后状态丢失 | 无真实收藏接口前隐藏爱心；或接真实收藏/取消收藏接口 |
| R-006 | 中 | 发布风险 | 餐饮、分享、提现页面注册但仍是准备中 | `pkg-dining/**`、`pkg-member/pages/share*`、`withdraw*` | 用户通过乐园入口、扫码、广告或旧路径直达时，会看到未完成能力 | 当前不开放则下线注册或加运营开关；开放前补真实链路 |
| R-007 | 中 | 路由 | 首页扫码直达 `/pkg-*` 绕过统一导航守卫 | `src/pages/home/index.tsx` 直接 `Taro.navigateTo({ url: scanResult.result })` | 受保护页面可能绕过入口级登录策略，非法路径也缺少白名单过滤 | 扫码结果先解析到合法 `MINI_PACKAGE_ROUTES`，再走 `navigateToMiniRoute()` |
| R-008 | 中 | 路由 | 乐园 tab 入口直接 `Taro.navigateTo()` | `src/pages/park/index.tsx` | 当前目标多为公开页，但后续入口变成受保护能力时容易遗漏登录守卫 | 改为统一 `navigateToMiniRoute()` |
| R-009 | 中 | 数据展示 | 会员首页缺字段时用默认会员信息兜底 | `src/pkg-member/services/index.ts` 默认 `乐园会员`、`会员`、`levelNo ?? 1` | 接口字段缺失会被看似真实的会员资料掩盖 | 缺关键字段时显示待同步、未开通或空态，不伪造等级 |
| R-010 | 中 | 维护 | 历史 docs 仍保留 mock、本地订单、模拟支付说明 | `docs/ui/**` 多处命中 | 后续 Codex 或人工恢复任务可能参考过期方案 | 归档或标注废弃，把当前事实源指向 `docs/codex` |
| R-011 | 中 | 当前工作树 | `KittySvgLoading` import 指向未跟踪 SVG | 当前工作树 `src/components/KittySvgLoading/index.tsx` 修改，`outline-draw.svg` 未跟踪 | 如果只提交 import 不提交 SVG，加载素材会缺失 | 对应工作包需成对提交或还原；本次 Review 不处理 |
| R-012 | 低 | 可删项 | 多个分包占位 store 未被使用 | `src/pkg-*/store/index.ts` 仅 `ready/markReady` | 增加维护噪音，容易误导状态边界 | 删除占位 store，未来按真实业务状态重建 |
| R-013 | 低 | 可删项 | 旧 purchase/category-list/date util 疑似未引用 | `src/pkg-ticket/services/purchase-api.ts`、`src/pkg-mall/services/category-list.ts`、`src/core/utils/date.ts` | 增加历史包袱 | 删除前跑类型检查和页面约定检查 |
| R-014 | 低 | 性能 | `PageLayout` 动态测量 header/footer，复杂页面可能有重测抖动 | `src/core/components/PageLayout` | 真机低端设备上可能出现细微跳动或重复布局 | 用微信开发工具性能面板观察；稳定页面可减少重测频率 |
| R-015 | 低 | 调试日志 | 支付失败会输出 console error | `src/core/utils/wechat-actions.ts` | 生产控制台可能出现支付诊断信息，虽然未直接打印完整敏感字段 | 生产环境可降级日志或统一接入脱敏 logger |

## 优先修复建议

1. 先修 R-001 分包互引。它是明确违反 MP-104 的架构问题，且容易影响后续包体治理。
2. 再修 R-002 和 R-003。它们直接影响票务交易确认体验和实名数据可信度。
3. 收敛 R-004 的 `allowMockImage`。这类白名单容易在后续业务扩张时重新引入旧占位图。
4. 决策 R-006 占位页面。当前餐饮、分享、提现要么下线注册，要么补真实闭环，不建议保持外部可直达准备中页。
5. 清理 R-010 历史 mock 文档，降低后续长任务恢复时的误导成本。

## 交互体验优化项

| 编号 | 优化项 | 说明 |
| --- | --- | --- |
| UX-001 | 统一跳转封装 | 分包内公开页可以继续直接跳，但主包入口、扫码入口、广告入口和交易入口应优先统一到 `navigateToMiniRoute()` 或 `adClick()` |
| UX-002 | 占位页改运营开关 | 未上线能力不应只靠页面里“准备中”兜底，入口层应先隐藏 |
| UX-003 | 会员缺字段降级 | 真实接口缺会员名、等级、券数时，用待同步态而不是默认会员态 |
| UX-004 | 票务实名表单显式填写 | 证件姓名不要自动使用微信昵称，减少入园核验失败 |
| UX-005 | 商品/票务/酒店图片兜底统一 | 图片缺失时显示业务空态，不允许旧 mock 图片透出 |
| UX-006 | 订单未知业态显式提示 | 订单详情遇到未知 `sceneType` 时，建议提示“订单类型暂不支持展示”并上报，而不是默认低保真展示 |

## 验证建议

下一轮修复后建议按以下门禁验证：

- `yarn check:package-boundary`
- `yarn typecheck`
- `yarn check:page-convention`
- 关键链路微信开发工具验收：票务预订到确认单、酒店确认单、商城购物车到订单确认、会员 K 币兑换、订单详情支付继续、售后申请、物流和评价。

本次没有执行上述命令，因此本台账只代表静态 Review 结论。
