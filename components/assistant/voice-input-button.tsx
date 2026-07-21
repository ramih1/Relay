"use client";

import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type RecognitionResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type RecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type RecognitionConstructor = new () => RecognitionInstance;

type SpeechWindow = Window & {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
};

export function VoiceInputButton({ onTranscript }: { onTranscript: (value: string) => void }) {
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [message, setMessage] = useState("Voice input");

  useEffect(() => {
    const speechWindow = window as SpeechWindow;
    setIsSupported(Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition));
  }, []);

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setMessage("Voice input");
  }

  function startListening() {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setIsSupported(false);
      setMessage("Voice input is not supported in this browser");
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-CA";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      onTranscript(transcript);
    };
    recognition.onerror = () => {
      setMessage("Voice input stopped. Try again.");
      setIsListening(false);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      setMessage("Voice input");
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setMessage("Listening");
  }

  return (
    <button
      type="button"
      className={`voice-input-button ${isListening ? "listening" : ""}`}
      onClick={isListening ? stopListening : startListening}
      aria-pressed={isListening}
      aria-label={isListening ? "Stop voice input" : message}
      title={isSupported ? message : "Voice input is not supported in this browser"}
    >
      {isListening ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-4 w-4" />}
      <span className="voice-input-label">{isListening ? "Listening" : "Speak"}</span>
    </button>
  );
}
