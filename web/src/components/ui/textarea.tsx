import * as React from"react"

import { cn } from"@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
 return (
 <textarea
 data-slot="textarea"
 className={cn(
"flex field-sizing-content min-h-16 w-full rounded-2xl border border-[rgba(75,63,143,0.22)] bg-transparent px-3 py-2 text-base transition-[color,box-shadow] outline-none placeholder:text-[#6f6a7d] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-[#4b3f8f]/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm",
 className
 )}
 {...props}
 />
 )
}

export { Textarea }
