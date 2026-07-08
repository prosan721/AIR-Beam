// AirBeam PRO - High Speed 30GB Local Wi-Fi File Sharing Engine & Multi-Language Settings
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // --- Constants & Config ---
  const CHUNK_SIZE = 512 * 1024; // 512 KB per slice
  const MAX_RECEIVERS = 10;
  
  // --- Global Application State ---
  let ws = null;
  let serverInfo = null;
  let currentRole = null; // 'SENDER' | 'RECEIVER'
  let currentRoomId = null;
  let selectedFile = null;
  let worker = null;

  // Sender State
  const connectedReceivers = new Map(); // peerId -> { deviceInfo, pc, dataChannel, progress, receivedBytes }
  let isSending = false;
  let currentChunkIndex = 0;
  let totalFileChunks = 0;

  // Receiver State
  let receiverFileMeta = null;
  let receivedChunks = [];
  let totalBytesReceived = 0;
  let startTime = null;
  let lastSpeedCheckTime = null;
  let lastSpeedBytes = 0;
  let currentSpeedMBps = 0;

  // --- Multi-Language Translations Dictionary (Default: English) ---
  const translations = {
    en: {
      detectingWifi: "Detecting Wi-Fi...",
      localIpPrefix: "Local IP:",
      offlineLocalhost: "Offline / Localhost",
      shareFileTitle: "Share File (Sender)",
      shareFileDesc: "Send files up to <b>30GB</b> over local Wi-Fi/Hotspot to up to <b>10 devices simultaneously</b> with 0 lag.",
      startSharing: "Start Sharing",
      receiveFileTitle: "Receive File (Receiver)",
      receiveFileDesc: "Join a local sharing room using a 6-digit code or QR scan. Save files directly to your device local storage.",
      quickJoinPlaceholder: "Enter 6-digit Code",
      join: "Join",
      senderDashboard: "Sender Dashboard",
      back: "Back",
      room: "Room:",
      dragDrop: "Drag & Drop file here or <span>Browse</span>",
      browse: "Browse",
      dropHint: "Supports video, zip, ISO, 4K media, docs up to <b>30GB</b> without memory lag",
      shareRoomCode: "SHARE THIS ROOM CODE:",
      copy: "Copy",
      copied: "Copied!",
      scanOnPhone: "Scan on Phone",
      connectedReceivers: "Connected Receivers",
      liveLocalMesh: "Live Local Mesh",
      waitingReceivers: "Waiting for receiving devices to join room code or scan QR code on local Wi-Fi...",
      startBroadcast: "Start Fast Transfer (Broadcast)",
      streamingTo: "Streaming to",
      devicesCount: "Device(s)...",
      transferCompleted: "Transfer Completed",
      receiverDashboard: "Receiver Dashboard",
      connectingSender: "Connecting to Sender Device...",
      verifyingStream: "Verifying local Wi-Fi data stream",
      incomingFile: "INCOMING FILE",
      autoSaveNotice: "File will automatically download & save directly to your device local storage.",
      transferred: "Transferred",
      eta: "Estimated Time (ETA)",
      chunkStream: "Chunk Stream",
      calculating: "Calculating...",
      transferComplete: "Transfer Complete!",
      savedLocally: "File has been saved locally to your device storage.",
      saveOpenFile: "Click to Save / Open File",
      settingsTitle: "App Settings",
      settingsSubtitle: "Customize save path, privacy, theme & language",
      savePathTitle: "Local Folder Save Path",
      savePathDesc: "Choose default storage folder on your device for incoming downloads.",
      browseFolder: "Browse Folder",
      askSaveLocation: "Prompt for save location on every download",
      privacyTitle: "Privacy & Network Security",
      directWifiOnly: "Direct Wi-Fi Only Mode",
      directWifiOnlyDesc: "Force P2P transfer strictly within local network",
      encryptedStreaming: "End-to-End Encryption",
      encryptedStreamingDesc: "Encrypt WebRTC stream chunks with TLS/AES",
      deviceVisibility: "Device Discovery Visibility",
      deviceVisibilityDesc: "Control if local devices can discover this node",
      visibleToLocal: "Visible to Local Peers",
      incognitoMode: "Incognito / Private",
      clearCache: "Clear Transfer History & Cache",
      clearedToast: "Cleared!",
      languageTitle: "Change Language",
      languageDesc: "Select preferred display language (English is default with global support).",
      themeTitle: "Change Theme",
      darkTheme: "Dark Mode",
      lightTheme: "Light Mode",
      systemTheme: "System Default",
      saveAndClose: "Save & Apply",
      showQr: "Show QR Code",
      settings: "Settings",
      connected: "Connected",
      streaming: "Streaming",
      completedStatus: "Completed",
      footerText: "AirBeam PRO • Modern 30GB Local Wi-Fi File Sharing Engine • 100% Offline & Private",
      qrModalTitle: "Wi-Fi Device Scanner & Connection",
      tabMyQr: "My QR Code",
      tabScanCamera: "Scan Camera / Photo",
      myQrDesc: "Scan with any phone/tablet connected to the same Wi-Fi or Mobile Hotspot",
      scanCameraDesc: "Point camera at another device's QR code or upload a photo to connect instantly.",
      startCameraBtn: "Start Live Camera",
      stopCameraBtn: "Stop Camera",
      uploadPhotoBtn: "Photo / Gallery",
      cameraOffHint: "Camera is turned off",
      cameraPermissionError: "Camera access denied or unavailable.",
      qrScannedSuccess: "QR Code scanned! Connecting...",
      hostScannerMode: "Host Device Scanner Mode",
      receiverPhotoCaptureMode: "Receiver Photo Capture Mode",
      deviceScanMode: "Device Scan & Connect Mode",
      flipCamera: "Flip Camera",
      capturePhotoBtn: "Capture Photo",
      photoCaptured: "Photo Loaded",
      noQrFoundPhoto: "No QR code detected in photo.",
      scanningPhoto: "Scanning photo..."
    },
    bn: {
      detectingWifi: "ওয়াইফাই খোঁজা হচ্ছে...",
      localIpPrefix: "লোকাল আইপি:",
      offlineLocalhost: "অফলাইন / লোকালহোস্ট",
      shareFileTitle: "ফাইল শেয়ার করুন (প্রেরক)",
      shareFileDesc: "স্থানীয় Wi-Fi/Hotspot ব্যবহার করে ল্যাগ ছাড়াই <b>১০টি ডিভাইসে</b> <b>৩০ জিবি</b> পর্যন্ত ফাইল শেয়ার করুন।",
      startSharing: "শেয়ারিং শুরু করুন",
      receiveFileTitle: "ফাইল গ্রহণ করুন (গ্রাহক)",
      receiveFileDesc: "৬ ডিজিটের কোড বা QR স্ক্যান দিয়ে ঘরে বসেই লোকাল স্টোরেজে ফাইল ডাউনলোড করুন।",
      quickJoinPlaceholder: "৬ সংখ্যার কোড লিখুন",
      join: "যুক্ত হন",
      senderDashboard: "সেন্ডার ড্যাশবোর্ড",
      back: "ফিরে যান",
      room: "রুম কোড:",
      dragDrop: "ফাইল টেনে আনুন অথবা <span>ব্রাউজ করুন</span>",
      browse: "ব্রাউজ করুন",
      dropHint: "৩০ জিবি পর্যন্ত যেকোনো ভারী ফাইল যেমন ভিডিও, জিপ, আইএসও সম্পূর্ণ ল্যাগ ছাড়া সাপোর্টেড",
      shareRoomCode: "এই রুম কোডটি শেয়ার করুন:",
      copy: "কপি",
      copied: "কপি হয়েছে!",
      scanOnPhone: "ফোনে স্ক্যান করুন",
      connectedReceivers: "সংযুক্ত ডিভাইসসমূহ",
      liveLocalMesh: "লাইভ লোকাল মেশ",
      waitingReceivers: "অন্য ডিভাইস যুক্ত হওয়ার জন্য অপেক্ষা করা হচ্ছে...",
      startBroadcast: "হাই-স্পিড ট্রান্সফার শুরু করুন",
      streamingTo: "স্ট্রিম হচ্ছে",
      devicesCount: "টি ডিভাইসে...",
      transferCompleted: "ট্রান্সফার সম্পন্ন",
      receiverDashboard: "রিসিভার ড্যাশবোর্ড",
      connectingSender: "প্রেরক ডিভাইসের সাথে সংযোগ স্থাপন হচ্ছে...",
      verifyingStream: "লোকাল ডাটা স্ট্রিম যাচাই করা হচ্ছে",
      incomingFile: "আগত ফাইল",
      autoSaveNotice: "ফাইলটি সরাসরি আপনার ডিভাইসের লোকাল স্টোরেজে সেভ হবে।",
      transferred: "স্থানান্তরিত",
      eta: "আনুমানিক সময়",
      chunkStream: "চাঙ্ক স্ট্রিম",
      calculating: "হিসাব করা হচ্ছে...",
      transferComplete: "ট্রান্সফার সম্পন্ন!",
      savedLocally: "ফাইলটি সফলভাবে সেভ করা হয়েছে।",
      saveOpenFile: "ফাইল সেভ / ওপেন করুন",
      settingsTitle: "অ্যাপ সেটিংস",
      settingsSubtitle: "সেভ পাথ, প্রাইভেসি, থিম ও ভাষা পরিবর্তন করুন",
      savePathTitle: "লোকাল ফোল্ডার সেভ পাথ",
      savePathDesc: "ডাউনলোড হওয়া ফাইল কোথায় সেভ হবে তা নির্বাচন করুন।",
      browseFolder: "ফোল্ডার নির্বাচন",
      askSaveLocation: "প্রতিটি ডাউনলোডে সেভ করার জায়গা জিজ্ঞাসা করুন",
      privacyTitle: "প্রাইভেসি ও নেটওয়ার্ক সিকিউরিটি",
      directWifiOnly: "ডাইরেক্ট ওয়াইফাই মোড",
      directWifiOnlyDesc: "শুধুমাত্র লোকাল ওয়াইফাই নেটওয়ার্কে কানেক্ট থাকবে",
      encryptedStreaming: "এন্ড-টু-এন্ড এনক্রিপশন",
      encryptedStreamingDesc: "ডাটা স্ট্রিম TLS/AES এনক্রিপশনে সুরক্ষিত থাকবে",
      deviceVisibility: "ডিভাইস ভিজিবিলিটি",
      deviceVisibilityDesc: "লোকাল পেয়ারদের কাছে ডিভাইস দৃশ্যমান থাকবে কিনা",
      visibleToLocal: "সবার কাছে দৃশ্যমান",
      incognitoMode: "প্রাইভেট / ইনকগনিটো",
      clearCache: "ট্রান্সফার হিস্ট্রি ও ক্যাশ মুছুন",
      clearedToast: "মুছে ফেলা হয়েছে!",
      languageTitle: "ভাষা পরিবর্তন",
      languageDesc: "আপনার পছন্দমতো ভাষা নির্বাচন করুন (ডিফল্ট ইংরেজি)।",
      themeTitle: "থিম পরিবর্তন",
      darkTheme: "ডার্ক মোড",
      lightTheme: "লাইট মোড",
      systemTheme: "সিস্টেম ডিফল্ট",
      saveAndClose: "সেভ এবং অ্যাপ্লাই করুন",
      showQr: "QR কোড দেখুন",
      settings: "সেটিংস",
      connected: "সংযুক্ত",
      streaming: "স্ট্রিম চলছে",
      completedStatus: "সম্পন্ন",
      footerText: "AirBeam PRO • আধুনিক ৩০ জিবি লোকাল ফাইল শেয়ারিং ইঞ্জিন • ১০০% অফলাইন ও নিরাপদ",
      qrModalTitle: "ওয়াই-ফাই ডিভাইস স্ক্যানার ও কানেকশন",
      tabMyQr: "আমার QR কোড",
      tabScanCamera: "ক্যামেরা / ছবি স্ক্যান",
      myQrDesc: "একই ওয়াই-ফাই বা হটস্পটে থাকা যেকোনো ফোন/পিসি দিয়ে স্ক্যান করুন",
      scanCameraDesc: "অন্য ডিভাইসের QR কোডের দিকে ক্যামেরা ধরুন অথবা ছবি আপলোড করে সহজে কানেক্ট হন।",
      startCameraBtn: "লাইভ ক্যামেরা চালু করুন",
      stopCameraBtn: "ক্যামেরা বন্ধ করুন",
      uploadPhotoBtn: "ছবি স্ক্যান করুন",
      cameraOffHint: "ক্যামেরা বন্ধ আছে",
      cameraPermissionError: "ক্যামেরা পারমিশন পাওয়া যায়নি।",
      qrScannedSuccess: "QR কোড স্ক্যান সম্পন্ন! কানেক্ট হচ্ছে...",
      hostScannerMode: "হোস্ট ডিভাইস স্ক্যানার মোড",
      receiverPhotoCaptureMode: "রিসিভার ফটো ক্যাপচার মোড",
      deviceScanMode: "ডিভাইস স্ক্যান ও কানেক্ট মোড",
      flipCamera: "ক্যামেরা ফিপ করুন",
      capturePhotoBtn: "ছবি তুলুন",
      photoCaptured: "ফটো লোড হয়েছে",
      noQrFoundPhoto: "ছবিতে কোনো QR কোড পাওয়া যায়নি।",
      scanningPhoto: "ছবি স্ক্যান করা হচ্ছে..."
    }
  };

  // --- DOM Elements ---
  const networkIpText = document.getElementById('networkIpText');
  const showQrBtn = document.getElementById('showQrBtn');
  const qrModal = document.getElementById('qrModal');
  const closeQrModal = document.getElementById('closeQrModal');
  const modalQrImg = document.getElementById('modalQrImg');
  const modalUrlText = document.getElementById('modalUrlText');

  // Mode Selection
  const modeSelectionSection = document.getElementById('modeSelectionSection');
  const selectSenderMode = document.getElementById('selectSenderMode');
  const selectReceiverMode = document.getElementById('selectReceiverMode');
  const quickRoomInput = document.getElementById('quickRoomInput');
  const quickJoinBtn = document.getElementById('quickJoinBtn');

  // Sender Section
  const senderSection = document.getElementById('senderSection');
  const backFromSenderBtn = document.getElementById('backFromSenderBtn');
  const roomCodeBadge = document.getElementById('roomCodeBadge');
  const displayRoomCode = document.getElementById('displayRoomCode');
  const copyCodeBtn = document.getElementById('copyCodeBtn');
  const roomQrImage = document.getElementById('roomQrImage');

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const dropzoneContent = document.getElementById('dropzoneContent');
  const selectedFileCard = document.getElementById('selectedFileCard');
  const selectedFileName = document.getElementById('selectedFileName');
  const selectedFileSize = document.getElementById('selectedFileSize');
  const selectedFileChunks = document.getElementById('selectedFileChunks');
  const removeFileBtn = document.getElementById('removeFileBtn');

  const sharingDetailsContainer = document.getElementById('sharingDetailsContainer');
  const connectedCount = document.getElementById('connectedCount');
  const receiversList = document.getElementById('receiversList');
  const startBroadcastBtn = document.getElementById('startBroadcastBtn');

  // Receiver Section
  const receiverSection = document.getElementById('receiverSection');
  const backFromReceiverBtn = document.getElementById('backFromReceiverBtn');
  const receiverRoomBadge = document.getElementById('receiverRoomBadge');
  
  const receiverConnectingState = document.getElementById('receiverConnectingState');
  const receiverReadyState = document.getElementById('receiverReadyState');
  const receiverDownloadingState = document.getElementById('receiverDownloadingState');
  const receiverCompleteState = document.getElementById('receiverCompleteState');

  const rxFileName = document.getElementById('rxFileName');
  const rxFileSize = document.getElementById('rxFileSize');
  const progressCircle = document.getElementById('progressCircle');
  const progressPercentage = document.getElementById('progressPercentage');
  const rxSpeed = document.getElementById('rxSpeed');
  const rxTransferredBytes = document.getElementById('rxTransferredBytes');
  const rxEta = document.getElementById('rxEta');
  const rxChunkCount = document.getElementById('rxChunkCount');
  const rxDownloadTriggerBtn = document.getElementById('rxDownloadTriggerBtn');

  // Settings Modal Elements
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const closeSettingsModal = document.getElementById('closeSettingsModal');
  const settingsModal = document.getElementById('settingsModal');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  
  const chooseFolderBtn = document.getElementById('chooseFolderBtn');
  const currentSavePath = document.getElementById('currentSavePath');
  const askSavePathToggle = document.getElementById('askSavePathToggle');
  const directWifiToggle = document.getElementById('directWifiToggle');
  const encryptionToggle = document.getElementById('encryptionToggle');
  const visibilitySelect = document.getElementById('visibilitySelect');
  const clearCacheBtn = document.getElementById('clearCacheBtn');
  const clearCacheToast = document.getElementById('clearCacheToast');
  
  const languageSelect = document.getElementById('languageSelect');
  const themeOptionBtns = document.querySelectorAll('.theme-option-btn');

  // QR Modal Elements & Controls
  const qrModalRoleBadge = document.getElementById('qrModalRoleBadge');
  const modalRoleBadgeText = document.getElementById('modalRoleBadgeText');
  const tabMyQrBtn = document.getElementById('tabMyQrBtn');
  const tabScanCameraBtn = document.getElementById('tabScanCameraBtn');
  const tabMyQrContent = document.getElementById('tabMyQrContent');
  const tabScanCameraContent = document.getElementById('tabScanCameraContent');
  const copyServerUrlBtn = document.getElementById('copyServerUrlBtn');
  
  const toggleCameraBtn = document.getElementById('toggleCameraBtn');
  const toggleCameraText = document.getElementById('toggleCameraText');
  const switchCameraBtn = document.getElementById('switchCameraBtn');
  const captureSnapshotBtn = document.getElementById('captureSnapshotBtn');
  const cameraPlaceholder = document.getElementById('cameraPlaceholder');
  const scannerOverlay = document.getElementById('scannerOverlay');
  const snapshotCanvas = document.getElementById('snapshotCanvas');
  
  const photoPreviewContainer = document.getElementById('photoPreviewContainer');
  const photoPreviewImg = document.getElementById('photoPreviewImg');
  const photoPreviewName = document.getElementById('photoPreviewName');
  const clearPhotoBtn = document.getElementById('clearPhotoBtn');

  const qrFileInput = document.getElementById('qrFileInput');
  const scanResultStatus = document.getElementById('scanResultStatus');
  
  let html5QrCode = null;
  let isCameraScanning = false;
  let currentFacingMode = "environment"; // "environment" | "user"

  // --- WebRTC P2P Layer (Stage 1: connection setup + verification) ---
  // This runs ALONGSIDE the existing relay transfer (unchanged) so nothing
  // that already works can break. It only opens a direct DataChannel and
  // reports its status. File transfer will move onto this channel in Stage 2.
  const RTC_CONFIG = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };
  const senderPeers = new Map(); // peerId -> { pc, dataChannel }
  let receiverPC = null;
  let receiverDataChannel = null;

  // Initialize SVG progress ring
  const progressCircleEl = document.getElementById('progressCircle');
  if (progressCircleEl) {
    progressCircleEl.style.strokeDasharray = '440';
    progressCircleEl.style.strokeDashoffset = '440';
  }

  // --- Translation Helper Function ---
  function t(key) {
    const currentSettings = getSettingsFromStorage();
    const lang = currentSettings.language || 'en';
    const dict = translations[lang] || translations.en;
    return dict[key] || translations.en[key] || key;
  }

  // --- Storage & Preference Helpers ---
  function getSettingsFromStorage() {
    try {
      const raw = localStorage.getItem('airbeam_settings');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveSettingsToStorage(partialSettings) {
    const current = getSettingsFromStorage();
    const updated = { ...current, ...partialSettings };
    try {
      localStorage.setItem('airbeam_settings', JSON.stringify(updated));
    } catch (e) {}
  }

  // --- Theme Mode Application ---
  function applyTheme(theme) {
    let activeTheme = theme;
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      activeTheme = isDark ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', activeTheme);
    
    themeOptionBtns.forEach(btn => {
      if (btn.getAttribute('data-theme-val') === theme) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    saveSettingsToStorage({ theme });
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const currentSettings = getSettingsFromStorage();
    if (currentSettings.theme === 'system') {
      applyTheme('system');
    }
  });

  // --- Internationalization (i18n) Engine ---
  function applyLanguage(lang) {
    const dict = translations[lang] || translations.en;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        const icon = el.querySelector('i[data-lucide]');
        if (icon) {
          const iconHtml = icon.outerHTML;
          el.innerHTML = `${iconHtml} ${dict[key]}`;
        } else {
          el.innerHTML = dict[key];
        }
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) {
        el.placeholder = dict[key];
      }
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (dict[key]) {
        el.title = dict[key];
      }
    });

    saveSettingsToStorage({ language: lang });

    // Refresh dynamic text if server info available
    if (serverInfo) {
      networkIpText.textContent = `${t('localIpPrefix')} ${serverInfo.ip}:${serverInfo.port}`;
    } else {
      networkIpText.textContent = t('detectingWifi');
    }

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  // --- Load Initial Saved Settings ---
  function loadSavedSettings() {
    const settings = getSettingsFromStorage();

    // Theme
    const theme = settings.theme || 'dark';
    applyTheme(theme);

    // Language (Default to English 'en')
    const lang = settings.language || 'en';
    if (languageSelect) languageSelect.value = lang;
    applyLanguage(lang);

    // Local Save Path
    if (settings.savePath) {
      currentSavePath.textContent = settings.savePath;
    }
    if (settings.askSavePath !== undefined) {
      askSavePathToggle.checked = settings.askSavePath;
    }

    // Privacy Settings
    if (settings.directWifiOnly !== undefined) {
      directWifiToggle.checked = settings.directWifiOnly;
    }
    if (settings.encrypted !== undefined) {
      encryptionToggle.checked = settings.encrypted;
    }
    if (settings.visibility) {
      visibilitySelect.value = settings.visibility;
    }
  }
  loadSavedSettings();

  // --- Settings Event Listeners ---
  openSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
  });

  closeSettingsModal.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });

  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.add('hidden');
    }
  });

  // Choose Local Directory Handler
  chooseFolderBtn.addEventListener('click', async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const handle = await window.showDirectoryPicker();
        if (handle && handle.name) {
          const path = `Downloads/${handle.name}`;
          currentSavePath.textContent = path;
          saveSettingsToStorage({ savePath: path });
        }
      } catch (err) {
        // Picker closed by user
      }
    } else {
      const custom = prompt("Enter local save directory path:", currentSavePath.textContent);
      if (custom && custom.trim() !== '') {
        currentSavePath.textContent = custom.trim();
        saveSettingsToStorage({ savePath: custom.trim() });
      }
    }
  });

  // Theme option clicks
  themeOptionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedTheme = btn.getAttribute('data-theme-val');
      applyTheme(selectedTheme);
    });
  });

  // Language dropdown change
  languageSelect.addEventListener('change', (e) => {
    applyLanguage(e.target.value);
  });

  // Clear Transfer Cache
  clearCacheBtn.addEventListener('click', () => {
    try {
      localStorage.removeItem('airbeam_history');
      clearCacheToast.textContent = t('clearedToast');
      clearCacheToast.classList.remove('hidden');
      setTimeout(() => {
        clearCacheToast.classList.add('hidden');
      }, 2000);
    } catch (e) {}
  });

  // Save Settings Button
  saveSettingsBtn.addEventListener('click', () => {
    saveSettingsToStorage({
      savePath: currentSavePath.textContent,
      askSavePath: askSavePathToggle.checked,
      directWifiOnly: directWifiToggle.checked,
      encrypted: encryptionToggle.checked,
      visibility: visibilitySelect.value,
      language: languageSelect.value
    });
    settingsModal.classList.add('hidden');
  });

  // --- Copy Room Code Button (Sender Panel) ---
  if (copyCodeBtn) {
    copyCodeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const code = displayRoomCode ? displayRoomCode.textContent : '';
      if (code && code !== '------') {
        navigator.clipboard.writeText(code).then(() => {
          copyCodeBtn.innerHTML = `<i data-lucide="check"></i> ${t('copied')}`;
          if (window.lucide) lucide.createIcons();
          setTimeout(() => {
            copyCodeBtn.innerHTML = `<i data-lucide="copy"></i> ${t('copy')}`;
            if (window.lucide) lucide.createIcons();
          }, 2000);
        }).catch(() => {
          // Fallback for browsers that don't support clipboard API
          const ta = document.createElement('textarea');
          ta.value = code;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          copyCodeBtn.innerHTML = `<i data-lucide="check"></i> ${t('copied')}`;
          if (window.lucide) lucide.createIcons();
          setTimeout(() => {
            copyCodeBtn.innerHTML = `<i data-lucide="copy"></i> ${t('copy')}`;
            if (window.lucide) lucide.createIcons();
          }, 2000);
        });
      }
    });
  }

  // --- Dual Option QR & Camera Scanner Modal Controls ---

  // Synthesize scan success audio chime & haptic feedback
  function playScanChime() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.12); // E6 note
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.22);
    } catch (e) {}

    if (navigator.vibrate) {
      try { navigator.vibrate([100, 50, 100]); } catch (e) {}
    }
  }

  // Smart Context-Aware Scanner Modal Trigger
  showQrBtn.addEventListener('click', () => {
    qrModal.classList.remove('hidden');

    if (currentRole === 'RECEIVER') {
      // Receiver Mode: Open directly into Camera/Photo Scanner Mode
      qrModalRoleBadge.className = 'modal-role-badge badge-cyan';
      modalRoleBadgeText.textContent = t('receiverPhotoCaptureMode');
      switchToQrTab('SCAN_CAMERA');
      startCameraScan();
    } else if (currentRole === 'SENDER') {
      // Host Mode: Show Host QR with option to scan receivers
      qrModalRoleBadge.className = 'modal-role-badge badge-purple';
      modalRoleBadgeText.textContent = t('hostScannerMode');
      switchToQrTab('MY_QR');
    } else {
      // General / Home Mode: Show My QR code tab with network IP connection URL
      qrModalRoleBadge.className = 'modal-role-badge badge-cyan';
      modalRoleBadgeText.textContent = t('deviceScanMode');
      switchToQrTab('MY_QR');
    }
  });

  closeQrModal.addEventListener('click', async () => {
    await stopCameraScan();
    qrModal.classList.add('hidden');
  });

  qrModal.addEventListener('click', async (e) => {
    if (e.target === qrModal) {
      await stopCameraScan();
      qrModal.classList.add('hidden');
    }
  });

  // Tab Switcher - properly async to handle camera stop before switching
  tabMyQrBtn.addEventListener('click', async () => {
    if (tabMyQrBtn.classList.contains('active')) return; // already on this tab
    await stopCameraScan();
    switchToQrTab('MY_QR');
  });

  tabScanCameraBtn.addEventListener('click', async () => {
    if (tabScanCameraBtn.classList.contains('active')) return; // already on this tab
    switchToQrTab('SCAN_CAMERA');
    // Small delay so DOM is visible before starting camera
    setTimeout(() => startCameraScan(), 100);
  });

  function switchToQrTab(tabName) {
    if (tabName === 'MY_QR') {
      tabMyQrBtn.classList.add('active');
      tabScanCameraBtn.classList.remove('active');
      tabMyQrContent.classList.remove('hidden');
      tabScanCameraContent.classList.add('hidden');

      // Load QR image only if it's not already loaded
      if (!modalQrImg.src || modalQrImg.naturalWidth === 0) {
        generateRoomQrCode(currentRoomId || null);
      } else if (currentRoomId) {
        generateRoomQrCode(currentRoomId);
      }
    } else {
      tabScanCameraBtn.classList.add('active');
      tabMyQrBtn.classList.remove('active');
      tabScanCameraContent.classList.remove('hidden');
      tabMyQrContent.classList.add('hidden');

      // Reset scan result status when switching to camera tab
      if (scanResultStatus) {
        scanResultStatus.classList.add('hidden');
        scanResultStatus.textContent = '';
      }
    }
  }

  // Copy Server URL Button
  copyServerUrlBtn.addEventListener('click', () => {
    const url = modalUrlText.textContent;
    if (url && url.startsWith('http')) {
      navigator.clipboard.writeText(url).catch(() => {});
      copyServerUrlBtn.innerHTML = `<i data-lucide="check"></i> ${t('copied')}`;
      if (window.lucide) lucide.createIcons();
      setTimeout(() => {
        copyServerUrlBtn.innerHTML = `<i data-lucide="copy"></i> ${t('copy')}`;
        if (window.lucide) lucide.createIcons();
      }, 2000);
    }
  });

  // Live Camera Scanner Toggle
  toggleCameraBtn.addEventListener('click', () => {
    if (isCameraScanning) {
      stopCameraScan();
    } else {
      startCameraScan();
    }
  });

  // Camera Flip Switch Button
  if (switchCameraBtn) {
    switchCameraBtn.addEventListener('click', async () => {
      currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
      if (isCameraScanning) {
        await stopCameraScan();
        startCameraScan();
      }
    });
  }

  // Snapshot Capture Button (Captures current video frame & scans it)
  if (captureSnapshotBtn) {
    captureSnapshotBtn.addEventListener('click', () => {
      const videoEl = document.querySelector('#qrReaderViewport video');
      if (videoEl && snapshotCanvas) {
        const ctx = snapshotCanvas.getContext('2d');
        snapshotCanvas.width = videoEl.videoWidth || 640;
        snapshotCanvas.height = videoEl.videoHeight || 480;
        ctx.drawImage(videoEl, 0, 0, snapshotCanvas.width, snapshotCanvas.height);
        
        snapshotCanvas.toBlob(async (blob) => {
          if (!blob || !window.Html5Qrcode) return;
          const scanner = new Html5Qrcode("qrReaderViewport");
          try {
            scanResultStatus.classList.remove('hidden');
            scanResultStatus.style.background = 'rgba(0, 242, 254, 0.15)';
            scanResultStatus.style.color = 'var(--accent-cyan)';
            scanResultStatus.textContent = t('scanningPhoto');

            const file = new File([blob], "snapshot.png", { type: "image/png" });
            
            // Display photo preview thumbnail
            photoPreviewImg.src = URL.createObjectURL(blob);
            photoPreviewName.textContent = "Camera Photo Snapshot.png";
            photoPreviewContainer.classList.remove('hidden');

            const decodedText = await scanner.scanFile(file, true);
            handleScannedQrResult(decodedText);
          } catch (err) {
            scanResultStatus.classList.remove('hidden');
            scanResultStatus.style.background = 'rgba(255, 59, 48, 0.15)';
            scanResultStatus.style.color = '#ff453a';
            scanResultStatus.textContent = t('noQrFoundPhoto');
            setTimeout(() => {
              scanResultStatus.classList.add('hidden');
            }, 3000);
          }
        }, 'image/png');
      }
    });
  }

  // Clear photo preview button
  if (clearPhotoBtn) {
    clearPhotoBtn.addEventListener('click', () => {
      photoPreviewContainer.classList.add('hidden');
      photoPreviewImg.src = '';
      qrFileInput.value = '';
    });
  }

  function startCameraScan() {
    if (isCameraScanning) return; // Already scanning, don't start again

    if (!window.Html5Qrcode) {
      console.warn('QR Scanner library not loaded yet');
      return;
    }

    // Always create a fresh instance to avoid reuse issues
    try {
      if (html5QrCode) {
        html5QrCode.clear().catch(() => {});
      }
    } catch (e) {}
    html5QrCode = new Html5Qrcode('qrReaderViewport');

    cameraPlaceholder.classList.add('hidden');
    scannerOverlay.classList.remove('hidden');
    if (switchCameraBtn) switchCameraBtn.classList.remove('hidden');
    if (captureSnapshotBtn) captureSnapshotBtn.classList.remove('hidden');

    toggleCameraText.textContent = t('stopCameraBtn');
    isCameraScanning = true;

    html5QrCode.start(
      { facingMode: currentFacingMode },
      { fps: 12, qrbox: { width: 220, height: 220 } },
      (decodedText) => {
        playScanChime();
        handleScannedQrResult(decodedText);
        stopCameraScan();
      },
      () => {
        // Scan frame error — continue scanning
      }
    ).catch(err => {
      console.error('Camera access error:', err);
      isCameraScanning = false;
      cameraPlaceholder.classList.remove('hidden');
      scannerOverlay.classList.add('hidden');
      if (switchCameraBtn) switchCameraBtn.classList.add('hidden');
      if (captureSnapshotBtn) captureSnapshotBtn.classList.add('hidden');
      toggleCameraText.textContent = t('startCameraBtn');
      html5QrCode = null;

      // Show error inline — DO NOT use alert() as it blocks the JS event loop
      if (scanResultStatus) {
        scanResultStatus.classList.remove('hidden');
        scanResultStatus.style.background = 'rgba(255, 59, 48, 0.15)';
        scanResultStatus.style.color = '#ff453a';
        scanResultStatus.textContent = t('cameraPermissionError');
      }
    });
  }

  function stopCameraScan() {
    return new Promise((resolve) => {
      scannerOverlay.classList.add('hidden');
      if (switchCameraBtn) switchCameraBtn.classList.add('hidden');
      if (captureSnapshotBtn) captureSnapshotBtn.classList.add('hidden');

      if (html5QrCode && isCameraScanning) {
        html5QrCode.stop().then(() => {
          isCameraScanning = false;
          cameraPlaceholder.classList.remove('hidden');
          toggleCameraText.textContent = t('startCameraBtn');
          html5QrCode = null; // Clear instance so next start gets a fresh one
          resolve();
        }).catch(() => {
          isCameraScanning = false;
          cameraPlaceholder.classList.remove('hidden');
          toggleCameraText.textContent = t('startCameraBtn');
          html5QrCode = null;
          resolve();
        });
      } else {
        isCameraScanning = false;
        cameraPlaceholder.classList.remove('hidden');
        toggleCameraText.textContent = t('startCameraBtn');
        resolve();
      }
    });
  }


  // Scan QR from Uploaded Photo File / Gallery Image
  qrFileInput.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!window.Html5Qrcode) return;

      // Show photo preview
      photoPreviewImg.src = URL.createObjectURL(file);
      photoPreviewName.textContent = file.name;
      photoPreviewContainer.classList.remove('hidden');
      
      const scanner = new Html5Qrcode("qrReaderViewport");
      try {
        scanResultStatus.classList.remove('hidden');
        scanResultStatus.style.background = 'rgba(0, 242, 254, 0.15)';
        scanResultStatus.style.color = 'var(--accent-cyan)';
        scanResultStatus.textContent = t('scanningPhoto');
        const decodedText = await scanner.scanFile(file, true);
        playScanChime();
        handleScannedQrResult(decodedText);
      } catch (err) {
        scanResultStatus.classList.remove('hidden');
        scanResultStatus.style.background = 'rgba(255, 59, 48, 0.15)';
        scanResultStatus.style.color = '#ff453a';
        scanResultStatus.textContent = t('noQrFoundPhoto');
        setTimeout(() => {
          scanResultStatus.classList.add('hidden');
        }, 3000);
      }
    }
  });

  // Handle Scanned QR Result (Auto Connect & Join Room)
  function handleScannedQrResult(decodedText) {
    console.log("Scanned QR Code:", decodedText);
    
    scanResultStatus.classList.remove('hidden');
    scanResultStatus.style.background = 'rgba(0, 230, 118, 0.15)';
    scanResultStatus.style.color = 'var(--accent-green)';
    scanResultStatus.textContent = t('qrScannedSuccess');

    // Parse room code from scanned string, URL or JSON
    let roomCode = null;
    if (decodedText.includes('room=')) {
      try {
        const urlObj = new URL(decodedText);
        roomCode = urlObj.searchParams.get('room');
      } catch (e) {
        const match = decodedText.match(/room=(\d{6})/);
        if (match) roomCode = match[1];
      }
    } else if (/^\d{6}$/.test(decodedText.trim())) {
      roomCode = decodedText.trim();
    } else {
      try {
        const json = JSON.parse(decodedText);
        if (json.room) roomCode = json.room;
      } catch (e) {}
    }

    setTimeout(() => {
      stopCameraScan().then(() => {
        qrModal.classList.add('hidden');
        if (roomCode) {
          joinRoomAsReceiver(roomCode);
        } else if (decodedText.startsWith('http')) {
          window.location.href = decodedText;
        } else {
          alert(`Scanned Content: ${decodedText}`);
        }
      });
    }, 1000);
  }

  // --- Initialize Web Worker ---
  function initWorker() {
    if (!worker) {
      worker = new Worker('stream-worker.js');
      worker.onmessage = handleWorkerMessage;
    }
  }

  // --- Helper Functions ---
  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function formatEta(seconds) {
    if (!isFinite(seconds) || seconds <= 0) return t('calculating');
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return `${mins}m ${secs}s`;
  }

  // Fetch Server Local IP & Connection Info
  async function fetchServerInfo() {
    try {
      const res = await fetch('/api/info');
      const data = await res.json();
      if (data.success) {
        serverInfo = data;
        networkIpText.textContent = `${t('localIpPrefix')} ${data.ip}:${data.port}`;
        modalQrImg.src = data.qrCode;
        modalUrlText.textContent = data.url;

        // Check if room code was passed in URL query string (QR scan auto join)
        const urlParams = new URLSearchParams(window.location.search);
        const roomFromUrl = urlParams.get('room');
        if (roomFromUrl && roomFromUrl.length === 6) {
          joinRoomAsReceiver(roomFromUrl);
        }
      }
    } catch (err) {
      console.error('Failed to fetch server info:', err);
      networkIpText.textContent = t('offlineLocalhost');
    }
  }
  fetchServerInfo();

  // --- WebSocket Connection ---
  function connectWebSocket(onOpenCallback) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      if (onOpenCallback) onOpenCallback();
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      console.log('Connected to Signaling Server');
      if (onOpenCallback) onOpenCallback();
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        handleIncomingBinaryChunk(event.data);
      } else {
        try {
          const message = JSON.parse(event.data);
          handleSignalingMessage(message);
        } catch (e) {
          console.error('WS JSON parse error:', e);
        }
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed.');
    };

    ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
    };
  }

  // --- Signaling Message Router ---
  function handleSignalingMessage(data) {
    switch (data.type) {
      case 'ROOM_CREATED':
        currentRoomId = data.roomId;
        displayRoomCode.textContent = currentRoomId;
        roomCodeBadge.innerHTML = `<span>${t('room')}</span> ${currentRoomId}`;
        generateRoomQrCode(currentRoomId);
        break;

      case 'RECEIVER_CONNECTED':
        handleReceiverConnected(data.peerId, data.deviceInfo, data.totalReceivers);
        break;

      case 'RECEIVER_DISCONNECTED':
        connectedReceivers.delete(data.peerId);
        connectedCount.textContent = data.totalReceivers;
        renderReceiversList();
        if (connectedReceivers.size === 0 && !isSending) {
          startBroadcastBtn.disabled = true;
        }
        break;

      case 'ROOM_JOINED':
        currentRoomId = data.roomId;
        receiverRoomBadge.innerHTML = `<span>${t('room')}</span> ${currentRoomId}`;
        receiverFileMeta = data.fileMeta;
        if (data.fileMeta) {
          displayIncomingFile(data.fileMeta);
        }
        break;

      case 'CHUNK_META':
        // Metadata received; binary chunk follows
        break;

      case 'RECEIVER_PROGRESS':
        updateReceiverProgressInSenderUI(data.peerId, data.progress);
        break;

      case 'RECEIVER_COMPLETE':
        markReceiverCompleteInSenderUI(data.peerId);
        break;

      case 'SENDER_DISCONNECTED':
        resetToHome();
        break;

      case 'SIGNAL':
        handleIncomingSignal(data.fromPeerId, data.signal);
        break;

      case 'ERROR':
        alert(data.message);
        if (currentRole === 'RECEIVER') resetToHome();
        break;

      default:
        break;
    }
  }

  // --- WebRTC P2P: Sender Side ---
  // Called once a receiver joins the room (in addition to existing logic).
  function initSenderPeerConnection(peerId) {
    if (senderPeers.has(peerId)) return; // already set up for this device

    const pc = new RTCPeerConnection(RTC_CONFIG);
    const dataChannel = pc.createDataChannel('airbeam-file');
    senderPeers.set(peerId, { pc, dataChannel });

    dataChannel.binaryType = 'arraybuffer';

    dataChannel.onopen = () => {
      console.log(`[P2P] Direct connection OPEN with device ${peerId}`);
      const statusEl = document.getElementById(`rx-status-${peerId}`);
      if (statusEl) statusEl.textContent = 'P2P Connected ⚡';
    };

    dataChannel.onclose = () => {
      console.log(`[P2P] Data channel closed with ${peerId}`);
    };

    dataChannel.onerror = (e) => {
      console.warn(`[P2P] Data channel error with ${peerId}:`, e);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'SIGNAL',
          targetPeerId: peerId,
          signal: { kind: 'ice', candidate: event.candidate }
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[P2P] Connection state (${peerId}):`, pc.connectionState);
    };

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'SIGNAL',
            targetPeerId: peerId,
            signal: { kind: 'offer', sdp: pc.localDescription }
          }));
        }
      })
      .catch((err) => console.error('[P2P] Offer creation failed:', err));
  }

  // --- WebRTC P2P: Receiver Side ---
  function initReceiverPeerConnection() {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    receiverPC = pc;

    pc.ondatachannel = (event) => {
      receiverDataChannel = event.channel;
      receiverDataChannel.binaryType = 'arraybuffer';

      receiverDataChannel.onopen = () => {
        console.log('[P2P] Direct connection OPEN with sender');
        if (receiverReadyState) {
          const hint = receiverReadyState.querySelector('[data-i18n="waitingForFile"], p');
          if (hint) hint.setAttribute('data-p2p', 'connected');
        }
      };

      receiverDataChannel.onerror = (e) => {
        console.warn('[P2P] Data channel error:', e);
      };
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'SIGNAL',
          signal: { kind: 'ice', candidate: event.candidate }
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[P2P] Connection state:', pc.connectionState);
    };

    return pc;
  }

  // --- WebRTC P2P: Route incoming signaling messages ---
  async function handleIncomingSignal(fromPeerId, signal) {
    if (!signal || !signal.kind) return;

    try {
      if (currentRole === 'SENDER') {
        const entry = senderPeers.get(fromPeerId);
        if (!entry) return;
        const { pc } = entry;

        if (signal.kind === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } else if (signal.kind === 'ice' && signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } else if (currentRole === 'RECEIVER') {
        if (signal.kind === 'offer') {
          if (!receiverPC) initReceiverPeerConnection();
          await receiverPC.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await receiverPC.createAnswer();
          await receiverPC.setLocalDescription(answer);
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'SIGNAL',
              signal: { kind: 'answer', sdp: receiverPC.localDescription }
            }));
          }
        } else if (signal.kind === 'ice' && signal.candidate && receiverPC) {
          await receiverPC.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      }
    } catch (err) {
      console.error('[P2P] Signal handling error:', err);
    }
  }

  // --- QR Code Generator for Room Code ---
  async function generateRoomQrCode(roomId) {
    try {
      const endpoint = roomId ? `/api/info?room=${roomId}` : '/api/info';
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.success) {
        if (roomQrImage) roomQrImage.src = data.qrCode;
        if (modalQrImg) modalQrImg.src = data.qrCode;
        if (modalUrlText) modalUrlText.textContent = data.url;
      }
    } catch (e) {
      console.error('Error generating room QR:', e);
    }
  }

  // --- Mode Switches ---
  selectSenderMode.addEventListener('click', () => {
    currentRole = 'SENDER';
    modeSelectionSection.classList.add('hidden');
    senderSection.classList.remove('hidden');
    initWorker();
    connectWebSocket(() => {
      // WebSocket is now open and ready
    });
  });

  selectReceiverMode.addEventListener('click', () => {
    quickRoomInput.focus();
  });

  // Enter key triggers join
  quickRoomInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      quickJoinBtn.click();
    }
  });

  // Only allow digits in room code input
  quickRoomInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
  });

  quickJoinBtn.addEventListener('click', () => {
    const code = quickRoomInput.value.trim();
    if (code.length === 6) {
      joinRoomAsReceiver(code);
    } else {
      quickRoomInput.style.borderColor = 'rgba(255,59,48,0.8)';
      quickRoomInput.placeholder = 'Enter 6-digit code!';
      setTimeout(() => {
        quickRoomInput.style.borderColor = '';
        quickRoomInput.placeholder = 'Enter 6-digit Code';
      }, 2000);
    }
  });

  function joinRoomAsReceiver(roomId) {
    currentRole = 'RECEIVER';
    currentRoomId = roomId;
    modeSelectionSection.classList.add('hidden');
    senderSection.classList.add('hidden');
    receiverSection.classList.remove('hidden');

    receiverConnectingState.classList.remove('hidden');
    receiverReadyState.classList.add('hidden');
    receiverDownloadingState.classList.add('hidden');
    receiverCompleteState.classList.add('hidden');

    connectWebSocket(() => {
      ws.send(JSON.stringify({
        type: 'JOIN_ROOM',
        roomId: roomId,
        deviceInfo: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'PC / Desktop'
      }));
    });
  }

  backFromSenderBtn.addEventListener('click', resetToHome);
  backFromReceiverBtn.addEventListener('click', resetToHome);

  function resetToHome() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    ws = null;

    // Reset all state
    currentRole = null;
    currentRoomId = null;
    selectedFile = null;
    isSending = false;
    currentChunkIndex = 0;
    totalFileChunks = 0;

    // Stage 1: close any open P2P connections so nothing leaks between sessions
    senderPeers.forEach(({ pc }) => { try { pc.close(); } catch (e) {} });
    senderPeers.clear();
    if (receiverPC) { try { receiverPC.close(); } catch (e) {} }
    receiverPC = null;
    receiverDataChannel = null;

    // Reset sender state
    connectedReceivers.clear();
    if (receiversList) receiversList.innerHTML = `
      <div class="empty-receivers-state">
        <i data-lucide="smartphone"></i>
        <p>${t('waitingReceivers')}</p>
      </div>`;
    if (connectedCount) connectedCount.textContent = '0';
    if (startBroadcastBtn) {
      startBroadcastBtn.disabled = true;
      startBroadcastBtn.innerHTML = `<i data-lucide="play"></i> <span data-i18n="startBroadcast">${t('startBroadcast')}</span>`;
    }
    if (displayRoomCode) displayRoomCode.textContent = '------';
    if (roomCodeBadge) roomCodeBadge.innerHTML = `<span>${t('room')}</span> ------`;
    if (roomQrImage) roomQrImage.src = '';
    if (dropzoneContent) dropzoneContent.classList.remove('hidden');
    if (selectedFileCard) selectedFileCard.classList.add('hidden');
    if (sharingDetailsContainer) sharingDetailsContainer.classList.add('hidden');
    if (fileInput) fileInput.value = '';

    // Reset receiver state
    receiverFileMeta = null;
    receivedChunks = [];
    totalBytesReceived = 0;
    startTime = null;
    lastSpeedCheckTime = null;
    lastSpeedBytes = 0;
    nextExpectedChunkIndex = 0;
    currentSpeedMBps = 0;

    // Reset receiver UI states
    if (receiverConnectingState) receiverConnectingState.classList.remove('hidden');
    if (receiverReadyState) receiverReadyState.classList.add('hidden');
    if (receiverDownloadingState) receiverDownloadingState.classList.add('hidden');
    if (receiverCompleteState) receiverCompleteState.classList.add('hidden');
    if (progressCircle) {
      progressCircle.style.strokeDashoffset = '440';
      progressPercentage.textContent = '0%';
    }
    if (quickRoomInput) quickRoomInput.value = '';

    senderSection.classList.add('hidden');
    receiverSection.classList.add('hidden');
    modeSelectionSection.classList.remove('hidden');

    if (window.lucide) lucide.createIcons();
  }

  // --- File Selection & Dropzone (Sender) ---
  dropzone.addEventListener('click', (e) => {
    // Don't trigger file picker if clicking on the file card or remove button
    if (e.target.closest('#selectedFileCard')) return;
    fileInput.click();
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });

  removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedFile = null;
    fileInput.value = '';
    dropzoneContent.classList.remove('hidden');
    selectedFileCard.classList.add('hidden');
    sharingDetailsContainer.classList.add('hidden');
    startBroadcastBtn.disabled = true;
  });

  function handleFileSelected(file) {
    selectedFile = file;
    totalFileChunks = Math.ceil(file.size / CHUNK_SIZE);

    selectedFileName.textContent = file.name;
    selectedFileSize.textContent = formatBytes(file.size);
    selectedFileChunks.textContent = `${totalFileChunks.toLocaleString()} chunks`;

    dropzoneContent.classList.add('hidden');
    selectedFileCard.classList.remove('hidden');
    sharingDetailsContainer.classList.remove('hidden');

    // Enable broadcast if receivers already connected
    if (connectedReceivers.size > 0) {
      startBroadcastBtn.disabled = false;
    }

    function sendCreateRoom() {
      ws.send(JSON.stringify({
        type: 'CREATE_ROOM',
        fileMeta: {
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          totalChunks: totalFileChunks,
          chunkSize: CHUNK_SIZE
        }
      }));
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      sendCreateRoom();
    } else {
      connectWebSocket(() => sendCreateRoom());
    }
  }

  // --- Sender: Connected Receivers Tracking ---
  function handleReceiverConnected(peerId, deviceInfo, totalCount) {
    connectedReceivers.set(peerId, {
      deviceInfo: deviceInfo,
      progress: 0,
      receivedBytes: 0
    });

    connectedCount.textContent = totalCount;
    renderReceiversList();

    if (totalCount > 0 && selectedFile && !isSending) {
      startBroadcastBtn.disabled = false;
    }

    // Stage 1: kick off a direct P2P (WebRTC) connection attempt to this
    // device, in parallel with the existing relay path. Does not affect
    // the current (working) file transfer.
    initSenderPeerConnection(peerId);
  }

  function renderReceiversList() {
    if (connectedReceivers.size === 0) {
      receiversList.innerHTML = `
        <div class="empty-receivers-state">
          <i data-lucide="smartphone"></i>
          <p data-i18n="waitingReceivers">${t('waitingReceivers')}</p>
        </div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    receiversList.innerHTML = '';
    connectedReceivers.forEach((data, peerId) => {
      const card = document.createElement('div');
      card.className = 'receiver-item-card';
      card.id = `rx-card-${peerId}`;
      card.innerHTML = `
        <div class="receiver-device-info">
          <div class="device-avatar"><i data-lucide="hard-drive"></i></div>
          <div>
            <strong>Device (${peerId})</strong>
            <div style="font-size:0.8rem; color:var(--text-muted);">${data.deviceInfo}</div>
          </div>
        </div>
        <div class="rx-progress-bar-container">
          <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-secondary);">
            <span id="rx-status-${peerId}">${t('connected')}</span>
            <span id="rx-pct-${peerId}">${data.progress}%</span>
          </div>
          <div class="rx-progress-bar-bg">
            <div class="rx-progress-bar-fill" id="rx-fill-${peerId}" style="width: ${data.progress}%"></div>
          </div>
        </div>`;
      receiversList.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
  }

  function updateReceiverProgressInSenderUI(peerId, progress) {
    if (connectedReceivers.has(peerId)) {
      const item = connectedReceivers.get(peerId);
      item.progress = progress;

      const fill = document.getElementById(`rx-fill-${peerId}`);
      const pct = document.getElementById(`rx-pct-${peerId}`);
      const status = document.getElementById(`rx-status-${peerId}`);

      if (fill) fill.style.width = `${progress}%`;
      if (pct) pct.textContent = `${progress}%`;
      if (status) status.textContent = `${t('streaming')} (${progress}%)`;
    }
  }

  function markReceiverCompleteInSenderUI(peerId) {
    const status = document.getElementById(`rx-status-${peerId}`);
    if (status) {
      status.textContent = t('completedStatus');
      status.style.color = 'var(--accent-green)';
    }
  }

  // --- Sender: Stream File Chunks using Web Worker (Zero-Lag) ---
  startBroadcastBtn.addEventListener('click', () => {
    if (!selectedFile || connectedReceivers.size === 0) return;
    isSending = true;
    currentChunkIndex = 0;
    startBroadcastBtn.disabled = true;
    startBroadcastBtn.innerHTML = `<i data-lucide="loader-2" class="spinner-sm"></i> ${t('streamingTo')} ${connectedReceivers.size} ${t('devicesCount')}`;

    requestNextChunkRead();
  });

  function requestNextChunkRead() {
    if (!isSending || currentChunkIndex >= totalFileChunks) {
      console.log('All chunks read and sent!');
      isSending = false;
      startBroadcastBtn.innerHTML = `<i data-lucide="check-circle"></i> ${t('transferCompleted')}`;
      return;
    }

    const offset = currentChunkIndex * CHUNK_SIZE;
    worker.postMessage({
      action: 'READ_CHUNK',
      file: selectedFile,
      offset: offset,
      chunkSize: CHUNK_SIZE,
      chunkIndex: currentChunkIndex,
      totalChunks: totalFileChunks
    });
  }

  function handleWorkerMessage(e) {
    const { type, chunkIndex, totalChunks, arrayBuffer } = e.data;

    if (type === 'CHUNK_READY') {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'CHUNK_META',
          chunkIndex: chunkIndex,
          totalChunks: totalChunks,
          byteOffset: chunkIndex * CHUNK_SIZE,
          chunkSize: arrayBuffer.byteLength
        }));

        ws.send(arrayBuffer);
      }

      currentChunkIndex++;
      setTimeout(requestNextChunkRead, 2);
    }
  }

  // --- Receiver: Display Incoming File Card ---
  function displayIncomingFile(fileMeta) {
    receiverConnectingState.classList.add('hidden');
    receiverReadyState.classList.remove('hidden');

    rxFileName.textContent = fileMeta.name;
    rxFileSize.textContent = formatBytes(fileMeta.size);

    receivedChunks = new Array(fileMeta.totalChunks);
    totalBytesReceived = 0;
    startTime = Date.now();
    lastSpeedCheckTime = Date.now();
    lastSpeedBytes = 0;

    setTimeout(() => {
      receiverReadyState.classList.add('hidden');
      receiverDownloadingState.classList.remove('hidden');
    }, 1200);
  }

  // --- Receiver: Handle Incoming Binary Chunks ---
  let nextExpectedChunkIndex = 0;

  function handleIncomingBinaryChunk(arrayBuffer) {
    if (!receiverFileMeta) return;

    receivedChunks[nextExpectedChunkIndex] = arrayBuffer;
    totalBytesReceived += arrayBuffer.byteLength;
    nextExpectedChunkIndex++;

    const progress = Math.min(100, Math.round((nextExpectedChunkIndex / receiverFileMeta.totalChunks) * 100));

    updateReceiverProgressUI(progress);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'TRANSFER_PROGRESS',
        progress: progress,
        receivedBytes: totalBytesReceived
      }));
    }

    if (nextExpectedChunkIndex >= receiverFileMeta.totalChunks) {
      handleDownloadComplete();
    }
  }

  function updateReceiverProgressUI(progressPct) {
    const offset = 440 - (440 * progressPct) / 100;
    progressCircle.style.strokeDashoffset = offset;
    progressPercentage.textContent = `${progressPct}%`;

    const now = Date.now();
    const timeDiff = (now - lastSpeedCheckTime) / 1000;
    if (timeDiff >= 0.5) {
      const bytesDiff = totalBytesReceived - lastSpeedBytes;
      currentSpeedMBps = (bytesDiff / timeDiff) / (1024 * 1024);
      rxSpeed.textContent = `${currentSpeedMBps.toFixed(1)} MB/s`;

      const remainingBytes = receiverFileMeta.size - totalBytesReceived;
      const etaSeconds = currentSpeedMBps > 0 ? (remainingBytes / (1024 * 1024)) / currentSpeedMBps : 0;
      rxEta.textContent = formatEta(etaSeconds);

      lastSpeedCheckTime = now;
      lastSpeedBytes = totalBytesReceived;
    }

    rxTransferredBytes.textContent = `${formatBytes(totalBytesReceived)} / ${formatBytes(receiverFileMeta.size)}`;
    rxChunkCount.textContent = `${nextExpectedChunkIndex} / ${receiverFileMeta.totalChunks}`;
  }

  // --- Receiver: Transfer Complete & Direct Local File Saving ---
  function handleDownloadComplete() {
    receiverDownloadingState.classList.add('hidden');
    receiverCompleteState.classList.remove('hidden');

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'TRANSFER_COMPLETE'
      }));
    }

    const blob = new Blob(receivedChunks, { type: receiverFileMeta.type || 'application/octet-stream' });
    const downloadUrl = URL.createObjectURL(blob);

    rxDownloadTriggerBtn.href = downloadUrl;
    rxDownloadTriggerBtn.download = receiverFileMeta.name;

    const tempA = document.createElement('a');
    tempA.href = downloadUrl;
    tempA.download = receiverFileMeta.name;
    document.body.appendChild(tempA);
    tempA.click();
    document.body.removeChild(tempA);
  }
});
