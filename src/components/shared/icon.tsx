import * as React from "react";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

const registry: Record<string, LucideIcon> = {};

export function icon(name: string): LucideIcon {
  if (!registry[name]) {
    const key = name
      .split("-")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join("");
    registry[name] = (Icons as unknown as Record<string, LucideIcon>)[key] ?? Icons.HelpCircle;
  }
  return registry[name];
}

export function Icon({
  name,
  className,
  ...props
}: { name: string } & Omit<React.ComponentProps<LucideIcon>, "ref">) {
  return React.createElement(icon(name), { className: cn("size-4", className), ...props });
}