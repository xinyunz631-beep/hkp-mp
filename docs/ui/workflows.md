# UI 工作流

本文件定义截图、Pencil、Figma、页面文档和代码之间的协作流程。当前使用哪种设计工具由 `page-registry.yaml` 的 `currentTool` 决定。

当前首页设计源：
- Pencil：`/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen`
- Figma：`https://www.figma.com/design/LCJbfpQmHoCR5RdKTYcf0O/hkp-team?node-id=0-1`

## 看板组织规则

- 全局设计规范单独维护，不与页面开发稿混排在同一看板中。
- 每个页面使用一个独立页面看板；后续新增页面继续沿用“一页面一看板”。
- 页面文档和 `page-registry.yaml` 默认记录页面看板节点；全局规范节点在页面文档备注中补充引用。

## 页面状态机

- `design-draft`：截图刚转成画板。
- `design-review`：设计细节持续调整中。
- `design-approved`：用户确认设计最终版。
- `implementation-ready`：页面文档已锁定，可进入开发。
- `implementing`：代码开发中。
- `implemented`：代码已完成。
- `verified`：已通过必要校验和目视验证。
- `design-changed`：确认后又发生设计变动，需要重新确认。

## 截图到设计

1. 读取 `README.md`、`tokens.md`、`components.md`、`states.md` 和目标页面文档。
2. 按 `page-registry.currentTool` 在对应工具里创建 `750px` 可开发稿。
3. 删除截图里的系统栏、水印、外侧边距和无效标题。
4. 动态图片统一灰色占位，图层名标注 `接口图占位`。
5. 只做设计，不写小程序代码。

## 设计锁定

用户明确表示“确认最终版”后才能锁定：

1. 截图或读取画板确认无明显布局问题。
2. 更新 `pages/{page}.md` 的当前确认版本。
3. 更新 `page-registry.yaml` 状态为 `implementation-ready`。
4. 写清设计意图、动态/静态边界、状态、接口和交互。
5. 锁定前确认当前页面的 `currentTool`，并在对应客户端核对最终稿。

## 开发实现

1. 检查页面状态必须是 `design-approved` 或 `implementation-ready`。
2. 读取当前页面文档和 `service-rules.md`。
3. 按页面文档实现代码，并先到 `currentTool` 对应的设计客户端看图。
4. 跑 `yarn check:ui-contract`、`yarn typecheck`、`yarn check:package-boundary`，必要时再跑构建或微信开发工具验证。
5. 回写页面文档的实现状态和验证记录。

## 设计变更

已确认页面发生设计变动时：

- 影响布局、组件、状态、接口、交互：必须更新页面文档并改为 `design-changed` 或重新锁定版本。
- 只是不影响开发的小视觉微调：追加简短变更记录。
