function injectClock() {
    // Dowolny div z nazwa klasy _header
    var headerDiv = document.querySelector('div[class$="_header"]');
    
    if (!headerDiv) return;
    
    var clockSpan = document.createElement('span');
    clockSpan.id = "live-clock";
    
    var style = document.createElement('style');
    style.textContent = `
        /* override */
        div[class$="_header"] {
            display: flex !important;
            flex-wrap: wrap !important;
            justify-content: space-between !important;
            align-items: center !important;
        }
        /* patch do h1 */
        div[class$="_header"] h1 {
            flex: 1 1 auto;
            text-align: center;
            margin: 0;
            min-width: 200px;
        }
        /* spacer do podzialu */
        .header-spacer {
            flex: 1 1 0%;
            min-width: 140px;
        }
        #live-clock {
            flex: 1 1 0%;
            text-align: right;
            font-size: 32px;
            font-family: monospace;
            white-space: nowrap;
            min-width: 140px;
            padding-right: 10px;
        }
        /* Jezeli ekran jest za maly, przeniesmy zegar na dol */
        @media (max-width: 800px) {
            div[class$="_header"] {
                height: auto !important;
                padding-bottom: 10px;
            }
            #live-clock {
                flex-basis: 100%;
                text-align: center;
                font-size: 24px;
                margin-top: 10px;
                padding-right: 0;
            }
            .header-spacer {
                display: none;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Spacer
    var spacer = document.createElement('div');
    spacer.className = "header-spacer";
    headerDiv.insertBefore(spacer, headerDiv.firstChild);

    headerDiv.appendChild(clockSpan);

    function updateClock() {
        var now = new Date();
        var hours = now.getHours().toString().padStart(2, '0');
        var minutes = now.getMinutes().toString().padStart(2, '0');
        var seconds = now.getSeconds().toString().padStart(2, '0');

        clockSpan.textContent = hours + ":" + minutes + ":" + seconds;
    }

    setInterval(updateClock, 1000);
    updateClock();
}

document.addEventListener("DOMContentLoaded", injectClock);
