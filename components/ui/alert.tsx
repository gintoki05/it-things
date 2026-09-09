import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-[3px] border p-3 font-mono text-xs shadow-[1px_1px_0px_rgba(0,0,0,0.12)] [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-2px] [&>svg]:absolute [&>svg]:left-3 [&>svg]:top-3 [&>svg]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[#E5E9EE] text-[#14253D] border-[#7D8E9E] [&>svg]:text-[#2E5AA8]",
        warning:
          "bg-[#FEF3C7] text-[#92400E] border-[#F59E0B] [&>svg]:text-[#D97706]",
        destructive:
          "bg-[#FEE2E2] text-[#991B1B] border-[#EF4444] [&>svg]:text-[#DC2626]",
        success:
          "bg-[#D4F3DE] text-[#1F9254] border-[#8CD3A5] [&>svg]:text-[#1F9254]",
        info:
          "bg-[#EBF3FC] text-[#1C4E80] border-[#96BEE6] [&>svg]:text-[#2E5AA8]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("font-bold text-xs uppercase tracking-wide leading-tight mb-1 flex items-center gap-1.5", className)}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-[11px] leading-relaxed [&_p]:leading-relaxed", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, alertVariants }
