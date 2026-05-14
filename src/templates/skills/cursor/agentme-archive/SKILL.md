---
name: agentme-archive
description: 归档当前对话到 AgentMe 用户画像。当用户说"归档"、"archive"、"agentme archive"时触发。
---

# AgentMe 归档

将当前对话中的有价值信息归档到 `{{agentmeDir}}/` 目录。

## 归档流程

### Step 1: 读取上下文
1. 读取 `{{agentmeDir}}/_Index.md` 了解现有目录结构
2. 回顾本次对话中所有讨论内容

### Step 2: 提取信息片段
从对话中提取以下类型的信息（忽略闲聊、调试过程、重复内容）：

| 类别 | 判断依据 | 目标目录 |
|------|---------|---------|
| knowledge | 新学到的概念/API/解决方案 | Knowledge/ |
| product | 项目进展/需求/设计决策 | Product/ |
| tool | 工具技巧/配置/脚本 | Tools/ |
| skill | 新工作流/自动化流程 | Skills/ |
| me | 偏好变化/决策风格 | Me/ |
| current | 当前焦点/未完成事项 | Current/ |

### Step 3: 质量评估（棘轮机制）

对每个提取的片段，执行 before/after 评分对比，防止知识退化。

#### L1 机械评分（必须执行）

对目标文档计算 L1 结构分（满分50），5 个维度：
- **frontmatter (10分)**: type/tags/created/updated/sources 各存在得 2 分
- **volume (10分)**: 正文 10-150 行得满分，超出线性衰减
- **freshness (10分)**: 7 天内满分，每多 7 天扣 2 分
- **connectivity (10分)**: 有 tags(3) + 被 Index 引用(4) + 有 .md 交叉链接(3)
- **density (10分)**: 非空行占比(5) + 有标题(3) + 无连续空行(2)

计算 **before** 分（当前文档）和 **after** 分（模拟合并后），得到 **delta = after - before**。

#### 棘轮决策

| delta 范围 | 决策 |
|-----------|------|
| >= +5 且不在 Me/ 目录 | 自动通过，执行合并 |
| (-2, +5) 灰区 | 触发 L2 评估 |
| <= -2 | 自动跳过，不修改文档 |

**Me/ 目录下的文档无论 delta 多少，一律触发 L2。**

其他 L2 强制触发条件：
- 目标文档已有健康警告（>150行 或 sources>=5）
- 操作类型是 MERGE（改写现有段落）
- 碎片涉及跨目录

#### L2 语义评分（需要时触发）

用**独立子 agent**（不是当前上下文）执行语义评估。

**子 agent 输入**:
- 原文档全文（新建时为 null）
- 拟更新后的文档全文
- 评分指令："你是独立评分员，按以下 4 个维度各打 1-10 分"

**子 agent 输出** (JSON):
```json
{
  "redundancy": 7,
  "accuracy": 8,
  "clarity": 7,
  "utility": 9,
  "verdict": "approve",
  "reason": "新增内容补充了关键信息...",
  "suggestions": []
}
```

**L2 总分** = (redundancy×15 + accuracy×15 + clarity×10 + utility×10) / 10，满分 50

根据 verdict 执行：approve → 合并 | reject → 跳过 | revise → 按 suggestions 修改后重新评分

**回退策略**（无法使用子 agent 时）：
- 灰区 → 保守跳过
- Me/ 目录 → 跳过并提示用户
- MERGE → 降级为 APPEND

### Step 4: 展示评估结果并请求确认
向用户展示每个片段的：
- 目标路径
- 操作类型（NEW/APPEND/MERGE/SKIP）
- L1 before → after (delta)
- L2 verdict（如果触发了）
- 内容摘要

等待用户确认后再执行。

### Step 5: 匹配与写入
对每个确认的片段：

1. 读取目标目录的 `_Index.md`
2. 按确认的操作类型执行：
   - **APPEND**: 在文档末尾追加内容
   - **MERGE**: 重新整合全文，合并重复，提炼总结
   - **NEW**: 创建新子目录和文档
   - **SKIP**: 不修改（记录到进化日志）

3. **体积约束**: 合并后行数 > 原文档 × 1.5 时，先压缩再写入

4. 文档格式要求（每个 .md 文件必须有 frontmatter）：
```yaml
---
type: knowledge
topic: "主题名"
created: "ISO8601时间"
updated: "ISO8601时间"
sources: 1
tags: [标签1, 标签2]
---
```

5. 写入后更新 frontmatter：
   - APPEND: updated 更新, sources +1, tags 合并去重
   - MERGE: updated 更新, version +1, sources 保留
   - NEW: 全部初始化

### Step 6: 记录进化日志
对每个片段（包括 SKIP），追加一行到 `{{agentmeDir}}/_Evolution.md`：

```
| 日期 | 文件路径 | 操作 | before分 | after分 | delta | 来源 | 备注 |
```

同时更新 _Evolution.md frontmatter 的 entries 计数和 last_updated。

### Step 7: 更新索引链
自底向上更新 `_Index.md`：
1. 叶子目录 _Index.md — 添加/更新文档条目
2. 父目录 _Index.md — 更新子目录摘要和 children 计数
3. 根 _Index.md — 更新 updated 和 last_archive

### Step 8: 更新身份摘要（跨平台）

读取 `~/.agentme.json` 配置文件，获取已安装平台列表。对每个已安装平台执行身份摘要更新。

1. **生成最新摘要**：重新读取 `{{agentmeDir}}/Me/Roles.md` 和 `{{agentmeDir}}/Current/focus.md`，生成身份摘要和当前焦点文本。

2. **按平台类型更新**：

| 平台 | 更新方式 | 目标文件 |
|------|---------|---------|
| cursor | 写入 Cursor Rule 文件 | `{{cursorRulePath}}/agentme-identity.mdc` |
| claude | 标记区块注入（`<!-- AGENTME:START/END -->`） | `~/.claude/CLAUDE.md` |
| agents (project) | 标记区块注入 | `./AGENTS.md`（当前工作目录） |
| agents (global) | 标记区块注入 | `~/.codex/AGENTS.md` |
| chatgpt | 输出到控制台供用户手动粘贴 | — |

3. **标记区块注入规则**：
   - 使用 `<!-- AGENTME:START -->` / `<!-- AGENTME:END -->` 标记
   - 文件不存在时创建，有标记时替换区块内容，无标记时追加到末尾
   - **不会**破坏用户在标记区块外的任何内容

4. **更新完成后**告知用户哪些平台已同步。
