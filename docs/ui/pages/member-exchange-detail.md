# 兑换商品详情页面设计说明

## 基本信息

- 页面：商品详情
- 路由：src/pkg-member/pages/exchange-detail
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：member-exchange-detail
- 设计稿名称：兑换商品详情 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：member-exchange-detail
- 当前版本：v0.1
- 页面状态：interaction-ready
- 更新时间：2026-05-31
- 实现文件：
  - src/pkg-member/pages/exchange-detail/index.tsx
  - src/pkg-member/pages/exchange-detail/index.scss
  - src/pkg-member/pages/exchange-detail/index.config.ts
  - src/pkg-member/components/MemberRichText/index.tsx
  - src/pkg-member/services/exchange.ts

## 设计意图

兑换商品详情根据路由 `id` 请求商品详情。页面承载接口返回的商品图、K 币价格、库存、已兑数量、分享、喜欢、商品详情正文，并通过居中弹层完成兑换订单确认。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：
  - 商品大图
  - 商品信息：K 币价格、划线原价、标题、已兑数量、库存、分享、喜欢
  - 商品详情正文：`MemberRichText`
  - 固定底部按钮：立即兑换
  - 居中确认弹层：商品、库存、K 币价格、数量、取消、确定

## 动态与静态边界

- 接口图片：商品图片由接口字段 `imageSrc` 返回，页面用 `AppImage` 承载。
- 接口正文：商品详情由接口字段 `detailHtml` 返回，页面用 `MemberRichText` 承载。
- 接口文本/数据：通过页面 service 获取，商品 id 使用接口返回的数字字符串。
- 代码渲染：页面结构、喜欢状态、数量、库存和确认弹层。

## 状态要求

- loading：页面运行时统一承接。
- error：优先使用 `BaseException` 或 `StatusException`。
- 缺少 id：service 返回默认商品兜底。
- 未登录：`usePageRuntime({ loginRequired: true })` 兜底。
- 库存不足 / K 币不足：toast 提示。

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| 兑换商品详情 | `fetchMemberExchangeDetailData(id)` | service 内归一和兜底 | 是 |

## 交互与跳转

- 页面进入：从路由参数读取接口数据里的 `id`。
- 分享：使用微信好友分享，分享路径携带接口数据里的 `id`。
- 喜欢：本地切换喜欢态，后续接真实接口。
- 立即兑换：打开订单确认弹层。
- 弹层数量：受库存限制。
- 确定：校验 K 币余额和库存，通过后 toast 展示兑换成功。

## 实现映射

- `src/pkg-member/pages/exchange-detail/index.tsx`：页面主体。
- `src/pkg-member/pages/exchange-detail/index.scss`：页面样式。
- `src/pkg-member/pages/exchange-detail/index.config.ts`：页面配置。
- `src/pkg-member/components/MemberRichText/index.tsx`：商品详情正文承载。
- `src/pkg-member/services/exchange.ts`：页面 service。

## 变更记录

### v0.1

- 完成兑换商品详情、兑换确认弹层和本地兑换成功闭环。

## 验证记录

- 待验证。
