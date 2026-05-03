class App {
    constructor() {
        this.currentMatches = [];
        this.autoRefreshInterval = null;
        
        this.init();
    }

    async init() {
        await this.loadMatches();
        this.startAutoRefresh();
        this.loadLeagues();
    }

    async loadMatches() {
        try {
            ui.showLoading();
            
            const today = new Date().toISOString().split('T')[0];
            
            switch(ui.currentTab) {
                case 'ao-vivo':
                    this.currentMatches = await api.getLiveMatches();
                    break;
                case 'hoje':
                    this.currentMatches = await api.getMatchesByDate(today);
                    break;
                case 'proximos':
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    this.currentMatches = await api.getMatchesByDate(tomorrow.toISOString().split('T')[0]);
                    break;
                case 'favoritos':
                    const allMatches = await api.getMatchesByDate(today);
                    this.currentMatches = favorites.getFavoriteMatches(allMatches);
                    break;
                default:
                    this.currentMatches = await api.getLiveMatches();
            }

            ui.renderMatches(this.currentMatches);
        } catch (error) {
            console.error('Error loading matches:', error);
            ui.showEmpty('Erro ao carregar jogos. Tente novamente.');
        } finally {
            ui.hideLoading();
        }
    }

    startAutoRefresh() {
        // Atualiza a cada 60 segundos se estiver na aba ao vivo
        this.autoRefreshInterval = setInterval(() => {
            if (ui.currentTab === 'ao-vivo') {
                this.loadMatches();
            }
        }, 60000);
    }

    async loadLeagues() {
        try {
            const leagues = await api.getLeagues();
            const select = document.getElementById('leagueSelect');
            
            leagues.forEach(league => {
                const option = document.createElement('option');
                option.value = league.league.id;
                option.textContent = league.league.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading leagues:', error);
        }
    }
}

// Inicializa a aplicação
const app = new App();

// Função global para atualizar
function atualizarJogos() {
    app.loadMatches();
}
