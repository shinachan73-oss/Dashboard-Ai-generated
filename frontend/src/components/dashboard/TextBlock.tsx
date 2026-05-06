import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TextBlockProps {
  title?: string
  content: string
}

export default function TextBlock({ title, content }: TextBlockProps) {
  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content}</p>
      </CardContent>
    </Card>
  )
}
