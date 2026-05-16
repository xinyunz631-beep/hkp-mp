# Service 与页面职责

本文件约束页面、service、request 的职责边界。

## 基本原则

- 页面只负责渲染、交互和状态组合。
- 页面直接 `await service`，不在页面到处写 `.catch`。
- service 不是薄转发，要处理当前接口的默认值、轻量字段归一和失败兜底。
- 单接口轻量处理直接写在方法内部，不为每个 API 抽一堆 helper。
- request 负责通用网络、授权、header、业务成功码等基础能力。

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
