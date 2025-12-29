// 1. INJETAR HTML (Adicionamos a div #kudo-subtitle-box separada do painel)
const htmlTemplate = `
    <div id="kudo-panel">
        <div id="kudo-header">
            <div class="mac-dots"><span class="dot-red"></span><span class="dot-yellow"></span><span class="dot-green"></span></div>
            <div id="kudo-lang" class="lang-switch">PT ⮕ EN</div>
        </div>
        <div class="source-switch">
            <button id="btn-mic" class="source-btn active">🎤 Mic</button>
            <button id="btn-tab" class="source-btn">💻 Reunião</button>
        </div>
        <div id="kudo-orb">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
        </div>
        <div id="kudo-status" style="margin-top:10px; font-size:12px; color:#666;">Pronto</div>
        <div class="hint" style="margin-top:5px;">[ESPAÇO] para Ligar/Desligar Legenda</div>
    </div>
`;

// Container do Painel Lateral
const overlay = document.createElement("div");
overlay.id = "kudo-overlay";
overlay.innerHTML = htmlTemplate;
document.body.appendChild(overlay);

// Container da Legenda Central (Separado)
const subtitleBox = document.createElement("div");
subtitleBox.id = "kudo-subtitle-box";
document.body.appendChild(subtitleBox);

// 2. ESTADOS E VARIÁVEIS
let isVisible = false;
let isLive = false; // Se o modo contínuo está ligado
let mediaRecorder = null;
let audioChunks = [];
let audioSource = "mic"; // "mic" ou "tab"
let currentDirection = "pt_to_en";
let globalStream = null;
let recordingInterval = null;

// Configuração de Tempo (Delay para precisão)
const CHUNK_DURATION = 4000; // 4 segundos (Ideal para o Whisper pegar contexto)

// Elementos UI
const orb = document.getElementById("kudo-orb");
const txtStatus = document.getElementById("kudo-status");
const btnLang = document.getElementById("kudo-lang");
const btnMic = document.getElementById("btn-mic");
const btnTab = document.getElementById("btn-tab");
const panel = document.getElementById("kudo-overlay");

// 3. LISTENERS E CONTROLES

// Atalho para abrir/fechar interface (Cmd+Shift+U)
chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "toggle_ui") {
        isVisible = !isVisible;
        panel.style.display = isVisible ? "flex" : "none";
        // Se fechar o painel, desliga a legenda também por segurança
        if (!isVisible && isLive) stopLiveCaption();
    }
});

// Tecla Espaço (Ligar/Desligar Legenda Ao Vivo)
document.addEventListener("keydown", (e) => {
    if (!isVisible) return;
    if (e.code === "Space" && e.target.tagName !== "INPUT") {
        e.preventDefault();
        if (!isLive) startLiveCaption();
        else stopLiveCaption();
    }
});

// Troca de Fonte (Mic/Tab)
btnMic.addEventListener("click", () => setSource("mic"));
btnTab.addEventListener("click", () => setSource("tab"));

function setSource(source) {
    if (isLive) return alert("Pare a legenda antes de trocar a fonte!");
    audioSource = source;
    btnMic.classList.toggle("active", source === "mic");
    btnTab.classList.toggle("active", source === "tab");
    txtStatus.textContent = source === "mic" ? "Modo: Microfone" : "Modo: Sistema";
    // Zera stream para forçar nova permissão se necessário
    if (globalStream) { globalStream.getTracks().forEach(t => t.stop()); globalStream = null; }
}

// Troca de Idioma
btnLang.addEventListener("click", () => {
    currentDirection = (currentDirection === "pt_to_en") ? "en_to_pt" : "pt_to_en";
    btnLang.textContent = (currentDirection === "pt_to_en") ? "PT ⮕ EN" : "EN ⮕ PT";
});

// 4. LÓGICA DO LIVE CAPTION (LOOP)

async function getAudioStream() {
    if (globalStream && globalStream.active) return globalStream;
    
    if (audioSource === "mic") {
        globalStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } else {
        // Importante: No modo Tab, precisamos do vídeo para o Chrome liberar, mas usamos só o áudio
        globalStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    }
    return globalStream;
}

async function startLiveCaption() {
    try {
        const stream = await getAudioStream();
        
        // Validação de áudio do sistema
        if (audioSource === "tab" && stream.getAudioTracks().length === 0) {
            alert("Você não compartilhou o áudio! Marque a caixinha 'Compartilhar áudio'.");
            stopLiveCaption();
            return;
        }

        isLive = true;
        panel.classList.add("recording-live");
        orb.classList.add("listening");
        txtStatus.textContent = "🔴 AO VIVO - Capturando...";
        
        // Inicia o primeiro ciclo de gravação
        recordSlice();

        // Configura o Loop Infinito: A cada X segundos, para, processa e recomeça
        recordingInterval = setInterval(() => {
            if (isLive) {
                stopSliceAndProcess(); // Para o atual e envia
                recordSlice(); // Começa o próximo imediatamente
            }
        }, CHUNK_DURATION);

    } catch (err) {
        console.error(err);
        txtStatus.textContent = "Erro de Permissão";
        isLive = false;
    }
}

function stopLiveCaption() {
    isLive = false;
    clearInterval(recordingInterval);
    
    // Para gravação atual se existir
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }
    
    // UI Updates
    panel.classList.remove("recording-live");
    orb.classList.remove("listening");
    txtStatus.textContent = "Pausado";
    subtitleBox.classList.remove("visible"); // Esconde legenda
}

// --- FUNÇÕES AUXILIARES DO LOOP ---

function recordSlice() {
    // Cria um novo gravador para este "pedaço" de 4 segundos
    if (!globalStream || !globalStream.active) return;
    
    mediaRecorder = new MediaRecorder(globalStream);
    audioChunks = [];
    
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    
    // Importante: Não definimos onstop aqui para enviar, pois faremos manualmente
    mediaRecorder.start();
}

function stopSliceAndProcess() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        // Precisamos clonar os chunks atuais para enviar, pois o recorder vai ser resetado
        const recorderRef = mediaRecorder; // Referência local
        
        recorderRef.onstop = async () => {
            // Quando este pedaço parar, enviamos ele
            const blob = new Blob(audioChunks, { type: 'audio/wav' });
            // Limpa chunks para o próximo (embora estejamos criando new MediaRecorder, é bom garantir)
            audioChunks = []; 
            await sendToTranslation(blob);
        };
        
        recorderRef.stop();
    }
}

async function sendToTranslation(audioBlob) {
    // Se o blob for muito pequeno (silêncio), ignorar
    if (audioBlob.size < 3000) return;

    const formData = new FormData();
    formData.append("file", audioBlob, "chunk.wav");
    formData.append("direction", currentDirection);

    try {
        txtStatus.textContent = "Traduzindo trecho...";
        const res = await fetch("http://127.0.0.1:8000/translate", {
            method: "POST",
            body: formData
        });
        const data = await res.json();
        
        // Se houver tradução válida, exibe na legenda
        if (data.translation && data.translation.trim().length > 0) {
            showSubtitle(data.translation);
            
            // Opcional: Falar (pode ficar confuso no modo live, descomente se quiser)
            // speakText(data.translation, currentDirection);
        }
        
        if (isLive) txtStatus.textContent = "🔴 AO VIVO";

    } catch (err) {
        console.error(err);
    }
}

// Exibe a legenda estilo "Filme"
let subtitleTimeout;
function showSubtitle(text) {
    subtitleBox.textContent = text;
    subtitleBox.classList.add("visible");
    
    // Esconde depois de 6 segundos se não chegar nada novo
    clearTimeout(subtitleTimeout);
    subtitleTimeout = setTimeout(() => {
        subtitleBox.classList.remove("visible");
    }, 6000);
}

function speakText(text, direction) {
    // No modo live, é melhor cancelar a fala anterior para não "encavalar"
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = direction === "pt_to_en" ? "en-US" : "pt-BR";
    window.speechSynthesis.speak(u);
}