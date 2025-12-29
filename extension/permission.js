document.getElementById("btnAllow").addEventListener("click", async () => {
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        alert("Microfone autorizado! Você pode fechar esta aba e usar a extensão.");
        window.close(); // Tenta fechar a aba automaticamente
    } catch (err) {
        alert("Erro: Você precisa clicar em 'Permitir' no alerta do navegador.");
        console.error(err);
    }
});