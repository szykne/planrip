function timeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + (parts[2] ? parseInt(parts[2], 10) : 0);
}

function checkTime() {
    let godz = new Date();
    //godz.setHours(godz.getHours() - 10); // testowanie o godzinach nocnych
    //godz.setMinutes(godz.getMinutes() + 18);
    
    let currentSeconds = godz.getHours() * 3600 + godz.getMinutes() * 60 + godz.getSeconds();
    let dzien = godz.getDay() - 1; // 0 = Mon, 4 = Fri
    // dzien = 0; // do testow
    
    // Clean up previous UI
    document.querySelectorAll('.ilezostalo').forEach(el => el.remove());
    document.querySelectorAll('.ilezostalo_lekcja').forEach(el => el.classList.remove('ilezostalo_lekcja'));
    document.querySelectorAll('.ilezostalo_przerwa').forEach(el => el.classList.remove('ilezostalo_przerwa'));
    
    // If it's weekend, do nothing
    if (dzien < 0 || dzien > 4) {
        return;
    }
    
    let activePeriod = null;
    let isBreak = false;
    let nextPeriodStart = 0;
    let periodEnd = 0;
    
    if (typeof PLAN_PERIODS === 'undefined') return;

    for (let i = 0; i < PLAN_PERIODS.length; i++) {
        let p = PLAN_PERIODS[i];
        let pStart = timeToSeconds(p.start_time);
        let pEnd = timeToSeconds(p.end_time);
        
        // Active lesson
        if (currentSeconds >= pStart && currentSeconds < pEnd) {
            activePeriod = p.id;
            isBreak = false;
            periodEnd = pEnd;
            break;
        }
        
        // Break before next lesson
        if (i < PLAN_PERIODS.length - 1) {
            let pNext = PLAN_PERIODS[i+1];
            let pNextStart = timeToSeconds(pNext.start_time);
            if (currentSeconds >= pEnd && currentSeconds < pNextStart) {
                activePeriod = pNext.id;
                isBreak = true;
                nextPeriodStart = pNextStart;
                break;
            }
        }
    }
    
    if (activePeriod !== null) {
        // Find the cell
        let rows = document.querySelectorAll('table.plan_tabela tr');
        let targetCell = null;
        for (let r of rows) {
            let nrCell = r.querySelector('td.nr');
            if (nrCell && nrCell.textContent.trim() == activePeriod) {
                let lCells = r.querySelectorAll('td.l');
                if (lCells.length > dzien) {
                    targetCell = lCells[dzien];
                }
                break;
            }
        }
        
        if (targetCell) {
            targetCell.classList.add(isBreak ? 'ilezostalo_przerwa' : 'ilezostalo_lekcja');
            
            let isEmpty = targetCell.innerHTML.trim() === '' || targetCell.innerHTML.trim() === '&nbsp;';
            
            if (!isEmpty) {
                let remainingSeconds = isBreak ? (nextPeriodStart - currentSeconds) : (periodEnd - currentSeconds);
                let rm = Math.floor(remainingSeconds / 60);
                let rs = remainingSeconds % 60;
                
                let isBlinking = (rm === 0 && rs % 2 === 0);
                
                let text = '(' + (isBreak ? 'Lekcja za <b>' : 'Koniec lekcji za <b>') + 
                           (rm < 10 ? '0' : '') + rm + '</b>:<b>' + 
                           (rs < 10 ? '0' : '') + rs + '</b>' + ')';
                
                let div = document.createElement('div');
                div.className = 'ilezostalo';
                if (isBlinking) {
                    div.classList.add('ilezostalo_blink');
                }
                div.innerHTML = text;
                
                targetCell.appendChild(div);
            }
        }
    }
}

function startCountdown() {
    checkTime();
    setInterval(checkTime, 1000);
}

document.addEventListener('DOMContentLoaded', startCountdown);
