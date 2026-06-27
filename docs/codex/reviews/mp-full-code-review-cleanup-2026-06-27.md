# 小程序可清理项与 mock 治理清单

## 结论

本次静态 Review 没有发现仍在运行态使用的 mock service 文件或模拟支付实现。主要清理空间集中在空目录、历史兼容页、未引用 service、占位 store、占位页面和历史文档。

清理时必须分三类处理：

- 可直接删除：空目录或确认未被任何 import 引用的纯残留。
- 需确认后删除：可能被后台广告、二维码、旧版本外链或运营配置直达的页面。
- 不建议删除：当前虽引用弱，但属于真实业务入口或外部配置入口的页面。

## 运行态 mock 扫描结果

未发现以下运行态文件或函数仍被源码使用：

- `src/core/services/mock.ts`
- `src/pkg-*/services/mock-data.ts`
- `resolveMockData`
- `withServiceFallback`
- 本地模拟支付成功
- 本地订单写入冒充真实订单

仍存在的 mock 关键词主要来自三类：

- 历史文档：`docs/ui/**`、旧 current 文档、早期 PRD 和页面说明。
- 注释说明：说明“不再回退旧本地静态数据”。
- 运行时清洗工具：`src/core/utils/mall-runtime.ts` 用于过滤旧占位文本和旧 mock 图片 URL。

## 可直接清理候选

以下目录为空，静态扫描未发现实际内容：

| 路径 | 类型 | 建议 |
| --- | --- | --- |
| `src/app` | 空目录 | 删除 |
| `src/core/components/AppEmpty` | 空目录 | 删除 |
| `src/core/components/AppSkeleton` | 空目录 | 删除 |
| `src/core/components/GlobalLoading` | 空目录 | 删除 |
| `src/core/components/HkyEmpty` | 空目录 | 删除 |
| `src/core/components/HkySkeleton` | 空目录 | 删除 |
| `src/core/mock` | 空目录 | 删除，避免后续误以为仍允许 mock 入口 |
| `src/core/router` | 空目录 | 删除 |
| `src/pkg-dining/services` | 空目录 | 删除；餐饮若后续启动再新建真实 service |

## 可评估删除的未引用文件

以下文件经静态引用扫描和人工复核后，当前未发现有效调用方。删除前建议跑一次 `yarn typecheck`、`yarn check:page-convention` 和 `yarn check:package-boundary`。

| 路径 | 当前状态 | 删除前确认点 |
| --- | --- | --- |
| `src/core/utils/date.ts` | 导出 `formatDateTime`、`formatDate`、`formatTimeRange`，当前业务处各自定义日期格式函数，没有 import 该 util | 确认无新分支依赖后删除，或统一替换为该 util 后再保留 |
| `src/pkg-ticket/services/purchase-api.ts` | 旧 `/api/bff/purchase/resources` 和 `/api/bff/cms/resources` service，当前票务页已使用新的票务和资源位服务 | 确认后端旧 purchase 资源位不再被页面使用后删除 |
| `src/pkg-mall/services/category-list.ts` | 为旧 `category-list` 页面准备真实分类数据，但页面本身已直接 redirect 到新分类页 | 若旧兼容页下线，可一起删除 |
| `src/pkg-dining/store/index.ts` | 仅 `ready=false/markReady()` 占位 store，未发现 import | 删除，后续餐饮真实业务启动时按真实状态模型重建 |
| `src/pkg-hotel/store/index.ts` | 同上 | 删除 |
| `src/pkg-mall/store/index.ts` | 同上 | 删除 |
| `src/pkg-member/store/index.ts` | 同上；注意不要混淆 `src/core/store/member-store.ts` | 删除分包占位 store，保留 core 会员 store |
| `src/pkg-order/store/index.ts` | 同上 | 删除 |
| `src/pkg-ticket/store/index.ts` | 同上 | 删除 |
| `src/core/components/BaseException/index.scss` | `BaseException` 实际样式由 `status/StatusException.scss` 承接，当前未发现该 scss 被 import | 删除前确认组件导出链没有隐式样式依赖 |

## 需确认后下线的页面或路由

| 路径 | 当前状态 | 风险 | 建议 |
| --- | --- | --- | --- |
| `pkg-mall/pages/category-list/index` | 旧分类路由兼容壳，进入后 redirect 到 `mallCategory` | 可能有旧二维码、广告、外部路径直达 | 先查后台广告 linkTarget、二维码、客服素材和历史版本路径；确认无直达后从 `app.config.ts` 下线 |
| `pkg-member/pages/share-rule/index` | 准备中页面 | 直达体验不完整 | 若分销/分享未上线，建议从注册页下线或加内部白名单 |
| `pkg-member/pages/share/index` | 准备中页面 | 同上 | 同上 |
| `pkg-member/pages/share-income/index` | 准备中页面 | 同上 | 同上 |
| `pkg-member/pages/share-invite/index` | 准备中页面 | 同上 | 同上 |
| `pkg-member/pages/withdraw-records/index` | 准备中页面 | 同上 | 同上 |
| `pkg-member/pages/withdraw/index` | 准备中页面 | 同上 | 同上 |
| `pkg-dining/pages/index/index` | 准备中页面 | 乐园 tab 可跳转到占位页 | 当前商用包不开放餐饮时，下线入口和注册页 |
| `pkg-dining/pages/merchant-detail/index` | 准备中页面 | 可能被外部直达 | 同上 |
| `pkg-dining/pages/checkout/index` | 准备中页面 | 交易页占位风险更高 | 同上 |

## 不建议直接删除的弱引用页面

| 路径 | 原因 |
| --- | --- |
| `pkg-mall/pages/recommend/index` | 当前源码内链引用弱，但可能由后台推荐位、广告配置或运营链接直达 |
| `pages/park/index` | 路由常量引用弱，但它是 tabBar 注册页，不可删 |
| `pkg-ticket/pages/park-list/index`、`pkg-ticket/pages/activity-list/index` | 依赖首页资源位编码跳转，不能只按静态引用计数判断 |

## mock 图片清洗与白名单

`src/core/utils/mall-runtime.ts` 当前做了两件事：

- 清理旧占位文本，例如 `UAT商城联调商品`。
- 过滤旧 mock 图片 URL，例如路径中符合 `/mock-YYYYMMDD` 模式的图片。

风险点在于多个业务 adapter 使用 `allowMockImage: true` 绕过过滤：

| 路径 | 行为 |
| --- | --- |
| `src/pkg-hotel/services/checkout-adapter.ts` | 酒店确认单商品图允许旧 mock 图片 |
| `src/pkg-ticket/services/checkout-adapter.ts` | 票务确认单商品图允许旧 mock 图片 |
| `src/pkg-ticket/services/order-draft.ts` | 票务订单草稿商品图允许旧 mock 图片 |
| `src/pkg-ticket/services/ticket-booking.ts` | 票务预订商品图允许旧 mock 图片 |
| `src/pkg-order/services/index.ts` | 订单列表/聚合适配允许旧 mock 图片 |
| `src/pkg-order/services/bff-adapter.ts` | 订单 BFF 适配允许旧 mock 图片 |

建议：

- 默认删除 `allowMockImage: true`。
- 如果确有历史合法图片路径误伤，改为更窄的真实 CDN 白名单，而不是放开 mock 图片。
- 增加静态检查，禁止新增 `allowMockImage: true`，除非同一文件写明业务来源和下线时间。

## 历史文档清理

`docs/ui/**` 中仍有大量早期 mock、本地订单、模拟支付和 service-rules 描述，例如：

- `docs/ui/service-rules.md`
- `docs/ui/pages/hkp-mini-prd.md`
- `docs/ui/pages/ticket-checkout.md`
- `docs/ui/pages/hotel-checkout.md`
- `docs/ui/pages/order-checkout.md`
- `docs/ui/pages/member.md`
- `docs/ui/page-registry.yaml`

这些文档不影响运行态，但会误导后续恢复任务。建议二选一：

- 归档到 `docs/ui/archive/` 并在目录 README 标注“历史 mock 阶段资料，不作为当前实现依据”。
- 保留文件位置，但逐页加废弃头部，并把当前事实源指向 `docs/codex/current-mini-program.md`、`docs/codex/interface-integration.md` 和本次 Review 报告。

## 当前并行改动提醒

当前工作树存在素材切换未提交项：

- `src/components/KittySvgLoading/index.tsx`
- `src/assets/loading/hello-kitty-kt-tp-4-outline-draw.svg`

这不是本次 Review 清理项。若后续要提交该改动，必须保证 import 目标 SVG 一起纳入提交。若最终不需要该素材，应由对应工作包确认后清理，不能由本次 Review 文档任务擅自删除。
