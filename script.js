// ============================================
// DADOS DA API ABERTA
// ============================================
const OPEN_DATA_URL = 'https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/br.1.json'; // Dados do Brasileirão 2024-25 [citation:1]

// ============================================
// CLASSE DA API (Totalmente Gratuita e Aberta)
// ============================================
class FootballAPI {
    async fetchData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro na requisição:', error);
            throw error;
        }
    }

    async getAllMatches() {
        const data = await this.fetchData(OPEN_DATA_URL);
        // A estrutura do JSON tem uma chave "matches" com um array de jogos [citation:1]
        return data.matches || [];
    }
}

// ============================================
// CLASSE DA INTERFACE (Mantida com poucas alterações)
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
        this.matchesFromAPI = [];
        this.displayedMatches = [];
        
        this.initEvents();
    }

    initEvents() {
        this.searchInput.addEventListener('input', () => this.filterAndRender());
        this.leagueSelect.addEventListener('change', () => this.filterAndRender());
        
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.currentTab = tab.dataset.tab;
                this.tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.loadData(); // Carrega os dados para a tab
            });
        });

        window.addEventListener('scroll', () => {
            const fab = document.querySelector('.fab');
            if (fab) fab.style.display = window.scrollY > 300 ? 'block' : 'none';
        });
    }

    showLoading() {
        this.loading.style.display = 'block';
        this.container.innerHTML = '';
        this.emptyState.style.display = 'none';
    }

    hideLoading() {
        this.loading.style.display = 'none';
    }

    showError(message) {
        this.container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle" style="color: #ff7675; font-size: 3em;"></i><h3>Erro</h3><p>${message}</p><button onclick="atualizarJogos()" style="margin-top:15px;padding:10px 20px;background:var(--primary);border:none;border-radius:10px;color:white;cursor:pointer;">Tentar Novamente</button></div>`;
    }

    showEmpty() {
        this.emptyState.style.display = 'block';
        this.container.innerHTML = '';
    }

    // Carrega e processa os dados de acordo com a tab
    async loadData() {
        this.showLoading();
        try {
            this.matchesFromAPI = await api.getAllMatches();
            this.applyTabFilter();
            this.filterAndRender();
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    // Filtra os jogos com base na tab selecionada
    applyTabFilter() {
        const hoje = new Date().toISOString().split('T')[0];
        switch (this.currentTab) {
            case 'ao-vivo':
                // Como são dados estáticos, "Ao Vivo" pode mostrar os jogos de hoje
                this.displayedMatches = this.matchesFromAPI.filter(m => m.date === hoje);
                break;
            case 'hoje':
                const dataInput = document.getElementById('dataFiltro').value;
                const dataParaFiltrar = dataInput || hoje;
                this.displayedMatches = this.matchesFromAPI.filter(m => m.date === dataParaFiltrar);
                break;
            case 'favoritos':
                this.displayedMatches = this.matchesFromAPI; // Favoritos precisa de mais lógica, não será implementado agora
                break;
            default:
                this.displayedMatches = [...this.matchesFromAPI];
        }
    }

    // Aplica filtros de busca e liga
    filterAndRender() {
        let filtered = [...this.displayedMatches];
        
        const search = this.searchInput.value.toLowerCase();
        if (search) {
            filtered = filtered.filter(m => 
                m.team1.name.toLowerCase().includes(search) ||
                m.team2.name.toLowerCase().includes(search)
            );
        }

        const leagueId = this.leagueSelect.value;
        if (leagueId) {
            filtered = filtered.filter(m => m.league_id == leagueId); // Adapte conforme a estrutura
        }

        this.renderMatches(filtered);
    }

    renderMatches(matches) {
        this.container.innerHTML = '';
        
        if (!matches || matches.length === 0) {
            this.showEmpty();
            return;
        }

        this.liveCount.textContent = '0'; // Dados estáticos não possuem status ao vivo

        const section = document.createElement('div');
        section.innerHTML = `<h3 style="color:var(--primary);margin-bottom:10px;">Jogos Encontrados (${matches.length})</h3>`;
        
        matches.forEach(m => {
            section.appendChild(this.createCard(m));
        });
        
        this.container.appendChild(section);
        this.emptyState.style.display = 'none';
    }

    createCard(match) {
        // Adapte os campos conforme a estrutura do JSON do Open Football Data [citation:1]
        const date = match.date || 'Data não informada';
        const time = match.time || '00:00';
        const team1 = match.team1?.name || match.team1;
        const team2 = match.team2?.name || match.team2;
        const score = match.score ? `${match.score.ft[0]} - ${match.score.ft[1]}` : 'VS';
        const round = match.round || '';
        
        const card = document.createElement('div');
        card.className = 'match-card';
        card.innerHTML = `
            <div class="card-header">
                <div class="league-info">
                    <span class="league-name">${round ? round : ''}</span>
                </div>
                <span class="match-status status-scheduled">Agendado</span>
            </div>
            <div class="match-content">
                <div class="team">
                    <div class="team-name">${team1}</div>
                </div>
                <div class="score">${score}</div>
                <div class="team">
                    <div class="team-name">${team2}</div>
                </div>
            </div>
            <div class="card-footer">
                <span><i class="far fa-calendar-alt"></i> ${date} às ${time}</span>
            </div>
        `;
        return card;
    }
}

// ============================================
// APLICAÇÃO PRINCIPAL
// ============================================
class App {
    constructor() {
        this.currentDate = new Date().toISOString().split('T')[0];
        document.getElementById('dataFiltro').value = this.currentDate;
    }

    init() {
        ui.loadData(); // Inicia o carregamento dos dados
    }
}

// ============================================
// FUNÇÕES GLOBAIS
// ============================================
const api = new FootballAPI();
const ui = new UI();
const app = new App();

window.addEventListener('DOMContentLoaded', () => app.init());

function atualizarJogos() { ui.loadData(); }

function buscarPorData() {
    const data = document.getElementById('dataFiltro').value;
    if (data) {
        app.currentDate = data;
        ui.tabs.forEach(t => t.classList.remove('active'));
        document.querySelector('[data-tab="hoje"]').classList.add('active');
        ui.currentTab = 'hoje';
        ui.loadData();
    }
}

function buscarHoje() {
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('dataFiltro').value = hoje;
    app.currentDate = hoje;
    ui.tabs.forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="hoje"]').classList.add('active');
    ui.currentTab = 'hoje';
    ui.loadData();
}
