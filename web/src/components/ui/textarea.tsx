import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
 return (
 <textarea
 data-slot="textarea"
 className={cn(
 "flex field-sizing-content min-h-16 w-full rounded-[3px] border border-[rgba(201,168,76,0.22)] bg-transparent px-3 py-2 text-base  transition-[color,box-shadow] outline-none placeholder:text-[#a8997e] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-[#c9a84c]/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-[#0a0e1a]/30 dark:aria-invalid:ring-destructive/40",
 className
 )}
 {...props}
 />
 )
}

export { Textarea }
