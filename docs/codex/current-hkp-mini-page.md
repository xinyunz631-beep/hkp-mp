# HKP 小程序全页面工程恢复检查点

## 当前状态

- 更新时间：`2026-05-16`
- 当前阶段：`Phase 3 - 商城闭环`
- 当前分支：`feature/hkp-mini-phase-3-mall-flow`
- 基线提交：`36b7517 chore: 保存小程序当前开发基线`
- 最近阶段提交：`92d810d feat: 建立 HKP 小程序页面骨架`
- 总控 Skill：`/Users/kite/.codex/skills/hkp-mini-build/SKILL.md`
- 主执行 Skill：`$mpcode-page`

## 已完成

- 已提交 `mini-program` 当前开发基线。
- 已从基线创建 `feature/hkp-mini-phase-0-prd-assets` 分支。
- 已新增 `$hkp-mini-build` 总控恢复 skill。
- 已把 `/Users/kite/Desktop/hkp/mini-page` 的 70 张 750px PNG 复制到 `docs/ui/source/hkp-mini-page/`。
- 已按业务语义重命名 UI 图，并生成 `docs/ui/source/hkp-mini-page/manifest.json`。
- 已新增 `docs/ui/pages/hkp-mini-prd.md` 作为全页面工程 PRD。
- 已更新 `docs/ui/page-registry.yaml` 顶层 HKP 工程元信息。
- Phase 0 门禁已通过：`yarn typecheck`、`yarn check:page-convention`、`yarn check:package-boundary`、`yarn check:ui-contract`。
- 已进入 `feature/hkp-mini-phase-1-routes-shells` 分支。
- 已补齐 HKP 全页面工程的主包入口、分包首页和业务子页面骨架。
- 已更新 `src/app.config.ts` 分包页面注册和 `src/core/constants/routes.ts` 路由常量。
- 已将早期主包入口和分包 `index` 占位页迁到 `PageShell`、`usePageRuntime`、`observer` 和 `_pg-*` 页面规范。
- 已登记页面说明文档和 `docs/ui/page-registry.yaml` 页面索引。
- Phase 1 轻量门禁已通过：`yarn typecheck`、`yarn check:page-convention`、`yarn check:package-boundary`、`yarn check:ui-contract`。
- `yarn build:weapp` 已尝试执行，Taro 构建在本地长时间无新增输出并出现 `system-configuration` 运行时 panic 日志，已手动终止，后续需单独复验完整产物。
- 已进入 `feature/hkp-mini-phase-2-shared-components` 分支。
- 已新增 `src/core/types/hkp.ts` 作为商品、订单、优惠券、地址、SKU、日期等基础 DTO。
- 已新增 `src/core/services/mock.ts` 作为本地数据返回和失败兜底工具。
- 已新增 `src/core/components/commerce` 交易通用组件，包含商品卡、订单卡、优惠券卡、地址卡、固定提交栏、数量选择、筛选 Tab、SKU 弹层和日期选择。
- 已为商城、票务、酒店、餐饮、订单、会员分包补齐 `services/mock-data.ts` 和基础页面 service 返回值。
- Phase 2 门禁已通过：`yarn typecheck`、`yarn check:page-convention`、`yarn check:package-boundary`、`yarn check:ui-contract`。
- 已进入 `feature/hkp-mini-phase-3-mall-flow` 分支。
- 已完成商城首页、商品列表、商品详情、购物车四个核心页面的首版 UI、mock 数据和跳转闭环。
- 已补齐商城首页 service、商城页面所需 NutUI 图标外层封装，并保持 `AppImage` 空地址失败态占位策略。
- Phase 3 当前轮轻量门禁已通过：`yarn typecheck`、`yarn check:page-convention`、`yarn check:package-boundary`、`yarn check:ui-contract`。

## 下一步

1. 提交商城核心购买链路首版成果。
2. 继续补齐商城剩余辅助页面：搜索、分类、收藏、赠品、推荐。
3. 收口 Phase 3 后进入票务、酒店、餐饮闭环。

## 恢复方式

换账号或新会话后直接说：

```text
[$hkp-mini-build] 继续
```

Codex 应读取本文件、`docs/ui/pages/hkp-mini-prd.md`、`docs/ui/page-registry.yaml`、路由配置和 Git 状态后继续。

## 阶段分支

- `feature/hkp-mini-phase-0-prd-assets`：PRD、截图资产、registry 元信息、checkpoint。
- `feature/hkp-mini-phase-1-routes-shells`：路由和页面骨架。
- `feature/hkp-mini-phase-2-shared-components`：通用组件和基础 mock service。
- `feature/hkp-mini-phase-3-mall-flow`：商城闭环。
- `feature/hkp-mini-phase-4-booking-flows`：票务、酒店、餐饮闭环。
- `feature/hkp-mini-phase-5-order-aftersale`：订单、售后、地址、评价、物流。
- `feature/hkp-mini-phase-6-member-growth`：会员优惠券、分享、提现。
- `feature/hkp-mini-phase-7-polish-verify`：状态补齐和整体验收。
