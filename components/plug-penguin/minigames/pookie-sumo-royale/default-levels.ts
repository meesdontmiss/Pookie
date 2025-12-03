import { Level } from './levels'

const defaultLevels: Level[] = [
  {
    id: 1,
    name: 'Sumo Arena',
    description: 'Knock other Pookies off the platform.',
    difficulty: 'Easy',
    timeLimit: 90,
    objects: [
      {
        type: 'spawn_platform',
        position: [0, 20, 0],
        scale: [10, 1, 10],
        properties: { thickness: 1 }
      },
      {
        type: 'collectible',
        position: [3, 21, 2]
      },
      {
        type: 'collectible',
        position: [-4, 21, -3]
      },
      {
        type: 'goal',
        position: [0, 20, -8]
      }
    ]
  }
]

export default defaultLevels


