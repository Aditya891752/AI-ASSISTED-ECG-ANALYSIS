import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixDialog.Content>) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 bg-black/60 z-40 animate-in fade-in" />
      <RadixDialog.Content
        className={cn(
          "fixed right-0 top-0 h-full w-full max-w-xl bg-ecg-surface border-l border-ecg-border z-50 overflow-y-auto p-6 shadow-2xl",
          className
        )}
        {...props}
      >
        <RadixDialog.Close className="absolute top-4 right-4 text-ecg-muted hover:text-white">
          <X className="h-5 w-5" />
        </RadixDialog.Close>
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export const DialogTitle = RadixDialog.Title;
