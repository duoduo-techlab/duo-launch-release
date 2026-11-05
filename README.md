# duo-launch-release

Duo Launch（长城哈弗 B16 车机第三方桌面）的**发布仓库** —— 只有两件事：

1. **放发布产物**：APK 走 GitHub Releases，不进 git 历史；
2. **放介绍页**：`index.html` 由 GitHub Pages 托管，页面上的版本号 / 体积 / SHA256 / 版本列表
   全部读 `data/releases.json`，不在 HTML 里手写。

主线开发仓库是私有的，**不会**在这里公开。所以这里不接受 PR，也没有源码。

| | |
|---|---|
| 站点 | `https://<owner>.github.io/duo-launch-release/` |
| 最新直链 | `https://github.com/<owner>/duo-launch-release/releases/latest/download/duo-launcher.apk` |
| App 更新清单 | `https://<owner>.github.io/duo-launch-release/data/update.json` |
| 版本列表 | `https://<owner>.github.io/duo-launch-release/data/releases.json` |

> 页面里所有链接都是**相对路径**，所以换成自定义域名、或把仓库改名为
> `<owner>.github.io` 都不需要改 HTML。

## 目录

```text
.
├── index.html            # 落地页（单页，无构建步骤）
├── 404.html              # 回首页
├── .nojekyll             # 关掉 Jekyll：assets/ 下的文件要原样发布
├── assets/
│   ├── style.css         # 颜色取自主线仓库的 theme/dark token
│   ├── app.js            # 读 data/releases.json 渲染版本信息（零依赖）
│   ├── icon.svg          # 品牌图标（与 APK 的自适应图标同一条 path）
│   └── shots/            # 可选真机截图：放 dashboard.png 页面自动出现
└── data/
    ├── releases.json     # 全部版本（页面用，versionCode 倒序）
    └── update.json       # 最新一条（App「检查更新」用，与七牛那套字段一致）
```

`data/*.json` 由主线仓库的 `tools/release/publish-pages.sh` **自动重写**，
手改会在下次发版时被覆盖。

## 发版

在私有仓库里：

```bash
bash app/build.sh                                  # → dist/duo-launcher.apk
bash tools/release/publish-pages.sh                # 上传 Release + 提交 data/*.json
DRY_RUN=1 bash tools/release/publish-pages.sh      # 只看生成的 JSON，不联网
```

CI 里是 `.github/workflows/build.yml` 打 tag 之后的最后一步，需要目标仓库的
`contents:write`：

- secret `RELEASE_REPO_TOKEN`：fine-grained PAT（只授权 `duo-launch-release` 的 Contents: R/W）
- variable `RELEASE_REPO`：可选，默认 `cary-hu/duo-launch-release`

没配 token 时那一步只打 `::warning::` 跳过，不影响七牛那条链路。

## 一次性设置（GitHub Pages）

1. 仓库 → Settings → Pages → Source 选 **Deploy from a branch**，分支 `main`、目录 `/ (root)`；
2. 等第一次 deploy 完，`https://<owner>.github.io/duo-launch-release/` 就能打开；
3. 站点打开是空态（「待发布」）说明还没有发过版 —— 跑一次上面的 publish 脚本就有内容。

**关于域名**：GitHub Pages 的地址永远是 `https://<账号>.github.io/<仓库>/`。
`https://duo-launch-release.github.io` 这种写法要求账号（或 org）本身叫 `duo-launch-release`，
并且仓库名为 `duo-launch-release.github.io`。要走那条路，把本仓库改名、把
`index.html` 顶到 `main` 根目录即可，页面不用改。

## 更新源说明

`data/update.json` 的字段与七牛上的 `update.json` 完全一致（`versionName` / `versionCode` /
`url` / `sha256` / `publishedAt` / `notes`，多出来的 `size` / `page` / `tag` App 会忽略），
所以把 App 的更新源从七牛切到 Pages 只需要编译时换一个地址，不动代码：

```bash
UPDATE_MANIFEST_URL=https://<owner>.github.io/duo-launch-release/data/update.json bash app/build.sh
```

差别只有一个：GitHub Pages 走 Fastly，缓存约 10 分钟、没有主动刷新接口（七牛可以调
`/v2/tune/refresh` 立刻刷）。App 拉清单自带 `?t=<时间戳>` 破本地缓存，所以实际要等的是
CDN 那一层。追新很急的话，继续用七牛；只要「有个稳定的版本清单」就够，Pages 更省事。

## 免责声明

第三方个人作品，与长城汽车 / 哈弗无关，未获官方授权或背书。侧载安装与替换桌面属自行改动，
风险自负。
