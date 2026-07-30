"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";
import { controlBase } from "./Input";
import { useFieldControl } from "./Field";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, rows = 4, ...props }, ref) {
    const field = useFieldControl();

    return (
      <textarea
        ref={ref}
        rows={rows}
        {...field}
        className={cn(controlBase, "resize-y py-2.5", className)}
        {...props}
      />
    );
  },
);
