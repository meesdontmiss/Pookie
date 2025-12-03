// Minimal utility implementations to satisfy imports used in UI

export function createCollisionGroup() {
  return {}
}

export function createCollisionMap() {
  return {}
}

export function exportCollisionMap(_map: unknown) {
  return JSON.stringify(_map ?? {})
}

export async function importCollisionMap(_file: File) {
  const text = await _file.text()
  try { return JSON.parse(text) } catch { return null }
}

export function exportToFile(filename: string, contents: string) {
  if (typeof window !== 'undefined') {
    const blob = new Blob([contents], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
}

export function generateExportFilename(base = 'collision-map') {
  return `${base}-${new Date().toISOString().slice(0,10)}.json`
}

export function exportToShape(input: unknown) {
  return input
}

export function validateRotationOrder(order: string): 'XYZ' | 'YXZ' | 'ZXY' | 'ZYX' | 'YZX' | 'XZY' {
  const allowed = new Set(['XYZ','YXZ','ZXY','ZYX','YZX','XZY'])
  return (allowed.has(order) ? order : 'XYZ') as any
}

const collisionShapeUtils = {
  createCollisionGroup,
  createCollisionMap,
  exportCollisionMap,
  importCollisionMap,
  exportToFile,
  generateExportFilename,
  exportToShape,
  validateRotationOrder,
}

export default collisionShapeUtils

