# Changelog

## v0.1.0 (2025-05-14)

### Features

- **agentme init**: 交互式初始化画像目录，支持自定义路径、身份引导、Git 初始化
- **agentme status**: 画像统计、平台状态、健康提示、进化数据一览
- **agentme validate**: 校验目录结构、文档格式、索引一致性，支持 `--fix` 自动修复
- **Cursor 集成**: SKILL (agentme-archive) + Rule (agentme-identity)，支持全局/项目级安装
- **Claude 集成**: 标记区块注入到 `~/.claude/CLAUDE.md`，不覆盖用户已有内容
- **AGENTS.md 集成**: 支持 Codex / Gemini CLI / Windsurf / Copilot，项目级和全局两种范围
- **ChatGPT 集成**: 生成 Custom Instructions 文本
- **知识进化系统**: L1 机械评分 (结构/体积/新鲜度/连接度/密度) + L2 语义评分协议
- **棘轮机制**: 归档时对比 before/after 分数，防止知识退化
- **进化日志**: `_Evolution.md` 记录每笔归档操作的评分和决策
- **标记区块注入**: 安全的幂等注入机制，保护用户在标记外的内容
- **持久化配置**: `~/.agentme.json` 记录初始化状态，支持增量安装新平台
