import * as React from"react"
import { cva, type VariantProps } from"class-variance-authority"
import { Slot } from"radix-ui"

import { cn } from"@/lib/utils"

const badgeVariants = cva(
"inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-[#4b3f8f]/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3",
 {
 variants: {
 variant: {
 default:"bg-[#4b3f8f] text-[#ffffff] [a&]:hover:bg-[#4b3f8f]/90",
 secondary:
"bg-[#f4f2ee] text-[#3d3a45] [a&]:hover:bg-[#f4f2ee]/90",
 destructive:
"bg-[#c14d3a] text-[#3d3a45] focus-visible:ring-destructive/20 [a&]:hover:bg-[#c14d3a]/90",
 outline:
"border-[rgba(75,63,143,0.22)] text-[#3d3a45] [a&]:hover:bg-[rgba(75,63,143,0.12)] [a&]:hover:text-[#ffffff]",
 ghost:"[a&]:hover:bg-[rgba(75,63,143,0.12)] [a&]:hover:text-[#ffffff]",
 link:"text-primary underline-offset-4 [a&]:hover:underline",
 },
 },
 defaultVariants: {
 variant:"default",
 },
 }
)

function Badge({
 className,
 variant ="default",
 asChild = false,
 ...props
}: React.ComponentProps<"span"> &
 VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
 const Comp = asChild ? Slot.Root :"span"

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
