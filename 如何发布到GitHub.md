# 一键发布到 GitHub Pages

> 不需要安装 git。脚本通过 GitHub API 创建仓库、上传网站、开启 Pages。

## 第 1 步：生成 Token

在浏览器打开：

https://github.com/settings/tokens/new?scopes=repo&description=tianjin-elderly-viz

- 选择 **Personal access tokens (classic)**；
- 勾选 **repo**（完整仓库权限）；
- 生成后复制 `ghp_...` 开头的 Token。

> 如果这个网络打不开 github.com，可以在手机/其他网络生成，再回来粘贴。
> Token 只在本次运行中使用，不会写入文件。

## 第 2 步：双击运行

双击本文件夹的 **`发布到GitHub.bat`**。

按提示粘贴 Token（输入时不显示），仓库名默认 `tianjin-elderly-viz`，直接回车即可。

### 如果终端里粘贴不了

这是 Windows 命令行/`getpass` 不接受粘贴的常见问题。改用 Token 文件：

1. 双击 **`打开Token文件.bat`**，会用记事本打开 `token.txt`；
2. 在记事本里 `Ctrl + V` 粘贴 Token，保存并关闭；
3. 双击 **`发布到GitHub.bat`**，脚本会自动读取 `token.txt`，不再要求输入；
4. 发布完成后可以删除 `token.txt`。

> `token.txt` 只在本机读取，不会上传到 GitHub，也不会打进 `github-pages.zip`。
> 不要把 Token 发到聊天/群里；如果已经发过，立刻去 GitHub 删除并重新生成。

脚本会：

1. 验证 Token；
2. 创建公开仓库（或使用同名仓库）；
3. 上传 `index.html`、`css/`、`js/`、`data/app_data.js`、`vendor/`、`assets/`、`.nojekyll`；
4. 开启 GitHub Pages（main 分支 / 根目录）；
5. 输出网站地址。

## 第 3 步：等 1—3 分钟

网站地址格式：

```
https://你的用户名.github.io/tianjin-elderly-viz/
```

如果 404：

- 等 2 分钟再刷新；
- 打开仓库 `Settings -> Pages`，确认 Source 是 `Deploy from a branch`、分支 `main`、目录 `/ (root)`；
- 确认仓库根目录直接能看到 `index.html`，没有多套一层文件夹。

## 自定义仓库名

```bash
python deploy_github.py --repo 我的仓库名
```

## 失败时

- `HTTP 401`：Token 无效或过期；
- `HTTP 403`：Token 没有 `repo` 权限，或 fine-grained token 缺少 Contents / Pages / Administration 权限；
- `HTTP 404`：仓库名冲突或权限不足；
- 上传中途失败：重新运行即可，脚本会自动覆盖已存在的文件。

## 不想用脚本？

也可以手动上传：

1. 解压 `github-pages.zip`；
2. 在 GitHub 新建 Public 仓库；
3. Add file → Upload files，把解压后的所有文件拖进去（包含 `.nojekyll`）；
4. Commit；
5. Settings → Pages → Deploy from a branch → main → `/ (root)` → Save。
