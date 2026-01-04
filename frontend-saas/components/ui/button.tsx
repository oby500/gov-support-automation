import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "md" | "lg" | "icon"
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", asChild, children, ...props }, ref) => {
    const buttonClassName = cn(
      "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
      variant === "default" && "bg-blue-600 text-white hover:bg-blue-700",
      variant === "outline" && "border border-gray-300 bg-white hover:bg-gray-50",
      variant === "ghost" && "hover:bg-gray-100",
      size === "sm" && "h-9 px-3",
      size === "md" && "h-10 px-4 py-2",
      size === "lg" && "h-11 px-6",
      size === "icon" && "h-10 w-10 p-0",
      className
    )

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as any, {
        className: cn(buttonClassName, (children as any).props?.className),
      })
    }

    return (
      <button
        className={buttonClassName}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
