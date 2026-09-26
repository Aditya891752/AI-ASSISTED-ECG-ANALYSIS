import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "@/utils/cn";

export const Tabs = RadixTabs.Root;

export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixTabs.List>) {
  return (
    <RadixTabs.List
      className={cn("inline-flex gap-1 rounded-lg bg-ecg-bg p-1 border border-ecg-border", className)}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        "px-3 py-1.5 text-sm rounded-md text-ecg-muted transition-colors data-[state=active]:bg-ecg-accent data-[state=active]:text-ecg-bg data-[state=active]:font-semibold hover:text-white",
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixTabs.Content>) {
  return <RadixTabs.Content className={cn("mt-4", className)} {...props} />;
}
