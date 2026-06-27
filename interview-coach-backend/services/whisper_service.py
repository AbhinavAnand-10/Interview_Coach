import subprocess
import threading
import numpy as np
from config import get_settings

settings = get_settings()


class WhisperService:
    def __init__(self):
        self._model = None
        self._lock = threading.Lock()

    def _get_model(self):
        with self._lock:
            if self._model is None:
                from faster_whisper import WhisperModel
                print(f"⏳ Loading Whisper model '{settings.whisper_model_size}'...")
                self._model = WhisperModel(
                    settings.whisper_model_size,
                    device=settings.whisper_device,
                    compute_type="int8",
                )
                print("✅ Whisper model loaded")
        return self._model

    def transcribe(self, audio_bytes: bytes, language: str = "en") -> dict:
        try:
            model = self._get_model()

            # Browser sends audio/webm;codecs=opus — convert to raw float32 PCM
            # at 16kHz mono using ffmpeg pipe (no temp files needed)
            result = subprocess.run(
                [
                    "ffmpeg",
                    "-i", "pipe:0",       # Read from stdin
                    "-ar", "16000",        # Resample to 16kHz
                    "-ac", "1",            # Mono
                    "-f", "f32le",         # Raw float32 little-endian output
                    "pipe:1",              # Write to stdout
                    "-loglevel", "quiet",
                ],
                input=audio_bytes,
                capture_output=True,
                timeout=30,
            )

            if not result.stdout:
                print(f"ffmpeg produced no output. stderr: {result.stderr.decode()[:200]}")
                return {"text": "", "confidence": 0.0}

            pcm = np.frombuffer(result.stdout, dtype=np.float32)

            if len(pcm) < 1600:  # Less than 0.1s of audio
                return {"text": "", "confidence": 0.0}

            print(f"🎤 Transcribing {len(pcm)/16000:.1f}s of audio...")

            segments, info = model.transcribe(
                pcm,
                language=language,
                beam_size=5,
                vad_filter=True,
                vad_parameters={"min_silence_duration_ms": 300},
            )

            texts = []
            confidences = []
            for segment in segments:
                text = segment.text.strip()
                if text:
                    texts.append(text)
                    print(f"  📝 [{segment.start:.1f}s → {segment.end:.1f}s] {text}")
                if hasattr(segment, "avg_logprob"):
                    confidence = min(1.0, max(0.0, segment.avg_logprob + 1.0))
                    confidences.append(confidence)

            full_text = " ".join(texts)
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.8

            if full_text:
                print(f"✅ Transcript: '{full_text[:80]}...'")
            else:
                print("⚠️  No speech detected in this chunk")

            return {"text": full_text, "confidence": round(avg_confidence, 3)}

        except FileNotFoundError:
            print("❌ ffmpeg not found! Install with: sudo apt install -y ffmpeg")
            return {"text": "", "confidence": 0.0, "error": "ffmpeg not installed"}
        except Exception as e:
            print(f"❌ Whisper error: {e}")
            return {"text": "", "confidence": 0.0, "error": str(e)}


# Singleton
whisper_service = WhisperService()
