# 小程序 UI 工程入口

本目录是 hkitty 小程序 UI 设计到代码实现的事实源。页面当前使用哪种设计工具由 `page-registry.yaml` 的 `currentTool` 决定，Pencil 和 Figma 都可以作为事实源；页面设计意图、实现约束和最新状态必须落到这里。

当前首页设计源：
- Pencil：`/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen`
- Figma：`https://www.figma.com/design/LCJbfpQmHoCR5RdKTYcf0O/hkp-team?node-id=0-1`

- 全局设计规范必须单独维护看板。
- 业务页面必须遵循“一个页面一个看板”。

## 快速选择

- `mpui-pencil`：当前页面登记为 `pencil`，在 Pencil 客户端里设计画板。
- `mpui-figma`：当前页面登记为 `figma`，在 Figma 客户端里设计画板。
- 设计截图到画板：读 `tokens.md`、`components.md`、`states.md`、`workflows.md`、`page-registry.yaml` 和当前页面 `pages/{page}.md`。
- 确认最终设计：读 `workflows.md`、`page-spec-template.md`、`page-registry.yaml` 和当前页面 `pages/{page}.md`。
- 开发页面代码：先读 `page-registry.yaml` 的 `currentTool`，再读 `service-rules.md`、`components.md`、`states.md` 和当前页面 `pages/{page}.md`，并到对应设计客户端看图。
- 恢复任务进度：先读 `page-registry.yaml`，再只读目标页面文档。

## 不变原则

- 仓库文档是规范源，Pencil/Figma 是表现层，Taro 小程序代码是实现层。
- 未确认的设计稿不能直接进入开发。
- 已确认页面的设计变动必须同步更新页面文档。
- Codex 开发页面前必须读取对应页面文档，并按 `currentTool` 去对应客户端看图。
- 规范要短、准、可恢复；不要依赖长对话记忆。
