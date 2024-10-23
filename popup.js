const API_KEY = "AIzaSyCrhJcDvg_15JyHWzUe7c4_itL3f2axz18"; // Substitua pela sua chave de API do Google Safe Browsing

function calcularPontuacao(conexoesTerceiras, cookiesTerceiros, canvasFingerprint, storageCount) {
  let pontuacao = 100; // Pontuação inicial

  // Penalidades
  pontuacao -= cookiesTerceiros * 5; // Cada cookie de terceiros reduz 5 pontos
  if (canvasFingerprint) pontuacao -= 20; // Fingerprint de canvas reduz 20 pontos
  if (storageCount > 10) pontuacao -= (storageCount - 10) * 5; // Reduz 5 pontos para cada item além de 10

   console.log("Conexões de terceiros:", conexoesTerceiras);

  return Math.max(pontuacao, 0); // A pontuação mínima é 0

}

function desenharMedidor(pontuacao) {
  const canvas = document.getElementById("medidor");
  const ctx = canvas.getContext("2d");
  const largura = canvas.width;
  const altura = canvas.height;

  // Limpar canvas
  ctx.clearRect(0, 0, largura, altura);

  // Desenhar fundo
  ctx.fillStyle = "#eee";
  ctx.fillRect(0, altura / 2 - 10, largura, 20);

  // Calcular a posição do ponteiro
  const posicao = (pontuacao / 100) * largura; // Ajuste para 100

  // Definir cor do ponteiro baseado na pontuação
  ctx.fillStyle = pontuacao > 50 ? "green" : "red";

  // Desenhar o ponteiro
  ctx.fillRect(0, altura / 2 - 10, posicao, 20);
}

// Alterna entre as abas
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    tab.classList.add("active");
    const contentId = tab.id.replace("tab-", "content-");
    document.getElementById(contentId).classList.add("active");
  });
});

// Torna a função de análise assíncrona
document.getElementById("analisar").addEventListener("click", async () => {
  console.log("Analisando...AAAAAAA");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const url = new URL(tab.url);
    if (url.protocol === "chrome:" || url.protocol === "about:") {
      document.getElementById("info").innerText = "Essa página não pode ser analisada.";
      return;
    }

    const cookies = await chrome.cookies.getAll({ url: tab.url });
    const terceiraParteCookies = cookies.filter(cookie => !cookie.domain.includes(url.hostname)).length;

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    chrome.runtime.sendMessage({ action: "getConexoesTerceiras" }, async (response) => {
      const conexoesTerceiras = response.conexoesTerceiras;

      chrome.tabs.sendMessage(tab.id, { action: "analisar" }, async (contentResponse) => {
        const storageCount = localStorage.length;
        const canvasFingerprint = contentResponse.resultado.includes("Sim");

        // Verifica suspeitas de hijacking
        console.log("Verificando suspeitas...");
        const aviso = await verificarSuspeitas(tab.url); // Chamada assíncrona

        const pontuacao = calcularPontuacao(conexoesTerceiras, terceiraParteCookies, canvasFingerprint, storageCount);
        
        // Atualiza o medidor com a pontuação
        desenharMedidor(pontuacao);

        document.getElementById("info").innerText = `
          Pontuação de Privacidade: ${pontuacao}/100\n
          ${contentResponse.resultado}\n
          ${aviso ? aviso : ''}
        `;

        // Preencher a lista de conexões
        const conexoesList = document.getElementById("conexoes-list");
        conexoesList.innerHTML = ""; // Limpa a lista antes de preenchê-la
        conexoesTerceiras.forEach(dominio => {
          const li = document.createElement("li");
          li.textContent = dominio;
          conexoesList.appendChild(li);
        });
      });
    });
  } catch (error) {
    console.error("Erro:", error);
    document.getElementById("info").innerText = "Erro ao conectar.";
  }
});

// Função assíncrona para verificar suspeitas
async function verificarSuspeitas(urlAtual) {
  const url = new URL(urlAtual);
  const dominioAtual = url.hostname;

  const isSafe = await verificarComGoogleSafeBrowsing(dominioAtual);
  // if (!isSafe) {
  //   return "Suspeita de sequestro de navegador detectada!";
  // }
  // return "Site seguro.";
  return isSafe;
}

async function verificarComGoogleSafeBrowsing(dominio) {
  console.log("Verificando com Google Safe Browsing...");

  try {
    const response = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client: {
          clientId: "your-client-id", // Substituir por um ID válido se necessário
          clientVersion: "1.0",
        },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url: dominio }],
        },
      }),
    });

    if (!response.ok) {
      console.error("Erro na API Safe Browsing:", response.status);
      return "Erro ao verificar segurança do site com o Google Safe Browsing.";
    }

    const data = await response.json();
    
    // Verifica se a resposta contém alguma ameaça
    if (data.matches && data.matches.length > 0) {
      console.log("Ameaça detectada:", data.matches);
      return "Atenção! O site pode ser perigoso.";
    }

    return "Site seguro segudo o Google Safe Browsing.";
  } catch (error) {
    console.error("Erro ao verificar com o Google Safe Browsing:", error);
    return "Erro na verificação de segurança com o Google Safe Browsing.";
  }
}

