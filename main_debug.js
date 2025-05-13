// main_debug.js
import UILabel from './views/components/UILabel.js';
import SimpleGridPositioner from './views/layout/SimpleGridPositioner.js';

document.addEventListener('DOMContentLoaded', () => {
    const konvaContainer = document.getElementById('konva-container-debug');
    let stageWidth = konvaContainer.clientWidth;
    let stageHeight = konvaContainer.clientHeight;

    const stage = new Konva.Stage({
        container: 'konva-container-debug',
        width: stageWidth,
        height: stageHeight,
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    // Beispiel-Theme-Objekt für Styling
    const theme = {
        padding: 10,
        colors: {
            text: '#333333',
            primaryBg: '#AED6F1',
            secondaryBg: '#F9E79F',
            accentText: '#D9534F',
            defaultLabelBg: 'lightgray',
        },
        fontSize: {
            small: 10,
            medium: 14,
            large: 18,
        },
        fontFamily: 'Arial, sans-serif',
    };

    // Globale Variablen zur Verwaltung des aktuellen Zustands des Grids
    let currentGridElementsConfig = [];
    let currentGridGeometryConfig = {};
    let gridPositioner = null;

    // Definiert die initiale Liste von UI-Element-Konfigurationen
    function createInitialElementsConfig() {
        return [
            {
                name: 'titleLabel',
                type: 'label',
                params: {
                    text: 'Dynamisches Gitter Test',
                    fontSize: theme.fontSize.large,
                    textColor: theme.colors.text,
                    fontStyle: 'bold',
                    padding: 5
                },
            },
            null, // Leere Zelle
            {
                name: 'infoLabel1',
                type: 'label',
                params: {
                    text: 'Info A:',
                    fontSize: theme.fontSize.medium,
                    textColor: theme.colors.text,
                    padding: 5
                },
            },
            {
                name: 'valueLabel1',
                type: 'label',
                params: {
                    text: 'Wert 123',
                    fontSize: theme.fontSize.medium,
                    textColor: theme.colors.accentText,
                    backgroundColor: theme.colors.primaryBg,
                    padding: 5,
                    cornerRadius: 3
                },
            },
            {
                name: 'description',
                type: 'label',
                params: {
                    text: 'Dies ist eine längere Beschreibung, die möglicherweise umgebrochen werden muss, um in die Zelle zu passen.',
                    fontSize: theme.fontSize.small,
                    textColor: theme.colors.text,
                    backgroundColor: theme.colors.secondaryBg,
                    padding: 8
                },
            },
            {
                name: 'statusLabel',
                type: 'label',
                params: {
                    text: 'Status: OK',
                    fontSize: theme.fontSize.medium,
                    textColor: 'green',
                    fontStyle: 'italic bold',
                    padding: 5
                },
            },
            new UILabel({ // Beispiel für eine bereits instanziierte Komponente
                name: 'instanceLabel',
                params: {
                    text: 'Instanz!',
                    backgroundColor: '#E8DAEF',
                    padding: 10,
                    fontSize: 16,
                    cornerRadius: 5
                }
            }),
            null, // Leere Zelle
            {
                name: 'footer',
                type: 'label',
                params: {
                    text: 'Fußzeile',
                    fontSize: theme.fontSize.small,
                    textColor: theme.colors.text,
                    padding: 5
                }
            }
        ];
    }

    // Erstellt/aktualisiert den GridPositioner mit den Elementen
    function setupGrid(elementsConfig) {
        currentGridElementsConfig = elementsConfig;

        // Aktualisiere Geometrie basierend auf aktueller Stage-Größe
        currentGridGeometryConfig = {
            startX: theme.padding, // LINKE obere Ecke
            startY: theme.padding,
            totalWidth: stage.width() - (2 * theme.padding),
            totalHeight: stage.height() - (2 * theme.padding),
            numRows: 3,
            numCols: 3,
            cellPadding: 8,
            fillDirection: 'rowFirst',
        };

        if (gridPositioner) {
            gridPositioner.destroy();
        }

        gridPositioner = new SimpleGridPositioner({
            ...currentGridGeometryConfig,
            elements: currentGridElementsConfig,
        });
    }

    // Leert den Layer und rendert den aktuellen GridPositioner
    function renderGrid() {
        if (!gridPositioner) {
            console.warn("renderGrid aufgerufen, aber gridPositioner ist nicht initialisiert.");
            return;
        }
        //layer.destroyChildren();
        gridPositioner.render(layer);
        layer.batchDraw();
    }

    // ---- Initiales Setup ----
    setupGrid(createInitialElementsConfig());
    renderGrid();

    

    // ---- Test: Updates nach 2 Sekunden ----
    setTimeout(() => {
        console.log("Aktualisiere Labels...");
        
        const valueLabel1 = gridPositioner.getElementByName('valueLabel1');
        if (valueLabel1) {
            valueLabel1.updateProperty('text', 'Neuer Wert: 456');
            valueLabel1.updateProperty('backgroundColor', '#85C1E9');
            valueLabel1.updateProperty('textColor', '#1A5276');
        }

        const descriptionLabel = gridPositioner.getElementByName('description');
        if (descriptionLabel) {
            descriptionLabel.updateProperty('text', 'Kurzbeschreibung nach Update.');
            descriptionLabel.updateProperty('fontSize', theme.fontSize.medium);
        }

        const statusLabel = gridPositioner.getElementByName('statusLabel');
        if (statusLabel) {
            statusLabel.updateProperty('text', 'Status: Geändert!');
            statusLabel.updateProperty('textColor', 'orange');
        }
        
        renderGrid();
        console.log("Labels aktualisiert und Gitter neu gerendert.");
    }, 2000);

    

    // ---- Resize Handler ----
    let resizeDebounceTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeDebounceTimer);
        resizeDebounceTimer = setTimeout(() => {
            console.log("Fenstergröße geändert, passe Konva-Stage und Layout an...");
            stageWidth = konvaContainer.clientWidth;
            stageHeight = konvaContainer.clientHeight;

            stage.width(stageWidth);
            stage.height(stageHeight);

            setupGrid(currentGridElementsConfig);
            renderGrid();

            console.log("Konva-Stage und Layout an Fenstergröße angepasst.");
        }, 250);
    });
});