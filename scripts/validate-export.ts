#!/usr/bin/env node
import { formatValidateExportReport, validateExportPath } from '../src/lib/export/validate-export-file.ts'

const paths = process.argv.slice(2)

if (paths.length === 0) {
  console.error('Usage: npm run validate:export -- <file-or-directory> [...]')
  console.error('')
  console.error('Examples:')
  console.error('  npm run validate:export -- ~/Downloads/my-song-tracker.zip')
  console.error('  npm run validate:export -- ~/Downloads/patterns-mtp.zip')
  console.error('  npm run validate:export -- ./pattern_01.mtp')
  console.error('  npm run validate:export -- ./TrackerProject/project.mt')
  process.exit(2)
}

let failed = 0

for (const path of paths) {
  try {
    const result = await validateExportPath(path)
    console.log(formatValidateExportReport(result))
    console.log('')
    if (!result.ok) failed++
  } catch (error) {
    failed++
    console.error(`${path}: ${error instanceof Error ? error.message : String(error)}`)
    console.log('')
  }
}

process.exit(failed > 0 ? 1 : 0)
