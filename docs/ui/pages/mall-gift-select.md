# 赠品选择页面设计说明

## 基本信息

- 页面：赠品选择
- 路由：src/pkg-mall/pages/gift-select
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：mall-gift-select
- 设计稿名称：赠品选择 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：mall-gift-select
- 当前版本：v0.3-interaction-ready
- 页面状态：interaction-ready
- 更新时间：2026-05-18
- 实现文件：
  - src/pkg-mall/pages/gift-select/index.tsx
  - src/pkg-mall/pages/gift-select/index.scss
  - src/pkg-mall/pages/gift-select/index.config.ts
  - src/pkg-mall/services/gift-select.ts

## 设计意图

赠品选择页首版按截图实现双列赠品宫格和更换按钮。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：双列赠品宫格和更换按钮。

## 动态与静态边界

- 接口图片：真实图片区域统一用项目封装 `AppImage`，render 内以空字符串变量预留地址，由组件承接加载中、淡入和失败态。
- 图标资源：优先使用项目封装；NutUI 有匹配项时先封装为项目组件，找不到匹配项时用图片组件预留空地址。
- 接口文本/数据：通过页面 service 获取。
- 代码渲染：页面结构、状态、交互和基础样式。
- 本地配置：页面标题、导航策略和分包注册。

## 状态要求

- loading：页面运行时统一承接。
- empty：优先使用 `BaseEmpty`。
- error：优先使用 `BaseException` 或 `StatusException`。
- 未登录：需要身份时使用 `usePageRuntime({ loginRequired: true })` 或 `AuthAction`。
- 降级态：可降级接口在 service 内返回默认值。

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| 页面数据 | `fetchGiftSelectData()` | service 内归一和兜底 | 按业务决定 |

## 交互与跳转

- 点击更换按钮写入当前选中赠品状态，按钮文案变为“已选择”，并给微信 toast 成功反馈。

## 交互矩阵

| 元素 | 处理结果 |
|---|---|
| 赠品更换 | 设置当前选中赠品 |

## 状态矩阵

| 状态 | 页面表现 |
|---|---|
| loading | `usePageRuntime` 初始化赠品列表 |
| 已选择 | 当前赠品按钮文案变为“已选择” |

## 微信开发工具验收清单

- 点击任一赠品更换按钮，应出现成功提示并切换“已选择”状态。

## 实现映射

- `src/pkg-mall/pages/gift-select/index.tsx`：页面主体。
- `src/pkg-mall/pages/gift-select/index.scss`：页面样式。
- `src/pkg-mall/pages/gift-select/index.config.ts`：页面配置。
- `src/pkg-mall/services/gift-select.ts`：页面 service。

## 变更记录

### v0.3-interaction-ready

- 赠品更换从占位提示改为本地选中状态。

### v0.2

- 按赠品截图补齐双列宫格和更换操作首版。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `2026-05-16`：`yarn typecheck`
- `2026-05-16`：`yarn check:page-convention`
- `2026-05-16`：`yarn check:package-boundary`
- `2026-05-16`：`yarn check:ui-contract`
