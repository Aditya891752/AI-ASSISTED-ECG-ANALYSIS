import * as RadixLabel from "@radix-ui/react-label";
import { cn } from "@/utils/cn";

export function Label({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixLabel.Root>) {
  return (
    <RadixLabel.Root
      className={cn("text-xs font-medium text-ecg-muted mb-1 block", className)}
      {...props}
    />
  );
}
