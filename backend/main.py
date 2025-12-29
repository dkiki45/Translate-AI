from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from core.asr import transcribe_audio
from core.translator import translate_text 
import shutil
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "temp_audio"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/translate")
# Adicionamos o parametro 'direction' no form data
async def translate_endpoint(file: UploadFile = File(...), direction: str = Form("pt_to_en")):
    temp_filename = f"{UPLOAD_DIR}/{file.filename}"
    
    with open(temp_filename, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 1. ASR (O Whisper detecta o que foi falado)
    transcription, detected_lang = transcribe_audio(temp_filename)
    
    # 2. Tradução baseada na direção escolhida
    translation = ""
    if direction == "pt_to_en":
        translation = translate_text(transcription, source="pt")
    else:
        translation = translate_text(transcription, source="en")
    
    return {
        "transcription": transcription,
        "translation": translation
    }