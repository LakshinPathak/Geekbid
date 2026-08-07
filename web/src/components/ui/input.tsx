import * as React from"react"

import { cn } from"@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
 return (
 <input
 type={type}
 data-slot="input"
 className={cn(
"h-9 w-full min-w-0 rounded-full border border-[rgba(75,63,143,0.22)] bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none selection:bg-[#4b3f8f] selection:text-[#ffffff] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#3d3a45] placeholder:text-[#6f6a7d] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
"focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-[#4b3f8f]/50",
"aria-invalid:border-destructive aria-invalid:ring-destructive/20",
 className
 )}
 {...props}
 />
 )
}

export { Input }
