let mediaRecorder;
let audioChunks = [];
let isRecording = false; // Controle de estado manual
let recordingTimer = null; // Timer para cortar o áudio a cada 5s

const btnRecord = document.getElementById("btnRecord");
const statusDiv = document.getElementById("status");
const outputDiv = document.getElementById("output");
const chkContinuous = document.getElementById("chkContinuous"); // O Checkbox novo

btnRecord.addEventListener("click", async () => {
    if (isRecording) {
        stopRecording(); // Parada manual total
    } else {
        startRecording();
    }
});

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        isRecording = true;

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        // Quando um "pedaço" termina de gravar...
        mediaRecorder.onstop = async () => {
            // 1. Envia o que gravou
            await sendAudioToBackend();
            
            // 2. Se estiver no Modo Reunião e o usuário não clicou em Parar...
            if (isRecording && chkContinuous.checked) {
                // ...começa a gravar o próximo pedaço imediatamente!
                statusDiv.textContent = "🔄 Ouvindo próximo trecho...";
                mediaRecorder.start();
                resetTimer(); // Reinicia a contagem de 5s
            } else {
                // Se não for loop, finaliza tudo
                stopEverything();
            }
        };

        mediaRecorder.start();
        
        // Atualiza UI
        btnRecord.textContent = "Parar";
        btnRecord.classList.add("recording");
        statusDiv.textContent = chkContinuous.checked ? "🔴 Modo Reunião Ativo" : "Ouvindo...";
        
        // Se for Modo Reunião, corta o áudio a cada 5 segundos automaticamente
        if (chkContinuous.checked) {
            resetTimer();
        }

    } catch (err) {
        console.error("Erro:", err);
        chrome.tabs.create({ url: 'permission.html' });
    }
}

// Função para parar o "corte" atual (dispara o onstop ali em cima)
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        // Nota: Não setamos isRecording = false aqui ainda, 
        // pois precisamos saber no onstop se foi uma parada automática do loop ou manual.
    }
}

// O botão "Parar" foi clicado pelo usuário (mata o loop)
function stopEverything() {
    isRecording = false;
    clearTimeout(recordingTimer); // Mata o timer
    
    // Desliga microfone
    if (mediaRecorder) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }

    btnRecord.textContent = "Gravar";
    btnRecord.classList.remove("recording");
    statusDiv.textContent = "Pronto";
}

function resetTimer() {
    clearTimeout(recordingTimer);
    // Daqui a 5 segundos, para a gravação atual (o que aciona o onstop -> envia -> recomeça)
    recordingTimer = setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
        }
    }, 5000); // 5000ms = 5 segundos
}

async function sendAudioToBackend() {
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.wav");

    try {
        const response = await fetch("http://127.0.0.1:8000/translate", {
            method: "POST",
            body: formData
        });

        const data = await response.json();
        
        if (data.transcription) {
            outputDiv.innerHTML = `
                <strong>🇺🇸 EN:</strong> ${data.transcription}<br>
                <strong>🇧🇷 PT:</strong> <span style="color: #2e7d32;">${data.translation}</span>
            `;

            // Envia para o Overlay na página
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "show_subtitle",
                        original: data.transcription,
                        translation: data.translation
                    });
                }
            });
        }
    } catch (error) {
        console.error("Erro API:", error);
    }
}