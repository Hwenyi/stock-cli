# CI/CD 说明

本仓库已经补齐了面向 GitHub 的基础持续集成和持续交付文件，默认以 Bun 作为二进制打包方案。

命名约束：

- 默认 Bun 本地打包产物统一命名为 `stock-cli`
- Windows x64 本地打包产物统一命名为 `stock-cli.exe`
- 只有备选方案 `tsdown` 产物保留 `-tsdown` 后缀
- `tsdown` 不进入 CI/CD，也不会作为 Release 资产上传

## 流水线组成

### CI

工作流文件：`.github/workflows/ci.yml`

触发条件：

- Pull Request
- 推送到 `main`

执行内容：

- `bun install --frozen-lockfile`
- `bun run check`
- `bun run build`
- `bun run verify:offline`
- `bun run build:release`

其中 `verify:offline` 会校验：

- `help` 输出可用
- A 股代码校验逻辑可用
- `kline-indicators` 缺少指标时能正确报错

### CD

工作流文件：`.github/workflows/release.yml`

触发条件：

- 推送到 `main`
- 手动触发 `workflow_dispatch`

执行内容：

- 再次执行类型检查和 Bun 默认构建
- 构建多平台发布资产
- 运行 `semantic-release`
- 基于提交历史自动计算版本号
- 回写 `package.json` 与 `CHANGELOG.md`
- 创建 GitHub Release
- 上传 `dist/releases/` 下的 Bun 二进制和 SHA256 校验文件

## 发布约定

自动发布依赖 conventional commits。推荐至少使用以下前缀：

- `feat:`：发布 minor 版本
- `fix:`：发布 patch 版本
- `perf:`：发布 patch 版本
- `docs:`、`refactor:`、`test:`、`ci:`、`build:`、`chore:`：当前也会触发 patch 版本，方便你在主干持续交付

破坏性变更请在提交信息中加入：

- `BREAKING CHANGE:`

示例：

```text
feat: add hk kline indicator filters
fix: normalize us tickers before sdk request
docs: update release instructions
```

## Release 产物

默认发布脚本为：`bun run build:release`

说明：Release 文件名包含版本号和目标平台，用于区分分发平台；这不属于构建方案后缀。

当前默认产物：

- `stock-cli_v<version>_darwin-arm64`
- `stock-cli_v<version>_darwin-arm64.sha256`
- `stock-cli_v<version>_windows-amd64.exe`
- `stock-cli_v<version>_windows-amd64.exe.sha256`
- `stock-cli_v<version>_manifest.json`

说明：

- macOS 产物面向 Apple Silicon，也就是 M 系列芯片
- Windows 产物当前使用 Bun 的 `bun-windows-x64-baseline` 目标生成，以兼顾更常见的 x64 机器兼容性；对外发布命名使用 `windows-amd64`
- 如果后续需要覆盖 Intel Mac 或 Linux，可继续在 `scripts/build-release.ts` 中追加目标
- `tsdown` 仅作为开发者在本地拉源码后的备用编译链路，不参与 GitHub Actions 和自动发布

## 仓库接入步骤

如果本地还没有 Git 仓库，可先执行：

```bash
git init
git branch -M main
git add .
git commit -m "chore: bootstrap stock-cli"
git remote add origin <your-github-repo-url>
git push -u origin main
```

GitHub 仓库侧建议确认以下设置：

1. 默认分支为 `main`
2. `Settings > Actions > General > Workflow permissions` 选择 `Read and write permissions`
3. 如果使用受保护分支，允许 GitHub Actions 推送 release commit

## 本地自检

推送前建议至少执行：

```bash
bun install
bun run check
bun run build
bun run verify:offline
bun run build:release
bun run release:dry-run
```