# 会员码页面设计说明

## 基本信息

- 页面：会员码
- 路由：src/pkg-member/pages/member-code
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：member-code-page
- 设计稿名称：会员码 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：member-code-page
- 当前版本：v0.3
- 页面状态：interaction-ready
- 更新时间：2026-05-18
- 实现文件：
  - src/pkg-member/pages/member-code/index.tsx
  - src/pkg-member/pages/member-code/index.scss
  - src/pkg-member/pages/member-code/index.config.ts
  - src/pkg-member/services/member-code.ts
  - src/core/constants/routes.ts
  - src/core/components/AppTabBar/index.tsx
  - src/app.config.ts

## 设计意图

会员码页承担会员身份识别和出示二维码的核心动作，页面以系统导航标题“会员码”进入，主体只保留二维码、轻提示和温和背景，不额外堆叠业务信息。

## 页面结构

按展示顺序：

1. 系统导航栏，标题为“会员码”。
2. 浅粉到浅蓝的柔和背景和泡泡氛围。
3. 白色会员码卡片，内部只放二维码展示区。
4. 卡片下方的绑定提示文案。

## 动态与静态边界

- 接口图片：无。
- 接口文本/数据：会员码字符串由 service mock 返回，后续可无缝替换为真实接口。
- 代码渲染：二维码生成、页面背景、卡片样式和提示文案。
- 本地配置：系统导航标题、页面分包路由、30 秒自动刷新定时器。

## 状态要求

- loading：首屏由 `usePageRuntime({ initPage })` 自动接管。
- empty：无。
- error：接口或初始化异常走统一异常态。
- 未登录：先弹登录流程，取消后显示统一登录引导异常态。
- 降级态：当前无额外降级内容。

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| 会员码内容 | `fetchMemberCode()` | 当前 mock 始终返回默认码，后续可替换真实接口 | 是，首屏必须拿到内容后再展示二维码 |

## 交互与跳转

- 页面进入后自动生成会员码。
- 每 30 秒自动刷新一次会员码内容并重绘二维码。
- 未登录时先走登录弹窗，取消后展示统一登录引导异常态。
- 当前页面不提供额外跳转入口，后续可从会员中心或快捷入口进入。

## 微信开发工具验收清单

- 已登录进入会员码页，应看到二维码 canvas。
- 停留 30 秒后二维码应重新绘制，不应出现页面报错。
- 未登录进入时应先走登录弹窗，取消后显示统一登录引导态。

## 实现映射

- `src/pkg-member/pages/member-code/index.tsx`：页面主体、二维码绘制和自动刷新。
- `src/pkg-member/pages/member-code/index.scss`：页面视觉、白卡和背景氛围。
- `src/pkg-member/pages/member-code/index.config.ts`：系统导航标题。
- `src/pkg-member/services/member-code.ts`：会员码 mock 数据源。
- `src/core/components/AppTabBar/index.tsx`：底部中间会员码入口跳转到本页面。
- `src/core/constants/routes.ts`：分包路由常量。
- `src/app.config.ts`：分包页面接入。

## 变更记录

### v0.3

- 确认会员码页登录态、二维码绘制和 30 秒刷新为当前交互闭环，页面状态推进到 `interaction-ready`。

### v0.2

- 页面外层补充 `_pg` 作用域根节点。
- render 和 SCSS 从 `member-code-page__*` 迁移为 `_pg-*` 单下划线 BEM，满足页面约束检查。

### v0.1

- 新增会员码页面，先用 `weapp-qrcode` 生成二维码。
- 页面默认 30 秒刷新一次会员码。
- 页面采用系统导航栏，标题为“会员码”。
- 底部中间会员码按钮已改为打开本页面。

## 验证记录

- 2026-05-14：`yarn typecheck` 通过。
- 2026-05-14：`yarn check:page-convention` 通过。
- 2026-05-14：`yarn check:package-boundary` 通过。
- 2026-05-14：`yarn check:ui-contract` 通过。
- 2026-05-15：`yarn check:page-convention` 通过。
- 待在微信开发工具中目视确认二维码 canvas 渲染和 30 秒刷新表现。
