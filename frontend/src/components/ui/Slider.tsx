import * as RadixSlider from "@radix-ui/react-slider";
import { cn } from "@/utils/cn";

export function Slider({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixSlider.Root>) {
  return (
    <RadixSlider.Root
      className={cn("relative flex h-5 w-full touch-none items-center", className)}
      {...props}
    >
      <RadixSlider.Track className="relative h-1.5 w-full grow rounded-full bg-ecg-border">
        <RadixSlider.Range className="absolute h-full rounded-full bg-ecg-accent" />
      </RadixSlider.Track>
      <RadixSlider.Thumb className="block h-4 w-4 rounded-full bg-ecg-accent shadow focus:outline-none focus:ring-2 focus:ring-cyan-300" />
    </RadixSlider.Root>
  );
}
