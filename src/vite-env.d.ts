
/// <reference types="vite/client" />

// Extend BadgeProps interface to support children
import { BadgeProps as OriginalBadgeProps } from "@/components/ui/badge";

declare module "@/components/ui/badge" {
  interface BadgeProps extends OriginalBadgeProps {
    children?: React.ReactNode;
  }
}

// Define AbortSignal.timeout for TypeScript
interface AbortSignalConstructor {
  timeout(milliseconds: number): AbortSignal;
}

declare global {
  interface AbortSignal {
    static: AbortSignalConstructor;
  }
}
