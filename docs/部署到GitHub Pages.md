# 部署到 GitHub Pages（天津版）

## 最快方式：一键脚本

不需要安装 git。准备一个带 `repo` 权限的 GitHub Token，双击 `发布到GitHub.bat`，按提示粘贴即可。脚本会自动创建仓库、上传文件、开启 Pages，并输出网址。详细说明见 `如何发布到GitHub.md`。

下面的手动上传步骤作为备用。

## 一、准备

天津版文件夹已经生成 **`github-pages.zip`**，里面是天津版网站根目录的全部文件（不是整个项目）。

先解压到一个空文件夹，确认里面直接能看到：

```
index.html
css/
js/
data/
vendor/
assets/
.nojekyll
部署说明.txt
```

> 关键：`index.html` 必须在最外层，不能在它外面再套一层 `天津版/`。

## 二、创建仓库

1. 打开 GitHub，右上角 **+ → New repository**；
2. 仓库名建议：`elderly-care-viz`；
3. 选择 **Public**（免费 Pages 需要公开仓库）；
4. 不要勾选 README / .gitignore，直接 **Create repository**。

## 三、上传文件

1. 在新仓库页面点 **Add file → Upload files**；
2. 把解压后文件夹里的**所有内容**拖进去（`index.html`、`css`、`js`、`data`、`vendor`、`assets`、`.nojekyll`、`部署说明.txt`）；
3. 等文件全部上传完（`data/app_data.js` 约 2MB，需要几十秒）；
4. 下方 Commit message 随意，比如 `add elderly care dashboard`；
5. 点 **Commit changes**。

> 如果拖拽文件夹不生效，就在本地打开文件夹，全选里面的文件/文件夹再拖；仍然不行就逐个上传，保持目录结构。

## 四、开启 Pages

1. 进入仓库 **Settings → Pages**；
2. **Build and deployment → Source** 选 **Deploy from a branch**；
3. Branch 选 **main**，文件夹选 **/ (root)**；
4. 点 **Save**；
5. 等 1–3 分钟，页面顶部会出现：

```
https://你的用户名.github.io/elderly-care-viz/
```

打开这个地址即可，任何浏览器都能访问。

## 五、检查

- 首页四个数字是否显示：16、300.27、2,015、1,342；
- 四个图表标签是否可切换；
- 设施账单排序/搜索是否正常；
- 底部“资源优先级实验室”拖动滑块，排名是否变化；
- 如果 404：确认仓库根目录有 `index.html`，Pages 分支是 `main`、目录是 `/ (root)`，再等 2 分钟；
- 如果页面样式没更新：`Ctrl + F5` 强刷；
- 如果图表空白：打开 F12 Console，确认 `data/app_data.js` 和 `vendor/echarts.min.js` 返回 200。

## 六、之后的临时地址

GitHub Pages 地址固定后，Cloudflare 临时地址就可以停掉，不需要电脑一直开机。

如果以后修改了数据或页面，重新生成：

```bash
python src/06_tianjin_analysis.py
python src/07_build_web_tj.py
```

然后把天津版网站根目录里变化的文件重新上传，或在 GitHub 网页上直接替换文件即可。
