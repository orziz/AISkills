#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const SELF_SKILL = 'xzskill'
const README_TABLE_HEADER = '| Skill | 简介 | 适用场景 | 对应文件 |'
const README_ROW_TEMPLATE = '| `{name}` | {description} | {scenario} | `skills/{name}/SKILL.md` |'
const DEFAULT_SCENARIO = '维护或新增 skill 时做多端同步'
const CLAUDE_ARGUMENT_BLOCK = '\n用户输入：\n$ARGUMENTS\n\n'
const MISSING_SOURCE_TEMPLATE = '错误：skills/{name}/SKILL.md 不存在，无法生成手动安装版本。'
const SELF_REFERENCE_ERROR = '错误：xzskill 不支持生成自身的手动安装版本，请改为处理其他 skill。'
const USAGE_ERROR = '错误：请只传入一个 skill 名称，例如：xzskill review-sslb'

function main() {
  const args = process.argv.slice(2)
  if (args.length !== 1) {
    fail(USAGE_ERROR)
  }

  const skillName = args[0].trim()
  if (!skillName || /\s/.test(skillName)) {
    fail(USAGE_ERROR)
  }
  if (skillName === SELF_SKILL) {
    fail(SELF_REFERENCE_ERROR)
  }

  const repoRoot = path.resolve(__dirname, '..')
  const sourcePath = path.join(repoRoot, 'skills', skillName, 'SKILL.md')
  const readmePath = path.join(repoRoot, 'README.md')
  const existingClaudePath = path.join(repoRoot, '.claude', 'commands', `${skillName}.md`)

  if (!fs.existsSync(sourcePath)) {
    fail(MISSING_SOURCE_TEMPLATE.replace('{name}', skillName))
  }

  const sourceText = readNormalized(sourcePath)
  const { frontmatter: sourceFrontmatter, body: sourceBody } = splitFrontmatter(sourceText)
  const sourceName = getFrontmatterValue(sourceFrontmatter, 'name') || skillName
  const description = getFrontmatterValue(sourceFrontmatter, 'description') || ''

  const existingClaudeText = fs.existsSync(existingClaudePath) ? readNormalized(existingClaudePath) : null
  const existingClaude = existingClaudeText ? splitClaudeWrapper(existingClaudeText) : null

  const claudeText = buildClaudeTarget({
    name: sourceName,
    description,
    body: sourceBody,
    existingClaude,
  })
  const genericText = buildGenericTarget({
    name: sourceName,
    description,
    body: sourceBody,
  })

  const outputs = new Map([
    [path.join(repoRoot, '.claude', 'commands', `${skillName}.md`), claudeText],
    [path.join(repoRoot, '.github', 'skills', `${skillName}.md`), genericText],
    [path.join(repoRoot, '.trae', 'skills', `${skillName}.md`), genericText],
    [path.join(repoRoot, '.trae', 'rules', `${skillName}.md`), genericText],
  ])

  for (const [filePath, content] of outputs) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    writeFile(filePath, content)
  }

  const readmeStatus = syncReadme(readmePath, skillName, description)

  console.log(`源文件：skills/${skillName}/SKILL.md`)
  console.log('已更新：')
  for (const filePath of outputs.keys()) {
    console.log(`- ${path.relative(repoRoot, filePath)}`)
  }
  console.log(`README：${readmeStatus}`)
  console.log('已按最小必要范围完成同步。')
}

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

function readNormalized(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n')
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, ensureTrailingNewline(content).replace(/\r\n/g, '\n'), 'utf8')
}

function splitFrontmatter(text) {
  if (!text.startsWith('---\n')) {
    return { frontmatter: {}, body: text }
  }

  const closingIndex = text.indexOf('\n---\n', 4)
  if (closingIndex === -1) {
    return { frontmatter: {}, body: text }
  }

  const rawFrontmatter = text.slice(4, closingIndex)
  const body = text.slice(closingIndex + 5)
  const frontmatter = {}
  let currentKey = null
  let buffer = []

  for (const line of rawFrontmatter.split('\n')) {
    if (/^[A-Za-z0-9_-]+:\s*/.test(line)) {
      if (currentKey !== null) {
        frontmatter[currentKey] = buffer.join('\n').replace(/\s+$/, '')
      }
      const separatorIndex = line.indexOf(':')
      currentKey = line.slice(0, separatorIndex).trim()
      buffer = [line.slice(separatorIndex + 1).trimStart()]
    } else if (currentKey !== null) {
      buffer.push(line)
    }
  }

  if (currentKey !== null) {
    frontmatter[currentKey] = buffer.join('\n').replace(/\s+$/, '')
  }

  return { frontmatter, body }
}

function getFrontmatterValue(frontmatter, key) {
  const value = frontmatter[key]
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed || null
}

function splitClaudeWrapper(text) {
  const { frontmatter, body } = splitFrontmatter(text)
  const prefixed = body.startsWith('用户输入：\n$ARGUMENTS\n\n') ? body : body.startsWith('\n用户输入：\n$ARGUMENTS\n\n') ? body.slice(1) : null

  if (!prefixed) {
    return {
      frontmatter,
      preamble: '',
      body,
    }
  }

  const rest = prefixed.slice('用户输入：\n$ARGUMENTS\n\n'.length)
  const sourceStart = findBodyStart(rest)
  if (sourceStart === -1) {
    return {
      frontmatter,
      preamble: rest,
      body: '',
    }
  }

  const candidatePreamble = rest.slice(0, sourceStart)
  const candidateBody = rest.slice(sourceStart)
  const normalizedCandidateBody = normalizeContentBody(candidateBody)

  return {
    frontmatter,
    preamble: normalizedCandidateBody ? candidatePreamble : '',
    body: normalizedCandidateBody ? candidateBody : rest,
  }
}

function findBodyStart(text) {
  const prefixes = ['你是', '若未', '## ', '# ', '用户提供', '日报、', '1. ']
  for (const prefix of prefixes) {
    if (text.startsWith(prefix)) {
      return 0
    }
  }

  const patterns = [
    '\n你是',
    '\n若未',
    '\n## ',
    '\n# ',
    '\n用户提供',
    '\n日报、',
    '\n1. ',
  ]
  let index = -1
  for (const pattern of patterns) {
    const found = text.indexOf(pattern)
    if (found !== -1 && (index === -1 || found < index)) {
      index = found
    }
  }
  return index === -1 ? -1 : index + 1
}

function normalizeContentBody(text) {
  return text
    .replace(/^\n+/, '')
    .replace(/\s+$/, '')
}

function buildClaudeTarget({ name, description, body, existingClaude }) {
  const lines = ['---']

  if (existingClaude) {
    const existingName = getFrontmatterValue(existingClaude.frontmatter, 'name')
    const existingDescription = getFrontmatterValue(existingClaude.frontmatter, 'description')
    const allowedTools = getFrontmatterValue(existingClaude.frontmatter, 'allowed-tools')
    const argumentHint = getFrontmatterValue(existingClaude.frontmatter, 'argument-hint')

    if (existingName) {
      lines.push(`name: ${name}`)
    }
    lines.push(`description: ${description || existingDescription || ''}`)
    if (allowedTools) {
      lines.push(`allowed-tools: ${allowedTools}`)
    }
    if (argumentHint) {
      lines.push(`argument-hint: ${argumentHint}`)
    }
  } else {
    lines.push(`name: ${name}`)
    lines.push(`description: ${description}`)
  }

  lines.push('---')

  const normalizedSourceBody = normalizeContentBody(body)
  const normalizedExistingBody = existingClaude ? normalizeContentBody(existingClaude.body) : ''
  const preamble = existingClaude && normalizedExistingBody === normalizedSourceBody ? existingClaude.preamble : ''

  let content = `${lines.join('\n')}\n${CLAUDE_ARGUMENT_BLOCK}`
  if (preamble) {
    content += preamble.replace(/^\n+/, '')
    if (!content.endsWith('\n\n')) {
      content = content.replace(/\n*$/, '\n\n')
    }
  }
  content += body.replace(/^\n+/, '')
  return ensureTrailingNewline(content)
}

function buildGenericTarget({ name, description, body }) {
  const content = `---\nname: ${name}\ndescription: ${description}\n---\n\n${body.replace(/^\n+/, '')}`
  return ensureTrailingNewline(content)
}

function syncReadme(readmePath, skillName, description) {
  const text = readNormalized(readmePath)
  const needle = `\`skills/${skillName}/SKILL.md\``
  if (text.includes(needle)) {
    return '已存在'
  }

  const lines = text.split('\n')
  const headerIndex = lines.indexOf(README_TABLE_HEADER)
  if (headerIndex === -1) {
    return '未更新（未找到 Skills 表头）'
  }

  let insertAt = headerIndex + 2
  while (insertAt < lines.length && lines[insertAt].startsWith('|')) {
    insertAt += 1
  }

  const row = README_ROW_TEMPLATE
    .replaceAll('{name}', skillName)
    .replace('{description}', description)
    .replace('{scenario}', DEFAULT_SCENARIO)

  lines.splice(insertAt, 0, row)
  writeFile(readmePath, lines.join('\n'))
  return '已追加'
}

function ensureTrailingNewline(text) {
  return text.endsWith('\n') ? text : `${text}\n`
}

main()
