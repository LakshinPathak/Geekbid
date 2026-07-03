import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
 return (
 <input
 type={type}
 data-slot="input"
 className={cn(
 "h-9 w-full min-w-0 rounded-[3px] border border-[rgba(201,168,76,0.22)] bg-transparent px-3 py-1 text-base  transition-[color,box-shadow] outline-none selection:bg-[#c9a84c] selection:text-[#050810] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#f0e8d4] placeholder:text-[#a8997e] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-[#0a0e1a]/30",
 "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-[#c9a84c]/50",
 "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
 className
 )}
 {...props}
 />
 )
}

export { Input }
