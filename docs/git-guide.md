# Git 使用手册

> 版本：v1.0 | 适用对象：全体开发团队成员

---

## 目录

- [1. Git 基础概念与环境配置](#1-git-基础概念与环境配置)
- [2. 提交全流程详解](#2-提交全流程详解)
- [3. 分支管理策略](#3-分支管理策略)
- [4. 团队协作方案](#4-团队协作方案)
- [5. 高级功能与最佳实践](#5-高级功能与最佳实践)
- [6. 附录](#6-附录)

---

## 1. Git 基础概念与环境配置

### 1.1 版本控制系统原理及 Git 优势

#### 什么是版本控制

版本控制系统（VCS）是记录文件内容变化，以便将来查阅特定版本修订情况的系统。核心能力：

- 记录文件的每一次变更历史
- 支持回退到任意历史版本
- 支持多人并行开发与变更合并
- 对比不同版本之间的差异

#### 版本控制系统的演进

```
本地版本控制 (RCS)
    ↓
集中式版本控制 (CVCS) —— SVN、Perforce
    ↓
分布式版本控制 (DVCS) —— Git、Mercurial
```

#### Git 的核心优势

| 优势 | 说明 |
|------|------|
| **分布式架构** | 每个开发者拥有完整的仓库副本，离线也能工作 |
| **高性能** | 几乎所有操作都在本地完成，速度极快 |
| **数据完整性** | 使用 SHA-1 哈希校验，确保数据不被篡改 |
| **强大的分支管理** | 创建和切换分支几乎零开销 |
| **暂存区设计** | 精细控制每次提交的内容 |
| **开源生态** | 与 GitHub/GitLab 等平台深度集成 |

#### Git 内部原理简述

Git 将数据视为**小型文件系统的一组快照**。每次提交，Git 会对当时的全部文件制作一个快照并保存这个快照的索引。

```
工作流程示意：

  文件修改 → 暂存快照 → 提交到仓库
     ↓           ↓           ↓
  Working    Staging     Repository
  Directory    Area       (.git)
```

Git 使用 SHA-1 哈希算法生成 40 位十六进制字符的校验和来标识每一个对象：

```
示例：26393bbf8a5e4f37b8e8d2c4a1b3e5f7d9c0a2b4
简写：26393bb（前 7 位通常足以唯一标识）
```

---

### 1.2 安装指南

#### Windows

```powershell
# 方式一：官方安装包（推荐）
# 访问 https://git-scm.com/download/win 下载安装

# 方式二：使用 winget
winget install Git.Git

# 方式三：使用 Chocolatey
choco install git

# 方式四：使用 Scoop
scoop install git
```

安装时建议选项：

- 选择 **Git Bash** 和 **Git GUI**
- 默认编辑器选择 VS Code
- 选择 **Git from the command line and also from 3rd-party software**
- 选择 **OpenSSL** 库
- 配置行尾转换：**Checkout Windows-style, commit Unix-style**

#### macOS

```bash
# 方式一：Xcode Command Line Tools（最简方式）
xcode-select --install

# 方式二：Homebrew（推荐，版本更新）
brew install git

# 方式三：官方安装包
# 访问 https://git-scm.com/download/mac 下载
```

#### Linux

```bash
# Debian/Ubuntu
sudo apt update
sudo apt install git

# Fedora
sudo dnf install git

# Arch Linux
sudo pacman -S git

# CentOS/RHEL
sudo yum install git
```

#### 验证安装

```bash
git --version
# 输出示例：git version 2.47.1
```

---

### 1.3 初始配置

Git 配置分为三个层级，优先级从高到低：

| 层级 | 文件位置 | 作用范围 | 命令参数 |
|------|----------|----------|----------|
| 本地 | `.git/config` | 当前仓库 | `--local` |
| 全局 | `~/.gitconfig` | 当前用户 | `--global` |
| 系统 | `/etc/gitconfig` | 所有用户 | `--system` |

#### 必要配置

```bash
# 设置用户名（提交记录中显示的名字）
git config --global user.name "Your Name"

# 设置邮箱（提交记录中显示的邮箱）
git config --global user.email "your.email@example.com"

# 设置默认编辑器
git config --global core.editor "code --wait"    # VS Code
git config --global core.editor "vim"             # Vim
git config --global core.editor "nano"            # Nano

# 设置默认分支名为 main
git config --global init.defaultBranch main
```

#### 推荐配置

```bash
# 自动纠正拼写错误的命令
git config --global help.autocorrect 1

# 彩色输出
git config --global color.ui auto

# 设置别名（提高效率）
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.lg "log --oneline --graph --all"

# 换行符处理（Windows 用户必设）
git config --global core.autocrlf input    # 提交时 CRLF→LF，检出时不转换

# 设置推送策略
git config --global push.default simple

# 设置拉取策略（推荐 rebase）
git config --global pull.rebase true
```

#### 查看配置

```bash
# 查看所有配置
git config --list

# 查看特定配置项
git config user.name
git config user.email

# 查看配置文件路径
git config --list --show-origin
```

---

### 1.4 SSH 密钥生成与远程仓库连接

#### 生成 SSH 密钥

```bash
# 生成新的 SSH 密钥（推荐 Ed25519 算法）
ssh-keygen -t ed25519 -C "your.email@example.com"

# 如果系统不支持 Ed25519，使用 RSA
ssh-keygen -t rsa -b 4096 -C "your.email@example.com"
```

按提示操作：

```
Generating public/private ed25519 key pair.
Enter file in which to save the key (/c/Users/you/.ssh/id_ed25519):
                                                    # 按 Enter 使用默认路径
Enter passphrase (empty for no passphrase):         # 输入密码短语（可选）
Enter same passphrase again:                        # 确认密码
```

#### 添加密钥到 SSH Agent

```bash
# 启动 SSH Agent
eval "$(ssh-agent -s)"

# 添加私钥到 Agent
ssh-add ~/.ssh/id_ed25519

# Windows 用户（PowerShell）
Get-Service ssh-agent | Set-Service -StartupType Automatic
Start-Service ssh-agent
ssh-add $env:USERPROFILE\.ssh\id_ed25519
```

#### 添加公钥到 GitHub

```bash
# 复制公钥内容
cat ~/.ssh/id_ed25519.pub

# Windows 用户
type %USERPROFILE%\.ssh\id_ed25519.pub
# 或
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | Set-Clipboard
```

然后在 GitHub 上操作：

1. 进入 **Settings → SSH and GPG keys → New SSH key**
2. Title 填写设备名称（如 "Work Laptop"）
3. Key 粘贴公钥内容
4. 点击 **Add SSH key**

#### 测试连接

```bash
ssh -T git@github.com
# 成功输出：Hi username! You've successfully authenticated, but GitHub does not provide shell access.
```

#### 配置多 SSH Key（多账号场景）

```bash
# 创建配置文件 ~/.ssh/config
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519

Host github-work
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_work
```

---

## 2. 提交全流程详解

### 2.1 工作区、暂存区、本地仓库、远程仓库关系说明

#### 四个区域模型

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Working Directory          Staging Area         Repository    │
│   (工作区)                   (暂存区)              (本地仓库)     │
│                                                                 │
│   ┌───────────┐    git add   ┌───────────┐  git commit  ┌─────┤
│   │           │ ───────────→ │           │ ───────────→ │     │
│   │  修改文件  │              │  已暂存    │              │ 提交 │
│   │           │ ←─────────── │  变更      │ ←─────────── │ 历史 │
│   │           │  git restore │           │  git reset   │     │
│   └───────────┘  --staged    └───────────┘              └─────┤
│                                                                 │
│                                          ┌───────────────┐      │
│                                          │ Remote        │      │
│                                          │ Repository    │      │
│                                          │ (远程仓库)     │      │
│                                          │               │      │
│                                          │  git push →   │      │
│                                          │  ← git pull   │      │
│                                          └───────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

#### 文件状态生命周期

```
                    git add
  Untracked ──────────────→ Staged
  (未跟踪)                    (已暂存)
     ↑                          │
     │                    git commit
     │                          ↓
     │                       Committed
     │                      (已提交)
     │                          │
     │    编辑文件               │  git reset
     │                          ↓
     └──── Modified ←─────── Unstaged
         (已修改)               (未暂存)
```

| 状态 | 说明 | 查看方式 |
|------|------|----------|
| Untracked | 新文件，未被 Git 跟踪 | `git status` 显示红色 |
| Staged | 已 `git add`，等待提交 | `git status` 显示绿色 |
| Committed | 已提交到本地仓库 | `git log` 可查看 |
| Modified | 已跟踪文件被修改但未暂存 | `git status` 显示红色 |

---

### 2.2 基础命令操作

#### 初始化仓库

```bash
# 在当前目录初始化新仓库
git init

# 克隆远程仓库
git clone https://github.com/user/repo.git

# 克隆到指定目录
git clone https://github.com/user/repo.git my-project

# 克隆指定分支
git clone -b main https://github.com/user/repo.git

# 浅克隆（只获取最近的历史，节省时间）
git clone --depth 1 https://github.com/user/repo.git
```

#### 查看状态

```bash
# 查看工作区和暂存区状态
git status

# 简洁输出
git status -s
# 输出示例：
#  M README.md          （已修改未暂存）
# M  src/app.py         （已暂存）
# ?? new-file.txt       （未跟踪）
# A  new-feature.py     （新添加到暂存区）
# D  old-file.py        （已删除）
```

状态标识说明：

| 标识 | 含义 |
|------|------|
| `??` | 未跟踪 |
| `A` | 新添加到暂存区 |
| `M` | 已修改 |
| `D` | 已删除 |
| `R` | 已重命名 |
| `C` | 已复制 |
| 左列 | 暂存区状态 |
| 右列 | 工作区状态 |

#### 添加文件到暂存区

```bash
# 添加指定文件
git add README.md

# 添加多个文件
git add file1.py file2.py

# 添加整个目录
git add src/

# 添加所有变更（包括修改和删除，不包括新文件）
git add -u

# 添加所有变更（包括新文件）
git add .

# 交互式添加（按块选择）
git add -p

# 添加时忽略空白变更
git add -w .
```

> ⚠️ **注意**：`git add .` 添加的是当前目录及子目录的所有变更，而 `git add -A` 添加的是整个仓库的变更。在仓库根目录下两者等效。

#### 提交变更

```bash
# 提交暂存区的所有变更
git commit -m "feat: 添加用户登录功能"

# 提交并打开编辑器编写详细说明
git commit

# 跳过暂存区，直接提交所有已跟踪文件的修改
git commit -a -m "fix: 修复登录验证逻辑"

# 修改上一次提交（未推送到远程时使用）
git commit --amend -m "feat: 添加用户登录功能（修正提交信息）"

# 提交时添加共同作者
git commit -m "feat: 添加支付模块

Co-authored-by: Partner <partner@example.com>"
```

#### 查看历史

```bash
# 查看完整提交历史
git log

# 单行简洁输出
git log --oneline

# 图形化显示分支历史
git log --oneline --graph --all

# 显示最近 N 条提交
git log -5

# 显示每次提交的文件变更统计
git log --stat

# 显示每次提交的具体差异
git log -p

# 按作者筛选
git log --author="username"

# 按日期筛选
git log --since="2024-01-01" --until="2024-12-31"

# 按提交信息搜索
git log --grep="关键词"

# 查看指定文件的修改历史
git log --follow -- path/to/file

# 自定义输出格式
git log --pretty=format:"%h - %an, %ar : %s"
# 输出示例：26393bb - Zhang San, 2 hours ago : feat: 添加用户登录功能
```

格式占位符说明：

| 占位符 | 含义 |
|--------|------|
| `%H` | 完整哈希值 |
| `%h` | 短哈希值 |
| `%an` | 作者名 |
| `%ae` | 作者邮箱 |
| `%ar` | 相对时间 |
| `%ad` | 绝对时间 |
| `%s` | 提交信息 |
| `%d` | 引用名称（分支/标签） |

---

### 2.3 提交规范与最佳实践

#### Conventional Commits 规范

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型定义：**

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(auth): 添加 JWT 令牌刷新机制` |
| `fix` | Bug 修复 | `fix(api): 修复分页查询越界问题` |
| `docs` | 文档更新 | `docs: 更新 API 接口文档` |
| `style` | 代码格式（不影响功能） | `style: 统一缩进为 4 空格` |
| `refactor` | 重构代码 | `refactor(utils): 抽取公共校验方法` |
| `perf` | 性能优化 | `perf(query): 优化数据库查询索引` |
| `test` | 测试相关 | `test(auth): 添加登录单元测试` |
| `chore` | 构建/工具变动 | `chore: 升级依赖版本` |
| `ci` | CI/CD 变动 | `ci: 配置 GitHub Actions` |
| `build` | 构建系统变动 | `build: 更新 Vite 配置` |
| `revert` | 回退提交 | `revert: 回退 feat(auth) 提交` |

**Scope 范围（可选）：**

指明提交影响的模块或组件，如 `auth`、`api`、`ui`、`db` 等。

**完整示例：**

```
feat(product): 添加产品批量上传功能

- 支持 Excel 文件解析与数据校验
- 添加上传进度显示
- 实现批量插入数据库

Closes #123
```

#### 提交最佳实践

1. **原子提交**：每次提交只做一件事，便于回退和审查
2. **频繁提交**：小步快跑，降低冲突风险
3. **不提交半成品**：确保每次提交都能通过编译和测试
4. **提交前检查**：使用 `git diff --staged` 检查暂存内容
5. **有意义的提交信息**：避免 "fix"、"update" 等模糊描述
6. **不要提交敏感信息**：密码、密钥、数据库文件等

---

### 2.4 版本回退与撤销操作

#### 撤销工作区修改

```bash
# 撤销单个文件的修改（恢复到暂存区状态）
git restore README.md

# 撤销所有已修改文件的修改
git restore .

# 旧语法（效果相同）
git checkout -- README.md
```

> ⚠️ **警告**：此操作不可逆！修改内容将永久丢失。

#### 撤销暂存

```bash
# 将文件从暂存区移出（保留工作区修改）
git restore --staged README.md

# 旧语法
git reset HEAD README.md
```

#### 版本回退

```bash
# 软回退：回退提交，保留修改在暂存区
git reset --soft HEAD~1

# 混合回退（默认）：回退提交，保留修改在工作区
git reset --mixed HEAD~1
# 等同于
git reset HEAD~1

# 硬回退：回退提交，丢弃所有修改
git reset --hard HEAD~1
```

三种模式对比：

```
                工作区      暂存区      提交历史
--soft          保留        保留        回退
--mixed         保留        清空        回退
--hard          清空        清空        回退
```

#### 回退到指定版本

```bash
# 回退到指定提交
git reset --hard 26393bb

# 查看所有操作记录（找回丢失的提交）
git reflog

# 使用 reflog 找回丢失的提交
git reset --hard 26393bb
```

#### 创建反向提交

```bash
# 创建一个新的提交来撤销指定提交（安全，不改写历史）
git revert 26393bb

# 撤销多个提交
git revert HEAD~3..HEAD

# 撤销但不自动提交
git revert -n 26393bb
```

**reset vs revert 选择指南：**

| 场景 | 使用命令 | 原因 |
|------|----------|------|
| 本地未推送的提交 | `git reset` | 改写本地历史无风险 |
| 已推送到远程的提交 | `git revert` | 不改写公共历史，安全 |
| 需要保留撤销记录 | `git revert` | 产生新提交，记录完整 |

---

### 2.5 差异比较与冲突解决方法

#### 差异比较

```bash
# 工作区 vs 暂存区
git diff

# 暂存区 vs 最新提交
git diff --staged
# 或
git diff --cached

# 工作区 vs 最新提交
git diff HEAD

# 两个提交之间
git diff commit1 commit2

# 两个分支之间
git diff main..feature/login

# 只显示文件名和变更统计
git diff --stat

# 只显示修改的行数统计
git diff --numstat

# 比较指定文件
git diff -- README.md src/app.py

# 使用外部工具比较
git difftool
```

#### 合并冲突

当两个分支修改了同一文件的同一位置时，会产生合并冲突。

冲突文件中的标记格式：

```
<<<<<<< HEAD
当前分支的内容
=======
合并分支的内容
>>>>>>> feature/login
```

#### 冲突解决流程

```
步骤一：尝试合并
    git merge feature/login

步骤二：查看冲突文件
    git status
    # 冲突文件标记为 "both modified"

步骤三：打开冲突文件，手动编辑
    删除冲突标记（<<<<<<, =======, >>>>>>>）
    保留需要的内容

步骤四：标记冲突已解决
    git add <冲突文件>

步骤五：完成合并
    git commit
    # 或使用默认合并信息
    git commit --no-edit
```

#### 使用工具解决冲突

```bash
# 使用 VS Code 作为合并工具
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd 'code --wait $MERGED'

# 使用 vimdiff
git config --global merge.tool vimdiff

# 启动合并工具
git mergetool

# 配置冲突标记样式
git config --global merge.conflictstyle diff3
```

#### 冲突预防策略

1. **频繁同步**：定期从主分支拉取最新代码
2. **小步提交**：减少每次修改的范围
3. **模块化开发**：不同人员负责不同模块
4. **沟通协调**：修改公共文件前与团队成员沟通
5. **代码审查**：通过 PR 审查提前发现潜在冲突

---

## 3. 分支管理策略

### 3.1 分支模型介绍

#### 分支类型定义

| 分支类型 | 命名规范 | 生命周期 | 说明 |
|----------|----------|----------|------|
| main | `main` | 永久 | 生产环境代码，始终保持可发布状态 |
| develop | `develop` | 永久 | 开发集成分支，包含最新的开发功能 |
| feature | `feature/<name>` | 临时 | 功能开发分支，完成后合并回 develop |
| release | `release/<version>` | 临时 | 发布准备分支，修复 bug 后合并回 main 和 develop |
| hotfix | `hotfix/<name>` | 临时 | 紧急修复分支，从 main 创建，修复后合并回 main 和 develop |

#### 分支关系图

```
main:      ●────────────────────────●──────────●────────────
            \                        ↑          ↑
hotfix:      \────●─────────────────/          /
                  \                ↗           /
develop:     ●────●──●──●──●──●──●           /
                  \       ↑      ↑           /
feature:           ●──●──/      /           /
                        \      /           /
release:                 ●──●─/           /
                              ↗           /
feature:           ●────●──●─────────────/
```

---

### 3.2 分支操作命令

#### 创建分支

```bash
# 创建新分支（不切换）
git branch feature/login

# 创建并切换到新分支
git checkout -b feature/login

# 新语法（推荐）
git switch -c feature/login

# 基于指定提交创建分支
git branch feature/login 26393bb

# 基于远程分支创建本地分支
git checkout -b feature/login origin/feature/login
```

#### 切换分支

```bash
# 切换到已有分支
git checkout feature/login

# 新语法（推荐）
git switch feature/login

# 切换到上一个分支
git switch -

# 切换到 main 分支
git switch main
```

#### 查看分支

```bash
# 查看本地分支
git branch

# 查看所有分支（包括远程）
git branch -a

# 查看远程分支
git branch -r

# 查看分支及其最后一次提交
git branch -v

# 查看已合并到当前分支的分支
git branch --merged

# 查看未合并到当前分支的分支
git branch --no-merged
```

#### 合并分支

```bash
# 将 feature 分支合并到当前分支
git merge feature/login

# 不使用快进合并（保留分支历史）
git merge --no-ff feature/login

# 只合并指定文件
git merge feature/login -- path/to/file

# 合并但提交信息为指定内容
git merge -m "merge: 合并登录功能" feature/login

# 中止合并
git merge --abort
```

**快进合并 vs 非快进合并：**

```
快进合并（--ff，默认）：
  合并前：main: A → B → C
          feature:       C → D → E
  合并后：main: A → B → C → D → E
  （分支指针直接前进，丢失分支信息）

非快进合并（--no-ff）：
  合并前：main: A → B → C
          feature:       C → D → E
  合并后：main: A → B → C ─────→ M
                        ↗       ↑
          feature:   D → E ─────┘
  （保留分支合并记录）
```

#### 变基操作

```bash
# 将当前分支变基到 main
git rebase main

# 交互式变基（整理提交历史）
git rebase -i HEAD~3

# 中止变基
git rebase --abort

# 继续变基（解决冲突后）
git rebase --continue

# 跳过当前提交
git rebase --skip
```

**merge vs rebase 选择指南：**

| 场景 | 使用命令 | 原因 |
|------|----------|------|
| 合并功能分支到 main | `merge --no-ff` | 保留完整分支历史 |
| 同步主分支到功能分支 | `rebase` | 保持线性历史 |
| 已推送的分支 | `merge` | 不改写公共历史 |
| 本地未推送的分支 | `rebase` | 整理提交历史 |

> ⚠️ **黄金法则**：永远不要对已推送到远程的提交执行 rebase！

---

### 3.3 分支命名规范与生命周期管理

#### 命名规范

```
<type>/<ticket-id>-<short-description>

示例：
feature/JIRA-123-user-login
bugfix/JIRA-456-payment-error
hotfix/JIRA-789-security-patch
release/v2.1.0
```

| 前缀 | 用途 | 示例 |
|------|------|------|
| `feature/` | 新功能开发 | `feature/user-auth` |
| `bugfix/` | 非紧急 Bug 修复 | `bugfix/login-validation` |
| `hotfix/` | 紧急线上修复 | `hotfix/security-patch` |
| `release/` | 版本发布 | `release/v2.1.0` |
| `experiment/` | 实验性功能 | `experiment/new-algorithm` |
| `docs/` | 文档更新 | `docs/api-reference` |
| `refactor/` | 代码重构 | `refactor/db-layer` |

#### 命名规则

- 使用小写字母和连字符（kebab-case）
- 包含任务编号（如有）
- 描述简洁明确（不超过 50 字符）
- 避免使用个人姓名

#### 生命周期管理

```bash
# 删除已合并的本地分支
git branch -d feature/login

# 强制删除未合并的本地分支
git branch -D feature/login

# 删除远程分支
git push origin --delete feature/login

# 清理已删除的远程分支引用
git fetch --prune

# 批量删除已合并的本地分支
git branch --merged main | grep -v "^\*\|main\|develop" | xargs -n 1 git branch -d
```

---

### 3.4 分支合并策略与代码审查流程

#### 合并策略选择

```
┌──────────────────────────────────────────────────────┐
│                  合并策略决策树                        │
├──────────────────────────────────────────────────────┤
│                                                      │
│  是否为功能分支合并到主分支？                           │
│      ├── 是 → 使用 merge --no-ff                     │
│      └── 否 → 继续判断                                │
│                                                      │
│  是否需要保持线性历史？                                │
│      ├── 是 → 使用 rebase（仅限本地未推送）            │
│      └── 否 → 使用 merge                             │
│                                                      │
│  是否为紧急修复？                                     │
│      ├── 是 → cherry-pick 到所有受影响分支             │
│      └── 否 → 走正常合并流程                          │
│                                                      │
└──────────────────────────────────────────────────────┘
```

#### Cherry-pick 选择性合并

```bash
# 将指定提交应用到当前分支
git cherry-pick 26393bb

# 应用多个提交
git cherry-pick 26393bb a1b2c3d

# 应用提交范围
git cherry-pick 26393bb^..a1b2c3d

# 只应用但不提交
git cherry-pick -n 26393bb
```

#### 代码审查流程

```
1. 开发者创建功能分支并完成开发
   ↓
2. 推送到远程仓库
   git push origin feature/login
   ↓
3. 在 GitHub/GitLab 上创建 Pull Request / Merge Request
   - 填写 PR 描述（改动内容、测试情况、关联 Issue）
   - 指定审查者（Reviewer）
   - 关联项目看板
   ↓
4. 代码审查
   - 审查者检查代码质量、逻辑、规范
   - 提出修改意见（Comment / Request Changes）
   - 开发者根据反馈修改并推送新提交
   ↓
5. 审查通过
   - 所有 Reviewer 批准（Approve）
   - CI/CD 检查通过
   - 无合并冲突
   ↓
6. 合并到目标分支
   - Squash and Merge（推荐：保持主分支历史整洁）
   - Merge Commit（保留完整分支历史）
   - Rebase and Merge（保持线性历史）
   ↓
7. 删除功能分支
   git push origin --delete feature/login
   git branch -d feature/login
```

---

## 4. 团队协作方案

### 4.1 远程仓库协作模式

#### 集中式工作流

```
所有开发者直接推送到同一个仓库的 main 分支

  Developer A ──push──→ ┌──────────┐ ←──push── Developer B
                        │ Remote   │
  Developer C ──push──→ │ Repo     │ ←──push── Developer D
                        └──────────┘

适用场景：小团队（2-3人），简单项目
```

#### 功能分支工作流

```
每个功能在独立分支开发，通过 PR 合并

  Developer A: feature/A ──PR──→ main
  Developer B: feature/B ──PR──→ main
  Developer C: feature/C ──PR──→ main

适用场景：中小团队，需要代码审查
```

#### Fork 工作流

```
开发者 Fork 仓库到自己的账号，修改后提交 PR

  Original Repo ←──PR── Fork (Developer A)
                ←──PR── Fork (Developer B)
                ←──PR── Fork (Developer C)

适用场景：开源项目，外部贡献者
```

---

### 4.2 团队工作流推荐

#### Git Flow

```
                    main
                     │
    ┌────────────────┼────────────────┐
    │                │                │
  hotfix          release          develop
    │                │                │
    │                │    ┌───────────┼───────────┐
    │                │    │           │           │
    │                │  feature/A  feature/B  feature/C

特点：
- 严格的分支模型，适合有明确发布周期的项目
- 维护成本较高，需要团队纪律
- 适合传统软件发布模式
```

分支流转规则：

| 操作 | 从 | 到 | 说明 |
|------|----|----|------|
| 开始功能开发 | develop | feature/* | `git checkout -b feature/login develop` |
| 完成功能开发 | feature/* | develop | 通过 PR 合并 |
| 开始发布准备 | develop | release/* | `git checkout -b release/v2.0 develop` |
| 完成发布 | release/* | main + develop | 合并到 main 打标签，再合并回 develop |
| 紧急修复 | main | hotfix/* | `git checkout -b hotfix/fix-bug main` |
| 完成修复 | hotfix/* | main + develop | 合并到 main 打标签，再合并回 develop |

#### GitHub Flow

```
main ──→ feature/A ──→ main ──→ feature/B ──→ main
           ↑ deploy      ↑ deploy

特点：
- 简单轻量，只有 main + feature 分支
- main 始终可部署
- 合并即部署
- 适合持续部署的 Web 应用
```

流程：

1. 从 main 创建功能分支
2. 开发并频繁推送
3. 创建 Pull Request
4. 代码审查和讨论
5. 合并到 main
6. 自动部署

#### GitLab Flow

```
main ──→ feature ──→ main ──→ staging ──→ production

特点：
- 结合了 Git Flow 和 GitHub Flow
- 通过环境分支管理部署
- 支持多环境部署流程
- 适合需要多环境验证的项目
```

#### 工作流选择建议

| 团队规模 | 项目类型 | 推荐工作流 |
|----------|----------|------------|
| 1-3 人 | 小型项目 | GitHub Flow |
| 4-10 人 | Web 应用 | GitHub Flow |
| 10+ 人 | 企业软件 | Git Flow |
| 开源项目 | 任何 | Fork + GitHub Flow |
| 多环境部署 | SaaS 产品 | GitLab Flow |

---

### 4.3 协作命令详解

#### 远程仓库管理

```bash
# 查看远程仓库
git remote -v

# 添加远程仓库
git remote add origin https://github.com/user/repo.git

# 修改远程仓库地址
git remote set-url origin https://github.com/user/new-repo.git

# 删除远程仓库
git remote remove origin

# 重命名远程仓库
git remote rename origin upstream
```

#### 拉取与推送

```bash
# 拉取远程分支（不合并）
git fetch origin

# 拉取所有远程分支
git fetch --all

# 拉取并合并（等于 fetch + merge）
git pull origin main

# 拉取并变基（推荐，保持线性历史）
git pull --rebase origin main

# 推送到远程
git push origin main

# 首次推送并设置上游分支
git push -u origin main

# 推送所有分支
git push --all

# 推送标签
git push origin v1.0.0

# 推送所有标签
git push --tags

# 强制推送（谨慎使用！）
git push -f origin main

# 更安全的强制推送（如果远程有更新则拒绝）
git push --force-with-lease origin main
```

#### Fork 工作流

```bash
# 1. Fork 仓库（在 GitHub 网页操作）

# 2. 克隆你的 Fork
git clone https://github.com/your-username/repo.git

# 3. 添加上游仓库
git remote add upstream https://github.com/original-owner/repo.git

# 4. 同步上游更新
git fetch upstream
git checkout main
git merge upstream/main

# 5. 推送到你的 Fork
git push origin main

# 6. 创建 Pull Request（在 GitHub 网页操作）
```

---

### 4.4 代码审查与反馈机制

#### PR 描述模板

```markdown
## 变更类型
- [ ] 新功能 (feat)
- [ ] Bug 修复 (fix)
- [ ] 重构 (refactor)
- [ ] 性能优化 (perf)
- [ ] 文档更新 (docs)
- [ ] 测试 (test)

## 变更说明
<!-- 描述本次 PR 的目的和实现方式 -->

## 关联 Issue
Closes #

## 测试情况
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 手动测试通过

## 截图/录屏
<!-- 如有 UI 变更，请附截图 -->

## 检查清单
- [ ] 代码遵循项目规范
- [ ] 无硬编码的敏感信息
- [ ] 已更新相关文档
- [ ] 已添加必要的测试
```

#### 审查要点

| 维度 | 检查内容 |
|------|----------|
| **功能正确性** | 逻辑是否正确，边界条件是否处理 |
| **代码质量** | 命名规范、可读性、复杂度 |
| **安全性** | 输入校验、权限控制、敏感信息 |
| **性能** | 数据库查询优化、内存使用 |
| **可维护性** | 模块化、注释、文档 |
| **测试覆盖** | 单元测试、边界测试 |

---

### 4.5 冲突预防与处理规范

#### 预防措施

1. **每日同步**：每天开始工作前 `git pull --rebase`
2. **小粒度开发**：每个功能分支不超过 3 天
3. **模块责任制**：明确各模块负责人
4. **提前沟通**：修改公共接口前通知团队
5. **自动化检测**：CI 检查合并冲突

#### 处理规范

```
1. 发现冲突后，立即通知相关开发者
2. 双方协商确定保留内容
3. 在本地解决冲突并测试
4. 提交解决结果并推送
5. 记录冲突原因和解决方案
```

---

### 4.6 团队权限管理与分支保护规则

#### GitHub 分支保护设置

进入 **Settings → Branches → Branch protection rules → Add rule**

推荐配置：

| 规则 | main | develop | release/* |
|------|------|---------|-----------|
| Require PR before merging | ✅ | ✅ | ✅ |
| Required approving reviews | 2 | 1 | 2 |
| Dismiss stale reviews on push | ✅ | ✅ | ✅ |
| Require status checks | ✅ | ✅ | ✅ |
| Require signed commits | ✅ | ❌ | ✅ |
| Do not allow force pushes | ✅ | ✅ | ✅ |
| Do not allow deletions | ✅ | ✅ | ✅ |

#### 团队角色与权限

| 角色 | 权限 | 适用人员 |
|------|------|----------|
| Owner | 完全控制 | 项目负责人 |
| Admin | 仓库管理 | 技术负责人 |
| Maintain | 推送保护分支 | 高级开发 |
| Write | 推送非保护分支 | 开发人员 |
| Read | 只读访问 | 实习生/外部 |

---

## 5. 高级功能与最佳实践

### 5.1 Git 钩子（Hooks）配置与应用

Git 钩子是在特定事件发生时自动执行的脚本。

#### 钩子类型

| 钩子 | 触发时机 | 用途 |
|------|----------|------|
| `pre-commit` | `git commit` 之前 | 代码格式检查、lint |
| `prepare-commit-msg` | 编辑提交信息之前 | 自动添加提交信息前缀 |
| `commit-msg` | 提交信息编辑之后 | 校验提交信息格式 |
| `pre-push` | `git push` 之前 | 运行测试 |
| `post-merge` | `git merge` 之后 | 自动安装依赖 |
| `pre-rebase` | `git rebase` 之前 | 防止 rebase 已推送的提交 |

#### 配置示例

```bash
# 钩子脚本位于 .git/hooks/ 目录
# 创建 pre-commit 钩子

cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh

# 运行 Python 代码检查
echo "Running lint checks..."
flake8 --max-line-length=120 .
if [ $? -ne 0 ]; then
    echo "❌ Lint check failed. Please fix the issues before committing."
    exit 1
fi

# 检查是否有调试代码
if git diff --cached | grep -q "debugger\|console.log\|print(" ; then
    echo "❌ Found debug statements. Please remove them before committing."
    exit 1
fi

echo "✅ All checks passed."
EOF

chmod +x .git/hooks/pre-commit
```

#### 使用 Husky 管理钩子（推荐）

```bash
# 安装 Husky
npm install --save-dev husky

# 初始化
npx husky init

# 添加 pre-commit 钩子
echo "npx lint-staged" > .husky/pre-commit

# 添加 commit-msg 钩子
echo "npx commitlint --edit \$1" > .husky/commit-msg
```

---

### 5.2 子模块（Submodule）管理

#### 基本操作

```bash
# 添加子模块
git submodule add https://github.com/user/shared-lib.git libs/shared

# 克隆含子模块的仓库
git clone --recurse-submodules https://github.com/user/main-repo.git

# 已克隆的仓库初始化子模块
git submodule init
git submodule update

# 一步完成初始化和更新
git submodule update --init --recursive

# 更新子模块到最新提交
git submodule update --remote

# 在子模块目录中工作
cd libs/shared
git checkout main
git pull
cd ../..
git add libs/shared
git commit -m "chore: 更新 shared-lib 子模块"
```

#### 常见问题

```bash
# 子模块显示脏状态
git submodule foreach --recursive git checkout .

# 删除子模块
git submodule deinit -f libs/shared
rm -rf .git/modules/libs/shared
git rm -f libs/shared
```

---

### 5.3 交互式 Rebase 与提交历史整理

#### 交互式 Rebase 命令

```bash
# 整理最近 3 次提交
git rebase -i HEAD~3

# 整理到指定提交
git rebase -i 26393bb
```

编辑器中显示：

```
pick a1b2c3d feat: 添加登录页面
pick d4e5f6g fix: 修复登录表单验证
pick h7i8j9k feat: 添加注册功能

# Rebase 操作：
# p, pick   = 保留提交
# r, reword = 保留提交，修改提交信息
# e, edit   = 保留提交，暂停修改
# s, squash = 合并到前一个提交
# f, fixup  = 合并到前一个提交，丢弃提交信息
# d, drop   = 删除提交
```

#### 常见操作

**合并多个提交：**

```
pick a1b2c3d feat: 添加登录页面
squash d4e5f6g fix: 修复登录表单验证
pick h7i8j9k feat: 添加注册功能
```

**修改历史提交信息：**

```
reword a1b2c3d feat: 添加登录页面
pick d4e5f6g fix: 修复登录表单验证
pick h7i8j9k feat: 添加注册功能
```

**调整提交顺序：**

```
pick h7i8j9k feat: 添加注册功能
pick a1b2c3d feat: 添加登录页面
pick d4e5f6g fix: 修复登录表单验证
```

**删除提交：**

```
pick a1b2c3d feat: 添加登录页面
drop d4e5f6g fix: 修复登录表单验证
pick h7i8j9k feat: 添加注册功能
```

---

### 5.4 Git LFS 大文件管理

#### 安装与初始化

```bash
# 安装 Git LFS
# Windows: git lfs install（Git for Windows 已内置）
# macOS: brew install git-lfs
# Linux: sudo apt install git-lfs

# 初始化
git lfs install
```

#### 使用方法

```bash
# 跟踪大文件类型
git lfs track "*.psd"
git lfs track "*.mp4"
git lfs track "*.zip"
git lfs track "*.db"

# 查看跟踪规则
git lfs track

# 添加 .gitattributes
git add .gitattributes

# 正常添加大文件
git add large-file.psd
git commit -m "feat: 添加设计稿"
git push
```

#### 管理操作

```bash
# 查看 LFS 对象列表
git lfs ls-files

# 查看 LFS 存储使用量
git lfs env

# 拉取 LFS 对象
git lfs pull

# 检出 LFS 对象
git lfs checkout

# 迁移已有文件到 LFS
git lfs migrate import --include="*.psd"
```

---

### 5.5 常见问题排查与解决方案

#### 提交后发现包含敏感信息

```bash
# 方案一：从历史中彻底删除（未推送时）
git rebase -i HEAD~3
# 将包含敏感信息的提交标记为 drop

# 方案二：使用 filter-branch（已推送时）
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch path/to/sensitive-file' \
  --prune-empty --tag-name-filter cat -- --all

# 方案三：使用 BFG Repo-Cleaner（推荐，更快）
bfg --delete-files sensitive-file.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

> ⚠️ **重要**：如果敏感信息已推送到远程，即使删除了历史，也应立即更换密钥/密码！

#### 误操作恢复

```bash
# 查看所有操作历史
git reflog

# 恢复到指定操作
git reset --hard HEAD@{5}

# 找回已删除的分支
git reflog
git checkout -b recovered-branch HEAD@{3}

# 找回已删除的提交
git cherry-pick HEAD@{5}
```

#### 仓库体积优化

```bash
# 查看仓库占用空间
git count-objects -vH

# 清理未跟踪的文件（预览）
git clean -n

# 清理未跟踪的文件
git clean -fd

# 清理未跟踪的文件和目录
git clean -fdx

# 垃圾回收
git gc

# 深度垃圾回收
git gc --aggressive --prune=now

# 清理远程已删除的分支引用
git remote prune origin

# 删除本地已合并的分支
git branch --merged | grep -v "\*\|main\|develop" | xargs -n 1 git branch -d
```

#### 中文文件名乱码

```bash
# 显示中文文件名
git config --global core.quotepath false
```

#### 换行符问题

```bash
# Windows 用户设置
git config --global core.autocrlf true    # 检出时 LF→CRLF，提交时 CRLF→LF

# Linux/macOS 用户设置
git config --global core.autocrlf input   # 提交时 CRLF→LF，检出时不转换

# 项目级 .gitattributes 配置
echo "* text=auto" > .gitattributes
echo "*.py text eol=lf" >> .gitattributes
echo "*.bat text eol=crlf" >> .gitattributes
```

---

### 5.6 效率提升工具与技巧

#### Git 别名配置

```bash
# 常用别名
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual 'log --oneline --graph --all'
git config --global alias.amend 'commit --amend --no-edit'
git config --global alias.wip '!git add -A && git commit -m "WIP"'
git config --global alias.unwip '!git log -1 | grep -q "WIP" && git reset HEAD~1'
```

#### 推荐 GUI 工具

| 工具 | 平台 | 特点 |
|------|------|------|
| VS Code Git | 全平台 | 内置 Git 支持，轻量 |
| GitKraken | 全平台 | 可视化分支管理 |
| Sourcetree | Win/Mac | 免费，功能全面 |
| GitHub Desktop | Win/Mac | 简单易用 |
| Lazygit | 全平台 | 终端 UI，高效 |
| Tig | 全平台 | 终端日志查看器 |

#### 实用技巧

```bash
# 自动补全（Bash）
curl -o ~/.git-completion.bash https://raw.githubusercontent.com/git/git/master/contrib/completion/git-completion.bash
echo 'source ~/.git-completion.bash' >> ~/.bashrc

# 查看某行代码的最后修改者
git blame -L 10,20 path/to/file

# 查找引入 Bug 的提交
git bisect start
git bisect bad                  # 当前版本有 Bug
git bisect good v1.0.0         # v1.0.0 没有 Bug
# Git 自动切换到中间版本，测试后标记
git bisect good / git bisect bad
# 重复直到找到引入 Bug 的提交
git bisect reset                # 结束 bisect

# 保存当前工作进度
git stash save "work in progress"

# 查看保存的工作进度
git stash list

# 恢复最近的工作进度
git stash pop

# 恢复指定的工作进度
git stash apply stash@{2}

# 恢复但保留 stash 记录
git stash apply

# 删除 stash
git stash drop stash@{0}

# 清空所有 stash
git stash clear

# 暂存包括未跟踪的文件
git stash -u

# 暂存包括忽略的文件
git stash --all

# 从 stash 创建分支
git stash branch feature/from-stash
```

---

## 6. 附录

### 6.1 常用命令速查表

#### 初始化与配置

| 命令 | 说明 |
|------|------|
| `git init` | 初始化仓库 |
| `git clone <url>` | 克隆远程仓库 |
| `git config --global user.name "name"` | 设置用户名 |
| `git config --global user.email "email"` | 设置邮箱 |
| `git config --list` | 查看所有配置 |

#### 日常操作

| 命令 | 说明 |
|------|------|
| `git status` | 查看状态 |
| `git add <file>` | 添加到暂存区 |
| `git add .` | 添加所有变更 |
| `git commit -m "msg"` | 提交 |
| `git commit --amend` | 修改上次提交 |
| `git diff` | 查看未暂存的修改 |
| `git diff --staged` | 查看已暂存的修改 |
| `git restore <file>` | 撤销工作区修改 |
| `git restore --staged <file>` | 撤销暂存 |
| `git stash` | 暂存当前修改 |
| `git stash pop` | 恢复暂存修改 |

#### 分支操作

| 命令 | 说明 |
|------|------|
| `git branch` | 查看本地分支 |
| `git branch <name>` | 创建分支 |
| `git switch <name>` | 切换分支 |
| `git switch -c <name>` | 创建并切换分支 |
| `git merge <branch>` | 合并分支 |
| `git branch -d <name>` | 删除分支 |
| `git rebase <branch>` | 变基 |
| `git cherry-pick <hash>` | 选择性合并 |

#### 远程操作

| 命令 | 说明 |
|------|------|
| `git remote -v` | 查看远程仓库 |
| `git fetch <remote>` | 拉取远程更新 |
| `git pull <remote> <branch>` | 拉取并合并 |
| `git push <remote> <branch>` | 推送到远程 |
| `git push -u <remote> <branch>` | 推送并设置上游 |
| `git remote add <name> <url>` | 添加远程仓库 |

#### 日志与查看

| 命令 | 说明 |
|------|------|
| `git log` | 查看提交历史 |
| `git log --oneline` | 简洁历史 |
| `git log --graph --all` | 图形化历史 |
| `git show <hash>` | 查看指定提交 |
| `git blame <file>` | 查看行级修改记录 |
| `git reflog` | 查看操作历史 |

#### 标签操作

| 命令 | 说明 |
|------|------|
| `git tag` | 查看所有标签 |
| `git tag v1.0.0` | 创建轻量标签 |
| `git tag -a v1.0.0 -m "msg"` | 创建附注标签 |
| `git push origin v1.0.0` | 推送标签 |
| `git push --tags` | 推送所有标签 |
| `git tag -d v1.0.0` | 删除本地标签 |
| `git push origin --delete v1.0.0` | 删除远程标签 |

---

### 6.2 错误提示与解决方法

| 错误信息 | 原因 | 解决方法 |
|----------|------|----------|
| `fatal: not a git repository` | 当前目录不是 Git 仓库 | 执行 `git init` 或 `git clone` |
| `error: failed to push some refs` | 远程有本地没有的更新 | 先 `git pull --rebase` 再推送 |
| `CONFLICT (content): Merge conflict` | 合并冲突 | 手动解决冲突后 `git add` 和 `git commit` |
| `fatal: remote origin already exists` | 远程仓库已配置 | `git remote set-url origin <new-url>` |
| `error: pathspec 'branch' did not match` | 分支不存在 | 检查分支名拼写，`git branch -a` 查看 |
| `Your branch is ahead of 'origin/main' by N commits` | 本地有未推送的提交 | `git push origin main` |
| `fatal: refusing to merge unrelated histories` | 两个不相关的仓库合并 | `git pull --allow-unrelated-histories` |
| `error: Your local changes would be overwritten` | 切换分支时有未提交的修改 | `git stash` 暂存后再切换 |
| `fatal: ambiguous argument 'HEAD'` | 仓库无提交 | 先创建初始提交 |
| `error: src refspec main does not match any` | 分支名不匹配 | 检查当前分支名 `git branch` |
| `warning: LF will be replaced by CRLF` | 换行符差异 | `git config core.autocrlf input` |
| `fatal: Authentication failed` | 认证失败 | 检查 SSH 密钥或 Personal Access Token |

---

### 6.3 推荐学习资源与工具

#### 官方资源

| 资源 | 链接 |
|------|------|
| Git 官方文档 | https://git-scm.com/doc |
| Pro Git 电子书 | https://git-scm.com/book/zh/v2 |
| GitHub 官方教程 | https://docs.github.com/cn |

#### 交互式学习

| 资源 | 说明 |
|------|------|
| Learn Git Branching | https://learngitbranching.js.org/?locale=zh_CN |
| GitHub Skills | https://skills.github.com/ |
| Git Immersion | http://gitimmersion.com/ |

#### 可视化工具

| 工具 | 说明 |
|------|------|
| GitKraken | 可视化 Git 客户端 |
| Git Graph (VS Code 插件) | VS Code 内分支图 |
| GitLens (VS Code 插件) | 增强版 Git 功能 |

#### 团队规范参考

| 规范 | 链接 |
|------|------|
| Conventional Commits | https://www.conventionalcommits.org/zh-hans/ |
| Angular 提交规范 | https://github.com/angular/angular/blob/master/CONTRIBUTING.md |
| Git Flow 原文 | https://nvie.com/posts/a-successful-git-branching-model/ |
| GitHub Flow | https://docs.github.com/en/get-started/quickstart/github-flow |

---

> 📌 **维护说明**：本手册随项目迭代持续更新。如有疑问或建议，请提交 Issue 或联系技术负责人。
