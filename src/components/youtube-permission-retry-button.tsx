"use client";

import { type ComponentProps, useTransition } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { GOOGLE_REAUTHORIZATION_PARAMS } from "@/lib/auth/google";

type YoutubePermissionRetryButtonProps = {
  label?: string;
  pendingLabel?: string;
  callbackUrl?: string;
} & Pick<ComponentProps<typeof Button>, "variant" | "size" | "className">;

export function YoutubePermissionRetryButton({
  label = "Conceder acesso ao YouTube",
  pendingLabel = "Abrindo Google...",
  callbackUrl = "/",
  variant = "default",
  size = "default",
  className,
}: YoutubePermissionRetryButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          void signIn("google", { callbackUrl }, GOOGLE_REAUTHORIZATION_PARAMS);
        });
      }}
    >
      {isPending ? pendingLabel : label}
    </Button>
  );
}
