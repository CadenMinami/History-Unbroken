export interface InputSafetyResult {
  flagged: boolean;
  categories: string[];
}

export interface InputSafetyGateway {
  check(input: string, signal?: AbortSignal): Promise<InputSafetyResult>;
}
