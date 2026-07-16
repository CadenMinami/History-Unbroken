"use client";

import {
  CharacterInterview,
  type StationId,
} from "./character-interview";
import type { BrowserSpeechAdapter } from "@/lib/voice/browser-speech";

interface CharacterConversationPanelProps {
  speechAdapterFactory?: () => BrowserSpeechAdapter;
  stationId: StationId;
}

export function CharacterConversationPanel({
  speechAdapterFactory,
  stationId,
}: CharacterConversationPanelProps) {
  return (
    <CharacterInterview
      lockedStationId={stationId}
      speechAdapterFactory={speechAdapterFactory}
    />
  );
}
