# stock-cli MVP 方案（Bun 默认打包，tsdown 备选）

> 日期：2026-03-09
> 目标：基于 `stock-sdk` 封装一个可在 Apple Silicon（M4 / macOS arm64）直接执行的 CLI，以 Bun 作为默认打包方案，并保留 tsdown 作为备选路径。

## 1) MVP 目标（只做必要功能）

### 核心目标
- 统一封装 `stock-sdk` 的常用查询能力为命令行工具 `stock-cli`
- 默认产出 **路线 A（bun-direct）**：Bun 直接从 TS 源码编译为二进制
- 保留 **路线 B（tsdown+bun）**：先 tsdown bundle，再由 Bun 编译为二进制，作为备选与回退方案
- 在本机 M4 macOS 上可直接运行（无需 Node 环境）

### 非目标（MVP 不做）
- 不做全量 API 暴露
- 不做复杂配置管理（仅 env/flags）
- 不做持久化缓存
- 不做多平台发布（先只做 darwin-arm64）

---

## 2) 来自文档的关键约束

根据 `introduction` + `api` 页面与本地类型定义：
- SDK 入口：`new StockSDK(options?)`
- 建议限流：`requestsPerSecond: 3~5`
- 关键配置：`timeout/retry/rateLimit/circuitBreaker`
- 常用能力：
  - `getSimpleQuotes(codes)`
  - `getFundQuotes(codes)`
  - `getHKQuotes(codes)`
  - `getUSQuotes(codes)`
  - `getHistoryKline(symbol, options)` / `getHKHistoryKline(symbol, options)` / `getUSHistoryKline(symbol, options)`
  - `getKlineWithIndicators(symbol, options)`
  - `search(keyword)`

这 7 个能力足够组成一个“可用且可验证”的 CLI MVP。

---

## 3) CLI MVP 命令设计

建议命令面：

1. `stock-cli a <codes...>`
- 示例：`stock-cli a sh600519 sz000858`
- 输出：统一为 JSON（默认且唯一输出格式）
- SDK：`getSimpleQuotes`

2. `stock-cli fund <codes...>`
- 示例：`stock-cli fund 000001 110011`
- 输出：统一为 JSON（默认且唯一输出格式）
- SDK：`getFundQuotes`

3. `stock-cli hk <codes...>`
- 示例：`stock-cli hk 00700 09988`
- 输出：统一为 JSON（默认且唯一输出格式）
- SDK：`getHKQuotes`

4. `stock-cli us <codes...>`
- 示例：`stock-cli us AAPL MSFT`
- 输出：统一为 JSON（默认且唯一输出格式）
- SDK：`getUSQuotes`

5. `stock-cli search <keyword>`
- 示例：`stock-cli search 茅台`
- 输出 JSON 数组
- SDK：`search`

6. `stock-cli kline <market> <symbol>`
- 示例：`stock-cli kline a sh600519 --period weekly --adjust qfq --start 20240101 --end 20241231`
- 输出 JSON 数组
- `market` 支持 `a` / `hk` / `us`
- SDK：按市场分别调用 `getHistoryKline` / `getHKHistoryKline` / `getUSHistoryKline`

7. `stock-cli kline-indicators <symbol>`
- 示例：`stock-cli kline-indicators sz000001 --start 20240101 --end 20241231 --ma --ma-periods 5,10,20,60 --macd --rsi --rsi-periods 6,12`
- 输出：带技术指标字段的 K 线 JSON 数组
- SDK：`getKlineWithIndicators`
- 定位：这是“拉 K 线并自动计算指标”的聚合型命令，不替代未来单独的 MA、MACD、BOLL 等指标命令

命令边界约定：
- `kline`：只返回原始历史 K 线，不包含技术指标字段
- `kline-indicators`：返回“带指标的 K 线对象”，适合回测脚本、策略筛选和一次性数据导出
- 后续独立指标命令：例如 `indicator-ma`、`indicator-macd` 或 `indicator <name>`，聚焦单指标序列或单指标计算参数，不与 `kline-indicators` 混用

通用参数：
- `--timeout`：覆盖默认超时
- `--rps`：限流请求速率（默认 4）
- `--debug`：打印错误堆栈

K 线参数：
- `--period`：`daily|weekly|monthly`，默认 `daily`
- `--adjust`：`qfq|hfq|none`，默认 `qfq`
- `--start`：开始日期，格式 `YYYYMMDD`
- `--end`：结束日期，格式 `YYYYMMDD`

聚合指标参数：
- `--market`：可选，`a|hk|us`，默认按代码格式自动识别
- `--ma`、`--macd`、`--boll`、`--kdj`、`--rsi`、`--wr`、`--bias`、`--cci`、`--atr`
- `--ma-periods`：如 `5,10,20,60`
- `--ma-type`：`sma|ema|wma`
- `--macd-short` / `--macd-long` / `--macd-signal`
- `--boll-period` / `--boll-stddev`
- `--kdj-period` / `--kdj-k` / `--kdj-d`
- `--rsi-periods` / `--wr-periods` / `--bias-periods`
- `--cci-period` / `--atr-period`

约束：
- `kline-indicators` 至少要显式选择一个指标
- 只有 `kline` 和 `kline-indicators` 支持 K 线公共参数 `--period`、`--adjust`、`--start`、`--end`
- 指标专属参数只允许在 `kline-indicators` 中出现

---

## 4) 技术实现骨架

### 项目结构（建议）

```txt
src/
  cli.ts            # shebang + 参数解析 + 调度
  sdk.ts            # 创建 StockSDK 实例（统一配置）
  commands/
    a.ts
    fund.ts
    hk.ts
    us.ts
    search.ts
    kline.ts
    kline-indicators.ts
  output/
    json.ts         # 统一 JSON 输出
```

### 参数解析建议
- MVP 直接手写解析（减少依赖）或用 `commander`（开发更快）
- 你当前想“最小化”，建议先手写轻解析，后续再换框架

### 错误处理
- 统一捕获 SDK 抛错
- 默认简洁报错；`--debug` 显示详细栈
- 退出码：
  - `0` 成功
  - `1` 业务/参数错误
  - `2` 网络/远端错误

---

## 5) 构建/封装方案

## 默认路线：Bun Direct（二进制）
- 输入：`src/cli.ts`
- 默认命令：`bun run build`
- 命令：`bun build src/cli.ts --compile --target=bun-darwin-arm64 --outfile dist/bin/stock-cli`
- 优点：链路短，构建快
- 观察点：产物大小、启动速度

## 备选路线：tsdown + Bun（二进制）
- 命令：`bun run build:tsdown`
- 产物：`dist/tsdown/stock-cli-tsdown`
- 定位：保留为兼容性验证、回退和构建链路对比
- 观察点：相对默认路线的体积/冷启动差异

> 说明：当前基准结果已经确认 `bun-direct` 为默认推荐路线；`tsdown --exe` 在 Node 25.8.0 环境下验证通过，可继续作为备选项。

---

## 6) 对比评测口径（MVP 必做）

同一台 M4，固定测试命令：
- `a sh600519`
- `search maotai`
- `kline a sh600519 --period monthly --start 20250101 --end 20250331`

记录以下指标：
1. 二进制文件大小（`ls -lh`）
2. 冷启动耗时（`time ./binary a sh600519`）
3. 热启动耗时（连续执行 3 次取均值）
4. 失败率（网络正常下 20 次调用）

输出一个 `BENCHMARK.md`，方便后续迭代。

---

## 7) 分阶段里程碑（半天到一天可完成）

### 里程碑 M1（功能通）
- 完成 `a/fund/hk/us/search/kline/kline-indicators`
- 本地 `bun run` 可执行
- JSON 输出为默认且唯一格式

### 里程碑 M2（双二进制）
- 产出 `stock-cli`、`stock-cli-tsdown`
- 默认发布 Bun 产物 `stock-cli`，并保留 `stock-cli-tsdown` 作为仅供本地手动编译的备选项

### 里程碑 M3（对比报告）
- 形成 `BENCHMARK.md`
- 固定默认推荐路线为 `bun-direct`，并记录保留 `tsdown` 的原因

---

## 8) MVP 验收标准（Done Definition）

- [ ] `./dist/bin/stock-cli a sh600519` 返回有效行情
- [ ] `./dist/bin/stock-cli fund 000001` 返回有效行情
- [ ] `./dist/bin/stock-cli hk 00700` 返回有效行情
- [ ] 默认构建命令 `bun run build` 产出 `./dist/bin/stock-cli`
- [ ] `./dist/tsdown/stock-cli-tsdown us AAPL` 返回有效行情
- [ ] `./dist/tsdown/stock-cli-tsdown fund 110011` 返回有效行情
- [ ] `search` 命令可用
- [ ] `kline` 命令可用
- [ ] `kline-indicators` 命令可用
- [ ] CLI 默认输出 JSON
- [ ] 有 `BENCHMARK.md` 对比数据
- [ ] README 有安装与使用说明

---

## 9) 下一步执行建议

按顺序推进就行：
1. 先把命令功能写通（不急着打包）
2. 默认走 Bun 路线产出主二进制
3. 保留 tsdown 路线作为备选产物
4. 最后统一做基准测试并固化默认结论

这个节奏最稳，也最符合 MVP。