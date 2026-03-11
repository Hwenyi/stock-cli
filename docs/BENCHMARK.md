# Packaging Benchmark

> 说明：本页性能数据采集于输出格式切换需求之前，当时在线验收使用的是 JSON 输出路径。2026-03-11 起，文档层面的最新约定已调整为默认 YAML、保留 JSON 为次选；等代码完成后，需要补跑一次基于 YAML 默认输出的基准测试。

## Summary

| Route | Binary Size | Cold Start | Hot Start Avg | Stability Failures |
| --- | --- | --- | --- | --- |
| bun-direct | 58.2 MB | 150 ms | 147 ms | 0/5 |
| tsdown-bun | 125.6 MB | 168 ms | 178 ms | 0/5 |

## Recommendation

固定使用 bun-direct 作为默认打包路线。两条路线功能都通过，但 bun-direct 产物显著更小，且本次测试中冷启动与热启动也更优；tsdown-bun 继续保留为备选构建路径，用于兼容性验证和回退。

## Test Set

- 离线冒烟：help 输出、无效 A 股代码校验、kline-indicators 缺少指标校验
- 在线验收：A 股行情、search、kline-indicators
- 稳定性：连续 5 次执行 a sh600519，统计失败数

## Details

## bun-direct

Binary: dist/bin/stock-cli

离线测试
- PASS help output: exit=0, 559 ms
- PASS invalid A-share code: exit=1, 558 ms
- PASS missing indicator selection: exit=1, 557 ms

在线测试
- PASS A-share quote JSON baseline: exit=0, 134 ms
- PASS search JSON baseline: exit=0, 154 ms
- PASS kline indicators JSON baseline: exit=0, 374 ms

## tsdown-bun

Binary: dist/tsdown/stock-cli-tsdown

离线测试
- PASS help output: exit=0, 976 ms
- PASS invalid A-share code: exit=1, 973 ms
- PASS missing indicator selection: exit=1, 973 ms

在线测试
- PASS A-share quote JSON baseline: exit=0, 179 ms
- PASS search JSON baseline: exit=0, 150 ms
- PASS kline indicators JSON baseline: exit=0, 391 ms
