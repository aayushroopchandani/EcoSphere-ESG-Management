"use client";

import dynamic from "next/dynamic";
import type {
  GovernanceCitation,
  PolicyDocument,
} from "@/features/governance/types/governance";

export type PolicyPdfViewerProps = {
  citation: GovernanceCitation | null;
  document: PolicyDocument | null;
  mode?: "overlay" | "inline";
  onClose: () => void;
};

export const PolicyPdfViewer = dynamic<PolicyPdfViewerProps>(
  () =>
    import("@/features/governance/components/policy-pdf-viewer-client").then(
      (module) => module.PolicyPdfViewerClient,
    ),
  {
    ssr: false,
  },
);
