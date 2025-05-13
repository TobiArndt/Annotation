// src/main.js

import AppState from './models/AppState.js';
import Logger from './utils/Logger.js';
import { ACTION_TYPES } from './constants/ActionTypes.js';
import ImagePairDataHelper from './utils/ImagePairDataHelper.js';
import EventBus from './utils/EventBus.js';

// Views und Controller importieren
import SidebarView from './views/SidebarView.js';
import ImagePairOrchestrator from './controllers/ImagePairOrchestrator.js';
import ZoomController from './controllers/ZoomController.js';

const DEBUG = true; 
if (DEBUG) {
  Logger.enable(true);
  Logger.log('DEBUG-Modus ist aktiviert.');
}

function setupTestListeners() {
  EventBus.subscribeToState((eventPackage) => {
    const { type, payload } = eventPackage; 
    Logger.log(`[main.js TestListener] Event: ${type}`, payload);
  });
  EventBus.subscribe(ACTION_TYPES.IMAGE_REFERENCES_UPDATED, (eventPackage) => {
    Logger.log('[main.js TestListener] IMAGE_REFERENCES_UPDATED', eventPackage.payload);
  });
}

async function loadInitialAppData() {
  let dataForAppState;
  try {
    // 1. Versuche, aus dem LocalStorage zu laden
    const modelsFromStorage = ImagePairDataHelper.loadFromLocalStorage();

    if (modelsFromStorage) {
      Logger.log('Daten erfolgreich aus localStorage geladen (als Modelle).');
      dataForAppState = modelsFromStorage; // AppState.loadInitialData kann direkt Modelle verarbeiten
    } else {
      // 2. Wenn nichts im LocalStorage, lade aus JSON-Datei
      Logger.log('Keine Daten im localStorage gefunden, lade aus image_pairs.json...');
      const response = await fetch('data/image_pairs.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} beim Laden von image_pairs.json`);
      }
      const jsonDataArray = await response.json();

      // Konvertiere das JSON-Array in das von AppState erwartete Objektformat (Modelle nach ID)
      dataForAppState = ImagePairDataHelper.convertJsonToModels(jsonDataArray);
    }
    window.appState.loadInitialData(dataForAppState);

  } catch (error) {
    Logger.error('Fehler beim Laden der initialen Bildpaardaten:', error);
    Logger.log('Lade leere Daten als Fallback.');
    window.appState.loadInitialData({}); // Leere Daten laden, um Fehler in der UI zu vermeiden
  }
}


document.addEventListener('DOMContentLoaded', () => {
  Logger.log('DOM vollständig geladen. Anwendung wird initialisiert...');

  window.appState = AppState;

  if (DEBUG) {
    setupTestListeners();
  }

  // Views und Controller instanziieren
  const sidebarView = new SidebarView();
  const imagePairOrchestrator = new ImagePairOrchestrator();
  const zoomController = new ZoomController();

  // Event-Listener für UI-Aktionen, die den AppState modifizieren
  EventBus.subscribe('SELECT_IMAGE_PAIR_REQUESTED', (eventPackage) => {
    window.appState.setCurrentPair(eventPackage.payload.pairId);
  });

  // Lade initiale Daten (aus localStorage oder JSON)
  loadInitialAppData();

  // UI-Control-Buttons
  const correctBtn = document.getElementById('correct-btn');
  if (correctBtn) {
    correctBtn.addEventListener('click', () => window.appState.markPair('correct'));
  } else { Logger.warn('#correct-btn nicht gefunden.'); }

  const incorrectBtn = document.getElementById('incorrect-btn');
  if (incorrectBtn) {
    incorrectBtn.addEventListener('click', () => window.appState.markPair('incorrect'));
  } else { Logger.warn('#incorrect-btn nicht gefunden.'); }

  const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener('click', () => window.appState.toggleSidebar());
  } else { Logger.warn('#sidebar-toggle-btn nicht gefunden.'); }

  // Globale Tastatur-Listener (außerhalb des Zoom-Modals)
  window.addEventListener('keydown', (e) => {
    if (!window.appState) return;
    const state = window.appState.state; // Direkter Zugriff auf den internen State für schnelle Prüfung
    const key = e.key.toLowerCase();

    if (state.isZoomActive) return; // Tastatureingaben im Zoom-Modal werden dort behandelt

    const relevantKeysForPreventDefault = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'a', 'q', 'p', 'z', 'o', 'h'];
    if (relevantKeysForPreventDefault.includes(key)) e.preventDefault();

    switch(key) {
      case 'arrowup': window.appState.navigateUp(); break;
      case 'arrowdown': window.appState.navigateDown(); break;
      case 'arrowleft': window.appState.navigateLeft(); break;
      case 'arrowright': window.appState.navigateRight(); break;
      case ' ':
        if (state.isParallelMode) window.appState.markActiveRegionsParallel('ok');
        else window.appState.markActiveRegion('ok');
        break;
      case 'a':
        if (state.isParallelMode) window.appState.markActiveRegionsParallel('anomaly');
        else window.appState.markActiveRegion('anomaly');
        break;
      case 'q':
        if (state.isParallelMode) window.appState.markActiveRegionsParallel('questionable');
        else window.appState.markActiveRegion('questionable');
        break;
      case 'z': if (!state.isZoomActive) window.appState.activateZoom(); break;
      case 'p': window.appState.toggleParallelMode(); break;
      case 'o': window.appState.toggleOverlays(); break;
      case 'h': window.appState.toggleHighlightBoxes(); break;
    }
  });

  // Funktion zum Speichern der aktuellen Modelle im LocalStorage
  const saveCurrentModelsToLocalStorage = () => {
    if (window.appState && typeof window.appState.getImagePairModels === 'function') {
      ImagePairDataHelper.saveToLocalStorage(window.appState.getImagePairModels());
      Logger.log('Daten im localStorage gespeichert.');
    } else {
      Logger.error('Konnte Daten nicht im localStorage speichern: AppState oder getImagePairModels nicht verfügbar.');
    }
  };

  // Events, die ein Speichern im LocalStorage auslösen
  EventBus.subscribe(ACTION_TYPES.MARK_CORRECT, saveCurrentModelsToLocalStorage);
  EventBus.subscribe(ACTION_TYPES.MARK_INCORRECT, saveCurrentModelsToLocalStorage);
  EventBus.subscribe(ACTION_TYPES.UPDATE_REGION_STATUS, saveCurrentModelsToLocalStorage);
  EventBus.subscribe(ACTION_TYPES.UPDATE_PARALLEL_REGIONS_STATUS, saveCurrentModelsToLocalStorage);

  // Resize-Listener für Fenstergrößenänderungen
  let resizeDebounceTimer;
  window.addEventListener('resize', () => {
      clearTimeout(resizeDebounceTimer);
      resizeDebounceTimer = setTimeout(() => {
          if (window.appState) {
              Logger.log('[main.js] Window resize detected, updating dimensions in AppState.');
              window.appState.updateDimensions({
                  window: { width: window.innerWidth, height: window.innerHeight }
              });
          }
      }, 250);
  });

  Logger.log('Anwendung vollständig initialisiert und Event-Listener sind eingerichtet.');

  // Initiale Dimensionen setzen, um das erste WINDOW_RESIZED Event auszulösen
  if (window.appState) {
      window.appState.updateDimensions({
          window: { width: window.innerWidth, height: window.innerHeight }
      });
  }
});