import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
 "inline-flex shrink-0 items-center justify-center gap-2 rounded-[3px] text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-[#c9a84c]/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
 {
 variants: {
 variant: {
 default: "bg-[#c9a84c] text-[#050810] hover:bg-[#c9a84c]/90",
 destructive:
 "bg-[#c0392b] text-[#f0e8d4] hover:bg-[#c0392b]/90 focus-visible:ring-destructive/20 dark:bg-[#c0392b]/60 dark:focus-visible:ring-destructive/40",
 outline:
 "border bg-[#080b14]  hover:bg-[rgba(201,168,76,0.12)] hover:text-[#050810] dark:border-[rgba(201,168,76,0.22)] dark:bg-[#0a0e1a]/30 dark:hover:bg-[#0a0e1a]/50",
 secondary:
 "bg-[#111625] text-[#f0e8d4] hover:bg-[#111625]/80",
 ghost:
 "hover:bg-[rgba(201,168,76,0.12)] hover:text-[#050810] dark:hover:bg-[rgba(201,168,76,0.12)]/50",
 link: "text-primary underline-offset-4 hover:underline",
 },
 size: {
 default: "h-9 px-4 py-2 has-[>svg]:px-3",
 xs: "h-6 gap-1 rounded-[3px] px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
 sm: "h-8 gap-1.5 rounded-[3px] px-3 has-[>svg]:px-2.5",
 lg: "h-10 rounded-[3px] px-6 has-[>svg]:px-4",
 icon: "size-9",
 "icon-xs": "size-6 rounded-[3px] [&_svg:not([class*='size-'])]:size-3",
 "icon-sm": "size-8",
 "icon-lg": "size-10",
 },
 },
 defaultVariants: {
 variant: "default",
 size: "default",
 },
 }
)

function Button({
 className,
 variant = "default",
 size = "default",
 asChild = false,
 ...props
}: React.ComponentProps<"button"> &
 VariantProps<typeof buttonVariants> & {
 asChild?: boolean
 }) {
 const Comp = asChild ? Slot.Root : "button"

 return (
 <Comp
 data-slot="button"
 data-variant={variant}
 data-size={size}
 className={cn(buttonVariants({ variant, size, className }))}
 {...props}
 />
 )
}

export { Button, buttonVariants }
