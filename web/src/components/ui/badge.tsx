import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
 "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-[#c9a84c]/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
 {
 variants: {
 variant: {
 default: "bg-[#c9a84c] text-[#050810] [a&]:hover:bg-[#c9a84c]/90",
 secondary:
 "bg-[#111625] text-[#f0e8d4] [a&]:hover:bg-[#111625]/90",
 destructive:
 "bg-[#c0392b] text-[#f0e8d4] focus-visible:ring-destructive/20 dark:bg-[#c0392b]/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-[#c0392b]/90",
 outline:
 "border-[rgba(201,168,76,0.22)] text-[#f0e8d4] [a&]:hover:bg-[rgba(201,168,76,0.12)] [a&]:hover:text-[#050810]",
 ghost: "[a&]:hover:bg-[rgba(201,168,76,0.12)] [a&]:hover:text-[#050810]",
 link: "text-primary underline-offset-4 [a&]:hover:underline",
 },
 },
 defaultVariants: {
 variant: "default",
 },
 }
)

function Badge({
 className,
 variant = "default",
 asChild = false,
 ...props
}: React.ComponentProps<"span"> &
 VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
 const Comp = asChild ? Slot.Root : "span"

 return (
 <Comp
 data-slot="badge"
 data-variant={variant}
 className={cn(badgeVariants({ variant }), className)}
 {...props}
 />
 )
}

export { Badge, badgeVariants }
