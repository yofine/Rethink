---
title: Lessons from Building Claude Code: How We Use Skills
source: 用户提供
translated: 2026-03-18
---

# 构建 Claude Code 的经验：我是如何使用 Skills 的

Skills 已经成为 Claude Code 中最常用的扩展点之一。它们灵活、易于创建、简单分发。

但这种灵活性也让我们很难知道什么才是最佳实践。哪种类型的 skills 值得制作？编写一个好的 skill 的秘诀是什么？什么时候应该分享给他人？

我们在 Anthropic 广泛使用 skills，已经有数百个正在使用。以下是我们学到的关于使用 skills 加速开发的经验。

## 什么是 Skills？

如果你是 skills 的新手，推荐阅读我们的文档或观看 Skilljar 上的最新课程《Agent Skills》。本文假设你已经对 skills 有一定了解。

我们听到的一个常见误解是 skills "只是 markdown 文件"，但 skills 最有趣的部分在于它们不仅仅是文本文件。它们是可以包含脚本、资产、数据等的文件夹，代理可以发现、探索和操作这些内容。

在 Claude Code 中，skills 还有很多配置选项，包括注册动态钩子。我们发现 Claude Code 中一些最有意思的 skills 创造性地使用了这些配置选项和文件夹结构。

## Skills 的类型

在对所有 skills 进行分类后，我们注意到它们可以分为几个反复出现的类别。最好的 skills 清楚地属于其中一类；而那些比较模糊的则会跨越多个类别。这不是一个确定的列表，但却是思考你是否在组织内缺少某些类型的好方法。

### 1. 库和 API 引用

Skills 用于解释如何正确使用库、CLI 或 SDK。这些可能是内部库或 Claude Code 有时容易出错的常见库。这些 skills 通常包含一个参考代码片段文件夹和一份 "坑" 列表，供 Claude 在编写脚本时避免。

示例：
- billing-lib — 你的内部账单库：边缘情况、常见陷阱等
- internal-platform-cli — 你的内部 CLI 包装器的每个子命令及使用示例
- frontend-design — 让 Claude 更擅长你的设计系统

### 2. 产品验证

Skills 用于描述如何测试或验证你的代码是否正常工作。这些通常与 Playwright、tmux 等外部工具配对使用，以进行验证。

验证 skills 对于确保 Claude 的输出正确非常有用。让工程师花一周时间专门优化你的验证 skills 是值得的。

考虑一些技巧，比如让 Claude 录制其输出的视频，这样你就能看到它测试了什么；或者在每个步骤对状态进行编程式断言。这些通常通过在 skill 中包含各种脚本来实现。

示例：
- signup-flow-driver — 在无头浏览器中运行注册 → 邮件验证 → 引导流程，并在每个步骤包含状态断言的钩子
- checkout-verifier — 使用 Stripe 测试卡驱动结账 UI，验证发票确实进入正确状态
- tmux-cli-driver — 用于交互式 CLI 测试，当需要验证的东西需要 TTY 时

### 3. 数据获取与分析

Skills 用于连接你的数据和监控堆栈。这些 skills 可能包含用于获取数据的凭证库、特定的仪表板 ID 等，以及有关常见工作流或获取数据方法的说明。

示例：
- funnel-query — "我需要连接哪些事件才能看到注册 → 激活 → 付费"，加上实际包含规范 user_id 的表
- cohort-compare — 比较两个队列的留存或转化，标记统计上显著的差异，关联到细分定义
- grafana — 数据源 UID、集群名称、问题 → 仪表板查找表

### 4. 业务流程和团队自动化

Skills 将重复性工作流自动化为一条命令。这些 skills 通常是相当简单的指令，但可能对其他 skills 或 MCP 有更复杂的依赖。在这些 skills 中，将之前的结果保存在日志文件中可以帮助模型保持一致并回顾工作流的之前执行。

示例：
- standup-post — 聚合你的 ticket tracker、GitHub 活动和之前的 Slack → 格式化的站会，只显示变化
- create-<ticket-system>-ticket — 强制执行 schema（有效的枚举值、必填字段）加上创建后工作流（ping 审查者、在 Slack 中关联）
- weekly-recap — 合并的 PR + 关闭的 ticket + 部署 → 格式化的每周总结

### 5. 代码脚手架和模板

Skills 用于在代码库中为特定功能生成框架样板。你可以将这些 skills 与可组合的脚本结合使用。当你的脚手架有无法仅通过代码覆盖的自然语言需求时，这些尤其有用。

示例：
- new-<framework>-workflow — 用你的注解搭建新的 service/workflow/handler
- new-migration — 你的迁移文件模板加上常见的坑
- create-app — 新的内部应用，包含预配置的 auth、logging 和 deploy 配置

### 6. 代码质量和审查

Skills 用于在组织内执行代码质量并帮助审查代码。这些可以包括确定性脚本或工具以获得最大鲁棒性。你可能希望将这些 skills 作为钩子的一部分自动运行，或在 GitHub Action 中运行。

示例：
- adversarial-review — 生成一个全新视角的子代理来批评，实施修复，迭代直到问题降级为吹毛求疵
- code-style — 强制执行代码风格，特别是 Claude 默认做得不好的风格
- testing-practices — 关于如何编写测试以及测试什么的说明

### 7. CI/CD 和部署

Skills 用于帮助你获取、推送和部署代码。这些 skills 可能引用其他 skills 来收集数据。

示例：
- babysit-pr — 监控 PR → 重试不稳定的 CI → 解决合并冲突 → 启用自动合并
- deploy-<service> — 构建 → 冒烟测试 → 渐进式流量滚动，错误率比较 → 回滚
- cherry-pick-prod — 隔离的工作树 → cherry-pick → 冲突解决 → 带模板的 PR

### 8. 运行手册

Skills 接受一个症状（如 Slack 线程、告警或错误签名），进行多工具调查，并生成结构化报告。

示例：
- <service>-debugging — 将症状映射到工具 → 查询模式，用于你流量最高的服务
- oncall-runner — 获取告警 → 检查常见嫌疑 → 格式化发现
- log-correlator — 给定请求 ID，从每个可能涉及的系统拉取匹配的日志

### 9. 基础设施运维

Skills 用于执行常规维护和操作程序——其中一些涉及破坏性操作，需要护栏。这些使得工程师更容易在关键操作中遵循最佳实践。

示例：
- <resource>-orphans — 查找孤立的 pod/volumes → 发布到 Slack → 浸泡期 → 用户确认 → 级联清理
- dependency-management — 你的组织依赖审批工作流
- cost-investigation — "为什么我们的存储/出口账单飙升"，包含特定的桶和查询模式

---

## 制作 Skills 的技巧

一旦你决定了要制作什么 skill，你应该怎么写？以下是我们发现的一些最佳实践、技巧和诀窍。

我们最近还发布了 Skill Creator 来简化在 Claude Code 中创建 skills 的过程。

### 不要说显而易见的事

Claude Code 对你的代码库了解很多，Claude 对编码也很了解，包括很多默认观点。如果你发布的 skill 主要是关于知识的，试着聚焦于将 Claude 从其正常思维方式中拉出的信息。

frontend-design skill 就是一个很好的例子——它是由 Anthropic 的一位工程师通过与客户迭代改进 Claude 的设计品味而构建的，避免了经典的模式，如 Inter 字体和紫色渐变。

### 建立一个"坑"部分

任何 skill 中最高信号的内容是"坑"部分。这些部分应该从 Claude 在使用你的 skill 时遇到的常见失败点中构建。理想情况下，你会随着时间推移更新你的 skill 以记录这些坑。

### 使用文件系统渐进式披露

就像我们之前说的，skill 是一个文件夹，而不仅仅是 markdown 文件。你应该将整个文件系统视为一种上下文工程和渐进式披露形式。告诉 Claude 你的 skill 中有哪些文件，它会在适当的时候读取它们。

渐进式披露最简单的形式是指向其他 markdown 文件供 Claude 使用。例如，你可能会将详细的函数签名和使用示例拆分为 references/api.md。

另一个例子：如果你的最终输出是一个 markdown 文件，你可能会在 assets/ 中包含一个模板文件供复制和使用。

你可以有参考文件夹、脚本、示例等，这有助于 Claude 更有效地工作。

### 避免让 Claude 走投无路

Claude 通常会尽力遵守你的指令，而且因为 Skills 是如此可重用，你需要小心在指令中过于具体。给 Claude 所需的信息，但给它适应情况的灵活性。

### 考虑设置

一些 skills 可能需要从用户那里设置上下文。例如，如果你制作了一个将站会发布到 Slack 的 skill，你可能希望 Claude 询问要发布到哪个 Slack 频道。

一个好的模式是在 skill 目录中像上面的例子一样将这个设置信息存储在 config.json 文件中。如果配置没有设置，代理可以向用户询问信息。

如果希望代理呈现结构化的多选问题，你可以指示 Claude 使用 AskUserQuestion 工具。

### 描述字段是为模型准备的

当 Claude Code 开始一个会话时，它会构建每个可用 skill 及其描述的列表。这个列表是 Claude 扫描以决定"这个请求有没有对应的 skill？"的依据。这意味着描述字段不是摘要——而是关于何时触发这个 PR 的描述。

### 内存和数据存储

一些 skills 可以通过在其中存储数据来包含一种内存形式。你可以存储在仅追加的文本日志文件或 JSON 文件中，也可以使用像 SQLite 数据库这样复杂的形式。

例如，一个 standup-post skill 可能会保留一个 standups.log，记录它写过的每次站会，这意味着下次你运行它时，Claude 会读取自己的历史，可以告诉你自昨天以来发生了什么变化。

存储在 skill 目录中的数据可能在升级 skill 时被删除，所以你应该存储在稳定的文件夹中。截至今天，我们提供 `${CLAUDE_PLUGIN_DATA}` 作为每个插件的稳定文件夹来存储数据。

### 存储脚本和生成代码

你可以给 Claude 的最强大的工具之一是代码。给 Claude 脚本和库，让 Claude 把时间花在组合和决定下一步做什么上，而不是重构样板。

例如，在你的数据科学 skill 中，你可能有一个从事件源获取数据的函数库。为了让 Claude 进行复杂分析，你可以给它一套辅助函数。

然后 Claude 可以动态生成脚本来组合这些功能，为"周二发生了什么？"这样的提示做更高级的分析。

### 按需钩子

Skills 可以包含仅在调用 skill 时激活并持续会话期间的钩子。使用这个功能来处理你不想一直运行但在某些时候非常有用的更有主见的钩子。

例如：
- /careful — 通过 Bash 上的 PreToolUse 匹配器阻止 rm -rf、DROP TABLE、force-push、kubectl delete。你只在知道要接触生产时才想要这个——一直开着会让你发疯
- /freeze — 阻止任何不在特定目录中的编辑/写入。调试时有用："我想添加日志但总是无意中'修复'不相关的东西"

---

## 分发 Skills

Skills 最大的好处之一是你可以与团队的其他成员分享。

有两种方式可以与他人分享 skills：
- 将你的 skills 签入你的仓库（放在 ./.claude/skills 下）
- 制作一个插件，让用户上传和安装插件（在 Claude Code Plugin  marketplace）

对于在相对较少的仓库中工作的小团队，将 skills 签入仓库效果很好。但每个签入的 skills 也会给模型的上下文增加一点内容。随着规模扩大，内部插件 marketplace 允许你分发 skills，让你的团队决定安装哪些。

### 管理 Marketplace

你如何决定哪些 skills 进入 marketplace？人们如何提交？

我们没有集中化的团队来决定；相反，我们尝试有机地找到最有用的 skills。如果你有一个想让人们试用的 skills，你可以把它上传到 GitHub 的沙箱文件夹，然后在 Slack 或其他论坛指向它。

一旦一个 skill 获得了吸引力（这由 skill 所有者决定），他们可以提交 PR 将其移入 marketplace。

一个警告：在发布前确保你有某种策划方法，因为创建糟糕或冗余的 skills 很容易。

### 组合 Skills

你可能想要有相互依赖的 skills。例如，你可能有一个上传文件的上传 skill 和一个生成 CSV 并上传的 CSV 生成 skill。这种依赖管理在 marketplace 或 skills 中还没有原生构建，但你可以通过名称引用其他 skills，如果它们已安装，模型会调用它们。

### 测量 Skills

为了了解一个 skill 的表现如何，我们使用 PreToolUse 钩子让我们在公司内记录 skill 使用情况。这意味着我们可以找到受欢迎的 skills 或与我们预期相比触发不足的 skills。

---

## 总结

Skills 对于代理来说是非常强大、灵活的工具，但现在仍处于早期阶段，我们都在摸索如何最好地使用它们。

把这更多地视为我们见过的有效的技巧集合，而不是权威指南。理解 skills 的最好方式是开始、实验，看看什么最适合你。我们的多数 skills 最初只是几行和一个单一的坑，因为人们不断添加内容而变得更好，因为 Claude 遇到了新的边缘情况。

希望这对你有帮助，如果你有任何问题请告诉我。