chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analisar") {
    analisarPagina().then((resultado) => {
      sendResponse({ resultado });  // Envia a resposta de forma assíncrona
    }).catch((error) => {
      console.error("Erro ao analisar a página:", error);
      sendResponse({ resultado: "Erro ao analisar a página." });
    });

    return true;  // Mantém a conexão aberta para enviar a resposta depois
  }
});

// Função para analisar a página e retornar o resultado
async function analisarPagina() {
  // Função para obter cookies corretamente
  function getCookies() {
    return document.cookie.split(";").map(cookie => cookie.trim()).filter(cookie => cookie);
  }

  const allCookies = getCookies();

  // Identificar cookies de primeira e de terceiros com mais precisão
  const firstPartyCookies = allCookies.filter(cookie => {
    return location.hostname.includes(document.domain);
  });

  const thirdPartyCookies = allCookies.filter(cookie => {
    return !location.hostname.includes(document.domain);
  });
  const storageItems = localStorage.length;
  const sessionStorageItems = sessionStorage.length;
  const canvasFingerprint = await detectCanvasFingerprint();
  const webGLFingerprint = detectWebGLFingerprint();

  const allCookiesString = allCookies.join(", ");

  return `
    Cookies de Primeira Parte: ${firstPartyCookies.length}\n
    Cookies de Terceiros: ${thirdPartyCookies.length}\n
    Itens no Local Storage: ${storageItems}\n
    Itens no Session Storage: ${sessionStorageItems}\n
    Fingerprint de Canvas: ${canvasFingerprint ? "Sim" : "Não"}\n
    Fingerprint de WebGL: ${webGLFingerprint ? "Sim" : "Não"}
  `;
}



async function detectCanvasFingerprint() {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 200;
    canvas.height = 50;

    ctx.fillStyle = "#f60";
    ctx.fillRect(10, 10, 100, 30);

    ctx.fillStyle = "#069";
    ctx.font = "18px Arial";
    ctx.fillText("Fingerprint Test", 20, 20);

    const dataURL = canvas.toDataURL();
    const hash = await hashString(dataURL);
    console.log("Hash de Canvas:", hash);
    return hash.length > 0;
  } catch (error) {
    console.error("Erro ao detectar fingerprint de canvas:", error);
    return false;
  }
}

async function hashString(input) {
  const msgBuffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function detectWebGLFingerprint() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!gl;
  } catch (error) {
    console.error("Erro ao detectar WebGL:", error);
    return false;
  }
}
