// js/mapa.js

// Prevent parent page zooming when map is open inside an iframe
if (window.top !== window.self) {
    try {
        const topDoc = window.top.document;
        let meta = topDoc.querySelector('meta[name="viewport"]');
        let originalContent = '';
        if (meta) {
            originalContent = meta.content;
        } else {
            meta = topDoc.createElement('meta');
            meta.name = "viewport";
            topDoc.head.appendChild(meta);
        }
        
        meta.content = "width=device-width, initial-scale=0.5, maximum-scale=1.0, user-scalable=no";

        const restoreZoom = () => {
            if (originalContent) {
                meta.content = originalContent;
            } else {
                meta.content = "width=device-width, initial-scale=0.4, user-scalable=yes";
            }
        };
        window.addEventListener('pagehide', restoreZoom);
        window.addEventListener('unload', restoreZoom);
    } catch (e) {
        console.warn("Could not access parent window to lock zoom.");
    }
}

// Statyczne dane sal dla pięter
const STATIC_ROOMS_DATA = {
    "-1": [
        { svg_id: "r1", short_name: "Sklepik szkolny", room_type: "utility" },
        { svg_id: "r2", short_name: "Sala 4", room_code: "4", room_type: "classroom" },
        { svg_id: "r4", short_name: "Sala 6", room_code: "6", room_type: "classroom" },
        { svg_id: "r5", short_name: "Sala 7", room_code: "7", room_type: "classroom" },
        { svg_id: "r6", short_name: "Sala 8", room_code: "8", room_type: "classroom" }
    ],
    "0": [
        { svg_id: "r1", short_name: "Biblioteka szkolna", room_type: "utility" },
        { svg_id: "r2", short_name: "Sala 16", room_code: "16", room_type: "classroom" },
        { svg_id: "r3", short_name: "Sala 15", room_code: "15", room_type: "classroom" },
        { svg_id: "r4", short_name: "Sala gimnastyczna", room_code: "sg1", room_type: "classroom" },
        { svg_id: "r8", short_name: "Pielęgniarka", room_type: "admin" },
        { svg_id: "r9", short_name: "Psycholog", room_type: "admin" },
        { svg_id: "r10", short_name: "Portiernia", room_type: "utility" },
        { svg_id: "r14", short_name: "Sala 14", room_code: "14", room_type: "classroom" },
        { svg_id: "r15", short_name: "Sala 13", room_code: "13", room_type: "classroom" },
        { svg_id: "r17", short_name: "Sala 12", room_code: "12", room_type: "classroom" },
        { svg_id: "r18", short_name: "Sala 11", room_code: "11", room_type: "classroom" }
    ],
    "1": [
        { svg_id: "r9", short_name: "Administracja", room_type: "admin" },
        { svg_id: "r10", short_name: "Sala 38", room_code: "38", room_type: "classroom" },
        { svg_id: "r11", short_name: "Pedagog", room_type: "admin" },
        { svg_id: "r12", short_name: "Sala 39", room_code: "39", room_type: "classroom" },
        { svg_id: "r14", short_name: "Sala 40", room_code: "40", room_type: "classroom" },
        { svg_id: "r17", short_name: "Sala 41", room_code: "41", room_type: "classroom" },
        { svg_id: "r19", short_name: "Sala 42", room_code: "42", room_type: "classroom" },
        { svg_id: "r20", short_name: "Sala 43", room_code: "43", room_type: "classroom" }
    ],
    "2": [
        { svg_id: "r1", short_name: "Sala 52", room_code: "52", room_type: "classroom" },
        { svg_id: "r2", short_name: "Sala 51", room_code: "51", room_type: "classroom" },
        { svg_id: "r4", short_name: "Sala 48", room_code: "48", room_type: "classroom" },
        { svg_id: "r5", short_name: "Sala 47", room_code: "47", room_type: "classroom" },
        { svg_id: "r6", short_name: "Sala 46", room_code: "46", room_type: "classroom" },
        { svg_id: "r11", short_name: "Sala 45", room_code: "45", room_type: "classroom" },
        { svg_id: "r12", short_name: "Sala 44", room_code: "44", room_type: "classroom" }
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    let currentFloor = typeof INITIAL_FLOOR !== 'undefined' ? INITIAL_FLOOR : 0;
    let mapData = [];
    let panzoomInstance = null;
    let mapResizeObserver = null;
    let selectedRoomId = typeof INITIAL_ROOM !== 'undefined' ? INITIAL_ROOM : null;

    const mapContainer = document.getElementById('map-container');
    const mapLoading = document.getElementById('map-loading');
    const mapError = document.getElementById('map-error');
    
    // Panels
    const roomInfoPanel = document.getElementById('room-info-panel');
    const closeInfoBtn = document.getElementById('close-info');
    const searchInput = document.getElementById('room-search');

    // Setup Floor buttons
    document.querySelectorAll('.floor-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const f = parseInt(e.target.getAttribute('data-floor'));
            if (f !== currentFloor) {
                document.querySelectorAll('.floor-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                loadFloor(f);
            }
        });
    });

    closeInfoBtn.addEventListener('click', () => {
        roomInfoPanel.style.display = 'none';
        document.querySelectorAll('.svg-room.active').forEach(el => el.classList.remove('active'));
    });

    const searchToggle = document.getElementById('search-toggle');
    const searchContent = document.getElementById('search-content');
    if (searchToggle) {
        searchToggle.addEventListener('click', () => {
            searchContent.classList.toggle('open');
            searchToggle.textContent = searchContent.classList.contains('open') ? 'Ukryj wyszukiwanie ▲' : 'Szukaj sali ▼';
        });
    }

    // Room Search
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase().strip ? e.target.value.toLowerCase().strip() : e.target.value.toLowerCase();
            document.querySelectorAll('.room-item').forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(q)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }

    // Room List Click
    document.querySelectorAll('.room-item').forEach(item => {
        item.addEventListener('click', () => {
            const floor = parseInt(item.getAttribute('data-floor'));
            const roomId = item.getAttribute('data-id');
            if (floor !== currentFloor) {
                selectedRoomId = roomId;
                const targetBtn = document.querySelector(`.floor-btn[data-floor="${floor}"]`);
                if (targetBtn) targetBtn.click();
            } else {
                focusRoom(roomId, false);
            }
        });
    });

    // Main loader function
    function loadFloor(floorNum) {
        currentFloor = floorNum;
        if (roomInfoPanel) roomInfoPanel.style.display = 'none';
        
        const mapFilesConfig = typeof MAP_FILES !== 'undefined' ? MAP_FILES : {
            "-1": "svg/zsem_p_minus_1.svg",
            "0": "svg/zsem_p0.svg",
            "1": "svg/zsem_p1.svg",
            "2": "svg/zsem_p2.svg"
        };
        
        const filePath = mapFilesConfig[floorNum] || mapFilesConfig[String(floorNum)];

        if (!filePath) {
            console.error("No SVG file configured for floor:", floorNum);
            if (mapError) mapError.style.display = 'block';
            return;
        }

        if (mapLoading) mapLoading.style.display = 'block';
        if (mapError) mapError.style.display = 'none';
        
        if (panzoomInstance) {
            panzoomInstance.destroy();
            panzoomInstance = null;
        }
        
        const existingSvg = mapContainer.querySelector('svg');
        if (existingSvg) existingSvg.remove();

        fetch(filePath)
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.text();
            })
            .then(svgText => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(svgText, "image/svg+xml");
                const svgEl = doc.documentElement;
                
                const viewBox = svgEl.getAttribute('viewBox');
                if (viewBox) {
                    const parts = viewBox.split(' ');
                    if (parts.length >= 4) {
                        svgEl.style.width = parts[2] + 'px';
                        svgEl.style.height = parts[3] + 'px';
                    }
                } else {
                    svgEl.style.width = '1000px';
                    svgEl.style.height = '1000px';
                }
                
                mapContainer.appendChild(svgEl);
                if (mapLoading) mapLoading.style.display = 'none';
                
                initPanzoom(svgEl);
                fetchRoomData();
            })
            .catch(error => {
                console.error("Error loading SVG:", error);
                if (mapLoading) mapLoading.style.display = 'none';
                if (mapError) mapError.style.display = 'block';
            });
    }

    function initPanzoom(svgEl) {
        const containerRect = mapContainer.getBoundingClientRect();
        const svgW = parseFloat(svgEl.style.width) || svgEl.clientWidth || 1000;
        const svgH = parseFloat(svgEl.style.height) || svgEl.clientHeight || 1000;
        
        const coverScale = Math.max((containerRect.width || 800) / svgW, (containerRect.height || 600) / svgH);
        const initX = (containerRect.width / 2 - svgW / 2) / coverScale;
        const initY = (containerRect.height / 2 - svgH / 2) / coverScale;

        panzoomInstance = Panzoom(svgEl, {
            maxScale: 10,
            startScale: coverScale,
            startX: initX,
            startY: initY,
            contain: 'outside'
        });
        
        panzoomInstance.zoom(coverScale, { force: true });
        panzoomInstance.pan(initX, initY, { force: true });
        
        if (mapResizeObserver) {
            mapResizeObserver.disconnect();
        }
        
        mapResizeObserver = new ResizeObserver(entries => {
            if (!panzoomInstance) return;
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    const currentSvgW = parseFloat(svgEl.style.width) || svgEl.clientWidth || 1000;
                    const currentSvgH = parseFloat(svgEl.style.height) || svgEl.clientHeight || 1000;
                    const newCoverScale = Math.max(width / currentSvgW, height / currentSvgH);
                    
                    panzoomInstance.setOptions({ minScale: newCoverScale });
                    const currentScale = panzoomInstance.getScale();
                    
                    if (currentScale <= newCoverScale + 0.01) {
                        panzoomInstance.zoom(newCoverScale, { force: true });
                        const newInitX = (width / 2 - currentSvgW / 2) / newCoverScale;
                        const newInitY = (height / 2 - currentSvgH / 2) / newCoverScale;
                        panzoomInstance.pan(newInitX, newInitY, { force: true });
                    }
                }
            }
        });
        mapResizeObserver.observe(mapContainer);
    }

    mapContainer.addEventListener('wheel', function(event) {
        if (!panzoomInstance) return;
        event.preventDefault();
        
        const scale = panzoomInstance.getScale();
        const delta = event.deltaY === 0 && event.deltaX ? event.deltaX : event.deltaY;
        const direction = delta < 0 ? 1 : -1;
        const newScale = scale * Math.exp((direction * 0.3) / 3);
        
        panzoomInstance.zoomToPoint(newScale, event);
    }, { passive: false });

    function fetchRoomData() {
        // Pobieranie statycznych danych dla piętra
        mapData = STATIC_ROOMS_DATA[String(currentFloor)] || [];
        renderMapOverlays();
        
        if (selectedRoomId) {
            setTimeout(() => {
                focusRoom(selectedRoomId, true);
                selectedRoomId = null;
            }, 50);
        }
    }

    function renderMapOverlays() {
        const svgEl = mapContainer.querySelector('svg');
        if (!svgEl) return;
        
        const interactiveGroup = Array.from(svgEl.querySelectorAll('g')).find(g => 
            g.getAttribute('inkscape:label') === 'interactive' || 
            g.getAttribute('id') === 'interactive'
        );
        
        if (!interactiveGroup) return;

        interactiveGroup.classList.add('interactive-layer');
        interactiveGroup.querySelectorAll('text.svg-room-text').forEach(t => t.remove());

        mapData.forEach(room => {
            if (!room.svg_id) return;
            const safeId = CSS.escape(room.svg_id);
            const roomEl = interactiveGroup.querySelector(`[id="${safeId}"]`);
            
            if (roomEl) {
                roomEl.classList.add('svg-room');
                roomEl.setAttribute('data-room-id', room.svg_id);
                
                let startX, startY;
                roomEl.addEventListener('pointerdown', (e) => {
                    startX = e.clientX;
                    startY = e.clientY;
                });
                
                roomEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (startX !== undefined && (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5)) {
                        return;
                    }
                    focusRoom(room.svg_id, false);
                });

                const bbox = roomEl.getBBox();
                const centerX = bbox.x + bbox.width / 2;
                const centerY = bbox.y + bbox.height / 2;

                if (room.short_name) {
                    const textNode = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    textNode.setAttribute("x", centerX);
                    textNode.setAttribute("class", "svg-room-text short");
                    
                    const words = room.short_name.split(' ');
                    if (words.length > 1) {
                        const lineSpacing = 13.2;
                        const blockHeight = (words.length - 1) * lineSpacing;
                        let startY = centerY - (blockHeight / 2);

                        textNode.setAttribute("y", startY);
                        words.forEach((word, idx) => {
                            const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                            tspan.textContent = word;
                            tspan.setAttribute("x", centerX);
                            if (idx > 0) tspan.setAttribute("dy", "1.2em");
                            textNode.appendChild(tspan);
                        });
                    } else {
                        textNode.setAttribute("y", centerY);
                        textNode.textContent = room.short_name;
                    }
                    interactiveGroup.appendChild(textNode);
                }
            }
        });

        setTimeout(() => {
            interactiveGroup.classList.add('ready');
        }, 50);
    }

    function focusRoom(roomId, isInitialFocus = false) {
        document.querySelectorAll('.svg-room.active').forEach(el => el.classList.remove('active'));
        const svgEl = mapContainer.querySelector('svg');
        if (!svgEl || !roomId) return;
        
        const safeId = CSS.escape(roomId);
        const roomEl = svgEl.querySelector(`[id="${safeId}"]`);
        if (!roomEl) return;
        
        roomEl.classList.add('active');

        if (panzoomInstance) {
            const bbox = roomEl.getBBox();
            const centerX = bbox.x + bbox.width / 2;
            const centerY = bbox.y + bbox.height / 2;
            
            const scale = 2.5; 
            const animDuration = isInitialFocus ? 1000 : 300;
            
            setTimeout(() => {
                panzoomInstance.setOptions({ contain: 'none', duration: animDuration });
                panzoomInstance.zoom(scale, { animate: true });
                
                const containerRect = mapContainer.getBoundingClientRect();
                const svgW = parseFloat(svgEl.style.width) || svgEl.clientWidth || 1000;
                const svgH = parseFloat(svgEl.style.height) || svgEl.clientHeight || 1000;
                
                const targetY = (containerRect.height / 2) - 80; 
                
                const x = (containerRect.width / 2 - svgW / 2) / scale - centerX + svgW / 2;
                const y = (targetY - svgH / 2) / scale - centerY + svgH / 2;
                
                panzoomInstance.pan(x, y, { animate: true, force: true });
                
                setTimeout(() => {
                    panzoomInstance.setOptions({ contain: 'outside', duration: 200 });
                }, animDuration + 50);
            }, 50);
        }

        showRoomInfo(roomId);
    }

    function escapeHtml(unsafe) {
        if (unsafe == null) return '';
        return String(unsafe)
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    function showRoomInfo(roomId) {
        const room = mapData.find(r => r.svg_id === roomId);
        if (!room) return;

        let roomNameText = room.short_name + (room.long_name ? ' - ' + room.long_name : '');
        if (room.room_code) {
            document.getElementById('info-room-name').innerHTML = `<a target="planframe" style="color:inherit;text-decoration:none;" href="../sale/${encodeURIComponent(room.room_code)}.html">${escapeHtml(roomNameText)}</a>`;
        } else {
            document.getElementById('info-room-name').textContent = roomNameText;
        }
        
        document.getElementById('info-room-desc').textContent = 'Typ: ' + (room.room_type === 'classroom' ? 'Sala lekcyjna' : (room.room_type === 'utility' ? 'Gospodarcze / Inne' : (room.room_type === 'admin' ? 'Administracja / Gabinet' : 'Inne')));
        
        const timetableDiv = document.getElementById('info-timetable');
        timetableDiv.innerHTML = '';
        
        if (room.room_code) {
            document.getElementById('info-actions').innerHTML = `<a class="btn-link" target="planframe" href="../sale/${encodeURIComponent(room.room_code)}.html">Zobacz pełny plan sali</a>`;
        } else {
            timetableDiv.innerHTML = '<i>Sala ogólnodostępna / brak przypisanego planu lekcji.</i>';
            document.getElementById('info-actions').innerHTML = '';
        }
        
        roomInfoPanel.style.display = 'block';
    }

    // Initialize map with default floor 0 (Parter)
    loadFloor(currentFloor);
});
