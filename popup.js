// YT Creator Collector Popup Logic

// State variables
let apiBaseUrl = "http://localhost:8082";
let jwtToken = null;
let currentUser = null;
let currentVideo = null; // Contains: title, channelName, url, videoId
let channels = [];
let ideas = [];
let activeTabMode = "existente"; // "existente" or "nova"

// DOM Elements
const screenLogin = document.getElementById("screen-login");
const screenCollector = document.getElementById("screen-collector");
const globalAlert = document.getElementById("global-alert");
const alertIcon = document.getElementById("alert-icon");
const alertMessage = document.getElementById("alert-message");
const settingsPanel = document.getElementById("settings-panel");
const loadingOverlay = document.getElementById("loading-overlay");

const btnSettings = document.getElementById("btn-settings");
const btnLogout = document.getElementById("btn-logout");
const btnSaveSettings = document.getElementById("btn-save-settings");
const btnLoginSubmit = document.getElementById("btn-login-submit");
const btnSaveReference = document.getElementById("btn-save-reference");
const btnCreateIdea = document.getElementById("btn-create-idea");

const serverUrlInput = document.getElementById("server-url");
const loginUsernameInput = document.getElementById("login-username");
const loginPasswordInput = document.getElementById("login-password");

const ytDetectWarning = document.getElementById("yt-detect-warning");
const ytVideoCard = document.getElementById("yt-video-card");
const collectorActions = document.getElementById("collector-actions");
const videoThumb = document.getElementById("video-thumb");
const videoTitleEl = document.getElementById("video-title");
const videoChannelEl = document.getElementById("video-channel");

const selectChannel = document.getElementById("select-channel");
const selectIdea = document.getElementById("select-idea");
const userDisplayEmail = document.getElementById("user-display-email");

const saveLinkCheckbox = document.getElementById("save-link");
const saveThumbCheckbox = document.getElementById("save-thumb");

const newIdeaTitleInput = document.getElementById("new-idea-title");
const newIdeaDescriptionInput = document.getElementById("new-idea-description");
const newIdeaLinkCheckbox = document.getElementById("new-idea-link");
const newIdeaThumbCheckbox = document.getElementById("new-idea-thumb");

const tabExistente = document.getElementById("tab-existente");
const tabNova = document.getElementById("tab-nova");
const tabCanal = document.getElementById("tab-canal");
const modeExistente = document.getElementById("mode-existente");
const modeNova = document.getElementById("mode-nova");
const modeCanal = document.getElementById("mode-canal");

const btnSaveCanalThumb = document.getElementById("btn-save-canal-thumb");
const btnSaveCanalTitle = document.getElementById("btn-save-canal-title");
const btnSaveCanalSuggestions = document.getElementById("btn-save-canal-suggestions");

// Initialize extension popup
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Load settings from local storage
  const storage = await chrome.storage.local.get(["apiBaseUrl", "jwtToken", "savedUsername"]);
  if (storage.apiBaseUrl) {
    let storedUrl = storage.apiBaseUrl;
    if (storedUrl.startsWith("http://api.creatorsdeck.site")) {
      storedUrl = storedUrl.replace("http://", "https://");
      chrome.storage.local.set({ apiBaseUrl: storedUrl });
    }
    apiBaseUrl = storedUrl;
    serverUrlInput.value = apiBaseUrl;
  }

  if (storage.savedUsername) {
    loginUsernameInput.value = storage.savedUsername;
  }

  if (storage.jwtToken) {
    jwtToken = storage.jwtToken;
  }

  // 2. Setup event listeners
  setupEventListeners();

  // 3. Check authentication status
  if (jwtToken) {
    await validateTokenAndInit();
  } else {
    showScreen("login");
  }
});

// Event Listeners Configuration
function setupEventListeners() {
  // Toggle Settings Panel
  btnSettings.addEventListener("click", () => {
    const isVisible = settingsPanel.style.display === "block";
    settingsPanel.style.display = isVisible ? "none" : "block";
  });

  // Save Settings
  btnSaveSettings.addEventListener("click", async () => {
    let url = serverUrlInput.value.trim().replace(/\/$/, ""); // remove trailing slash
    
    // Auto-fix http to https for the production API
    if (url.startsWith("http://api.creatorsdeck.site")) {
      url = url.replace("http://", "https://");
    }
    
    if (!url) return showAlert("error", "O endereço do servidor não pode ser vazio.");

    apiBaseUrl = url;
    await chrome.storage.local.set({ apiBaseUrl: url });
    settingsPanel.style.display = "none";
    showAlert("success", "Endereço da API atualizado com sucesso!");

    if (jwtToken) {
      await validateTokenAndInit();
    }
  });

  // Login Form Submission
  document.getElementById("form-login").addEventListener("submit", handleLogin);

  // Logout Action
  btnLogout.addEventListener("click", handleLogout);

  // Channel Dropdown Change
  selectChannel.addEventListener("change", async () => {
    const channelId = selectChannel.value;
    if (channelId) {
      await fetchIdeas(channelId);
    } else {
      selectIdea.innerHTML = '<option value="">Selecione um canal primeiro...</option>';
    }
  });

  // Tab Switchers
  tabExistente.addEventListener("click", () => switchTab("existente"));
  tabNova.addEventListener("click", () => switchTab("nova"));
  tabCanal.addEventListener("click", () => switchTab("canal"));

  // Save Reference Action
  btnSaveReference.addEventListener("click", handleSaveReference);

  // Create New Idea Action
  btnCreateIdea.addEventListener("click", handleCreateIdea);

  // Save directly to Channel Action
  btnSaveCanalThumb.addEventListener("click", () => handleSaveCanalDirect("THUMBNAIL"));
  btnSaveCanalTitle.addEventListener("click", () => handleSaveCanalDirect("TITLE"));
  btnSaveCanalSuggestions.addEventListener("click", handleSaveCanalSuggestions);
}

// Show/Hide Screens
function showScreen(screen) {
  if (screen === "login") {
    screenLogin.classList.add("active");
    screenCollector.classList.remove("active");
    btnLogout.style.display = "none";
  } else {
    screenLogin.classList.remove("active");
    screenCollector.classList.add("active");
    btnLogout.style.display = "flex";
  }
}

// Switch between existing ideas, new ideas, and channel tabs
function switchTab(mode) {
  activeTabMode = mode;
  tabExistente.classList.toggle("active", mode === "existente");
  tabNova.classList.toggle("active", mode === "nova");
  tabCanal.classList.toggle("active", mode === "canal");
  modeExistente.classList.toggle("active", mode === "existente");
  modeNova.classList.toggle("active", mode === "nova");
  modeCanal.classList.toggle("active", mode === "canal");
}

// Helper to show banners
function showAlert(type, message) {
  globalAlert.style.display = "flex";
  globalAlert.className = `alert alert-${type}`;
  alertMessage.innerText = message;

  if (type === "error") {
    alertIcon.innerText = "error";
  } else if (type === "success") {
    alertIcon.innerText = "check_circle";
  } else {
    alertIcon.innerText = "info";
  }

  // Auto-hide success alerts after 4 seconds
  if (type === "success") {
    setTimeout(() => {
      globalAlert.style.display = "none";
    }, 4000);
  }
}

function hideAlert() {
  globalAlert.style.display = "none";
}

// Loader toggle
function toggleLoader(show) {
  loadingOverlay.style.display = show ? "flex" : "none";
}

// Validate Token & Load Core Data
async function validateTokenAndInit() {
  toggleLoader(true);
  hideAlert();
  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${jwtToken}`,
        "Content-Type": "application/json"
      }
    });

    if (response.ok) {
      currentUser = await response.json();
      userDisplayEmail.innerText = currentUser.username || currentUser.email || "Usuário";
      showScreen("collector");

      // Load user channels and detect video
      await fetchChannels();
      await detectYouTubeVideo();
    } else {
      // Invalid/expired token
      await handleLogout();
      showAlert("error", "Sessão expirada. Por favor, conecte-se novamente.");
    }
  } catch (err) {
    console.error(err);
    showAlert("error", "Não foi possível conectar ao servidor. Verifique o status da API.");
    showScreen("login");
  } finally {
    toggleLoader(false);
  }
}

// Authenticate user
async function handleLogin(e) {
  e.preventDefault();
  const username = loginUsernameInput.value.trim();
  const password = loginPasswordInput.value;

  if (!username || !password) {
    return showAlert("error", "Preencha todos os campos.");
  }

  toggleLoader(true);
  hideAlert();

  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    if (response.ok) {
      const data = await response.json();
      jwtToken = data.token;
      await chrome.storage.local.set({ jwtToken, savedUsername: username });

      // Prefill login input values off (keep email)
      loginPasswordInput.value = "";

      await validateTokenAndInit();
    } else {
      const errText = await response.text();
      let msg = "Usuário ou senha incorretos.";
      try {
        const errJson = JSON.parse(errText);
        if (errJson.message) msg = errJson.message;
      } catch (e) { }
      showAlert("error", msg);
    }
  } catch (err) {
    console.error(err);
    showAlert("error", "Falha de conexão com o servidor.");
  } finally {
    toggleLoader(false);
  }
}

// Sign out user
async function handleLogout() {
  jwtToken = null;
  currentUser = null;
  channels = [];
  ideas = [];
  currentVideo = null;

  await chrome.storage.local.remove("jwtToken");
  showScreen("login");
  hideAlert();
}

// Fetch channels list
async function fetchChannels() {
  try {
    const response = await fetch(`${apiBaseUrl}/api/channels`, {
      headers: {
        "Authorization": `Bearer ${jwtToken}`
      }
    });

    if (response.ok) {
      channels = await response.json();
      populateChannelsDropdown();
    } else {
      throw new Error("Erro ao buscar canais");
    }
  } catch (err) {
    console.error(err);
    showAlert("error", "Erro ao sincronizar canais cadastrados.");
  }
}

// Populate Channels Dropdown UI
function populateChannelsDropdown() {
  if (channels.length === 0) {
    selectChannel.innerHTML = '<option value="">Nenhum canal cadastrado</option>';
    return;
  }

  selectChannel.innerHTML = '<option value="">-- Selecione um Canal --</option>';
  channels.forEach(ch => {
    const opt = document.createElement("option");
    opt.value = ch.id;
    opt.innerText = ch.name;
    selectChannel.appendChild(opt);
  });

  // Automatically select the first channel if there's only one
  if (channels.length === 1) {
    selectChannel.value = channels[0].id;
    fetchIdeas(channels[0].id);
  }
}

// Fetch Video Ideas for selected channel
async function fetchIdeas(channelId) {
  try {
    const response = await fetch(`${apiBaseUrl}/api/channels/${channelId}/ideas`, {
      headers: {
        "Authorization": `Bearer ${jwtToken}`
      }
    });

    if (response.ok) {
      ideas = await response.json();
      populateIdeasDropdown();
    }
  } catch (err) {
    console.error(err);
    showAlert("error", "Erro ao buscar as ideias de vídeo do canal.");
  }
}

// Populate Ideas Dropdown UI
function populateIdeasDropdown() {
  if (ideas.length === 0) {
    selectIdea.innerHTML = '<option value="">Nenhuma ideia ativa neste canal</option>';
    return;
  }

  selectIdea.innerHTML = '<option value="">-- Selecione uma Ideia --</option>';
  ideas.forEach(idea => {
    const opt = document.createElement("option");
    opt.value = idea.id;
    opt.innerText = idea.mainTitle;
    selectIdea.appendChild(opt);
  });
}

// Detect if current active tab is a YouTube watch video page
async function detectYouTubeVideo() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) return;

    const tab = tabs[0];
    const url = tab.url;

    // Verify if it is a watch page or a channel page
    if (url && (url.includes("youtube.com/watch") || url.includes("youtu.be/") || url.includes("youtube.com/shorts/") || url.includes("/@") || url.includes("/channel/"))) {
      // Send message to content script
      chrome.tabs.sendMessage(tab.id, { action: "getVideoInfo" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          // If content script was not loaded or error, fallback to tab title/url
          fallbackExtractVideo(tab);
        } else {
          displayDetectedVideo(response);
        }
      });
    } else {
      showYouTubeWarning(true);
    }
  } catch (err) {
    console.error(err);
    showYouTubeWarning(true);
  }
}

// Fallback parsing if content script is unavailable
function fallbackExtractVideo(tab) {
  const url = tab.url;
  let videoId = null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.substring(1);
    } else if (u.pathname.startsWith("/shorts/")) {
      videoId = u.pathname.split("/")[2];
    } else {
      videoId = u.searchParams.get("v");
    }
  } catch (e) { }

  displayDetectedVideo({
    title: tab.title.replace(" - YouTube", ""),
    channelName: "YouTube",
    url: url,
    videoId: videoId
  });
}

// Render Video Details
function displayDetectedVideo(videoData) {
  if (!videoData.videoId && videoData.type !== "channel") {
    showYouTubeWarning(true);
    return;
  }

  currentVideo = videoData;
  showYouTubeWarning(false);

  // Fill forms
  videoTitleEl.innerText = videoData.title;
  videoChannelEl.innerText = videoData.type === "channel" ? videoData.subs : (videoData.channelName || "YouTube");

  // Use hqdefault thumbnail which exists for all videos
  videoThumb.src = videoData.type === "channel" ? videoData.photoUrl : `https://img.youtube.com/vi/${videoData.videoId}/hqdefault.jpg`;
  if (videoData.type === "channel") {
    videoThumb.style.borderRadius = "50%";
    videoThumb.style.width = "56px";
    videoThumb.style.height = "56px";
    videoThumb.style.aspectRatio = "1/1";
    videoThumb.style.objectFit = "cover";
  } else {
    videoThumb.style.borderRadius = "4px";
    videoThumb.style.width = "110px";
    videoThumb.style.height = "auto";
    videoThumb.style.aspectRatio = "16/9";
    videoThumb.style.objectFit = "cover";
  }

  // Prefill new idea input with the video's title
  newIdeaTitleInput.value = videoData.title;
}

function showYouTubeWarning(show) {
  if (show) {
    ytDetectWarning.style.display = "block";
    ytVideoCard.style.display = "none";
    collectorActions.style.display = "none";
  } else {
    ytDetectWarning.style.display = "none";
    ytVideoCard.style.display = "block";
    collectorActions.style.display = "block";
  }
}

// Add reference to an existing video idea
async function handleSaveReference() {
  const ideaId = selectIdea.value;
  if (!ideaId) {
    return showAlert("error", "Selecione uma ideia de vídeo.");
  }

  const saveLink = saveLinkCheckbox.checked;
  const saveThumb = saveThumbCheckbox.checked;

  if (!saveLink && !saveThumb) {
    return showAlert("error", "Selecione pelo menos uma opção para salvar.");
  }

  toggleLoader(true);
  hideAlert();

  try {
    // 1. Save Link reference if checked
    if (saveLink) {
      await postReference(ideaId, "LINK", currentVideo.url, currentVideo.title);
    }

    // 2. Save Thumbnail reference if checked
    if (saveThumb) {
      const thumbUrl = currentVideo.type === "channel" ? currentVideo.photoUrl : `https://img.youtube.com/vi/${currentVideo.videoId}/hqdefault.jpg`;
      await postReference(ideaId, "IMAGE", thumbUrl, `Thumbnail: ${currentVideo.title}`);
    }

    showAlert("success", "Referências adicionadas com sucesso!");
  } catch (err) {
    console.error(err);
    showAlert("error", err.message || "Erro ao adicionar referências.");
  } finally {
    toggleLoader(false);
  }
}

// Post single reference to backend API
async function postReference(ideaId, type, url, label) {
  const response = await fetch(`${apiBaseUrl}/api/ideas/${ideaId}/references`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${jwtToken}`
    },
    body: JSON.stringify({
      type: type,
      url: url,
      label: label
    })
  });

  if (!response.ok) {
    throw new Error(`Falha ao salvar referência do tipo ${type}.`);
  }
}

// Create a new video idea and attach references
async function handleCreateIdea() {
  const channelId = selectChannel.value;
  if (!channelId) {
    return showAlert("error", "Selecione um canal destino.");
  }

  const title = newIdeaTitleInput.value.trim();
  if (!title) {
    return showAlert("error", "Digite o título da nova ideia.");
  }

  const description = newIdeaDescriptionInput.value.trim();
  const attachLink = newIdeaLinkCheckbox.checked;
  const attachThumb = newIdeaThumbCheckbox.checked;

  toggleLoader(true);
  hideAlert();

  try {
    // 1. Create new Idea
    const ideaResponse = await fetch(`${apiBaseUrl}/api/channels/${channelId}/ideas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwtToken}`
      },
      body: JSON.stringify({
        mainTitle: title,
        description: description || `Criado via Extensão do Chrome a partir do vídeo: ${currentVideo.title}`
      })
    });

    if (!ideaResponse.ok) {
      throw new Error("Erro ao criar nova ideia de vídeo.");
    }

    const newIdea = await ideaResponse.json();
    const ideaId = newIdea.id;

    // 2. Attach Link reference if checked
    if (attachLink) {
      await postReference(ideaId, "LINK", currentVideo.url, currentVideo.title);
    }

    // 3. Attach Thumbnail reference if checked
    if (attachThumb) {
      const thumbUrl = currentVideo.type === "channel" ? currentVideo.photoUrl : `https://img.youtube.com/vi/${currentVideo.videoId}/hqdefault.jpg`;
      await postReference(ideaId, "IMAGE", thumbUrl, `Thumbnail: ${currentVideo.title}`);
    }

    // Reset fields
    newIdeaDescriptionInput.value = "";

    // Refresh ideas dropdown list
    await fetchIdeas(channelId);
    selectIdea.value = ideaId;

    showAlert("success", "Nova Ideia criada e referências anexadas!");
    switchTab("existente");
  } catch (err) {
    console.error(err);
    showAlert("error", err.message || "Erro ao criar nova ideia.");
  } finally {
    toggleLoader(false);
  }
}

// Save reference directly to channel
async function handleSaveCanalDirect(refType) {
  const channelId = selectChannel.value;
  if (!channelId) {
    return showAlert("error", "Selecione um canal destino.");
  }

  const title = currentVideo.title;
  const note = "";
  
  const isChannel = currentVideo.type === "channel";
  let payloadNote = note;
  if (isChannel) {
    payloadNote = `Inscritos: ${currentVideo.subs}\nDescrição: ${currentVideo.description}`;
  }
  const thumbUrl = isChannel ? currentVideo.photoUrl : `https://img.youtube.com/vi/${currentVideo.videoId}/maxresdefault.jpg`;

  toggleLoader(true);
  hideAlert();

  try {
    const response = await fetch(`${apiBaseUrl}/api/channels/${channelId}/references`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwtToken}`
      },
      body: JSON.stringify({
        title: title,
        url: currentVideo.url,
        note: payloadNote,
        thumbnailUrl: thumbUrl,
        type: refType
      })
    });

    if (!response.ok) {
      throw new Error("Erro ao salvar referência no canal.");
    }

    showAlert("success", "Referência salva no canal com sucesso!");
    setTimeout(window.close, 1500); // Close popup
  } catch (err) {
    console.error(err);
    showAlert("error", err.message || "Erro ao salvar referência no canal.");
  } finally {
    toggleLoader(false);
  }
}

// Save YouTube channel reference and trigger suggestions scrape
async function handleSaveCanalSuggestions() {
  const channelId = selectChannel.value;
  if (!channelId) {
    return showAlert("error", "Selecione um canal destino.");
  }

  const isChannel = currentVideo.type === "channel";
  const targetUrl = isChannel ? currentVideo.url : currentVideo.channelUrl;
  const targetName = isChannel ? (currentVideo.channelName || currentVideo.title.replace("[Canal] ", "")) : currentVideo.channelName;

  if (!targetUrl) {
    return showAlert("error", "Não foi possível detectar a URL do canal de origem neste vídeo. Tente recarregar a página.");
  }

  toggleLoader(true);
  hideAlert();

  try {
    const response = await fetch(`${apiBaseUrl}/api/channels/${channelId}/references`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwtToken}`
      },
      body: JSON.stringify({
        title: `Canal: ${targetName || "YouTube"}`,
        url: targetUrl,
        note: "Coleta de sugestões de vídeos deste canal.",
        thumbnailUrl: isChannel ? currentVideo.photoUrl : "",
        type: "LINK",
        scrapeChannelUrl: targetUrl
      })
    });

    if (!response.ok) {
      throw new Error("Erro ao solicitar a coleta de sugestões do canal.");
    }

    showAlert("success", "Solicitação de sugestões enviada com sucesso!");
    setTimeout(window.close, 1500); // Close popup
  } catch (err) {
    console.error(err);
    showAlert("error", err.message || "Erro ao solicitar a coleta de sugestões.");
  } finally {
    toggleLoader(false);
  }
}
