export type LevelObject = {
  id?: number
  type: string
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  properties?: Record<string, any>
}

export type Level = {
  id: number
  name: string
  description?: string
  difficulty?: string | number
  timeLimit: number
  objects: LevelObject[]
}


