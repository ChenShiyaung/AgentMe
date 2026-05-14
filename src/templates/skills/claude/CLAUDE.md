# AgentMe 用户画像

## 身份摘要
{{identitySummary}}

## 当前焦点
{{currentFocus}}

## 深入了解
如需更详细的用户信息，使用文件系统工具读取以下文件:
- 人格详情: {{agentmeDir}}/Me/SOUL.md
- 知识库索引: {{agentmeDir}}/Knowledge/_Index.md
- 项目索引: {{agentmeDir}}/Product/_Index.md
- 工具链: {{agentmeDir}}/Tools/_Index.md
- 当前工作: {{agentmeDir}}/Current/_Index.md

## 归档指令
当用户说"归档"或"archive"时，执行以下流程：

1. 回顾本次对话所有内容
2. 提取有价值的信息片段，分类为：knowledge/product/tool/skill/me/current
3. 读取 {{agentmeDir}}/ 下对应目录的 _Index.md 进行匹配
4. 向用户展示提取结果并请求确认
5. 确认后写入文档（每个 .md 需要 YAML frontmatter）
6. 自底向上更新 _Index.md 索引链
7. 更新本文件（CLAUDE.md）中的身份摘要和当前焦点

### 文档格式
每个 .md 文件必须包含 frontmatter:
```yaml
---
type: knowledge
topic: "主题名"  
created: "ISO8601"
updated: "ISO8601"
sources: 1
tags: [标签]
---
```

### 写入策略
- NEW: 无匹配时创建新目录和文档
- APPEND: 匹配到且文档不大（<=150行, sources<5）追加内容
- MERGE: 文档过大时重新整合
