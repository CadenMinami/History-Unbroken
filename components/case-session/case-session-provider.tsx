"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import type { CaseCommand } from "@/lib/case-engine/commands";
import { loadVarennesCase } from "@/lib/case-engine/load-case";
import { restoreCaseState, serializeCaseState } from "@/lib/case-engine/persistence";
import { reduceCase, type ReducerResult } from "@/lib/case-engine/reducer";
import { createInitialCaseState } from "@/lib/case-engine/state";
import type { CaseState } from "@/schemas/case-state";

const STORAGE_KEY = "history-unbroken:varennes:state";
const casePackage = loadVarennesCase();

type CaseCommandInput = CaseCommand extends infer Command
  ? Command extends CaseCommand
    ? Omit<Command, "commandId" | "expectedRevision">
    : never
  : never;

interface CaseSessionContextValue {
  state: CaseState;
  ready: boolean;
  issue: (command: CaseCommandInput) => ReducerResult;
  reset: () => void;
}

const CaseSessionContext = createContext<CaseSessionContextValue | null>(null);

interface CaseSessionProviderProps {
  children: ReactNode;
  initialState?: CaseState;
  persist?: boolean;
}

export function CaseSessionProvider({
  children,
  initialState,
  persist = true,
}: CaseSessionProviderProps) {
  const [state, setState] = useState<CaseState>(
    () => initialState ?? createInitialCaseState(casePackage),
  );
  const [ready, setReady] = useState(!persist);
  const stateRef = useRef(state);
  const hydrated = useRef(!persist);
  const commandSequence = useRef(0);

  useEffect(() => {
    if (!persist) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const restored = restoreCaseState(
        casePackage,
        window.localStorage.getItem(STORAGE_KEY) ?? "",
      );
      stateRef.current = restored.state;
      setState(restored.state);
      hydrated.current = true;
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [persist]);

  useEffect(() => {
    if (!persist || !hydrated.current) return;
    window.localStorage.setItem(STORAGE_KEY, serializeCaseState(state));
  }, [persist, state]);

  const issue = useCallback((command: CaseCommandInput): ReducerResult => {
    const current = stateRef.current;
    if (!hydrated.current) {
      return { state: current, status: "rejected", reason: "session-not-ready" };
    }

    commandSequence.current += 1;
    const commandId = `local-${Date.now()}-${commandSequence.current}`;
    const result = reduceCase(casePackage, current, {
      ...command,
      commandId,
      expectedRevision: current.revision,
    } as CaseCommand);
    stateRef.current = result.state;
    if (result.state !== current) setState(result.state);
    return result;
  }, []);

  const reset = useCallback(() => {
    if (persist) window.localStorage.removeItem(STORAGE_KEY);
    const initial = createInitialCaseState(casePackage);
    stateRef.current = initial;
    setState(initial);
  }, [persist]);

  return (
    <CaseSessionContext.Provider value={{ state, ready, issue, reset }}>
      {children}
    </CaseSessionContext.Provider>
  );
}

export function useCaseSession(): CaseSessionContextValue {
  const value = useContext(CaseSessionContext);
  if (!value) throw new Error("useCaseSession must be used inside CaseSessionProvider.");
  return value;
}
