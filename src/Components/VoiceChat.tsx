import React, { useRef, useState, useEffect } from "react";
import "./VoiceChat.css";
import ChatbotAvatar from "./ChatbotAvatar";

const WS_URL = "wss://voice-assistant-api-i6sz.onrender.com/ws/voice";
//const WS_URL = "ws://localhost:8000/ws/voice";

const VoiceChat: React.FC = () => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bufferedChunksRef = useRef<ArrayBuffer[]>([]);
  const mimeTypeRef = useRef("audio/wav");
  const audioBlobRef = useRef<Blob | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const [progress, setProgress] = useState(0);
  const [selectedVoice, setSelectedVoice] = useState<string>("default");
  const [isPlaying, setIsPlaying] = useState(false);
  const availableVoices = ["default", "female", "male", "robot"];
  const hasSentChunksRef = useRef(false);
  const [selectedMode, setSelectedMode] = useState<"record" | "playback">(
    "record"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        setAudioStream(stream);
      })
      .catch((err) => {
        console.error("Microphone access failed", err);
      });
  }, []);

  useEffect(() => {
    if (isRecording) {
      drawWaveform();
    } else {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    }
  }, [isRecording]);

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteTimeDomainData(dataArray);

      ctx!.fillStyle = "#111";
      ctx!.fillRect(0, 0, canvas.width, canvas.height);

      ctx!.lineWidth = 2;
      ctx!.strokeStyle = "#00ffcc";
      ctx!.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx!.moveTo(x, y);
        } else {
          ctx!.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx!.lineTo(canvas.width, canvas.height / 2);
      ctx!.stroke();

      animationIdRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const startRecording = async () => {
    if (isRecording) return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    audioContextRef.current = new AudioContext();
    sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 2048;
    sourceRef.current.connect(analyserRef.current);

    let mimeType = "";
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
      mimeType = "audio/webm;codecs=opus";
    } else if (MediaRecorder.isTypeSupported("audio/webm")) {
      mimeType = "audio/webm";
    } else {
      console.warn("No supported MIME type found for MediaRecorder.");
    }

    const mediaRecorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined
    );
    mediaRecorderRef.current = mediaRecorder;

    wsRef.current = new WebSocket(
      `${WS_URL}?voice=${selectedVoice}&mode=${selectedMode}`
    );
    wsRef.current.binaryType = "arraybuffer";

    wsRef.current.onmessage = async (event) => {
      if (typeof event.data === "string") {
        try {
          const msg = JSON.parse(event.data);
          if (msg.transcript) {
            setTranscript(msg.transcript);
          }

          if (msg.audio_done) {
            setSelectedMode("playback");
            if (bufferedChunksRef.current.length === 0) return;

            const blob = new Blob(
              bufferedChunksRef.current.map((buf) => new Uint8Array(buf)),
              {
                type: "audio/wav",
              }
            );
            audioBlobRef.current = blob;
            const url = URL.createObjectURL(blob);

            if (audioRef.current) {
              audioRef.current.src = url;
              audioRef.current.onended = () => {
                setIsPlaying(false);
                setSelectedMode("record");
                setProgress(100); // ✅ Force final update
                setIsSpeaking(false); // ✅ Hide overlay
                wsRef.current?.close();
              };
              audioRef.current.oncanplay = () => {
                audioRef.current?.play().then(() => {
                  setIsPlaying(true);
                  setIsLoading(false); // Stop loader once audio is ready
                });
                setIsSpeaking(true); // ✅ Show overlay
              };
            }
          }
        } catch (err) {
          console.warn("Failed to parse JSON:", err);
        }
      } else if (event.data instanceof ArrayBuffer) {
        bufferedChunksRef.current.push(event.data);
      }
    };

    wsRef.current.onopen = () => {
      if (!audioStream) {
        console.error("Audio stream not ready");
        return;
      }
      setTimeout(() => {
        mediaRecorder.start(250);
      }, 100);

      mediaRecorder.ondataavailable = (event) => {
        if (
          event.data.size > 0 &&
          wsRef.current?.readyState === WebSocket.OPEN
        ) {
          hasSentChunksRef.current = true;
          wsRef.current.send(event.data);
        }
      };
    };

    wsRef.current.onclose = () => {
      setSelectedMode("record");
    };

    wsRef.current.onerror = (event) => {
      console.error("WebSocket error:", event);
    };

    setIsRecording(true);
    setTranscript("");
    bufferedChunksRef.current = [];
    mimeTypeRef.current = "audio/wav";
    audioBlobRef.current = null;
  };

  const stopRecording = () => {
    if (!isRecording) return;

    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream
      .getTracks()
      .forEach((track) => track.stop());

    if (
      hasSentChunksRef.current &&
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      const encoder = new TextEncoder();
      wsRef.current.send(encoder.encode("__END__"));
    }

    hasSentChunksRef.current = false;

    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }
    audioContextRef.current?.close();

    setIsLoading(true); // ✅ Start loader immediately after user stops
    setIsRecording(false);
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => setIsPlaying(true));
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const downloadAudio = () => {
    if (!audioBlobRef.current) return;
    const url = URL.createObjectURL(audioBlobRef.current);
    const a = document.createElement("a");
    a.href = url;
    a.download = "response.wav";
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (audioRef.current && !audioRef.current.paused) {
        const current = audioRef.current.currentTime;
        const duration = audioRef.current.duration;
        if (!isNaN(duration) && duration > 0) {
          setProgress((current / duration) * 100);
        }
      }
    }, 500);

    return () => {
      clearInterval(interval);
      if (isRecording) stopRecording();
    };
  }, []);

  return (
    <div className="voice-chat-container">
      <div className="voice-select">
        <label htmlFor="voice">🎙️ Voice:</label>
        <select
          id="voice"
          value={selectedVoice}
          onChange={(e) => setSelectedVoice(e.target.value)}
          disabled={isRecording}
        >
          {availableVoices.map((voice) => (
            <option key={voice} value={voice}>
              {voice.charAt(0).toUpperCase() + voice.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <button
        className={`voice-button ${isRecording ? "recording" : ""}`}
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
      >
        {isRecording ? "🎧 Listening..." : "🎤 Hold to Talk"}
      </button>

      {/* During recording: show waveform */}
      {isRecording && (
        <>
          <canvas
            ref={canvasRef}
            width={400}
            height={100}
            className="waveform-canvas visible"
          />
        </>
      )}

      {/* During playback: show animated chatbot */}
      {selectedMode === "playback" && isSpeaking && (
        <ChatbotAvatar isSpeaking={isSpeaking} />
      )}

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>

      <audio ref={audioRef} hidden controls />
      {isSpeaking && <div className="speaking-overlay">🔊 Speaking...</div>}

      {isLoading && <div className="spinner" />}

      {audioBlobRef.current && (
        <div className="controls">
          <button onClick={togglePlayback}>
            {isPlaying ? "⏸️ Pause" : "▶️ Play"}
          </button>
          <button onClick={downloadAudio}>⬇️ Download</button>
        </div>
      )}

      {transcript && (
        <div className="text-output">
          <p>
            <strong>📝 Transcript:</strong>{" "}
            {transcript.split(" ").map((word, i) => (
              <span
                key={i}
                className="transcript-word"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {word + " "}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
};

export default VoiceChat;
