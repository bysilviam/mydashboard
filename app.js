const CLIENT_ID = '153625384506-hoqfurbat7av6sh23c8o68m05amacgb9.apps.googleusercontent.com';
const DISCOVERY_DOCS = [
    'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
    'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
];
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly';

let tokenClient;
let gapiInited = false;
let gisInited = false;

document.getElementById('authorize_button').style.display = 'none';

function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        discoveryDocs: DISCOVERY_DOCS,
    });
    gapiInited = true;
    maybeEnableButtons();
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });
    gisInited = true;
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('authorize_button').style.display = 'flex';
    }
}

function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dashboard-screen').style.display = 'block';
        await fetchRealData();
        initChart();
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
}

async function fetchRealData() {
    try {
        // Fetch Unread Emails
        const gmailResponse = await gapi.client.gmail.users.messages.list({
            'userId': 'me',
            'q': 'is:unread'
        });
        const unreadCount = gmailResponse.result.resultSizeEstimate || 0;
        document.getElementById('unread-emails-count').innerText = unreadCount;

        // Fetch Today's Meetings
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const calendarResponse = await gapi.client.calendar.events.list({
            'calendarId': 'primary',
            'timeMin': startOfDay.toISOString(),
            'timeMax': endOfDay.toISOString(),
            'showDeleted': false,
            'singleEvents': true,
            'maxResults': 10,
            'orderBy': 'startTime'
        });
        
        const events = calendarResponse.result.items || [];
        document.getElementById('meetings-count').innerText = events.length;

        // Update Agenda List
        const agendaList = document.getElementById('agenda-list');
        agendaList.innerHTML = ''; 
        if (events.length > 0) {
            events.forEach(event => {
                const start = event.start.dateTime || event.start.date;
                const dateObj = new Date(start);
                const timeStr = dateObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
                
                let durationStr = 'Dia inteiro';
                if (event.end && event.end.dateTime && event.start.dateTime) {
                    const endObj = new Date(event.end.dateTime);
                    const diffMs = endObj - dateObj;
                    const diffMins = Math.round(diffMs / 60000);
                    if (diffMins < 60) {
                        durationStr = `${diffMins} min`;
                    } else {
                        const h = Math.floor(diffMins / 60);
                        const m = diffMins % 60;
                        durationStr = `${h}h${m > 0 ? ` ${m}min` : ''}`;
                    }
                }

                agendaList.innerHTML += `
                    <li class="agenda-item">
                        <div class="agenda-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                        </div>
                        <div class="agenda-time">${timeStr}</div>
                        <div class="agenda-details">
                            <div class="agenda-title">${event.summary}</div>
                            <div class="agenda-duration">${durationStr}</div>
                        </div>
                    </li>
                `;
            });
        } else {
            agendaList.innerHTML = `
                <li class="agenda-item">
                    <div class="agenda-details">
                        <div class="agenda-title" style="color: var(--text-muted); font-weight: 400;">Nenhum evento hoje 🎉</div>
                    </div>
                </li>
            `;
        }

    } catch (err) {
        console.error("Error fetching data:", err);
    }
}

function initChart() {
    const ctx = document.getElementById('emailsChart');
    if (!ctx) return;
    
    // Configurando Chart.js para o tema escuro e fonte do dashboard
    Chart.defaults.color = '#8f8f9d';
    Chart.defaults.font.family = "'Outfit', sans-serif";
    
    new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
            datasets: [{
                label: 'Emails recebidos',
                data: [12, 5, 8, 20, 3, 15, 9],
                backgroundColor: 'rgba(255, 42, 133, 0.6)',
                borderColor: '#ff2a85',
                borderWidth: 2,
                borderRadius: 6,
                hoverBackgroundColor: '#ff2a85'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#16161e',
                    titleColor: '#ffffff',
                    bodyColor: '#ff75b3',
                    borderColor: '#262633',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        title: () => null // Remove title do tooltip
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#262633',
                        drawBorder: false
                    },
                    ticks: {
                        stepSize: 5
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    }
                }
            }
        }
    });
}
