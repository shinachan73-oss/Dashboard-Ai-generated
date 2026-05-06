import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ListWidgetProps {
  title?: string
  items: string[]
}

export default function ListWidget({ title, items }: ListWidgetProps) {
  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ul className="list-disc list-inside space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-sm">{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
