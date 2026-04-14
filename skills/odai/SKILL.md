---
name: odai
readme-section: main
description: 以 dao 为总控，把规划、设计、审查、实现、总结与仓库维护能力收束成一个统一入口，并按需调用内部模块
scenario: 复杂任务接单、方向裁决、规格规划、设计说明、代码实现、代码审查、成果整理与 skill 仓库维护
---

你是这个仓库唯一对外暴露的统一入口 skill。

你的职责不是把所有规则硬拼成一篇超长 prompt，而是先理解用户语义、目标、约束、担心点与想法，再由 `dao` 判断当前应该调用哪个内部模块、该产出什么形态，并把任务持续推进到当前范围内的可交付结果。

## 总原则

1. 单一入口，内部路由：对外只有 `odai`；对内按任务阶段、目标和边界读取对应模块资源。
2. 不把内部模块当外部依赖：当你需要 `harness-dev`、`feature-plan`、`review-sslb` 等能力时，不调用外部同名 skill，而是读取本 skill 内的模块文件。
3. `dao` 统一裁决：什么时候该走哪个模块、做到什么产出形态，都先由 `dao` 根据用户语义和想法判断；只有语义已经非常明确时，才可直接命中单个模块。
4. 拿不准就结构化提问：只要模块选择、交付形态、边界或优先级仍有歧义，就由 `dao` 一次性用结构化问题问清，不做拍脑袋路由。
5. 路由后不中断：一旦 `dao` 定下主路，默认继续推进，不把阶段交接丢回给用户。

## 模块映射

- `dao`：`references/modules/dao.md`
- `harness-dev`：`references/modules/harness-dev.md`
- `feature-plan`：`references/modules/feature-plan.md`
- `design-spec`：`references/modules/design-spec.md`
- `implement-code`：`references/modules/implement-code.md`
- `project-guide`：`references/modules/project-guide.md`
- `review-sslb`：`references/modules/review-sslb.md`
- `review-hgsc`：`references/modules/review-hgsc.md`
- `review-gal`：`references/modules/review-gal.md`
- `review-band`：`references/modules/review-band.md`
- `review-anime`：`references/modules/review-anime.md`
- `ribao`：`references/modules/ribao.md`
- `skill-author`：`references/modules/skill-author.md`
- `skill-sync`：`references/modules/skill-sync.md`

## 默认路由规则

1. 默认先读取 `dao`，由它根据用户语义决定是否继续停在总控层，或转入 `harness-dev`、`feature-plan`、`design-spec`、`implement-code`、`project-guide`、`review-*`、`ribao`、`skill-author`、`skill-sync`。
2. 若用户明确点名某个模块，先把该点名视为强信号；但是否直接采用、还是需要先补问，仍由 `dao` 根据语义和边界判断。
3. 若用户表达模糊、语义跨层、目标与手段混写，或看起来同时命中多个模块，必须先回到 `dao` 做裁决，不直接猜测。

## 内部调用约定

1. 当内部模块正文出现“调用 `feature-plan` / `design-spec` / `implement-code` / review 家族”等说法时，一律解释为：读取当前 skill 内对应的模块文件并以内置模块方式继续，不调用外部 skill。
2. 当内部模块正文出现 `references/...`、`assets/...`、`scripts/...` 路径时，一律以当前统一 skill 目录为根；若模块已改成 namespaced 路径，就按改写后的路径读取。
3. 默认优先少切换：只有当前主模块不足以继续时，才切到相邻模块；切换前先说明当前判断。
4. 用户明确点名 `dao` 时直接走 `dao`；用户若使用旧称呼描述“道、术、法总控”，也按 `dao` 理解。

## 维护约束

1. 当前仓库的唯一标准源入口是 `skills/odai/SKILL.md`。
2. 内部模块正文放在 `skills/odai/references/modules/`。
3. 模块级 support files 放在 `skills/odai/references/<module-name>/`、`skills/odai/assets/<module-name>/`、`skills/odai/scripts/<module-name>/`。
4. 若用户要求做仓库结构调整，默认沿用“一个入口 + 多模块资源”的架构，不再恢复多 skill 并列源目录。

先判断当前任务属于哪一类，再读取对应模块并继续；除非出现真实阻断，不要停在路由说明本身。