from transformers import MarianMTModel, MarianTokenizer

# Modelo 1: Inglês -> Português (O que já tínhamos)
MODEL_EN_PT = "Helsinki-NLP/opus-mt-en-ROMANCE"
# Modelo 2: Português -> Inglês (NOVO)
MODEL_PT_EN = "Helsinki-NLP/opus-mt-ROMANCE-en"

print("Carregando modelos de tradução... (Isso vai consumir RAM!)")

# Carrega tokenizers e modelos
tokenizer_en_pt = MarianTokenizer.from_pretrained(MODEL_EN_PT)
model_en_pt = MarianMTModel.from_pretrained(MODEL_EN_PT)

tokenizer_pt_en = MarianTokenizer.from_pretrained(MODEL_PT_EN)
model_pt_en = MarianMTModel.from_pretrained(MODEL_PT_EN)

def translate_text(text: str, source="pt"):
    try:
        if source == "pt":
            # Traduzir PT -> EN
            inputs = tokenizer_pt_en(text, return_tensors="pt", padding=True)
            translated = model_pt_en.generate(**inputs)
            return tokenizer_pt_en.batch_decode(translated, skip_special_tokens=True)[0]
        else:
            # Traduzir EN -> PT (precisa do código de lingua alvo >>pt<<)
            text = f">>pt<< {text}"
            inputs = tokenizer_en_pt(text, return_tensors="pt", padding=True)
            translated = model_en_pt.generate(**inputs)
            return tokenizer_en_pt.batch_decode(translated, skip_special_tokens=True)[0]
            
    except Exception as e:
        print(f"Erro na tradução: {e}")
        return text