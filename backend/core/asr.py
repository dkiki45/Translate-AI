import whisper
import ssl
import os

# Bypass de segurança SSL (essencial para o Mac)
ssl._create_default_https_context = ssl._create_unverified_context

# Carregamos o modelo 'base' (multilíngue) do Whisper original
print("Carregando Whisper Original (OpenAI)...")
model = whisper.load_model("base")

def transcribe_audio(file_path: str):
    try:
        # Transcrição padrão do OpenAI Whisper
        result = model.transcribe(file_path)
        
        # Retorna o texto e o idioma detectado
        return result["text"].strip(), result["language"]
    except Exception as e:
        print(f"Erro no ASR: {e}")
        return "", ""