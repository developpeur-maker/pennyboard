import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

interface ChartCardProps {
  title: string
  children: React.ReactNode
  className?: string
}

const ChartCard: React.FC<ChartCardProps> = ({ title, children, className }) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold font-poppins text-gray-800">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  )
}

export default ChartCard

