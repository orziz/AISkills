---
name: xzskill
description: 基于 skills 目录中的标准技能，生成对应的手动安装版本并同步 README
allowed-tools: [Read, Glob, Grep, Bash(git diff:*), Bash(git log:*)]
---

## 目标

用户传入一个 skill 名称后，仅基于 `skills/<skill-name>/SKILL.md` 生成对应的手动安装文件，并对 `README.md` 做最小范围同步。

## 输入约束

1. 只接受 **一个** skill 名称，例如：`sslb`。
2. 如果未传名称、传了多个名称、或无法明确解析为单个名称，提示用户重新输入。
3. 只认 `skills/<skill-name>/SKILL.md`，不从 `.agents` 目录取安装来源。
4. 不考虑依赖关系，不引入其他 skill 名称。
5. 如果 `<skill-name>` 是 `xzskill`，直接报错并停止，避免自引用生成。

## 执行步骤

1. 检查 `skills/<skill-name>/SKILL.md` 是否存在；不存在就报错并停止。
2. 读取 `skills/<skill-name>/SKILL.md`，将其作为唯一正文来源。
3. 不读取其他 skill 文件，不扫描仓库中无关目录，不参考其他文件作为模板。
4. 生成目标文件时，默认采用“固定模板 + 正文直拷”策略：**不要改写源文件正文，不要重组，不要风格化重写。**
5. 先解析源文件 frontmatter：
   - 读取 `name`
   - 读取 `description`
   - 其他 frontmatter 字段一律不推断、不扩写
6. 再取源文件 frontmatter 之后的正文，作为唯一正文载荷；正文段落顺序、标题层级、代码块、措辞保持原样。
7. 直接基于源文件内容生成或覆盖以下目标文件：
   - `.claude/commands/<skill-name>.md`
   - `.github/skills/<skill-name>.md`
   - `.trae/skills/<skill-name>.md`
   - `.trae/rules/<skill-name>.md`
8. 各目标文件的生成规则固定如下，不做临场判断：
   - `.claude/commands/<skill-name>.md`：
     1. 写入 frontmatter，并固定只包含：`name`、`description`
     2. 若源 skill 已明确需要参数，则补 `argument-hint`；否则不补
     3. 若源 skill 已明确限制工具，才补 `allowed-tools`；否则不凭空添加
     4. frontmatter 结束后，固定追加以下字面内容，逐字写入目标文件，不做变量替换、不代入当前参数：
        - 一个空行
        - `用户输入：`
        - `$ARGUMENTS`
        - 一个空行
     5. 这里的 `$ARGUMENTS` 仅是目标文件中的占位符文本，不是当前执行时要展开的值；生成文件时严禁把它替换成 `sslb` 或其他实际参数
     6. 若源正文已明确写明“未传参时如何处理”，则保留原文；否则不额外补规则
     7. 最后直接拼接源文件正文，不改正文语义
   - `.github/skills/<skill-name>.md`：保留 `name`、`description` frontmatter 后，直接拼接源文件正文；不额外解释平台差异
   - `.trae/skills/<skill-name>.md`：保留 `name`、`description` frontmatter 后，直接拼接源文件正文；不额外改写
   - `.trae/rules/<skill-name>.md`：保留 `name`、`description` frontmatter 后，直接拼接源文件正文；不额外改写
9. 更新 `README.md` 时，只处理“当前已提供”列表：
   - 若列表中不存在 `skills/<skill-name>/SKILL.md`，则追加一行
   - 若已存在，则不重复添加
   - 不修改 README 其他段落，不重写全文
10. 全程只处理当前指定的 skill，完成后停止。

## 严格限制

1. 不修改 `.agents` 下任何内容。
2. 不扫描或操作无关 skill。
3. 不发明新的文件格式，不扩展安装体系。
4. 不为“参考现有格式”而搜索全仓文件。
5. 如果源 skill 不存在，不做任何写入。
6. 除 `skills/<skill-name>/SKILL.md` 与 `README.md` 外，不读取其他 skill 文件。
7. 不为了“更像目标平台”而重写源 skill 正文；正文一律按源文件直拷，除固定头部外不改。
8. 不调整正文章节顺序，不合并段落，不擅自增删规则。
9. 不自行推断平台差异，不自行设计额外字段；凡源文件未写明、规则未写死的内容，一律不补。
10. 若生成规则已固定，就按固定模板执行；不要反复比较“是否还能更像目标平台”。
11. 写入目标文件时，凡规则中出现的 `$ARGUMENTS`，都按普通文本占位符处理，禁止展开、禁止替换、禁止引用当前传入参数。

## 失败输出

- 若源文件不存在：`错误：skills/<skill-name>/SKILL.md 不存在，无法生成手动安装版本。`
- 若传入 `xzskill`：`错误：xzskill 不支持生成自身的手动安装版本，请改为处理其他 skill。`

## 成功输出

成功时只简要说明：

1. 使用了哪个源文件；
2. 更新了哪些目标文件；
3. README 是否已追加或确认已存在；
4. 已按最小必要范围完成同步。

