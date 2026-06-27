import httpx
import json
import re
from config import get_settings

settings = get_settings()

ANALYSIS_PROMPT = """\
You are an expert interview coach analyzing a speech transcript. Return ONLY a valid JSON object with no extra text, no markdown, no explanation.

Transcript:
\"\"\"{transcript}\"\"\"

Return exactly this JSON structure:
{{
  "filler_words": {{"um": 0, "uh": 0, "like": 0, "you know": 0, "basically": 0, "literally": 0, "actually": 0, "right": 0}},
  "filler_word_count": 0,
  "estimated_wpm": 0,
  "clarity_score": 0,
  "confidence_score": 0,
  "structure_score": 0,
  "overall_score": 0,
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "summary": "2-3 sentence summary of the response quality"
}}

Rules:
- All scores are integers 0-100
- Count filler words exactly from the transcript
- estimated_wpm: count words divided by estimated speaking time (assume 150wpm average)
- Be specific and constructive in strengths and improvements
- Return ONLY the JSON, nothing else
"""


class OllamaService:
    def __init__(self):
        self.base_url = settings.ollama_base_url
        self.model = settings.ollama_model

    async def analyze_speech(self, transcript: str) -> dict:
        """Send transcript to Ollama for NLP analysis."""
        if not transcript.strip():
            return self._empty_feedback()

        prompt = ANALYSIS_PROMPT.format(transcript=transcript)

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "format": "json",
                        "stream": False,
                        "options": {
                            "temperature": 0.1,
                            "num_predict": 512,
                        },
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                raw = data.get("response", "{}")

                # Clean up any accidental markdown
                raw = re.sub(r"```json|```", "", raw).strip()
                result = json.loads(raw)

                # Ensure all required keys exist
                return self._normalize(result)

        except httpx.ConnectError:
            print("⚠️  Ollama not running. Start it with: ollama serve")
            return self._empty_feedback(error="Ollama not available")
        except Exception as e:
            print(f"Ollama error: {e}")
            return self._empty_feedback(error=str(e))

    def _normalize(self, data: dict) -> dict:
        """Ensure all required keys are present."""
        defaults = self._empty_feedback()
        for key, value in defaults.items():
            if key not in data:
                data[key] = value
        return data

    def _empty_feedback(self, error: str = "") -> dict:
        return {
            "filler_words": {"um": 0, "uh": 0, "like": 0, "you know": 0},
            "filler_word_count": 0,
            "estimated_wpm": 0,
            "clarity_score": 0,
            "confidence_score": 0,
            "structure_score": 0,
            "overall_score": 0,
            "strengths": [],
            "improvements": [],
            "summary": "",
            "error": error,
        }


# Singleton instance
ollama_service = OllamaService()
