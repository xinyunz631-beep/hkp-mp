# 小程序 BFF 必须接口目录

本目录只存放小程序发给后端 BFF 的必补接口清单和页面路由映射，方便后端长期按小程序页面链路理解缺口。

## 边界

- 只记录小程序 `/api/bff/**` 依赖、字段级缺口、验收口径和页面映射。
- 不复制管理后台必须接口清单；管理后台事实源仍在 `admin-frontend/docs/codex/admin-api-requirements/`。
- 小程序如果依赖后台先完成配置闭环，只在本文档引用后台文档路径和缺口编号，不把后台接口字段搬到小程序目录维护。
- 后端源码口头完成后，仍需按 `$hk-api-mp` 口径核验 release、Controller、DTO、Service、Mapper，再更新本目录。

## 当前文件

| 文件 | 用途 |
| --- | --- |
| `coupon-bff-required-interfaces-2026-06-16.md` | 小程序优惠券、K 币兑换、我的券、下单可用券、锁券核销和退款返还必补清单 |
| `coupon-bff-required-interfaces-2026-06-17.md` | 后端 `origin/uat@320a014` 复核后的优惠券同源资产 P0 缺口和验收用例 |
| `route-api-map.md` | 小程序页面路由到 BFF 接口、状态和后端缺口的长期映射 |

## 更新规则

- 新增或切换小程序页面真实接口时，同步更新 `route-api-map.md`。
- 后端补齐接口后，必须写明后端 commit、核验过的 Controller/Service/Mapper 和小程序适配状态。
- 已进入真实接口联调的链路不得失败回运行时本地 mock；未实现接口只能保留业务阻断或开发夹具隔离。
