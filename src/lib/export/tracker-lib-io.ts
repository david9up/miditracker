/**
 * Sync buffer I/O for @polyend/tracker-lib.
 * The public Tracker class exposes async file helpers; in-memory serialize/parse
 * is centralized here until sync buffer APIs are on the main package export.
 */
import type { PatternData, PatternsMetadata, ProjectData } from '@polyend/tracker-lib'
import Metadata from '../../../node_modules/@polyend/tracker-lib/dist/patterns/metadata.js'
import Pattern from '../../../node_modules/@polyend/tracker-lib/dist/patterns/pattern.js'
import Project from '../../../node_modules/@polyend/tracker-lib/dist/projects/project.js'

export function writePatternBuffer(pattern: PatternData): ArrayBuffer {
  return Pattern.write(pattern)
}

export function parsePatternBuffer(buffer: ArrayBuffer): PatternData {
  return Pattern.parse(buffer)
}

export function writeProjectBuffer(project: ProjectData): ArrayBuffer {
  return Project.write(project)
}

export function parseProjectBuffer(buffer: ArrayBuffer): ProjectData {
  return Project.parse(buffer)
}

export function writePatternsMetadataBuffer(metadata: PatternsMetadata): ArrayBuffer {
  return Metadata.writePatternsMetadata(metadata)
}

export function parsePatternsMetadataBuffer(buffer: ArrayBuffer): PatternsMetadata {
  return Metadata.parsePatternsMetadata(buffer)
}
