'use client'

import React, { forwardRef } from 'react'

export const WorldTiltControls = forwardRef<any, { active?: boolean; children?: React.ReactNode }>(
  ({ children }, ref) => {
    return <group ref={ref as any}>{children}</group>
  }
)

export default WorldTiltControls


