<p align="center">
  <a href="./README.en.md">English</a> | 中文
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/agentme-cli?color=blue&label=npm" alt="npm version" />
  <img src="https://img.shields.io/npm/l/agentme-cli" alt="license" />
  <img src="https://img.shields.io/badge/platform-Cursor%20%7C%20Claude%20%7C%20Codex%20%7C%20ChatGPT-blueviolet" alt="platforms" />
</p>

<h1 align="center">AgentMe</h1>

<p align="center">
  <strong>从碳基到硅基，你只差一个 init</strong><br/>
  用纯文档构建可携带、会进化的 AI 身份 — 带上它，去任何 AI 平台。<br/>
  <sub>AgentMe — Me 是「我」，也是 Memory。</sub>
</p>

---

## 一句话说明白

```bash
npx agentme-cli init
```

你和 AI 聊了一千次，它还是不认识你。换个工具？从头再来。笔记散落在十个 app 里，收藏夹早已长满蜘蛛网。

**AgentMe 就是来解决这个问题的。** 它在你本地建一套纯 Markdown 画像目录 — 你是谁、你知道什么、你做过什么、你在干什么 — 然后一键同步到你喜欢的 AI 工具里。

每次和 AI 聊完，只需要说一声 `/agentme-archive`（需已安装对应平台 Skill），对话里的知识就会**自动提取、评分、分类、写入**你的画像。持续归档，AI 就越来越懂你，而且棘轮机制保证不会越改越蠢。

## 为什么需要它？

| 你的痛 | AgentMe 怎么治 |
|--------|---------------|
| 换个 AI 就要重新自我介绍 | 一份画像走天下，同步到 Cursor、Claude、Codex 等多个平台 |
| 聊了 1000 次它还是个陌生人 | 每次归档都在积累，你的 AI 会长记性 |
| 收藏夹吃灰，笔记散落各处 | 结构化目录 + 自动索引，知识有处安放 |
| AI 记忆越改越差 | 棘轮机制抑制退化，合格归档才会写入 |

## 核心能力

### 以文档寄生你的赛博灵魂

```
~/.agentme/
├── Me/           # 你是谁：人格底层、角色定位、人生里程碑
├── Knowledge/    # 你知道什么：按主题分目录的知识库
├── Product/      # 你做过什么：项目、产品、需求决策
├── Tools/        # 你用什么：工具链、脚本、配置偏好
├── Skills/       # 你会什么：工作流、自动化技能
├── Current/      # 你在干什么：当前焦点、未完成事项
├── _Index.md     # 全局索引，知识地图的入口
└── _Evolution.md # 进化日志，每一笔成长都有据可查
```

没有数据库，没有私有格式。**纯 Markdown + YAML frontmatter**，`git push` 就是同步，`cat` 就能看，凡能读取本地文件的 AI 工具都能消费。

### 一份画像，所有 AI 都认识你

`agentme init` 一键把你的身份注入到各大 AI 平台：

| 平台 | 安装方式 | 怎么用 |
|------|---------|--------|
| **Cursor** | SKILL + Rule | 对话中说 `归档`，自动执行 |
| **Claude** | CLAUDE.md 标记注入 | 不覆盖你的已有内容 |
| **Codex / Gemini CLI / Windsurf / Copilot** | AGENTS.md (社区约定) | 项目级或全局注入 |
| **ChatGPT** | Custom Instructions | 生成指令文本，粘贴即用 |

### 会进化的知识系统

> **灵感来源**: 进化算法的设计借鉴了 [autoresearch](https://github.com/cfld/autoresearch) 的「单一目标分 + keep/discard 棘轮」思想，以及 [darwin-gpt](https://github.com/weykon/darwin-skill) 的「多维度评分 + 体积约束 + 独立评审」范式。AgentMe 将两者融合为双层评分体系，用于文档而非代码的持续进化。

每次执行 `/agentme-archive`，你的知识都要过两道关：

**L1 机械评分 (0-50)** — 不调用大模型，毫秒级完成

| 维度 | 满分 | 检查什么 |
|------|------|---------|
| 结构完整性 | 10 | frontmatter 五要素是否齐全 |
| 体积健康度 | 10 | 正文 10-150 行为最佳区间 |
| 新鲜度 | 10 | 7 天内满分，越老扣越多 |
| 连接度 | 10 | 有标签？被索引引用？有交叉链接？ |
| 信息密度 | 10 | 非空行占比、有标题、无冗余空行 |

**L2 语义评分 (0-50)** — 独立辅助模型评审，按需触发

从冗余度、准确性、清晰度、实用性四个维度打分，给出 `approve / reject / revise` 裁定。

**棘轮决策**: 对比归档前后的分数 — delta >= +5 自动通过，delta <= -2 自动拒绝。灰区交给 L2 仲裁。通过棘轮机制抑制明显退化，确保每次归档都是正向积累。

## 三步上手

### 1. 安装

```bash
npm install -g agentme-cli
```

### 2. 初始化

```bash
agentme init
```

交互式引导，30 秒搞定：
1. 选一个地方放画像目录（默认 `~/.agentme/`）
2. 填几个身份信息（名字、角色、技术栈）
3. 勾选要同步的 AI 平台

已经有画像目录？`agentme init` 会检测完整性，缺什么补什么。

### 3. 用起来

和 AI 聊完后，在对话里说：

```
/agentme-archive
```

就这一步。AI 会自动：提取知识 → 匹配分类 → 评分把关 → 写入画像 → 更新索引 → 同步各平台。

### 日常查看

```bash
agentme status     # 画像统计、平台状态、健康提示、进化数据
agentme validate   # 校验目录结构和文档格式
```

## 命令参考

| 命令 | 说明 |
|------|------|
| `agentme init` | 首次初始化画像 & 安装平台集成；再次运行可同步到新平台 |
| `agentme status` | 文档数、标签云、健康警告、进化统计一览 |
| `agentme validate` | 结构校验 + 格式检查 + 索引一致性 |
| `agentme validate --fix` | 自动修复可修复的问题（索引计数、时间戳等） |

## 设计哲学

> **Document as Identity** — 文档即身份

- **纯文本至上**: 不依赖数据库，不锁定平台，`git push` 就是备份
- **渐进生长**: 从空目录开始，每次对话都在浇灌
- **安全进化**: 棘轮机制抑制退化，每次归档都经过评分把关
- **开放适配**: 能读文件的 AI 就能接入 — Markdown 是最大公约数

## 贡献指南

欢迎贡献！新的平台适配器、评分算法改进、文档修正，来者不拒。

```bash
git clone https://github.com/ChenShiyaung/AgentMe.git
cd AgentMe
npm install
npm test
```

## License

[MIT](./LICENSE)

---

<p align="center">
  <em>对话终会消散，但你不会。</em>
</p>
