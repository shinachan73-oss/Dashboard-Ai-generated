import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Info, AlertTriangle } from "lucide-react"

interface AlertBannerProps {
  message: string
  severity: "info" | "warning" | "error"
}

const icons = {
  info: <Info className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />
}

const variants: Record<AlertBannerProps["severity"], "default" | "destructive"> = {
  info: "default",
  warning: "default",
  error: "destructive"
}

export default function AlertBanner({ message, severity }: AlertBannerProps) {
  return (
    <Alert variant={variants[severity]}>
      {icons[severity]}
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
