/**
 * YT Creator Collector - Content Script
 * Injected directly into YouTube pages.
 */

let apiBaseUrl = "http://localhost:8082";
let jwtToken = null;
let activeModalVideo = null;
let currentChannels = [];
let currentIdeas = [];
let activeTabMode = "existente"; // "existente" or "nova"

// 1. YouTube Watch Page and Thumbnail Button Injection Logic
function initCollector() {
  injectWatchPageButton();
  injectThumbnailHoverButtons();
  injectChannelPageButton();
}

// Periodic check (essential for SPAs like YouTube)
setInterval(initCollector, 1500);
window.addEventListener("yt-navigate-finish", initCollector);
document.addEventListener("DOMContentLoaded", initCollector);

// Inject button under video player (Watch Page)
function injectWatchPageButton() {
  if (!window.location.href.includes("/watch")) return;

  const targetContainer = document.querySelector("#top-level-buttons-computed");
  if (!targetContainer) return;

  // Check if button is already injected
  if (document.getElementById("cc-save-btn-wrapper")) return;

  const btnWrapper = document.createElement("yt-button-view-model");
  btnWrapper.id = "cc-save-btn-wrapper";
  btnWrapper.className = "ytd-menu-renderer cc-youtube-action-wrapper";
  btnWrapper.innerHTML = `
    <button-view-model class="ytSpecButtonViewModelHost">
      <button class="ytSpecButtonShapeNextHost ytSpecButtonShapeNextTonal ytSpecButtonShapeNextMono ytSpecButtonShapeNextSizeM ytSpecButtonShapeNextIconLeading ytSpecButtonShapeNextEnableBackdropFilterExperiment" title="Salvar no Creator Core" aria-label="Salvar no Creator Core">
        <div aria-hidden="true" class="ytSpecButtonShapeNextIcon">
          <span class="ytIconWrapperHost" style="width: 24px; height: 24px;">
            <span class="yt-icon-shape ytSpecIconShapeHost">
              <div style="width: 100%; height: 100%; display: block; fill: currentcolor;">
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z M12 7h-2v3H7v2h3v3h2v-3h3v-2h-3z" fill="currentColor"/></svg>
              </div>
            </span>
          </span>
        </div>
        <div class="ytSpecButtonShapeNextButtonTextContent" style="font-family: 'Montserrat', sans-serif; font-weight: 600;">Creator Core</div>
      </button>
    </button-view-model>
  `;

  // Attach click handler
  const btn = btnWrapper.querySelector("button");
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleWatchPageClick();
  });

  // Insert before the last button (e.g. "More actions" or "Share")
  if (targetContainer.children.length > 0) {
    targetContainer.insertBefore(btnWrapper, targetContainer.children[targetContainer.children.length - 1]);
  } else {
    targetContainer.appendChild(btnWrapper);
  }
}

// Inject hover buttons on video thumbnail cards (Home Feed, Search, etc.)
function injectThumbnailHoverButtons() {
  // Target new layout cards (yt-lockup-view-model .ytLockupViewModelHost)
  const lockupHosts = document.querySelectorAll("yt-lockup-view-model .ytLockupViewModelHost");

  lockupHosts.forEach(host => {
    if (host.querySelector(".cc-thumbnail-hover-btn")) return;

    // Add relative position wrapper class if not present
    host.classList.add("cc-lockup-host-relative");

    const hoverBtn = document.createElement("button");
    hoverBtn.className = "cc-thumbnail-hover-btn";
    hoverBtn.title = "Salvar no Creator Core";
    hoverBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="white">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>
    `;

    hoverBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleThumbnailClick(host);
    });

    host.appendChild(hoverBtn);
  });
}

// 2. Click Handler - Watch Page
function handleWatchPageClick() {
  // Extract info from page
  const titleEl = document.querySelector("h1.ytd-watch-metadata") ||
    document.querySelector("ytd-video-primary-info-renderer h1.title") ||
    document.querySelector("h1 yt-formatted-string");
  const title = titleEl ? titleEl.textContent.trim() : document.title.replace(" - YouTube", "");

  const channelEl = document.querySelector("ytd-video-owner-renderer yt-formatted-string.ytd-channel-name a") ||
    document.querySelector("#channel-name a") ||
    document.querySelector(".ytd-channel-name a");
  const channelName = channelEl ? channelEl.textContent.trim() : "YouTube";

  const url = window.location.href;
  let videoId = null;
  try {
    const u = new URL(url);
    videoId = u.searchParams.get("v");
  } catch (e) { }

  if (!videoId) return;

  openModal({
    title,
    channelName,
    url,
    videoId,
    type: "video"
  });
}

// Inject button on YouTube Channel Page
function injectChannelPageButton() {
  if (!window.location.href.includes("/@") && !window.location.href.includes("/channel/")) return;

  const targetContainers = document.querySelectorAll("yt-flexible-actions-view-model");
  if (targetContainers.length === 0) return;

  targetContainers.forEach(container => {
    if (container.querySelector(".cc-channel-save-btn-wrapper")) return;

    const btnWrapper = document.createElement("div");
    btnWrapper.className = "ytFlexibleActionsViewModelAction cc-channel-save-btn-wrapper";
    btnWrapper.innerHTML = `
      <button-view-model class="ytSpecButtonViewModelHost">
        <button class="ytSpecButtonShapeNextHost ytSpecButtonShapeNextTonal ytSpecButtonShapeNextMono ytSpecButtonShapeNextSizeM ytSpecButtonShapeNextIconLeading ytSpecButtonShapeNextEnableBackdropFilterExperiment" style="background-color: rgba(255, 80, 69, 0.15); color: #ff5045;" title="Salvar no Creator Core" aria-label="Salvar no Creator Core">
          <div aria-hidden="true" class="ytSpecButtonShapeNextIcon">
            <span class="ytIconWrapperHost" style="width: 24px; height: 24px;">
              <span class="yt-icon-shape ytSpecIconShapeHost">
                <div style="width: 100%; height: 100%; display: block; fill: currentcolor;">
                  <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z M12 7h-2v3H7v2h3v3h2v-3h3v-2h-3z" fill="currentColor"/></svg>
                </div>
              </span>
            </span>
          </div>
          <div class="ytSpecButtonShapeNextButtonTextContent" style="font-family: 'Montserrat', sans-serif; font-weight: 600;">Salvar Canal</div>
        </button>
      </button-view-model>
    `;

    const btn = btnWrapper.querySelector("button");
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleChannelPageClick(btn);
    });

    container.appendChild(btnWrapper);
  });
}

async function handleChannelPageClick(btnElement) {
  const activePage = btnElement.closest('ytd-browse') || btnElement.closest('yt-page-header-view-model') || document;

  const handleEl = activePage.querySelector('yt-content-metadata-view-model span[dir="auto"]') || activePage.querySelector('#channel-handle');
  const handle = handleEl ? handleEl.textContent.trim() : "";

  const nameEl = activePage.querySelector('h1.dynamicTextViewModelH1') || activePage.querySelector('yt-dynamic-text-view-model h1') || activePage.querySelector('#channel-name .ytd-channel-name');
  const channelName = nameEl ? nameEl.textContent.trim() : "YouTube Channel";

  const subsEl = activePage.querySelector('yt-content-metadata-view-model span[aria-label*="inscritos"]') || activePage.querySelector('#subscriber-count');
  const subs = subsEl ? subsEl.textContent.trim() : "";

  const photoEl = activePage.querySelector('yt-decorated-avatar-view-model img') || activePage.querySelector('yt-page-header-profile-picture-renderer img') || activePage.querySelector('#channel-header img') || activePage.querySelector('#avatar img') || activePage.querySelector('.yt-page-header-avatar img');
  const photoUrl = photoEl ? photoEl.src : "";

  const descEl = activePage.querySelector('yt-description-preview-view-model truncated-text-content') || activePage.querySelector('#description-container');
  const description = descEl ? descEl.textContent.trim().replace("…mais", "").replace("...more", "").trim() : "";

  const url = window.location.href.split('/videos')[0].split('/shorts')[0].split('/streams')[0].split('/community')[0];
  const titleStr = handle ? `[Canal] ${channelName} (${handle})` : `[Canal] ${channelName}`;
  const payloadNote = `Inscritos: ${subs}\nDescrição: ${description}`;

  const textElement = btnElement.querySelector(".ytSpecButtonShapeNextButtonTextContent");
  const iconElement = btnElement.querySelector(".ytSpecButtonShapeNextIcon");
  const originalText = textElement.innerHTML;
  
  textElement.innerHTML = "Salvando...";
  btnElement.style.opacity = "0.7";
  btnElement.style.pointerEvents = "none";

  try {
    const storage = await chrome.storage.local.get(["apiBaseUrl", "jwtToken"]);
    let apiBaseUrl = storage.apiBaseUrl || "http://localhost:8082";
    if (apiBaseUrl.startsWith("http://api.creatorsdeck.site")) {
      apiBaseUrl = apiBaseUrl.replace("http://", "https://");
    }
    const jwtToken = storage.jwtToken;

    if (!jwtToken) {
      alert("CreatorsDeck: Por favor, faça login na extensão primeiro.");
      throw new Error("No token");
    }

    const channelsResponse = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: "apiCall",
        url: `${apiBaseUrl}/api/channels`,
        method: "GET",
        headers: { "Authorization": `Bearer ${jwtToken}` }
      }, (resp) => {
        if (resp && resp.error) {
          reject(new Error(resp.error));
        } else if (resp && resp.text) {
          try {
            resolve(JSON.parse(resp.text));
          } catch(e) {
            resolve([]);
          }
        } else {
          resolve([]);
        }
      });
    });

    if (!channelsResponse || channelsResponse.length === 0) {
      alert("CreatorsDeck: Você precisa criar pelo menos um canal no painel antes de salvar.");
      throw new Error("No channels");
    }

    const targetChannelId = channelsResponse[0].id;

    await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: "apiCall",
        url: `${apiBaseUrl}/api/channels/${targetChannelId}/references`,
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${jwtToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: titleStr,
          url: url,
          note: payloadNote,
          thumbnailUrl: photoUrl,
          type: "LINK"
        })
      }, (resp) => {
        if (resp && resp.error) {
          reject(new Error(resp.error));
        } else if (resp && !resp.ok) {
          reject(new Error(`API retornou status ${resp.status}`));
        } else {
          resolve(resp);
        }
      });
    });

    textElement.innerHTML = "Salvo com Sucesso!";
    btnElement.style.backgroundColor = "rgba(43, 166, 64, 0.15)";
    btnElement.style.color = "#2ba640";
    btnElement.style.opacity = "1";
    if (iconElement) iconElement.style.display = "none";

    setTimeout(() => {
      textElement.innerHTML = originalText;
      btnElement.style.backgroundColor = "rgba(255, 80, 69, 0.15)";
      btnElement.style.color = "#ff5045";
      btnElement.style.pointerEvents = "auto";
      if (iconElement) iconElement.style.display = "block";
    }, 3000);

  } catch (err) {
    console.error(err);
    if (err.message !== "No token" && err.message !== "No channels") {
      alert("CreatorsDeck Erro: " + err.message);
    }
    textElement.innerHTML = "Erro ao Salvar";
    btnElement.style.backgroundColor = "rgba(239, 68, 68, 0.15)";
    btnElement.style.color = "#ef4444";
    btnElement.style.opacity = "1";
    if (iconElement) iconElement.style.display = "none";
    
    setTimeout(() => {
      textElement.innerHTML = originalText;
      btnElement.style.backgroundColor = "rgba(255, 80, 69, 0.15)";
      btnElement.style.color = "#ff5045";
      btnElement.style.pointerEvents = "auto";
      if (iconElement) iconElement.style.display = "block";
    }, 3000);
  }
}

// 3. Click Handler - Thumbnail
function handleThumbnailClick(host) {
  const lockup = host.closest("yt-lockup-view-model");
  if (!lockup) return;

  const titleLink = lockup.querySelector("a.ytLockupMetadataViewModelTitle") || lockup.querySelector("h3 a");
  const title = titleLink ? (titleLink.getAttribute("title") || titleLink.innerText.trim()) : "";
  const href = titleLink ? titleLink.getAttribute("href") : "";
  const fullUrl = href ? (href.startsWith("http") ? href : `https://www.youtube.com${href}`) : "";

  // Extract channel name
  const channelLink = lockup.querySelector("yt-content-metadata-view-model a") ||
    lockup.querySelector('.ytLockupMetadataViewModelTextContainer a[href*="/@"]') ||
    lockup.querySelector("a[href*='/channel/']") ||
    lockup.querySelector("a[href*='/@']");
  const channelName = channelLink ? channelLink.innerText.trim() : "YouTube";

  // Video ID
  let videoId = null;
  if (fullUrl) {
    try {
      const u = new URL(fullUrl);
      videoId = u.searchParams.get("v");
    } catch (e) { }
  }

  if (!videoId) return;

  openModal({
    title,
    channelName,
    url: fullUrl,
    videoId,
    type: "video"
  });
}

// Helper to make background proxy API fetches (Bypass CORS Loopback/PNA)
async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${apiBaseUrl}${endpoint}`;
  const headers = options.headers || {};

  if (jwtToken && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${jwtToken}`;
  }
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: "apiCall",
      url,
      method: options.method || "GET",
      headers,
      body: options.body
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response) {
        reject(new Error("Nenhuma resposta da extensão (background.js)."));
        return;
      }
      if (!response.ok) {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          reject(new Error(response.text || `Erro HTTP ${response.status}`));
        }
        return;
      }

      // Parse JSON response if possible
      try {
        const json = JSON.parse(response.text);
        resolve(json);
      } catch (e) {
        resolve(response.text);
      }
    });
  });
}

// 4. Modal Dialog Rendering
async function openModal(videoInfo) {
  // Remove existing modal if any
  closeModal();

  activeModalVideo = videoInfo;
  activeTabMode = "existente";

  // Load configuration
  const storage = await chrome.storage.local.get(["apiBaseUrl", "jwtToken"]);
  if (storage.apiBaseUrl) {
    apiBaseUrl = storage.apiBaseUrl;
    if (apiBaseUrl.startsWith("http://api.creatorsdeck.site")) {
      apiBaseUrl = apiBaseUrl.replace("http://", "https://");
    }
  }
  jwtToken = storage.jwtToken || null;

  // Create Modal Overlay
  const overlay = document.createElement("div");
  overlay.id = "cc-modal-overlay";
  overlay.className = "cc-modal-overlay";
  overlay.innerHTML = `
    <div class="cc-modal-card">
      <div class="cc-modal-header">
        <div class="cc-modal-logo">
          <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="#ff5045"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z M12 7h-2v3H7v2h3v3h2v-3h3v-2h-3z" fill="currentColor"/></svg>
          <span style="font-family: 'Montserrat', sans-serif; font-weight: 800; font-size: 14px;">Creator Core</span>
        </div>
        <button class="cc-modal-close-btn" id="cc-close-modal">
          <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>
      
      <div class="cc-modal-body">
        <div id="cc-modal-alert" class="cc-alert">
          <span id="cc-alert-msg"></span>
        </div>
        
        <div class="cc-video-card">
          <img class="cc-video-thumb" src="${videoInfo.type === 'channel' ? videoInfo.photoUrl : `https://img.youtube.com/vi/${videoInfo.videoId}/hqdefault.jpg`}" ${videoInfo.type === 'channel' ? 'style="border-radius: 50%; width: 56px; height: 56px; object-fit: cover;"' : ''}>
          <div class="cc-video-details">
            <h4 class="cc-video-title">${videoInfo.title}</h4>
            <span class="cc-video-channel">${videoInfo.type === 'channel' ? videoInfo.subs : videoInfo.channelName}</span>
          </div>
        </div>
        
        <div id="cc-modal-form-area">
          <!-- Form loaded dynamically -->
        </div>

        <div id="cc-modal-loader" class="cc-loading-overlay" style="display: none;">
          <svg class="cc-spinner" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff5045" stroke-width="3" stroke-linecap="round"><circle cx="12" cy="12" r="10" stroke="rgba(255,80,69,0.15)"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>
          <span style="font-weight: 600; font-size: 12px; color: #f1f1f1;">Carregando...</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Setup close events
  document.getElementById("cc-close-modal").addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  // Trigger CSS animations
  setTimeout(() => overlay.classList.add("active"), 10);

  // Load views
  if (jwtToken) {
    await renderCollectorForm();
  } else {
    renderLoginForm();
  }
}

function closeModal() {
  const overlay = document.getElementById("cc-modal-overlay");
  if (overlay) {
    overlay.classList.remove("active");
    setTimeout(() => overlay.remove(), 250);
  }
  activeModalVideo = null;
}

// 5. Render Login Form inside modal
function renderLoginForm() {
  const formArea = document.getElementById("cc-modal-form-area");
  formArea.innerHTML = `
    <div style="text-align: center; margin-bottom: 16px;">
      <p style="font-size: 12px; color: #aaaaaa;">Conecte-se com sua conta para salvar.</p>
    </div>
    <form id="cc-login-form">
      <div class="cc-form-group">
        <label class="cc-label">Usuário</label>
        <input type="text" id="cc-login-username" class="cc-input" required placeholder="Seu username">
      </div>
      <div class="cc-form-group" style="margin-bottom: 18px;">
        <label class="cc-label">Senha</label>
        <input type="password" id="cc-login-password" class="cc-input" required placeholder="Sua senha">
      </div>
      <button type="submit" class="cc-btn">Conectar</button>
    </form>
  `;

  document.getElementById("cc-login-form").addEventListener("submit", handleModalLogin);
}

// 6. Handle Login inside YouTube modal
async function handleModalLogin(e) {
  e.preventDefault();
  const username = document.getElementById("cc-login-username").value.trim();
  const password = document.getElementById("cc-login-password").value;

  toggleModalLoader(true);
  hideModalAlert();

  try {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: { username, password }
    });

    jwtToken = data.token;
    await chrome.storage.local.set({ jwtToken });

    // Load collector UI
    await renderCollectorForm();
  } catch (err) {
    console.error(err);
    showModalAlert("error", "Usuário ou senha incorretos.");
  } finally {
    toggleModalLoader(false);
  }
}

// 7. Render Core Collector form
async function renderCollectorForm() {
  toggleModalLoader(true);
  hideModalAlert();

  const formArea = document.getElementById("cc-modal-form-area");
  formArea.innerHTML = `
    <div class="cc-tabs">
      <button id="cc-tab-existente" class="cc-tab-btn active">Anexar a Ideia</button>
      <button id="cc-tab-nova" class="cc-tab-btn">Nova Ideia</button>
      <button id="cc-tab-canal" class="cc-tab-btn">Salvar no Canal</button>
    </div>

    <!-- Canal (Global, shared between all tabs) -->
    <div class="cc-form-group">
      <label class="cc-label">Canal Destino</label>
      <select id="cc-select-channel" class="cc-input"></select>
    </div>

    <!-- TAB 1: Existente -->
    <div id="cc-panel-existente" class="cc-tab-content active">
      <div class="cc-form-group">
        <label class="cc-label">Selecione a Ideia</label>
        <select id="cc-select-idea" class="cc-input">
          <option value="">Selecione um canal...</option>
        </select>
      </div>
      <div style="margin: 12px 0;">
        <label class="cc-checkbox-group">
          <input type="checkbox" id="cc-save-link" checked>
          <span>Salvar Link de Referência</span>
        </label>
        <label class="cc-checkbox-group">
          <input type="checkbox" id="cc-save-thumb" checked>
          <span>Salvar Thumbnail (Imagem)</span>
        </label>
      </div>
      <button id="cc-btn-save-ref" class="cc-btn">Salvar Referência</button>
    </div>

    <!-- TAB 2: Nova Ideia -->
    <div id="cc-panel-nova" class="cc-tab-content">
      <div class="cc-form-group">
        <label class="cc-label">Título da Nova Ideia</label>
        <input type="text" id="cc-new-idea-title" class="cc-input" value="${activeModalVideo.title}">
      </div>
      <div class="cc-form-group">
        <label class="cc-label">Anotações da Ideia</label>
        <textarea id="cc-new-idea-desc" class="cc-input" style="height: 52px; resize: none;" placeholder="Breve nota sobre essa referência..."></textarea>
      </div>
      <div style="margin: 10px 0;">
        <label class="cc-checkbox-group">
          <input type="checkbox" id="cc-new-idea-link" checked>
          <span>Anexar Link de Referência</span>
        </label>
        <label class="cc-checkbox-group">
          <input type="checkbox" id="cc-new-idea-thumb" checked>
          <span>Salvar Thumbnail no Moodboard</span>
        </label>
      </div>
      <button id="cc-btn-create-idea" class="cc-btn">Criar Ideia e Salvar</button>
    </div>

    <!-- TAB 3: Salvar no Canal -->
    <div id="cc-panel-canal" class="cc-tab-content">
      <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 8px;">
        <button id="cc-btn-save-canal-thumb" class="cc-btn">
          <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
          Salvar Thumb
        </button>
        <button id="cc-btn-save-canal-title" class="cc-btn">
          <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="currentColor"><path d="M5 4v3h5.5v12h3V7H19V4z"/></svg>
          Salvar Título
        </button>
        <button id="cc-btn-save-canal-suggestions" class="cc-btn" style="background-color: #ff5045;">
          <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
          Coletar Sugestões do Canal
        </button>
      </div>
    </div>
    
    <button id="cc-btn-modal-logout" class="cc-btn-secondary" style="font-size: 11px; padding: 6px; margin-top: 10px;">
      Desconectar
    </button>
  `;

  // Setup tab switcher logic
  setupModalTabs();

  // Load Channels
  try {
    currentChannels = await apiFetch("/api/channels");
    populateModalChannels();
  } catch (err) {
    console.error(err);
    // Token expired or network issue
    if (err.message.includes("401") || err.message.includes("403") || err.message.includes("Unauthorized")) {
      await chrome.storage.local.remove("jwtToken");
      jwtToken = null;
      renderLoginForm();
      showModalAlert("error", "Sessão expirada. Conecte-se novamente.");
    } else {
      showModalAlert("error", "Não foi possível carregar os canais da API.");
    }
  } finally {
    toggleModalLoader(false);
  }
}

// Modal tab logic
function setupModalTabs() {
  const tabEx = document.getElementById("cc-tab-existente");
  const tabNv = document.getElementById("cc-tab-nova");
  const tabCanal = document.getElementById("cc-tab-canal");
  const panelEx = document.getElementById("cc-panel-existente");
  const panelNv = document.getElementById("cc-panel-nova");
  const panelCanal = document.getElementById("cc-panel-canal");

  tabEx.addEventListener("click", () => {
    activeTabMode = "existente";
    tabEx.classList.add("active");
    tabNv.classList.remove("active");
    tabCanal.classList.remove("active");
    panelEx.classList.add("active");
    panelNv.classList.remove("active");
    panelCanal.classList.remove("active");
  });

  tabNv.addEventListener("click", () => {
    activeTabMode = "nova";
    tabEx.classList.remove("active");
    tabNv.classList.add("active");
    tabCanal.classList.remove("active");
    panelEx.classList.remove("active");
    panelNv.classList.add("active");
    panelCanal.classList.remove("active");
  });

  tabCanal.addEventListener("click", () => {
    activeTabMode = "canal";
    tabEx.classList.remove("active");
    tabNv.classList.remove("active");
    tabCanal.classList.add("active");
    panelEx.classList.remove("active");
    panelNv.classList.remove("active");
    panelCanal.classList.add("active");
  });

  document.getElementById("cc-btn-modal-logout").addEventListener("click", async () => {
    await chrome.storage.local.remove("jwtToken");
    jwtToken = null;
    renderLoginForm();
  });

  // Action Buttons
  document.getElementById("cc-btn-save-ref").addEventListener("click", handleModalSaveRef);
  document.getElementById("cc-btn-create-idea").addEventListener("click", handleModalCreateIdea);
  document.getElementById("cc-btn-save-canal-thumb").addEventListener("click", () => handleModalSaveCanalDirect("THUMBNAIL"));
  document.getElementById("cc-btn-save-canal-title").addEventListener("click", () => handleModalSaveCanalDirect("TITLE"));
  document.getElementById("cc-btn-save-canal-suggestions").addEventListener("click", handleModalSaveCanalSuggestions);
}

// Populate Channels Dropdown
function populateModalChannels() {
  const selectCh = document.getElementById("cc-select-channel");
  if (currentChannels.length === 0) {
    if (selectCh) selectCh.innerHTML = '<option value="">Nenhum canal cadastrado</option>';
    return;
  }

  const optionsHtml = '<option value="">-- Selecione um Canal --</option>' + 
    currentChannels.map(ch => `<option value="${ch.id}">${ch.name}</option>`).join('');

  if (selectCh) {
    selectCh.innerHTML = optionsHtml;
    selectCh.addEventListener("change", async () => {
      const channelId = selectCh.value;
      if (channelId) {
        await fetchModalIdeas(channelId);
      } else {
        const selectId = document.getElementById("cc-select-idea");
        if (selectId) selectId.innerHTML = '<option value="">Selecione um canal...</option>';
      }
    });
  }

  // Auto-select first channel
  if (currentChannels.length === 1) {
    const defaultChannelId = currentChannels[0].id;
    if (selectCh) {
      selectCh.value = defaultChannelId;
      fetchModalIdeas(defaultChannelId);
    }
  }
}

// Fetch Ideas for dropdown
async function fetchModalIdeas(channelId) {
  const selectId = document.getElementById("cc-select-idea");
  selectId.innerHTML = '<option value="">Carregando ideias...</option>';

  try {
    currentIdeas = await apiFetch(`/api/channels/${channelId}/ideas`);
    selectId.innerHTML = "";

    if (currentIdeas.length === 0) {
      selectId.innerHTML = '<option value="">Nenhuma ideia cadastrada</option>';
      return;
    }

    selectId.innerHTML = '<option value="">-- Selecione a Ideia --</option>';
    currentIdeas.forEach(idea => {
      const opt = document.createElement("option");
      opt.value = idea.id;
      opt.innerText = idea.mainTitle;
      selectId.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    showModalAlert("error", "Erro ao carregar ideias do canal.");
  }
}

// Post single reference to API
async function postModalReference(ideaId, type, url, label) {
  await apiFetch(`/api/ideas/${ideaId}/references`, {
    method: "POST",
    body: {
      type: type,
      url: url,
      label: label
    }
  });
}

// Save reference flow
async function handleModalSaveRef() {
  const selectCh = document.getElementById("cc-select-channel");
  const selectId = document.getElementById("cc-select-idea");
  const ideaId = selectId.value;

  if (!selectCh.value || !ideaId) {
    return showModalAlert("error", "Selecione o canal e a ideia de destino.");
  }

  const saveLink = document.getElementById("cc-save-link").checked;
  const saveThumb = document.getElementById("cc-save-thumb").checked;

  if (!saveLink && !saveThumb) {
    return showModalAlert("error", "Selecione ao menos um item para salvar.");
  }

  toggleModalLoader(true);
  hideModalAlert();

  try {
    if (saveLink) {
      await postModalReference(ideaId, "LINK", activeModalVideo.url, activeModalVideo.title);
    }

    if (saveThumb) {
      const thumbUrl = activeModalVideo.type === "channel" ? activeModalVideo.photoUrl : `https://img.youtube.com/vi/${activeModalVideo.videoId}/hqdefault.jpg`;
      await postModalReference(ideaId, "IMAGE", thumbUrl, `Thumbnail: ${activeModalVideo.title}`);
    }

    showModalAlert("success", "Referências salvas com sucesso!");
    setTimeout(closeModal, 1500);
  } catch (err) {
    console.error(err);
    showModalAlert("error", err.message || "Falha ao salvar as referências.");
  } finally {
    toggleModalLoader(false);
  }
}

// Create new Idea flow
async function handleModalCreateIdea() {
  const selectCh = document.getElementById("cc-select-channel");
  const channelId = selectCh.value;

  if (!channelId) {
    return showModalAlert("error", "Selecione o canal de destino.");
  }

  const titleInput = document.getElementById("cc-new-idea-title");
  const title = titleInput.value.trim();
  if (!title) {
    return showModalAlert("error", "Digite um título para a nova ideia.");
  }

  const desc = document.getElementById("cc-new-idea-desc").value.trim();
  const attachLink = document.getElementById("cc-new-idea-link").checked;
  const attachThumb = document.getElementById("cc-new-idea-thumb").checked;

  toggleModalLoader(true);
  hideModalAlert();

  try {
    // 1. Create Idea
    const newIdea = await apiFetch(`/api/channels/${channelId}/ideas`, {
      method: "POST",
      body: {
        mainTitle: title,
        description: desc || `Criado nativamente via YouTube a partir do vídeo: ${activeModalVideo.title}`
      }
    });

    const ideaId = newIdea.id;

    // 2. Add References
    if (attachLink) {
      await postModalReference(ideaId, "LINK", activeModalVideo.url, activeModalVideo.title);
    }

    if (attachThumb) {
      const thumbUrl = activeModalVideo.type === "channel" ? activeModalVideo.photoUrl : `https://img.youtube.com/vi/${activeModalVideo.videoId}/hqdefault.jpg`;
      await postModalReference(ideaId, "IMAGE", thumbUrl, `Thumbnail: ${activeModalVideo.title}`);
    }

    showModalAlert("success", "Nova Ideia criada e referências salvas!");
    setTimeout(closeModal, 1500);
  } catch (err) {
    console.error(err);
    showModalAlert("error", err.message || "Erro ao criar a ideia de vídeo.");
  } finally {
    toggleModalLoader(false);
  }
}

// Save directly to Channel flow
async function handleModalSaveCanalDirect(refType) {
  const selectCh = document.getElementById("cc-select-channel");
  const selectedChannel = selectCh.value;

  if (!selectedChannel) {
    return showModalAlert("error", "Selecione o canal de destino.");
  }

  const title = activeModalVideo.title;
  const note = "";

  toggleModalLoader(true);
  hideModalAlert();

  try {
    const isChannel = activeModalVideo.type === "channel";
    let payloadNote = note;
    if (isChannel) {
      payloadNote = `Inscritos: ${activeModalVideo.subs}\nDescrição: ${activeModalVideo.description}`;
    }

    await apiFetch(`/api/channels/${selectedChannel}/references`, {
      method: "POST",
      body: JSON.stringify({
        title: title,
        url: activeModalVideo.url,
        note: payloadNote,
        thumbnailUrl: isChannel ? activeModalVideo.photoUrl : `https://img.youtube.com/vi/${activeModalVideo.videoId}/maxresdefault.jpg`,
        type: refType
      })
    });

    showModalAlert("success", "Referência salva no canal com sucesso!");
    setTimeout(closeModal, 1500);
  } catch (err) {
    console.error(err);
    showModalAlert("error", err.message || "Erro ao salvar a referência no canal.");
  } finally {
    toggleModalLoader(false);
  }
}

// Save YouTube channel reference and trigger suggestions scrape
async function handleModalSaveCanalSuggestions() {
  const selectCh = document.getElementById("cc-select-channel");
  const selectedChannel = selectCh.value;

  if (!selectedChannel) {
    return showModalAlert("error", "Selecione o canal de destino.");
  }

  const isChannel = activeModalVideo.type === "channel";
  const targetUrl = isChannel ? activeModalVideo.url : activeModalVideo.channelUrl;
  const targetName = isChannel ? (activeModalVideo.channelName || activeModalVideo.title.replace("[Canal] ", "")) : activeModalVideo.channelName;

  if (!targetUrl) {
    return showModalAlert("error", "Não foi possível detectar a URL do canal de origem neste vídeo. Tente recarregar a página.");
  }

  toggleModalLoader(true);
  hideModalAlert();

  try {
    await apiFetch(`/api/channels/${selectedChannel}/references`, {
      method: "POST",
      body: {
        title: `Canal: ${targetName || "YouTube"}`,
        url: targetUrl,
        note: "Coleta de sugestões de vídeos deste canal.",
        thumbnailUrl: isChannel ? activeModalVideo.photoUrl : "",
        type: "LINK",
        scrapeChannelUrl: targetUrl
      }
    });

    showModalAlert("success", "Solicitação de sugestões enviada com sucesso!");
    setTimeout(closeModal, 1500);
  } catch (err) {
    console.error(err);
    showModalAlert("error", err.message || "Erro ao solicitar a coleta de sugestões.");
  } finally {
    toggleModalLoader(false);
  }
}


// Helper alerts
function showModalAlert(type, msg) {
  const alert = document.getElementById("cc-modal-alert");
  const alertMsg = document.getElementById("cc-alert-msg");

  alert.style.display = "flex";
  alert.className = `cc-alert cc-alert-${type}`;
  alertMsg.innerText = msg;
}

// Hide alerts helper
function hideModalAlert() {
  const alert = document.getElementById("cc-modal-alert");
  if (alert) alert.style.display = "none";
}

function toggleModalLoader(show) {
  const loader = document.getElementById("cc-modal-loader");
  if (loader) loader.style.display = show ? "flex" : "none";
}

// 8. Basic runtime listener for popup integration
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getVideoInfo") {
    const url = window.location.href;

    if (url.includes("/@") || url.includes("/channel/")) {
      const handleEl = document.querySelector('yt-content-metadata-view-model span[dir="auto"]');
      const handle = handleEl ? handleEl.textContent.trim() : "";
      
      const nameEl = document.querySelector('h1.dynamicTextViewModelH1');
      const channelName = nameEl ? nameEl.textContent.trim() : "YouTube Channel";
      
      const subsEl = document.querySelector('yt-content-metadata-view-model span[aria-label*="inscritos"]');
      const subs = subsEl ? subsEl.textContent.trim() : "";
      
      const photoEl = document.querySelector('yt-decorated-avatar-view-model img');
      const photoUrl = photoEl ? photoEl.src : "";
      
      const descEl = document.querySelector('yt-description-preview-view-model truncated-text-content');
      const description = descEl ? descEl.textContent.trim().replace("…mais", "").trim() : "";

      const cleanUrl = url.split('/videos')[0].split('/shorts')[0].split('/streams')[0].split('/community')[0];

      sendResponse({
        title: handle ? `[Canal] ${channelName} (${handle})` : `[Canal] ${channelName}`,
        channelName: handle || channelName,
        url: cleanUrl,
        photoUrl: photoUrl,
        subs: subs,
        description: description,
        type: "channel"
      });
      return true;
    }

    // Watch Page title
    const titleEl = document.querySelector("h1.ytd-watch-metadata") ||
      document.querySelector("ytd-video-primary-info-renderer h1.title") ||
      document.querySelector("h1 yt-formatted-string");
    const title = titleEl ? titleEl.textContent.trim() : document.title.replace(" - YouTube", "");

    // Channel
    const channelEl = document.querySelector("ytd-video-owner-renderer yt-formatted-string.ytd-channel-name a") ||
      document.querySelector("#channel-name a") ||
      document.querySelector(".ytd-channel-name a");
    const channelName = channelEl ? channelEl.textContent.trim() : "";
    const channelUrl = channelEl ? channelEl.href : "";

    let videoId = null;
    try {
      const u = new URL(url);
      videoId = u.searchParams.get("v");
    } catch (e) { }

    sendResponse({
      title: title,
      channelName: channelName,
      channelUrl: channelUrl,
      url: url,
      videoId: videoId,
      type: "video"
    });
  }
  return true;
});
