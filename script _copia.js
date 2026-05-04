// ============================================
// CONFIGURAÇÃO E VERIFICAÇÃO INICIAL
// ============================================

// Verifica se a configuração existe
if (typeof CONFIG === 'undefined' || !CONFIG.API_KEY || CONFIG.API_KEY === 'sua_chave_api_aqui') {
    document.body.innerHTML = `
        <div style="
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #0a0a1a;
            color: #dfe6e9;
            font-family: sans-serif;
            padding: 20px;
        ">
            <div style="
                background: rgba(255,255,255,0.05);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 20px;
                padding: 40px;
                max-width: 500px;
                text-align: center;
            ">
                <h2 style="color: #ff7675;">⚠️ Configuração Necessária</h2>
                <p style="margin: 20px 0;">Crie o arquivo <strong>config.js</strong> com sua chave da API:</p>
                <pre style="
                    background: #1e1e1e;
                    padding: 15px;
                    border-radius: 10px;
                    text-align: left;
                    color: #6c5ce7;
                    margin: 20px 0;
                ">const CONFIG = {
    API_KEY: 'sua_chave_api_aqui',
    API_URL: 'https://v3.football.api-sports.io'
};</pre>
                <p style="font-size: 0.9em; color: #b2bec3;">
                    Obtenha sua chave gratuita em:<br>
                    <a href="https://www.api-football.com/" target="_blank" style="color: #6c5ce7;">
                        api-football.com
                    </a>
                </p>
            </div>
        </div>
    `;
    throw new Error('API Key não configurada');
}

// ============================================
// GERENCIADOR DE FAVORITOS
// ============================================
class FavoritesManager {
    constructor() {
        this.storageKey = 'football_favorites';
        this.favorites = this.loadFavorites();
    }

    loadFavorites() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : { teams: [], leagues: [] };
        } catch {
            return { teams: [], leagues: [] };
        }
    }

    saveFavorites() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.favorites));
    }

    toggleTeam(teamId) {
        const index = this.favorites.teams.indexOf(teamId);
        if (index > -1) {
            this.favorites.teams.splice(index, 1);
        } else {
            this.favorites.teams.push(teamId);
        }
        this.saveFavorites();
        return index === -1;
    }

    toggleLeague(leagueId) {
        const index = this.favorites.leagues.indexOf(leagueId);
        if (index > -1) {
            this.favorites.leagues.splice(index, 1);
        } else {
            this.favorites.leagues.push(leagueId);
        }
        this.saveFavorites();
        return index === -1;
    }

    isTeamFavorite(teamId) {
        return this.favorites.teams.includes(teamId);
    }

    isLeagueFavorite(leagueId) {
        return this.favorites.leagues.includes(leagueId);
    }

    getFavoriteMatches(matches) {
        return matches.filter(match => 
            this.isTeamFavorite(match.teams.home.id) || 
            this.isTeamFavorite(match.teams.away.id) ||
            this.isLeagueFavorite(match.league.id)
        );
    }
}

// ============================================
// CLASSE DA API
// ============================================
class FootballAPI {
    constructor() {
        this.baseURL = CONFIG.API_URL;
        this.apiKey = CONFIG.API_KEY;
        this.cache = new Map();
        this.cacheTimeout = 60000;
    }

    async fetchWithCache(endpoint, params = {}) {
        const cacheKey = `${endpoint}?${new URLSearchParams(params)}`;
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const url = new URL(`${this.baseURL}/${endpoint}`);
            Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

            const response = await fetch(url, {
                headers: {
                    'x-apisports-key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            
            if (data.errors && Object.keys(data.errors).length > 0) {
                throw new Error(data.errors.requests || 'Erro na API');
            }

            this.cache.set(cacheKey, {
                data: data.response,
                timestamp: Date.now()
            });

            return data.response;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async getMatchesByDate(date) {
        return this.fetchWithCache('fixtures', {
            date: date,
            timezone: 'America/Sao_Paulo'
        });
    }

    async getLiveMatches() {
        return this.fetchWithCache('fixtures', {
            live: 'all'
        });
    }
}

// ============================================
// CLASSE DA INTERFACE
// ============================================
class UI {
    constructor() {
        this.container = document.getElementById('jogosContainer');
        this.loading = document.getElementById('loadingSkeleton');
        this.emptyState = document.getElementById('emptyState');
        this.liveCount = document.getElementById('liveCount');
        this.searchInput = document.getElementById('searchInput');
        this.leagueSelect = document.getElementById('leagueSelect');
        this.tabs = document.querySelectorAll('.tab');
        this.currentTab = 'ao-vivo';
        this.allMatches = [];
        
        this.initEventListeners();
    }

    initEventListeners() {
        // Busca em tempo real
        this.searchInput.addEventListener('input', () => this.filterAndRender());
        
        // Filtro por liga
        this.leagueSelect.addEventListener('change', () => this.filterAndRender());
        
        // Tabs
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Data filter
        const dataFiltro = document.getElementById('dataFiltro');
        if (dataFiltro) {
            dataFiltro.addEventListener('change', () => {
                if (typeof app !== 'undefined') {
                    app.loadMatchesByDate(dataFiltro.value);
                }
            });
        }

        // Scroll para FAB
        window.addEventListener('scroll', () => {
            const fab = document.querySelector('.fab');
            if (fab) {
                fab.style.display = window.scrollY > 300 ? 'block' : 'none';
            }
        });
    }

    switchTab(tab) {
        this.currentTab = tab;
        this.tabs.forEach(t => t.classList.remove('active'));
        const activeTab = document.querySelector(`[data-tab="${tab}"]`);
        if (activeTab) activeTab.classList.add('active');
        
        if (typeof app !== 'undefined') {
            app.loadMatches();
        }
    }

    filterAndRender() {
        let filtered = [...this.allMatches];
        
        // Filtro de busca
        const searchTerm = this.searchInput.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(m => 
                m.teams.home.name.toLowerCase().includes(searchTerm) ||
                m.teams.away.name.toLowerCase().includes(searchTerm) ||
                m.league.name.toLowerCase().includes(searchTerm)
            );
        }

        // Filtro de liga
        const leagueId = this.leagueSelect.value;
        if (leagueId) {
            filtered = filtered.filter(m => m.league.id == leagueId);
        }

        this.renderMatches(filtered);
    }

    showLoading() {
        if (this.loading) this.loading.style.display = 'block';
        if (this.container) this.container.innerHTML = '';
        if (this.emptyState) this.emptyState.style.display = 'none';
    }

    hideLoading() {
        if (this.loading) this.loading.style.display = 'none';
    }

    showError(message) {
        if (this.container) {
            this.container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle" style="color: #ff7675;"></i>
                    <h3>Erro</h3>
                    <p>${message}</p>
                    <button onclick="atualizarJogos()" style="
                        margin-top: 20px;
                        padding: 10px 20px;
                        background: var(--primary);
                        border: none;
                        border-radius: 10px;
                        color: white;
                        cursor: pointer;
                    ">Tentar Novamente</button>
                </div>
            `;
        }
    }

    showEmpty(message = 'Nenhum jogo encontrado') {
        if (this.emptyState) {
            this.emptyState.querySelector('h3').textContent = message;
            this.emptyState.style.display = 'block';
        }
        if (this.container) this.container.innerHTML = '';
    }

    renderMatches(matches) {
        if (!this.container) return;
        
        this.container.innerHTML = '';
        
        if (!matches || matches.length === 0) {
            this.showEmpty();
            return;
        }

        // Atualiza contador ao vivo
        const liveMatches = matches.filter(m => 
            m.fixture.status.short === '1H' || 
            m.fixture.status.short === '2H' || 
            m.fixture.status.short === 'HT' ||
            m.fixture.status.short === 'ET'
        );
        if (this.liveCount) this.liveCount.textContent = liveMatches.length;

        // Agrupa por liga
        const grouped = matches.reduce((acc, match) => {
            const leagueName = match.league.name;
            if (!acc[leagueName]) {
                acc[leagueName] = [];
            }
            acc[leagueName].push(match);
            return acc;
        }, {});

        // Renderiza cada grupo
        Object.entries(grouped).forEach(([leagueName, leagueMatches]) => {
            const section = document.createElement('div');
            section.className = 'league-section';
            section.style.marginBottom = '30px';
            
            section.innerHTML = `
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 15px;
                    padding: 10px 0;
                    border-bottom: 2px solid rgba(108, 92, 231, 0.3);
                ">
                    <span style="color: var(--primary); font-weight: bold; font-size: 1.1em;">
                        ${leagueName}
                    </span>
                    <span style="
                        background: rgba(108, 92, 231, 0.2);
                        padding: 2px 10px;
                        border-radius: 10px;
                        font-size: 0.8em;
                    ">${leagueMatches.length} jogos</span>
                </div>
            `;

            leagueMatches.forEach(match => {
                section.appendChild(this.createMatchCard(match));
            });

            this.container.appendChild(section);
        });

        this.emptyState.style.display = 'none';
    }

    createMatchCard(match) {
        const isLive = ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(match.fixture.status.short);
        
        const card = document.createElement('div');
        card.className = `match-card ${isLive ? 'live' : ''}`;
        
        const matchDate = new Date(match.fixture.date);
        const timeStr = matchDate.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo' 
        });

        const homeFav = favorites.isTeamFavorite(match.teams.home.id);
        const awayFav = favorites.isTeamFavorite(match.teams.away.id);
        const isFavorite = homeFav || awayFav;

        card.innerHTML = `
            <div class="card-header">
                <div class="league-info">
                    ${match.league.logo ? `<img src="${match.league.logo}" alt="${match.league.name}">` : '<i class="fas fa-trophy"></i>'}
                    <span class="league-name">${match.league.name}</span>
                    ${match.league.round ? `<span style="font-size:0.8em;color:var(--text-secondary);">- ${match.league.round}</span>` : ''}
                </div>
                <span class="match-status ${isLive ? 'status-live' : (match.goals.home !== null ? 'status-finished' : 'status-scheduled')}">
                    ${isLive ? '🔴 AO VIVO' : (match.goals.home !== null ? 'Finalizado' : 'Agendado')}
                </span>
            </div>

            <div class="match-content">
                <div class="team">
                    <img src="${match.teams.home.logo}" alt="${match.teams.home.name}" class="team-logo">
                    <div class="team-name">${match.teams.home.name}</div>
                </div>

                <div class="score">
                    ${match.goals.home !== null ? 
                        `${match.goals.home} - ${match.goals.away}` : 
                        '<span class="score-vs">VS</span>'}
                </div>

                <div class="team">
                    <img src="${match.teams.away.logo}" alt="${match.teams.away.name}" class="team-logo">
                    <div class="team-name">${match.teams.away.name}</div>
                </div>
            </div>

            <div class="card-footer">
                <div class="match-time">
                    <i class="far fa-calendar-alt"></i>
                    <span>${matchDate.toLocaleDateString('pt-BR')} às ${timeStr}</span>
                </div>
                <div style="display:flex;gap:10px;">
                    <button class="favorite-btn ${homeFav ? 'active' : ''}" 
                            onclick="quickToggleFavorite(event, ${match.teams.home.id}, this)" 
                            title="Favoritar time da casa">
                        <i class="fas fa-home"></i> <i class="fas fa-star"></i>
                    </button>
                    <button class="favorite-btn ${awayFav ? 'active' : ''}" 
                            onclick="quickToggleFavorite(event, ${match.teams.away.id}, this)" 
                            title="Favoritar time visitante">
                        <i class="fas fa-plane"></i> <i class="fas fa-star"></i>
                    </button>
                </div>
            </div>

            ${match.fixture.venue?.name ? `
                <div style="text-align:center;margin-top:10px;color:var(--text-secondary);font-size:0.85em;">
                    🏟️ ${match.fixture.venue.name}${match.fixture.venue.city ? ` - ${match.fixture.venue.city}` : ''}
                </div>
            ` : ''}
        `;

        return card;
    }
}

// ============================================
// FUNÇÕES GLOBAIS
// ============================================
function quickToggleFavorite(event, teamId, button) {
    event.stopPropagation();
    const isFav = favorites.toggleTeam(teamId);
    
    if (isFav) {
        button.classList.add('active');
    } else {
        button.classList.remove('active');
    }
    
    // Recarrega se necessário
    if (ui.currentTab === 'favoritos') {
        app.loadMatches();
    }
}

// ============================================
// APLICAÇÃO PRINCIPAL
// ============================================
class App {
    constructor() {
        this.currentDate = new Date().toISOString().split('T')[0];
        this.periodoInicial = null;
        this.periodoFinal = null;
        
        // Define data atual nos inputs
        const dataInicial = document.getElementById('dataInicial');
        const dataFinal = document.getElementById('dataFinal');
        
        if (dataInicial) dataInicial.value = this.currentDate;
        if (dataFinal) dataFinal.value = this.currentDate;

        this.autoRefreshInterval = null;
    }

    async init() {
        await this.loadMatches();
        this.startAutoRefresh();
    }

    async loadMatches() {
    try {
        ui.showLoading();
        
        let matches = [];
        
        switch(ui.currentTab) {
            case 'ao-vivo':
                matches = await api.getLiveMatches();
                break;
                
            case 'hoje':
                // Se tem período definido, usa ele
                if (this.periodoInicial && this.periodoFinal) {
                    matches = await this.loadMatchesInPeriod(this.periodoInicial, this.periodoFinal);
                } else {
                    matches = await api.getMatchesByDate(this.currentDate);
                }
                break;
                
            case 'proximos':
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const dayAfter = new Date();
                dayAfter.setDate(dayAfter.getDate() + 7);
                matches = await this.loadMatchesInPeriod(
                    tomorrow.toISOString().split('T')[0],
                    dayAfter.toISOString().split('T')[0]
                );
                break;
                
            case 'favoritos':
                if (this.periodoInicial && this.periodoFinal) {
                    matches = await this.loadMatchesInPeriod(this.periodoInicial, this.periodoFinal);
                } else {
                    matches = await api.getMatchesByDate(this.currentDate);
                }
                matches = favorites.getFavoriteMatches(matches);
                break;
                
            default:
                matches = await api.getLiveMatches();
        }

        ui.allMatches = matches;
        ui.filterAndRender();

    } catch (error) {
        console.error('Error:', error);
        ui.showError(error.message || 'Erro ao carregar jogos');
    } finally {
        ui.hideLoading();
    }
}

// Novo método para carregar por período
// Novo método para carregar por período (CORRIGIDO)
async loadMatchesInPeriod(dataInicial, dataFinal) {
    try {
        const start = new Date(dataInicial + 'T00:00:00');
        const end = new Date(dataFinal + 'T23:59:59');
        const allMatches = [];
        
        // Calcula a diferença em dias
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Limita a 30 dias para não sobrecarregar a API
        if (diffDays > 30) {
            throw new Error('Período máximo é de 30 dias');
        }
        
        // Busca dia a dia no período
        let currentDate = new Date(start);
        for (let i = 0; i <= diffDays; i++) {
            const dateStr = currentDate.toISOString().split('T')[0];
            
            try {
                const dayMatches = await api.getMatchesByDate(dateStr);
                if (dayMatches && dayMatches.length > 0) {
                    allMatches.push(...dayMatches);
                }
            } catch (error) {
                console.warn(`Erro ao buscar data ${dateStr}:`, error);
                // Continua mesmo com erro em um dia específico
            }
            
            // Avança um dia
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return allMatches;
        
    } catch (error) {
        console.error('Erro ao carregar período:', error);
        throw error;
    }
}

    async loadMatchesByDate(date) {
        this.currentDate = date;
        ui.currentTab = 'hoje';
        
        // Atualiza visual das tabs
        ui.tabs.forEach(t => t.classList.remove('active'));
        const hojeTab = document.querySelector('[data-tab="hoje"]');
        if (hojeTab) hojeTab.classList.add('active');
        
        await this.loadMatches();
    }

    startAutoRefresh() {
        // Limpa intervalo anterior
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }

        // Atualiza a cada 60 segundos
        this.autoRefreshInterval = setInterval(() => {
            if (ui.currentTab === 'ao-vivo') {
                this.loadMatches();
            }
        }, 60000);
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
    }
}

// ============================================
// FUNÇÕES DE PERÍODO
// ============================================

function aplicarFiltroPeriodo() {
    const dataInicial = document.getElementById('dataInicial').value;
    const dataFinal = document.getElementById('dataFinal').value;
    
    if (!dataInicial || !dataFinal) {
        alert('⚠️ Selecione as datas inicial e final');
        return;
    }
    
    if (dataInicial > dataFinal) {
        alert('⚠️ A data inicial deve ser menor que a data final');
        return;
    }
    
    // Salva o período na aplicação
    app.periodoInicial = dataInicial;
    app.periodoFinal = dataFinal;
    app.currentDate = null;
    
    // Muda para tab 'hoje' (que agora respeita o período)
    ui.switchTab('hoje');
    
    // Remove active dos botões de período rápido
    document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
    
    // Carrega os jogos
    app.loadMatches();
}

function filtrarPeriodo(periodo, event) {
    const hoje = new Date();
    let dataInicial, dataFinal;
    
    switch(periodo) {
        case 'hoje':
            dataInicial = hoje.toISOString().split('T')[0];
            dataFinal = hoje.toISOString().split('T')[0];
            break;
        case 'semana':
            const diaSemana = hoje.getDay() || 7; // Domingo = 7
            dataInicial = new Date(hoje);
            dataInicial.setDate(hoje.getDate() - diaSemana + 1);
            dataInicial = dataInicial.toISOString().split('T')[0];
            
            dataFinal = new Date(hoje);
            dataFinal.setDate(hoje.getDate() + (7 - diaSemana));
            dataFinal = dataFinal.toISOString().split('T')[0];
            break;
        case 'mes':
            dataInicial = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
            dataFinal = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
            break;
        case 'fim-semana':
            const dia = hoje.getDay();
            const diasAteSabado = dia === 6 ? 0 : (6 - dia);
            dataInicial = new Date(hoje);
            dataInicial.setDate(hoje.getDate() + diasAteSabado);
            dataInicial = dataInicial.toISOString().split('T')[0];
            
            dataFinal = new Date(dataInicial);
            dataFinal.setDate(dataFinal.getDate() + 1);
            dataFinal = dataFinal.toISOString().split('T')[0];
            break;
        default:
            dataInicial = hoje.toISOString().split('T')[0];
            dataFinal = hoje.toISOString().split('T')[0];
    }
    
    document.getElementById('dataInicial').value = dataInicial;
    document.getElementById('dataFinal').value = dataFinal;
    
    app.periodoInicial = dataInicial;
    app.periodoFinal = dataFinal;
    app.currentDate = null;
    
    // Corrigido: usa o event como parâmetro
    if (event) {
        document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
        event.target.closest('.period-btn').classList.add('active');
    }
    
    ui.switchTab('hoje');
    app.loadMatches();
}

// ============================================
// INICIALIZAÇÃO
// ============================================

// Instâncias globais
const favorites = new FavoritesManager();
const api = new FootballAPI();
const ui = new UI();
const app = new App();

// Inicia a aplicação quando a página carregar
window.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Função global para atualizar manualmente
function atualizarJogos() {
    app.loadMatches();
}
