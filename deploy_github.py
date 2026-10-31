# -*- coding: utf-8 -*-
"""
deploy_github.py
----------------
把天津版静态网站发布到 GitHub Pages，不需要安装 git。

用法（在 天津版 文件夹内）：
    python deploy_github.py
    python deploy_github.py --repo tianjin-elderly-viz

首次运行会提示输入 GitHub Token（输入时不显示）。推荐使用 classic token，
勾选 repo 权限；fine-grained token 需要 Contents / Pages / Administration 权限。
Token 只用于本次请求，不会写入文件。

说明：
  - 通过 api.github.com 创建仓库、上传文件、开启 Pages；
  - 不使用 git / GitHub Actions；
  - 上传的是当前文件夹的网站文件（index.html、css、js、data/app_data.js、vendor、assets）。
"""

import argparse
import base64
import getpass
import os
import sys
import time
from pathlib import Path

import requests

API = "https://api.github.com"
SITE = Path(__file__).resolve().parent
HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}


def die(msg: str, code: int = 1):
    print(f"\n[失败] {msg}")
    sys.exit(code)


def api(method: str, url: str, token: str, **kwargs):
    headers = dict(HEADERS)
    headers["Authorization"] = f"Bearer {token}"
    r = requests.request(method, url, headers=headers, timeout=60, **kwargs)
    return r


def get_token() -> str:
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token:
        print("[信息] 使用环境变量里的 GITHUB_TOKEN / GH_TOKEN")
        return token.strip()

    token_file = SITE / "token.txt"
    if token_file.exists():
        token = token_file.read_text(encoding="utf-8", errors="ignore").strip()
        if token and not token.startswith("在这里"):
            print("[信息] 使用 token.txt 里的 Token（不会上传这个文件）")
            return token

    print("请输入 GitHub Token（输入不显示；classic token 勾选 repo 权限）：")
    print("如果终端粘贴不了，可以把 Token 粘贴到 天津版/token.txt 后重新运行。")
    token = getpass.getpass("Token: ").strip()
    if not token:
        die("没有输入 Token。")
    return token


def site_files():
    files = [SITE / "index.html", SITE / "404.html", SITE / ".nojekyll", SITE / "部署说明.txt"]
    for d in ["assets", "css", "js", "vendor"]:
        files.extend(sorted((SITE / d).rglob("*")))
    files.append(SITE / "data" / "app_data.js")
    files.append(SITE / "data" / "tianjin_geo.js")
    files.append(SITE / "data" / "policy_data.js")
    return [p for p in files if p.is_file()]


def upload_file(token: str, owner: str, repo: str, path: Path, branch: str) -> None:
    rel = path.relative_to(SITE).as_posix()
    raw = path.read_bytes()
    if rel == ".nojekyll" and not raw:
        raw = b"\n"
    content = base64.b64encode(raw).decode("ascii")
    url = f"{API}/repos/{owner}/{repo}/contents/{requests.utils.quote(rel)}"
    existing = api("GET", url, token, params={"ref": branch})
    sha = existing.json().get("sha") if existing.status_code == 200 else None
    body = {
        "message": f"deploy: {rel}",
        "content": content,
        "branch": branch,
    }
    if sha:
        body["sha"] = sha
    r = api("PUT", url, token, json=body)
    if r.status_code not in (200, 201):
        die(f"上传 {rel} 失败：HTTP {r.status_code}\n{r.text[:800]}")
    print(f"  [上传] {rel} ({len(content) * 3 // 4:,} bytes)")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default="tianjin-elderly-viz", help="GitHub 仓库名")
    parser.add_argument("--private", action="store_true", help="创建私有仓库（Pages 需要付费计划）")
    args = parser.parse_args()
    repo = args.repo.strip()
    if not repo:
        die("仓库名不能为空。")

    token = get_token()

    # 1. 验证 token
    me = api("GET", f"{API}/user", token)
    if me.status_code != 200:
        die(f"Token 无效或无法访问 GitHub API：HTTP {me.status_code}\n{me.text[:500]}")
    login = me.json()["login"]
    scopes = me.headers.get("X-OAuth-Scopes", "")
    print(f"[信息] 已登录：{login}" + (f"（scopes: {scopes}）" if scopes else ""))

    # 2. 创建或读取仓库
    repo_url = f"{API}/repos/{login}/{repo}"
    r = api("GET", repo_url, token)
    if r.status_code == 404:
        print(f"[信息] 创建仓库 {login}/{repo} ...")
        r = api("POST", f"{API}/user/repos", token, json={
            "name": repo,
            "description": "天津 16 区社区养老数据可视化（静态网站）",
            "private": bool(args.private),
            "auto_init": True,
            "has_issues": True,
            "has_wiki": False,
        })
        if r.status_code != 201:
            die(f"创建仓库失败：HTTP {r.status_code}\n{r.text[:800]}")
        # 等初始 commit 就绪
        for _ in range(10):
            time.sleep(1)
            if api("GET", repo_url, token).status_code == 200:
                break
    elif r.status_code != 200:
        die(f"读取仓库失败：HTTP {r.status_code}\n{r.text[:800]}")
    else:
        print(f"[信息] 使用已有仓库 {login}/{repo}")

    repo_info = api("GET", repo_url, token)
    branch = repo_info.json().get("default_branch", "main")
    print(f"[信息] 默认分支：{branch}")

    # 3. 上传网站文件
    files = site_files()
    print(f"[信息] 上传 {len(files)} 个网站文件 ...")
    for p in files:
        upload_file(token, login, repo, p, branch)

    # 4. 开启 / 更新 Pages
    pages_url = f"{API}/repos/{login}/{repo}/pages"
    pages = api("GET", pages_url, token)
    body = {"source": {"branch": branch, "path": "/"}}
    if pages.status_code == 404:
        r = api("POST", pages_url, token, json=body)
        if r.status_code == 409:
            r = api("PUT", pages_url, token, json=body)
        if r.status_code not in (200, 201, 204):
            die(f"开启 Pages 失败：HTTP {r.status_code}\n{r.text[:800]}")
        print("[信息] 已开启 GitHub Pages")
    else:
        r = api("PUT", pages_url, token, json=body)
        if r.status_code not in (200, 204):
            die(f"更新 Pages 失败：HTTP {r.status_code}\n{r.text[:800]}")
        print("[信息] 已更新 GitHub Pages 设置")

    # 5. 等构建
    url = f"https://{login}.github.io/{repo}/"
    if repo.lower() == f"{login.lower()}.github.io":
        url = f"https://{login}.github.io/"
    print("\n[完成] 已推送。GitHub Pages 通常需要 1—3 分钟构建。")
    print(f"网站地址：{url}")
    print("如果 404，等 2 分钟再刷新；或在仓库 Settings -> Pages 查看构建状态。")
    print(f"仓库地址：https://github.com/{login}/{repo}（当前网络可能打不开 github.com，但 Pages 地址通常可访问）")


if __name__ == "__main__":
    main()
