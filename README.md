# stock-cli

`stock-sdk` 的最小 CLI 封装，当前提供七个命令：A 股行情、基金行情、港股行情、美股行情、股票搜索、历史 K 线，以及带技术指标的 K 线聚合查询。CLI 统一输出 JSON，后续新功能也遵循同一输出约定。

详细使用细则见 [docs/CLI_USAGE.md](docs/CLI_USAGE.md)。完整文档索引见 [docs/README.md](docs/README.md)。

## 安装依赖

```bash
bun install
```

## 运行源码

```bash
bun run src/cli.ts a sh600519 sz000858
bun run src/cli.ts fund 000001 110011
bun run src/cli.ts hk 00700 09988
bun run src/cli.ts us AAPL MSFT
bun run src/cli.ts search maotai
bun run src/cli.ts kline a sh600519 --period weekly --start 20240101 --end 20241231
bun run src/cli.ts kline-indicators sz000001 --start 20240101 --end 20241231 --ma --macd
```

## 命令

```bash
stock-cli a <codes...> [--timeout <ms>] [--rps <n>] [--debug]
stock-cli fund <codes...> [--timeout <ms>] [--rps <n>] [--debug]
stock-cli hk <codes...> [--timeout <ms>] [--rps <n>] [--debug]
stock-cli us <codes...> [--timeout <ms>] [--rps <n>] [--debug]
stock-cli search <keyword...> [--timeout <ms>] [--rps <n>] [--debug]
stock-cli kline <market> <symbol> [--period <daily|weekly|monthly>] [--adjust <qfq|hfq|none>] [--start <YYYYMMDD>] [--end <YYYYMMDD>] [--timeout <ms>] [--rps <n>] [--debug]
stock-cli kline-indicators <symbol> [--market <a|hk|us>] [--period <daily|weekly|monthly>] [--adjust <qfq|hfq|none>] [--start <YYYYMMDD>] [--end <YYYYMMDD>] [--ma] [--macd] [--boll] [--kdj] [--rsi] [--wr] [--bias] [--cci] [--atr] [--timeout <ms>] [--rps <n>] [--debug]
stock-cli help [command]
```

示例：

```bash
bun run src/cli.ts a sh600519
bun run src/cli.ts fund 000001
bun run src/cli.ts hk 700
bun run src/cli.ts us AAPL TSLA
bun run src/cli.ts search 腾讯
bun run src/cli.ts kline hk 00700 --period daily --adjust none
bun run src/cli.ts kline-indicators sh600519 --period weekly --ma --ma-periods 5,10,20,60 --rsi --rsi-periods 6,12
bun run src/cli.ts help kline
```

## 构建二进制

默认使用 Bun 打包。当前基准结果见 [docs/BENCHMARK.md](docs/BENCHMARK.md)：在本机测试中，Bun 产物更小、启动更快，因此作为项目默认方案保留；`tsdown` 继续保留为备选构建路径，用于兼容性对比和回退。

### 默认方案：Bun 二进制

```bash
bun run build
bun run build:bun
bun run build:bun:macos-arm64
bun run build:bun:windows-x64
./dist/bin/stock-cli a sh600519
./dist/bin/stock-cli fund 000001
./dist/bin/stock-cli hk 00700
./dist/bin/stock-cli us AAPL
./dist/bin/stock-cli search maotai
./dist/bin/stock-cli kline a sh600519 --period monthly
./dist/bin/stock-cli kline-indicators sz000001 --ma --macd --start 20240101 --end 20241231
```

发布构建默认覆盖两个平台：

- macOS Apple Silicon：`stock-cli-<version>-darwin-arm64`
- Windows x64：`stock-cli-<version>-windows-x64.exe`

其中 Windows 版本内部使用 Bun 的 `bun-windows-x64-baseline` 目标，以兼顾更广泛的 x64 CPU 兼容性。
本地默认 Bun 打包产物固定命名为 `stock-cli`，不会附加 `-bun` 之类的后缀。

### 备选方案：tsdown 二进制

仅在需要保留备用构建链路或排查 Bun 打包问题时使用。要求 Node.js >= 25.7.0。它不进入 CI/CD，也不会进入 GitHub Release，仅供拉取源码后在本地手动编译。

```bash
bun run build:tsdown
./dist/tsdown/stock-cli-tsdown a sz000858
./dist/tsdown/stock-cli-tsdown fund 110011
./dist/tsdown/stock-cli-tsdown hk 00700
./dist/tsdown/stock-cli-tsdown us AAPL
./dist/tsdown/stock-cli-tsdown search 00700
./dist/tsdown/stock-cli-tsdown kline us 105.AAPL --period weekly --adjust qfq
./dist/tsdown/stock-cli-tsdown kline-indicators 105.MSFT --market us --boll --rsi
```

## 说明

- A 股代码需带交易所前缀，例如 `sh600519`、`sz000858`、`bj430047`
- 基金代码为 6 位数字，例如 `000001`、`110011`
- 港股代码会自动补齐到 5 位，例如 `700` 会被转换成 `00700`
- 美股代码会自动转换为大写，例如 `aapl` 会被转换成 `AAPL`
- K 线命令的 `market` 取值为 `a` / `hk` / `us`
- `kline-indicators` 默认按代码格式自动识别市场，也支持 `--market a|hk|us` 强制指定
- A 股 K 线支持 `000001` 或带前缀形式；港股 K 线会自动补齐 5 位；美股 K 线需使用 `105.AAPL`、`106.BABA` 这类带市场代码格式
- `kline-indicators` 是聚合型命令，返回“带指标的 K 线”；后续独立 MA、MACD 等命令会与它分开设计
- `--adjust none` 会转换为 SDK 的不复权参数 `''`
- 场内 ETF 更适合使用 `a` 命令查询，`fund` 命令面向公募基金净值
- 搜索命令直接透传关键字给 `stock-sdk.search`，支持代码、名称和拼音缩写
- `help` 支持总览和命令级帮助，例如 `stock-cli help`、`stock-cli help us`、`stock-cli kline --help`
- 所有命令统一输出 JSON，适合脚本集成和后续功能扩展
- 默认打包命令是 `bun run build`，等价于 `bun run build:bun`
- 默认 Bun 本地产物命名为 `dist/bin/stock-cli`，Windows 本地产物命名为 `dist/bin/stock-cli.exe`
- `bun run build:tsdown` 保留为备选构建路径，不进入默认发布流程，也不进入 CI/CD

## CI/CD

仓库已经补齐 GitHub Actions 所需文件：

- `CI`：在 Pull Request 和推送时执行类型检查、Bun 二进制构建和离线冒烟校验
- `Release`：在推送到 `main` 时基于 conventional commits 自动计算版本、生成 `CHANGELOG.md`、创建 GitHub Release，并上传 macOS Apple Silicon 与 Windows x64 的 Bun 编译产物和 SHA256 校验文件
- `tsdown`：只保留为源码级备用构建，不参与 CI、CD 和 Release 上传

详细说明见 [docs/CI_CD.md](docs/CI_CD.md)。