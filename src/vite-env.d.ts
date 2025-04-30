
/// <reference types="vite/client" />

// Declare missing module types
declare module 'screp-js';

// Extend BadgeProps interface to support children
import { BadgeProps as OriginalBadgeProps } from "@/components/ui/badge";

declare module "@/components/ui/badge" {
  interface BadgeProps extends OriginalBadgeProps {
    children?: React.ReactNode;
  }
}
