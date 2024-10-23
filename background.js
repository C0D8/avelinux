let conexoesTerceiras = [];

function resetConexoes() {
  conexoesTerceiras = [];
}

// Listener para detectar requisições de terceiros
chrome.webRequest.onCompleted.addListener((details) => {
  const url = new URL(details.url);
  const dominioPrincipal = url.hostname;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabUrl = new URL(tabs[0].url).hostname;

    if (!dominioPrincipal.includes(tabUrl)) {
      conexoesTerceiras.push(dominioPrincipal);
      console.log(`Conexão de terceira parte detectada: ${dominioPrincipal}`);
    }
  });
}, { urls: ["<all_urls>"] });

// Detecta mudança de aba ou carregamento de página
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    resetConexoes();  // Limpa a lista de conexões
    iniciarAnalise(tabId);
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  resetConexoes();  // Limpa a lista de conexões ao trocar de aba
  iniciarAnalise(tabId);
});

// Função para iniciar a análise
function iniciarAnalise(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ["content.js"],
  });

  console.log("Análise iniciada para a nova página.");
}

// Responder o total de conexões de terceiros ao popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getConexoesTerceiras") {
    sendResponse({ conexoesTerceiras });
  }
});
