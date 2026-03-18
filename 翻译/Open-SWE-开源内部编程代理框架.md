---
title: Open SWE: An Open-Source Framework for Internal Coding Agents
source: https://langchain.dev/blog/open-swe/
translated: 2026-03-18
---

# Open SWE：内部编程代理的开源框架

过去一年，我们观察到多家工程组织构建了与开发团队协作的内部编程代理。Stripe 开发了 Minions，Ramp 构建了 Inspect，Coinbase 创建了 Cloudbot。这些系统与现有工作流集成（通过 Slack、Linear 和 GitHub 访问），而非要求工程师采用新接口。

尽管这些系统是独立开发的，但它们在架构模式上趋于一致：隔离的云沙箱、精选的工具集、子代理编排，以及与开发者工作流的集成。这种趋同表明在生产环境中部署 AI 代理存在一些共同需求。

今天，我们发布 Open SWE，这是一个以可定制形式捕获这些模式的开源框架。Open SWE 基于 Deep Agents 和 LangGraph 构建，提供了我们在这类实现中观察到的核心架构组件。如果你的组织正在探索内部编程代理，这可以作为一个起点。

## 生产部署中的模式

当我们研究 Stripe、Ramp 和 Coinbase 如何构建编程代理时，发现他们做出了类似的架构决策。以下是这些系统的共同点：

**隔离的执行环境**：任务在专用的云沙箱中运行，拥有完整权限但在严格边界内。这将任何错误的影响范围与生产系统隔离，同时允许代理无需逐个审批即可执行命令。

**精选的工具集**：根据 Stripe 工程团队的描述，他们的代理可以访问约 500 个工具，但这些工具是经过精心选择和维护的，而不是随着时间积累的。工具的质量似乎比数量更重要。

**Slack 优先的调用**：这三个系统都将 Slack 作为主要接口进行集成，在开发者现有的沟通工作流中接触他们，而不是要求切换到新应用。

**启动时的丰富上下文**：这些代理在开始工作前从 Linear issues、Slack 线程或 GitHub PR 中获取完整上下文，减少了通过工具调用发现需求的开销。

**子代理编排**：复杂任务被分解并委托给专门的子代理，每个子代理拥有隔离的上下文和专注的职责。

这些架构选择在多个生产部署中已被证明有效，不过组织可能需要根据自身环境和需求调整具体组件。

## Open SWE 的架构

Open SWE 提供了类似模式的开源实现。以下是框架如何映射到我们观察到的实现：

### 1. Agent Harness：基于 Deep Agents 构建

Open SWE 不是fork现有代理或从零开始，而是基于 Deep Agents 框架进行构建。这与 Ramp 团队在 OpenCode 之上构建 Inspect 的方式类似。

组合方式有两个优势：

- **升级路径**：当 Deep Agents 改进时（更好的上下文管理、更高效的规划、更优化的 token 使用），你可以整合这些改进而不需要重建你的定制。
- **无需 fork 的定制**：你可以将组织特定的工具、提示和工作流保持为配置，而不是修改核心代理逻辑。

```python
create_deep_agent(
    model="anthropic:claude-opus-4-6",
    system_prompt=construct_system_prompt(repo_dir, ...),
    tools=[
        http_request,
        fetch_url,
        commit_and_open_pr,
        linear_comment,
        slack_thread_reply
    ],
    backend=sandbox_backend,
    middleware=[
        ToolErrorMiddleware(),
        check_message_queue_before_model,
        ...
    ],
)
```

Deep Agents 提供了可以支持这些模式的基础设施：内置的基于 write_todos 的规划、基于文件的上下文管理、通过 task 工具原生支持子代理生成，以及用于确定性编排的中间件钩子。

### 2. Sandbox：隔离的云环境

每个任务在其独立的隔离云沙箱中运行，这是一个具有完整 shell 访问权限的远程 Linux 环境。仓库被克隆进来，代理拥有完整权限，任何错误都限制在该环境内。

Open SWE 开箱即用支持多种沙箱提供商：

- Modal
- Daytona
- Runloop
- LangSmith

你也可以实现自己的沙箱后端。

这遵循了我们观察到的模式：先隔离，然后在边界内授予完整权限。

关键行为：
- 每个对话线程获得一个持久化的沙箱，跨后续消息重用
- 如果沙箱变得无法访问，会自动重新创建
- 多个任务并行运行，每个任务在各自的沙箱中

### 3. Tools：精选而非累积

Open SWE 附带了一个聚焦的工具集：

- Bash
- Glob
- Grep
- Read_file
- Write_file
- Edit_file
- Ls
- http_request
- fetch_url
- commit_and_open_pr

加上内置的 Deep Agents 工具：read_file、write_file、edit_file、ls、glob、grep、write_todos 和 task（子代理生成）。

更小、更精选的工具集更容易测试、维护和推理。当你的组织需要额外工具时（内部 API、自定义部署系统、专业测试框架），可以明确添加。

### 4. 上下文工程：AGENTS.md + 源代码上下文

Open SWE 从两个来源收集上下文：

- **AGENTS.md 文件**：如果你的仓库根目录包含 AGENTS.md 文件，它会从沙箱中读取并注入系统提示。这个文件可以编码约定、测试要求、架构决策和每个代理运行都应该遵循的团队特定模式。
- **源代码上下文**：完整的 Linear issue（标题、描述、评论）或 Slack 线程历史被组装并在代理开始前传递，提供任务特定的上下文，无需额外的工具调用。

这种双层方法平衡了仓库范围的知识与任务特定的信息。

### 5. 编排：子代理 + 中间件

Open SWE 的编排结合了两种机制：

**子代理**：Deep Agents 框架支持通过 task 工具生成子代理。主代理可以将独立子任务委托给隔离的子代理，每个子代理有自己的中间件堆栈、待办事项列表和文件操作。

**中间件**：确定性中间件钩子在代理循环周围运行：

- `check_message_queue_before_model`：在下一个模型调用之前注入后续消息（Linear 评论或 Slack 消息）。这允许用户在代理工作时提供额外输入。
- `open_pr_if_needed`：作为安全网，如果代理没有完成此步骤则提交并打开 PR。这确保关键步骤可靠地发生。
- `ToolErrorMiddleware`：优雅地捕获和处理工具错误。

这种代理驱动（模型驱动）和确定性（中间件驱动）编排的分离可以帮助平衡可靠性与灵活性。

### 6. 调用：Slack、Linear 和 GitHub

我们观察到许多团队在 Slack 上收敛为主要调用表面。Open SWE 遵循类似的模式：

- **Slack**：在任何线程中提及机器人。支持 repo:owner/name 语法来指定要使用的仓库。代理在线程中回复状态更新和 PR 链接。
- **Linear**：在任何 issue 上评论 @openswe。代理读取完整的 issue 上下文，做出 👀 表情表示确认，并将结果作为评论发布。
- **GitHub**：在代理创建的 PR 上评论中标记 @openswe，让它处理审查反馈并将修复推送到同一分支。

每次调用都会创建确定的线程 ID，因此同一 issue 或线程上的后续消息会路由到同一运行中的代理。

### 7. 验证：提示驱动 + 安全网

代理被指示在提交前运行 linters、formatters 和 tests。open_pr_if_needed 中间件作为后盾——如果代理完成时没有打开 PR，中间件自动处理。

你可以通过添加确定性 CI 检查、视觉验证或审查门作为额外的中间件来扩展这个验证层。

## 为什么是 Deep Agents

Deep Agents 提供了使这种架构可组合和可维护的基础。

**上下文管理**：长时间运行的编程任务可能产生大量中间数据（文件内容、命令输出、搜索结果）。Deep Agents 通过基于文件的内存处理，将大型结果卸载，而不是将所有内容保存在对话历史中。这可以帮助在处理更大的代码库时防止上下文溢出。

**规划原语**：内置的 write_todos 工具提供了一种结构化的方式来分解复杂工作、跟踪进度以及根据新信息调整计划。我们发现这对于跨越较长时间的多步骤任务特别有帮助。

**子代理隔离**：当主代理通过 task 工具生成子代理时，该子代理获得自己的隔离上下文。不同的子任务不会相互污染对话历史，这可以在复杂的多方面工作中带来更清晰的推理。

**中间件钩子**：Deep Agents 的中间件系统允许你在代理循环中的特定点注入确定性逻辑。这就是 Open SWE 实现消息注入和自动 PR 创建的方式——这些行为需要可靠地发生。

**升级路径**：由于 Deep Agents 作为独立库积极开发，对上下文压缩、提示缓存、规划效率和子代理编排的改进可以流向 Open SWE，而不需要你重建定制。

这种可组合性提供了与 Ramp 团队在 OpenCode 之上构建时描述的类似优势：你获得一个维护中、不断改进的基础，同时保留对组织特定层的控制。

## 为你的组织定制

Open SWE 旨在作为可定制的基础，而不是成品。每个主要组件都是可插拔的：

- **沙箱提供商**：在 Modal、Daytona、Runloop 或 LangSmith 之间切换。如果有内部基础设施要求，也可以实现自己的沙箱后端。
- **模型**：使用任何 LLM 提供商。默认是 Claude Opus 4，但可以为不同的子任务配置不同的模型。
- **工具**：为你的内部 API、部署系统、测试框架或监控平台添加工具。移除不需要的工具。
- **触发器**：修改 Slack、Linear 和 GitHub 集成逻辑。添加新的触发表面，如 email、webhooks 或自定义 UI。
- **系统提示**：自定义基础提示和合并 AGENTS.md 文件的逻辑。添加组织特定的说明、约束或约定。
- **中间件**：添加你自己的验证、审批门、日志或安全检查的中间件钩子。

## 与内部实现的比较

以下是基于公开信息，Open SWE 与 Stripe、Ramp 和 Coinbase 的内部系统的比较：

| 特性 | Stripe Minions | Ramp Inspect | Coinbase Cloudbot | Open SWE |
|------|----------------|--------------|-------------------|----------|
| 框架 | 闭源 | 闭源 | 闭源 | Deep Agents + LangGraph |
| 沙箱 | 内部 | 内部 | 内部 | Modal/Daytona/Runloop/LangSmith |
| 调用 | Slack | Slack/Linear | Slack/GitHub | Slack/Linear/GitHub |
| 许可 | 专有 | 专有 | 专有 | MIT |

核心模式是相似的。差异在于实现细节、内部集成和组织特定的工具——这正是根据不同环境调整框架时你所期望的。

## 快速开始

Open SWE 现已在 GitHub 上可用。

- **安装指南**：逐步介绍 GitHub App 创建、LangSmith 设置、Linear/Slack/GitHub 触发器和生产部署。
- **定制指南**：展示如何交换沙箱、模型、工具、触发器、系统提示和中间件。

该框架采用 MIT 许可证。你可以 fork 它、定制它并在内部部署。如果你在其上构建了有趣的东西，我们很想听听。

---

多家工程组织已成功在生产中部署内部编程代理。Open SWE 提供了类似架构模式的开源实现，旨在为不同代码库和工作流进行定制。虽然我们仍在学习什么在不同上下文中有效，但这个框架为探索这种方法提供了起点。

尝试 Open SWE：github.com/langchain-ai/open-swe
了解 Deep Agents：docs.langchain.com/oss/python/deepagents
了解 LangSmith Sandboxes：https://blog.langchain.com/introducing-langsmith-sandboxes-secure-code-execution-for-agents/
阅读文档：Open SWE 文档