import * as RadixSelect from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/utils/cn";

export const Select = RadixSelect.Root;
export const SelectValue = RadixSelect.Value;

export function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixSelect.Trigger>) {
  return (
    <RadixSelect.Trigger
      className={cn(
        "flex h-10 items-center justify-between gap-2 rounded-lg border border-ecg-border bg-ecg-bg px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ecg-accent/50",
        className
      )}
      {...props}
    >
      {children}
      <RadixSelect.Icon>
        <ChevronDown className="h-4 w-4 text-ecg-muted" />
      </RadixSelect.Icon>
    </RadixSelect.Trigger>
  );
}

export function SelectContent({
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixSelect.Content>) {
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content
        className="overflow-hidden rounded-lg border border-ecg-border bg-ecg-surface shadow-lg z-50"
        {...props}
      >
        <RadixSelect.Viewport className="p-1">{children}</RadixSelect.Viewport>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixSelect.Item>) {
  return (
    <RadixSelect.Item
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-md px-6 py-2 text-sm text-white outline-none data-[highlighted]:bg-ecg-accent data-[highlighted]:text-ecg-bg",
        className
      )}
      {...props}
    >
      <RadixSelect.ItemIndicator className="absolute left-1.5">
        <Check className="h-3.5 w-3.5" />
      </RadixSelect.ItemIndicator>
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
    </RadixSelect.Item>
  );
}
