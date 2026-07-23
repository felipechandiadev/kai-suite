# Kai Voice — microservicio TTS (edge-tts / es-CL-CatalinaNeural)
#
# Solo síntesis de voz para Kai Board. No es civika-lira (asistente LLM).
#
# Setup:
#   cd services/kai-voice && npm run install:py
#   npm run start:dev
#
# Nest (backend) debe tener:
#   KAI_VOICE_URL=http://localhost:5041
#   (alias legacy: LIRA_VOICE_URL)
#
# Contrato:
#   POST /voice/speak  { "text": "...", "voice?": "es-CL-CatalinaNeural" }
#   → audio/mp4 | audio/wav | audio/mpeg
#   GET  /health
