import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "w-full min-w-0 rounded-[var(--radius)] border-[3px] border-[var(--color-ink)] bg-[var(--color-paper)] px-4 py-3 text-sm font-bold text-[var(--color-ink)] outline-none placeholder:font-medium placeholder:text-[var(--color-ink-soft)] focus-visible:outline-[3px] focus-visible:outline-[var(--color-purple-mid)] focus-visible:outline-offset-[1px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
