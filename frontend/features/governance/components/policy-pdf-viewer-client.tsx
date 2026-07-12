"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ExternalLink,
  FileSearch,
  Maximize2,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PolicyPdfViewerProps } from "@/features/governance/components/policy-pdf-viewer";
import type {
  GovernanceCitation,
  PolicyDocument,
} from "@/features/governance/types/governance";
import { cn } from "@/lib/utils";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildHighlightTerms(excerpt: string) {
  const stopWords = new Set([
    "about",
    "after",
    "and",
    "are",
    "before",
    "from",
    "must",
    "should",
    "that",
    "the",
    "their",
    "this",
    "with",
  ]);

  return Array.from(
    new Set(
      excerpt
        .toLowerCase()
        .match(/[a-z0-9][a-z0-9-]{4,}/g)
        ?.filter((word) => !stopWords.has(word)) ?? [],
    ),
  ).slice(0, 14);
}

function PdfSkeleton() {
  return (
    <div className="space-y-4 p-5">
      <div className="mx-auto h-[34rem] w-full max-w-2xl animate-pulse rounded-lg bg-slate-100 dark:bg-white/10" />
      <div className="mx-auto grid max-w-2xl gap-2">
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
        <div className="h-3 w-1/2 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
      </div>
    </div>
  );
}

function EmptyPdfState({
  citation,
  document,
}: {
  citation: GovernanceCitation;
  document: PolicyDocument | null;
}) {
  return (
    <div className="grid min-h-[28rem] place-items-center p-6">
      <div className="max-w-md rounded-lg border border-dashed border-slate-300 bg-white/80 p-5 text-center dark:border-white/10 dark:bg-white/[0.04]">
        <span className="mx-auto grid size-12 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200">
          <FileSearch size={22} />
        </span>
        <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-white">
          PDF preview unavailable
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {document
            ? "This document is indexed, but it does not have a Cloudinary URL yet."
            : "This citation came from indexed policy context, but the source PDF is not stored in Cloudinary."}
        </p>
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-left text-xs leading-5 text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
          {citation.excerpt}
        </p>
      </div>
    </div>
  );
}

export function PolicyPdfViewerClient({
  citation,
  document,
  mode = "overlay",
  onClose,
}: PolicyPdfViewerProps) {
  const pageShellRef = useRef<HTMLDivElement | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(() =>
    Math.max(1, citation?.page_number ?? 1),
  );
  const [pageWidth, setPageWidth] = useState(680);
  const [zoom, setZoom] = useState(1);

  const highlightTerms = useMemo(
    () => buildHighlightTerms(citation?.excerpt ?? ""),
    [citation?.excerpt],
  );
  const secureUrl = document?.secure_url ?? "";
  const pdfFile = useMemo(
    () => (secureUrl ? { url: secureUrl } : null),
    [secureUrl],
  );

  useEffect(() => {
    const element = pageShellRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(280, entry.contentRect.width - 32);
      setPageWidth(Math.min(width, 820));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (!citation) {
    return null;
  }

  const hasPdf = Boolean(document?.secure_url);
  const canGoBack = pageNumber > 1;
  const canGoForward = numPages ? pageNumber < numPages : true;
  const inline = mode === "inline";

  function renderHighlightedText(text: string) {
    const escaped = escapeHtml(text);
    const matchingTerms = highlightTerms.filter((term) =>
      text.toLowerCase().includes(term),
    );

    if (matchingTerms.length === 0) {
      return escaped;
    }

    const expression = new RegExp(
      `(${matchingTerms.map(escapeRegExp).join("|")})`,
      "gi",
    );

    return escaped.replace(
      expression,
      '<mark class="governance-pdf-highlight">$1</mark>',
    );
  }

  const viewer = (
    <aside
      aria-label="Policy PDF citation viewer"
      className={cn(
        "animate-pdf-pop pointer-events-auto flex flex-col overflow-hidden rounded-lg border border-slate-200/80 bg-white dark:border-white/10 dark:bg-slate-950",
        inline
          ? "governance-panel h-[calc(100vh-9rem)] min-h-[38rem] shadow-sm"
          : "fixed inset-x-3 bottom-3 top-16 shadow-2xl shadow-slate-950/20 dark:shadow-black/40 sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(82vh,48rem)] sm:min-h-[29rem] sm:w-[min(92vw,56rem)] sm:min-w-[24rem] sm:resize",
      )}
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-white/90 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-slate-950/90">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200">
            <FileSearch size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-slate-950 px-2 py-1 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">
                {citation.citation_id}
              </span>
              <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                {document?.filename ?? citation.document_name}
              </p>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {citation.policy_title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasPdf ? (
            <a
              aria-label="Open PDF in a new tab"
              className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-cyan-300 hover:text-cyan-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-cyan-400 dark:hover:text-cyan-200"
              href={document?.secure_url ?? "#"}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink size={15} />
            </a>
          ) : null}
          <button
            aria-label="Close PDF viewer"
            className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-rose-300 hover:text-rose-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-rose-400 dark:hover:text-rose-200"
            onClick={onClose}
            type="button"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-center gap-2">
          <Button
            className="size-9 px-0"
            disabled={!hasPdf || !canGoBack}
            onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
            type="button"
            variant="secondary"
          >
            <Minus size={15} />
          </Button>
          <span className="min-w-24 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
            Page {pageNumber}
            {numPages ? ` / ${numPages}` : ""}
          </span>
          <Button
            className="size-9 px-0"
            disabled={!hasPdf || !canGoForward}
            onClick={() =>
              setPageNumber((current) =>
                numPages ? Math.min(numPages, current + 1) : current + 1,
              )
            }
            type="button"
            variant="secondary"
          >
            <Plus size={15} />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="size-9 px-0"
            disabled={!hasPdf || zoom <= 0.75}
            onClick={() => setZoom((current) => Math.max(0.75, current - 0.1))}
            type="button"
            variant="secondary"
          >
            <Minus size={15} />
          </Button>
          <span className="min-w-14 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            className="size-9 px-0"
            disabled={!hasPdf || zoom >= 1.45}
            onClick={() => setZoom((current) => Math.min(1.45, current + 0.1))}
            type="button"
            variant="secondary"
          >
            <Maximize2 size={15} />
          </Button>
        </div>
      </div>

      <div className="shrink-0 border-b border-cyan-200/70 bg-cyan-50/80 px-4 py-3 text-xs leading-5 text-cyan-900 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-100">
        {citation.excerpt}
      </div>

      <div
        className="min-h-0 flex-1 overflow-auto bg-slate-100/80 p-4 dark:bg-black/20"
        ref={pageShellRef}
      >
        {hasPdf ? (
          <Document
            error={
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
                Unable to preview this PDF. Open it in a new tab instead.
              </div>
            }
            file={pdfFile}
            loading={<PdfSkeleton />}
            onLoadSuccess={({ numPages: nextNumPages }) => {
              setNumPages(nextNumPages);
              setPageNumber((current) =>
                Math.min(Math.max(1, current), nextNumPages),
              );
            }}
          >
            <Page
              className="mx-auto overflow-hidden rounded-lg shadow-lg shadow-slate-950/15 dark:shadow-black/40"
              customTextRenderer={({ str }) => renderHighlightedText(str)}
              loading={<PdfSkeleton />}
              pageNumber={pageNumber}
              renderAnnotationLayer
              renderTextLayer
              width={pageWidth * zoom}
            />
          </Document>
        ) : (
          <EmptyPdfState citation={citation} document={document} />
        )}
      </div>
    </aside>
  );

  if (inline) {
    return viewer;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-slate-950/10 backdrop-blur-[1px] dark:bg-black/30"
        onClick={onClose}
      />
      {viewer}
    </div>
  );
}
