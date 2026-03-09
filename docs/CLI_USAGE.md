# stock-cli 使用说明

本文档详细说明当前 `stock-cli` 已实现功能的使用细则、必填参数、可选参数、输入格式约束和帮助命令用法。

## 总览

当前支持的命令：

- `a`：获取 A 股或指数行情
- `fund`：获取公募基金净值行情
- `hk`：获取港股行情
- `us`：获取美股行情
- `search`：搜索股票代码、名称或拼音
- `kline`：获取历史 K 线
- `kline-indicators`：获取带技术指标的 K 线
- `help`：查看总览帮助或单个命令帮助

统一约定：

- 所有命令输出统一为 JSON
- 全局可选参数为 `--timeout`、`--rps`、`--debug`
- 全局帮助可通过 `stock-cli help` 或 `stock-cli --help` 查看
- 单个命令帮助可通过 `stock-cli help <command>` 或 `stock-cli <command> --help` 查看
- `kline` 与 `kline-indicators` 都属于 K 线数据命令，但职责不同：前者只返回原始 K 线，后者返回附带技术指标字段的 K 线
- 后续如果扩展独立指标命令，语义会与 `kline-indicators` 区分开：独立指标命令只负责单指标结果，`kline-indicators` 负责“一次请求同时取 K 线和多个指标”

## 全局参数

`--timeout <ms>`

- 含义：请求超时时间，单位毫秒
- 是否必填：否
- 默认值：`10000`
- 示例：`--timeout 15000`

`--rps <n>`

- 含义：每秒请求速率限制
- 是否必填：否
- 默认值：`4`
- 示例：`--rps 2`

`--debug`

- 含义：输出详细错误栈
- 是否必填：否
- 示例：`--debug`

## a 命令

用途：获取 A 股或指数简要行情。

用法：

```bash
stock-cli a <codes...> [--timeout <ms>] [--rps <n>] [--debug]
```

必填参数：

- `<codes...>`：一个或多个代码

代码格式要求：

- 必须包含交易所前缀
- 支持 `sh`、`sz`、`bj`
- 典型示例：`sh600519`、`sz000858`、`bj430047`
- 指数也可使用：`sh000001`、`sz399001`

示例：

```bash
stock-cli a sh600519
stock-cli a sh000001 sz399001
```

输出：`SimpleQuote[]`

## fund 命令

用途：获取公募基金净值行情。

用法：

```bash
stock-cli fund <codes...> [--timeout <ms>] [--rps <n>] [--debug]
```

必填参数：

- `<codes...>`：一个或多个基金代码

代码格式要求：

- 必须是 6 位数字
- 示例：`000001`、`110011`、`161005`

示例：

```bash
stock-cli fund 000001
stock-cli fund 000001 110011
```

输出：`FundQuote[]`

注意：

- `fund` 面向公募基金净值
- 场内 ETF 更适合使用 `a` 命令查询

## hk 命令

用途：获取港股行情。

用法：

```bash
stock-cli hk <codes...> [--timeout <ms>] [--rps <n>] [--debug]
```

必填参数：

- `<codes...>`：一个或多个港股代码

代码格式要求：

- 接受 1 到 5 位数字
- CLI 会自动补齐到 5 位
- 示例：`700` 会转换为 `00700`，`9988` 会转换为 `09988`

示例：

```bash
stock-cli hk 700
stock-cli hk 00700 09988
```

输出：`HKQuote[]`

## us 命令

用途：获取美股行情。

用法：

```bash
stock-cli us <codes...> [--timeout <ms>] [--rps <n>] [--debug]
```

必填参数：

- `<codes...>`：一个或多个美股代码

代码格式要求：

- 输入为股票代码本身
- CLI 会自动转换为大写
- 示例：`AAPL`、`MSFT`、`BRK.B`

示例：

```bash
stock-cli us AAPL
stock-cli us AAPL MSFT TSLA
```

输出：`USQuote[]`

注意：

- 响应中的 `code` 字段可能带市场后缀，如 `AAPL.OQ`

## search 命令

用途：搜索股票代码、名称或拼音。

用法：

```bash
stock-cli search <keyword...> [--timeout <ms>] [--rps <n>] [--debug]
```

必填参数：

- `<keyword...>`：一个或多个关键词片段

参数规则：

- CLI 会把所有关键词片段用空格拼接成一个完整搜索词
- 支持代码、中文名称、拼音缩写

示例：

```bash
stock-cli search maotai
stock-cli search 腾讯
stock-cli search 贵州 茅台
stock-cli search 00700
```

输出：`SearchResult[]`

## kline 命令

用途：获取 A 股、港股或美股的历史 K 线。

用法：

```bash
stock-cli kline <market> <symbol> [--period <daily|weekly|monthly>] [--adjust <qfq|hfq|none>] [--start <YYYYMMDD>] [--end <YYYYMMDD>] [--timeout <ms>] [--rps <n>] [--debug]
```

必填参数：

- `<market>`：市场类型，必须是 `a`、`hk`、`us` 之一
- `<symbol>`：代码，格式取决于市场

市场和代码格式：

- `a`：支持 `000001` 或带前缀形式 `sz000001`、`sh600519`、`bj430047`
- `hk`：支持 `700`、`00700`、`09988`，CLI 会自动补齐为 5 位
- `us`：必须带市场代码前缀，如 `105.AAPL`、`105.MSFT`、`106.BABA`

可选参数：

- `--period`：`daily`、`weekly`、`monthly`
- `--adjust`：`qfq`、`hfq`、`none`
- `--start`：开始日期，格式 `YYYYMMDD`
- `--end`：结束日期，格式 `YYYYMMDD`

参数说明：

- `--adjust none` 会转换为 SDK 的不复权模式
- 如果同时提供 `--start` 和 `--end`，则 `--start` 不能晚于 `--end`
- `kline` 命令必须且只能有两个位置参数：`<market> <symbol>`

示例：

```bash
stock-cli kline a sh600519 --period weekly --adjust qfq --start 20240101 --end 20241231
stock-cli kline hk 700 --period monthly --adjust none
stock-cli kline us 105.AAPL --period monthly
```

输出：

- A 股返回 `HistoryKline[]`
- 港股和美股返回 `HKUSHistoryKline[]`

## kline-indicators 命令

用途：获取带技术指标字段的历史 K 线。

这个命令对应 SDK 的聚合型接口 `getKlineWithIndicators`，适合一次性拉取 K 线并计算多个指标。

用法：

```bash
stock-cli kline-indicators <symbol> [--market <a|hk|us>] [--period <daily|weekly|monthly>] [--adjust <qfq|hfq|none>] [--start <YYYYMMDD>] [--end <YYYYMMDD>] [--ma] [--ma-periods <p1,p2,...>] [--ma-type <sma|ema|wma>] [--macd] [--macd-short <n>] [--macd-long <n>] [--macd-signal <n>] [--boll] [--boll-period <n>] [--boll-stddev <n>] [--kdj] [--kdj-period <n>] [--kdj-k <n>] [--kdj-d <n>] [--rsi] [--rsi-periods <p1,p2,...>] [--wr] [--wr-periods <p1,p2,...>] [--bias] [--bias-periods <p1,p2,...>] [--cci] [--cci-period <n>] [--atr] [--atr-period <n>] [--timeout <ms>] [--rps <n>] [--debug]
```

必填参数：

- `<symbol>`：股票代码

代码格式：

- A 股：`000001`、`sz000001`、`sh600519`、`bj430047`
- 港股：`00700`、`09988`
- 美股：`105.AAPL`、`106.BABA`

市场识别：

- 默认按代码格式自动识别市场
- 也可以用 `--market a|hk|us` 显式指定

指标选择规则：

- 至少要显式开启一个指标
- 只写 `--ma`、`--macd` 这类开关时，使用 SDK 默认参数
- 如果同时给了指标开关和指标参数，则按自定义参数计算

可选指标：

- `--ma`
- `--macd`
- `--boll`
- `--kdj`
- `--rsi`
- `--wr`
- `--bias`
- `--cci`
- `--atr`

指标参数：

- `--ma-periods`：逗号分隔整数列表，例如 `5,10,20,60`
- `--ma-type`：`sma`、`ema`、`wma`
- `--macd-short`、`--macd-long`、`--macd-signal`
- `--boll-period`、`--boll-stddev`
- `--kdj-period`、`--kdj-k`、`--kdj-d`
- `--rsi-periods`、`--wr-periods`、`--bias-periods`
- `--cci-period`、`--atr-period`

日期与 K 线参数：

- `--period`：`daily`、`weekly`、`monthly`
- `--adjust`：`qfq`、`hfq`、`none`
- `--start`：开始日期，格式 `YYYYMMDD`
- `--end`：结束日期，格式 `YYYYMMDD`

示例：

```bash
stock-cli kline-indicators sz000001 --start 20240101 --end 20241231 --ma --macd
stock-cli kline-indicators sh600519 --period weekly --ma --ma-periods 5,10,20,60 --ma-type ema --rsi --rsi-periods 6,12
stock-cli kline-indicators 00700 --boll --boll-period 20 --boll-stddev 2 --kdj
stock-cli kline-indicators 105.MSFT --market us --macd --macd-short 12 --macd-long 26 --macd-signal 9 --atr --atr-period 14
```

输出：

- 返回带指标字段的 K 线数组
- 每条 K 线除基础 OHLCV 字段外，还会按所选指标附加 `ma`、`macd`、`boll`、`kdj`、`rsi`、`wr`、`bias`、`cci`、`atr` 等字段

说明：

- SDK 会自动向前补拉足够历史数据用于计算指标，再裁剪到你指定的日期范围
- 该命令是“聚合查询”命令，不等同于未来单独的 `ma`、`macd` 等指标命令
- 如果你只需要原始 K 线，请使用 `kline`

## help 命令

用途：查看帮助信息。

用法：

```bash
stock-cli help
stock-cli help <command>
stock-cli <command> --help
```

示例：

```bash
stock-cli help
stock-cli help us
stock-cli help kline
stock-cli help kline-indicators
stock-cli fund --help
```

说明：

- `stock-cli help` 输出总览帮助
- `stock-cli help <command>` 输出指定命令的详细帮助
- `stock-cli <command> --help` 与上一种效果一致

## 常见错误

`Unknown command`

- 原因：命令名不在当前支持列表中
- 处理：先运行 `stock-cli help` 查看支持的命令

`Missing codes for ...`

- 原因：行情命令没有传代码
- 处理：补上至少一个代码

`Missing keyword for search`

- 原因：`search` 没有传关键词
- 处理：传入名称、代码或拼音缩写

`Kline command expects exactly 2 operands`

- 原因：`kline` 的 `<market>` 或 `<symbol>` 缺失，或者多传了位置参数
- 处理：确保格式是 `stock-cli kline <market> <symbol>`

`Invalid ... code`

- 原因：代码格式不符合命令要求
- 处理：按对应命令的代码格式重新输入

## 二进制使用

默认使用 Bun 构建二进制：

```bash
bun run build
bun run build:bun
./dist/bin/stock-cli help
```

说明：`bun run build` 是项目默认打包命令，等价于 `bun run build:bun`。

备选构建路径为 tsdown：

```bash
bun run build:tsdown
./dist/tsdown/stock-cli-tsdown help kline
```

说明：`tsdown` 产物保留为备选项，用于兼容性对比和回退，不作为默认发布方案。两种产物的命令用法与源码运行方式一致。