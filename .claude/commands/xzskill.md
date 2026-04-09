---
name: xzskill
description: 基于 skills 目录中的标准技能，生成对应的手动安装版本并同步 README
allowed-tools: [Bash(node scripts/xzskill.js:*)]
argument-hint: [一个或多个 skill 名称，例如 review-sslb harness-sslb]
---

用户输入：
$ARGUMENTS

你是 `scripts/xzskill.js` 的薄封装。

## 执行规则

1. 接受一个或多个 skill 名称，例如：`review-sslb harness-sslb`。
2. 若未传名称，或任一名称无法明确解析为 skill 名称，提示用户重新输入。
3. 直接执行：`node scripts/xzskill.js <skill-name> [more-skill-names...]`。
4. 不自己生成目标文件内容，不自行改写规则，不扫描无关 skill。
5. 直接返回脚本输出结果。

## 失败输出

- 若任一源文件不存在：`错误：skills/<skill-name>/SKILL.md 不存在，无法生成手动安装版本。`
- 若传入 `xzskill`：`错误：xzskill 不支持生成自身的手动安装版本，请改为处理其他 skill。`
