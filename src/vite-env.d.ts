
/// <reference types="vite/client" />

// Extend BadgeProps interface to support children
import { BadgeProps as OriginalBadgeProps } from "@/components/ui/badge";

declare module "@/components/ui/badge" {
  interface BadgeProps extends OriginalBadgeProps {
    children?: React.ReactNode;
  }
}
