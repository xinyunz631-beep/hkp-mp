# Service 与页面职责

本文件约束页面、service、request 的职责边界。

## 基本原则

- 页面只负责渲染、交互和状态组合。
- 页面直接 `await service`，不在页面到处写 `.catch`。
- service 不是薄转发，要处理当前接口的默认值、轻量字段归一和异常态/空态转译。
- 单接口轻量处理直接写在方法内部，不为每个 API 抽一堆 helper。
- request 负责通用网络、授权、header、业务成功码等基础能力。
- 长任务 UI 开发阶段可用 `src/core/services/mock.ts` 的 `resolveMockData()` 返回本地数据；真实接口文档到来后只替换 service 内部 request 和 mapper。
- 各业务分包的基础数据放在本分包 `services/mock-data.ts`，页面只 import 当前页面 service，不直接 import mock-data。
- 页面 DTO 优先复用 `src/core/types/hkp.ts`，分包差异字段可以在各自 service 内扩展。

## 可降级接口

可降级接口失败时，service 内部 catch 并 resolve 默认值。

示例：

```ts
export function fetchCouponUsedCount() {
  return new Promise<number>((resolve) => {
    request(...)
      .then((response) => {
        // 方法内部直接处理轻量返回结构
        resolve(...)
      })
      .catch(() => {
        resolve(0)
      })
  })
}
```

## 阻断接口

必须阻断页面的接口可以抛出异常，由 `usePageRuntime({ initPage })` 进入错误态。页面文档必须写清阻断原因和错误态表现。

## 文档要求

每个页面文档必须写清：

- 接口方法名。
- 成功数据用于哪个模块。
- 失败默认值。
- 是否阻断页面。
- 页面是否需要登录。
