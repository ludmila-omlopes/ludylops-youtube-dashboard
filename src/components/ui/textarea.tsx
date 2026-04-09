import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-28 w-full rounded-[var(--radius)] border-[3px] border-[var(--color-ink)] bg-[var(--color-paper)] px-4 py-3 text-sm text-[var(--color-ink)] shadow-[3px_3px_0_var(--shadow-color)] outline-none placeholder:text-[var(--color-ink-soft)] focus-visible:outline-[3px] focus-visible:outline-[var(--color-purple-mid)] focus-visible:outline-offset-[1px] disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
