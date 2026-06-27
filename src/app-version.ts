import packageJson from '../package.json'

declare const __BUILD_DATE__: string | undefined

type PackageMeta = {
  version: string
  author?: string | { name?: string }
}

const pkg = packageJson as PackageMeta

export const APP_VERSION = pkg.version

export const APP_AUTHOR =
  typeof pkg.author === 'string' ? pkg.author : pkg.author?.name ?? 'Unknown'

const buildTimestamp = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : new Date().toISOString()

export const APP_BUILD_DATE = new Date(buildTimestamp).toLocaleDateString(undefined, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})
