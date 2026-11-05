"use client"

import * as React from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type IconTooltipProps = {
  label: string
  children: React.ReactElement
  /** Wrap the child in a focusable span so the tooltip still shows for disabled buttons. */
  wrapDisabled?: boolean
}

/**
 * Shows a styled, locale-aware tooltip for an icon-only control.
 * The child should still carry its own `aria-label`.
 */
function IconTooltip({ label, children, wrapDisabled }: IconTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {wrapDisabled ? (
          <span className="inline-flex cursor-not-allowed" tabIndex={0}>
            {children}
          </span>
        ) : (
          children
        )}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export { IconTooltip }
