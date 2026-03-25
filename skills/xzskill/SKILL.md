---
name: xzskill
description: 基于 skills 目录中的标准技能，生成对应的手动安装版本并同步 README
---

`xzskill` 现在通过仓库内脚本 `scripts/xzskill.js` 执行。

## 目标

用户传入一个 skill 名称后，仅基于 `工程根目录/skills/<skill-name>/SKILL.md` 生成对应的手动安装文件，并对 `README.md` 做最小范围同步。

## 输入约束

1. 只接受 **一个** skill 名称，例如：`review-sslb`。
2. 如果未传名称、传了多个名称、或无法明确解析为单个名称，提示用户重新输入。
3. 只认 `工程根目录/skills/<skill-name>/SKILL.md`，不从 `.agents` 目录取安装来源。
4. 不考虑依赖关系，不引入其他 skill 名称。
5. 如果 `<skill-name>` 是 `xzskill`，直接报错并停止，避免自引用生成。

## 执行方式

1. Claude 命令层只做薄封装。
2. 实际生成逻辑统一由 `工程根目录/scripts/xzskill.js` 完成。
3. 脚本是唯一执行真相；不要再让模型按规则手工生成目标文件。

## 脚本职责

1. 检查 `工程根目录/skills/<skill-name>/SKILL.md` 是否存在；不存在就报错并停止。
2. 读取 `工程根目录/skills/<skill-name>/SKILL.md`，将其作为唯一正文来源。
3. `.claude/commands/<skill-name>.md` 中已有的 wrapper 信息（如 `allowed-tools`、`argument-hint`、`用户输入` 后的补充说明）视为 Claude 侧真相，生成时需要保留。
4. 不读取其他 skill 文件，不扫描仓库中无关目录，不参考其他文件作为模板。
5. 生成目标文件时，默认采用“固定模板 + 正文直拷”策略：**不要改写源文件正文，不要重组，不要风格化重写。**
6. 先解析源文件 frontmatter：
   - 读取 `name`
   - 读取 `description`
7. 再取源文件 frontmatter 之后的正文，作为唯一正文载荷；正文段落顺序、标题层级、代码块、措辞保持原样。
8. 直接基于源文件内容生成或覆盖以下目标文件：
   - `.claude/commands/<skill-name>.md`
   - `.github/skills/<skill-name>.md`
   - `.trae/skills/<skill-name>.md`
   - `.trae/rules/<skill-name>.md`
9. 各目标文件的生成规则固定如下，不做临场判断：
   - `.claude/commands/<skill-name>.md`：保留 `name`、`description`，并尽量保留该文件中已有的 `allowed-tools`、`argument-hint` 与 `用户输入` 后补充说明；frontmatter 后固定追加空行、`用户输入：`、`$ARGUMENTS`、空行，再拼接保留段和源文件正文
   - `.github/skills/<skill-name>.md`：保留 `name`、`description` frontmatter 后，直接拼接源文件正文；不额外解释平台差异
   - `.trae/skills/<skill-name>.md`：保留 `name`、`description` frontmatter 后，直接拼接源文件正文；不额外改写
   - `.trae/rules/<skill-name>.md`：保留 `name`、`description` frontmatter 后，直接拼接源文件正文；不额外改写
10. 更新 `README.md` 时，只处理“当前已提供”列表：
   - 若列表中不存在 `工程根目录/skills/<skill-name>/SKILL.md`，则追加一行
   - 若已存在，则不重复添加
   - 不修改 README 其他段落，不重写全文
11. 全程只处理当前指定的 skill，完成后停止。

## 严格限制

1. 不修改 `.agents` 下任何内容。
2. 不扫描或操作无关 skill。
3. 不发明新的文件格式，不扩展安装体系。
4. 不为“参考现有格式”而搜索全仓文件。
5. 如果源 skill 不存在，不做任何写入。
6. 除 `工程根目录/skills/<skill-name>/SKILL.md`、当前 `.claude/commands/<skill-name>.md` 与 `README.md` 外，不读取其他 skill 文件。
7. 不为了“更像目标平台”而重写源 skill 正文；正文一律按源文件直拷，除固定头部和 Claude 侧保留段外不改。
8. 不调整正文章节顺序，不合并段落，不擅自增删规则。
9. 不自行推断平台差异，不自行设计额外字段；凡源文件未写明、规则未写死的内容，一律不补。
10. 若生成规则已固定，就按固定模板执行；不要反复比较“是否还能更像目标平台”。
11. 写入目标文件时，凡规则中出现的 `$ARGUMENTS`，都按普通文本占位符处理，禁止展开、禁止替换、禁止引用当前传入参数。

## 失败输出

- 若源文件不存在：`错误：工程根目录/skills/<skill-name>/SKILL.md 不存在，无法生成手动安装版本。`
- 若传入 `xzskill`：`错误：xzskill 不支持生成自身的手动安装版本，请改为处理其他 skill。`

## 成功输出

成功时只简要说明：

1. 使用了哪个源文件；
2. 更新了哪些目标文件；
3. README 是否已追加或确认已存在；
4. 已按最小必要范围完成同步。

