"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ComparePayload } from "@/lib/compareTypes";

export type CompareMeta = {
  model: string;
  transcriptTruncated: boolean;
  articleTruncated: boolean;
};

type FlowContextValue = {
  transcript: string;
  setTranscript: (v: string) => void;
  articleUrl: string;
  setArticleUrl: (v: string) => void;
  articleText: string;
  setArticleText: (v: string) => void;
  articleTitle: string | null;
  setArticleTitle: (v: string | null) => void;
  articleTruncated: boolean;
  setArticleTruncated: (v: boolean) => void;
  compareResult: ComparePayload | null;
  setCompareResult: (v: ComparePayload | null) => void;
  compareMeta: CompareMeta | null;
  setCompareMeta: (v: CompareMeta | null) => void;
  clearFlow: () => void;
};

const FlowContext = createContext<FlowContextValue | null>(null);

export function FlowProvider({ children }: { children: ReactNode }) {
  const [transcript, setTranscript] = useState("");
  const [articleUrl, setArticleUrl] = useState("");
  const [articleText, setArticleText] = useState("");
  const [articleTitle, setArticleTitle] = useState<string | null>(null);
  const [articleTruncated, setArticleTruncated] = useState(false);
  const [compareResult, setCompareResult] = useState<ComparePayload | null>(
    null,
  );
  const [compareMeta, setCompareMeta] = useState<CompareMeta | null>(null);

  const clearFlow = useCallback(() => {
    setTranscript("");
    setArticleUrl("");
    setArticleText("");
    setArticleTitle(null);
    setArticleTruncated(false);
    setCompareResult(null);
    setCompareMeta(null);
  }, []);

  const value = useMemo(
    () => ({
      transcript,
      setTranscript,
      articleUrl,
      setArticleUrl,
      articleText,
      setArticleText,
      articleTitle,
      setArticleTitle,
      articleTruncated,
      setArticleTruncated,
      compareResult,
      setCompareResult,
      compareMeta,
      setCompareMeta,
      clearFlow,
    }),
    [
      transcript,
      articleUrl,
      articleText,
      articleTitle,
      articleTruncated,
      compareResult,
      compareMeta,
      clearFlow,
    ],
  );

  return (
    <FlowContext.Provider value={value}>{children}</FlowContext.Provider>
  );
}

export function useFlow() {
  const ctx = useContext(FlowContext);
  if (!ctx) {
    throw new Error("useFlow must be used within FlowProvider");
  }
  return ctx;
}
