class UI {
    constructor() {
        this.container = document.getElementById('jogosContainer');
        this.loading = document.getElementById('loadingSkeleton');
        this.emptyState = document.getElementById('emptyState');
        this.liveCount = document.getElementById('liveCount');
        this.searchInput = document.getElementById('searchInput');
        this.tabs = document.querySelectorAll('.tab');
        this.currentTab = 'ao-vivo';
        
        this.init();
    }

    init() {
        // Event listeners
        this.searchInput.addEventListener('input', () => this.filterMatches());
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Scroll listener para FAB
        window.addEventListener('scroll', () => {
            const fab = document.querySelector('.fab');
            if (window.scrollY > 300) {
                fab.style.display = 'block';
            } else {
                fab.style.display = 'none';
            }
        });
    }

    switchTab(tab) {
        this.currentTab = tab;
        this.tabs.forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        // Atualiza visualização
        if (typeof app !== 'undefined') {
            app.loadMatches();
        }
    }

    showLoading() {
        this.loading.style.display = 'block';
        this.container.innerHTML = '';
        this.emptyState.style.display = 'none';
    }

    hideLoading() {
        this.loading.style.display = 'none';
    }

    showEmpty(message = 'Nenhum jogo encontrado') {
        this.emptyState.querySelector('h3').textContent = message;
        this.emptyState.style.display = 'block';
    }

    renderMatchCard(match) {
        const isLive = match.fixture.status.short.includes('1H') || 
                       match.fixture.status.short.includes('2H') ||
                       match.fixture.status.short === 'HT';
        
        const isFavorite = favorites.isTeamFavorite(match.teams.home.id) || 
                          favorites.isTeamFavorite(match.teams.away.id);

        const card = document.createElement('div');
        card.className = `match-card ${isLive ? 'live' : ''} ${isFavorite ? 'favorite' : ''}`;
        card.dataset.matchId = match.fixture.id;

        const matchDate = new Date(match.fixture.date);
        const timeStr = matchDate.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo' 
        });

        card.innerHTML = `
            <div class="card-header">
                <div class="league-info">
                    ${match.league.logo ? `<img src="${match.league.logo}" alt="${match.league.name}">` : ''}
                    <span class="league-name">${match.league.name}</span>
                </div>
                <span class="match-status ${isLive ? 'status-live' : 'status-scheduled'}">
                    ${isLive ? '🔴 AO VIVO' : 'Agendado'}
                </span>
            </div>

            <div class="match-content">
                <div class="team">
                    <img src="${match.teams.home.logo}" alt="${match.teams.home.name}" class="team-logo">
                    <div class="team-name">${match.teams.home.name}</div>
                </div>

                <div class="score">
                    ${isLive || match.goals.home !== null ? 
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
                    <i class="far fa-clock"></i>
                    <span>${timeStr}</span>
                </div>
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                        onclick="event.stopPropagation(); toggleMatchFavorite(this, ${match.teams.home.id}, ${match.teams.away.id})">
                    <i class="fas fa-star"></i>
                </button>
            </div>
        `;

        // Click para abrir modal
        card.addEventListener('click', () => this.openMatchModal(match));

        return card;
    }

    renderMatches(matches) {
        this.container.innerHTML = '';
        
        if (!matches || matches.length === 0) {
            this.showEmpty();
            return;
        }

        // Atualiza contador ao vivo
        const liveMatches = matches.filter(m => 
            m.fixture.status.short.includes('1H') || 
            m.fixture.status.short.includes('2H') || 
            m.fixture.status.short === 'HT'
        );
        this.liveCount.textContent = liveMatches.length;

        // Filtra por busca
        const searchTerm = this.searchInput.value.toLowerCase();
        const filteredMatches = searchTerm ? 
            matches.filter(m => 
                m.teams.home.name.toLowerCase().includes(searchTerm) ||
                m.teams.away.name.toLowerCase().includes(searchTerm) ||
                m.league.name.toLowerCase().includes(searchTerm)
            ) : matches;

        if (filteredMatches.length === 0) {
            this.showEmpty('Nenhum resultado para sua busca');
            return;
        }

        // Agrupa por liga
        const grouped = this.groupByLeague(filteredMatches);
        
        Object.entries(grouped).forEach(([leagueName, leagueMatches]) => {
            const leagueSection = document.createElement('div');
            leagueSection.className = 'league-section';
            leagueSection.innerHTML = `
                <div class="league-section-header">
                    <h3>${leagueName}</h3>
                    <span>${leagueMatches.length} jogos</span>
                </div>
            `;
            
            leagueMatches.forEach(match => {
                leagueSection.appendChild(this.renderMatchCard(match));
            });
            
            this.container.appendChild(leagueSection);
        });
    }

    groupByLeague(matches) {
        return matches.reduce((acc, match) => {
            const leagueName = match.league.name;
            if (!acc[leagueName]) {
                acc[leagueName] = [];
            }
            acc[leagueName].push(match);
            return acc;
        }, {});
    }

    filterMatches() {
        if (typeof app !== 'undefined' && app.currentMatches) {
            this.renderMatches(app.currentMatches);
        }
    }

    async openMatchModal(match) {
        const modal = document.getElementById('matchModal');
        const modalContent = document.getElementById('modalContent');
        
        modal.style.display = 'block';
        modalContent.innerHTML = `
            <div style="text-align:center">
                <h2>${match.teams.home.name} vs ${match.teams.away.name}</h2>
                <p>${match.league.name} - ${match.league.round}</p>
                <p>Estádio: ${match.fixture.venue.name || 'N/D'}</p>
                <p>Cidade: ${match.fixture.venue.city || 'N/D'}</p>
            </div>
        `;

        // Fechar modal
        document.querySelector('.close').onclick = () => modal.style.display = 'none';
        window.onclick = (event) => {
            if (event.target === modal) modal.style.display = 'none';
        };
    }
}

function toggleMatchFavorite(button, homeId, awayId) {
    const isHomeFav = favorites.toggleTeam(homeId);
    const isAwayFav = favorites.toggleTeam(awayId);
    
    if (isHomeFav || isAwayFav) {
        button.classList.add('active');
    } else {
        button.classList.remove('active');
    }
    
    // Recarrega se estiver na aba favoritos
    if (typeof app !== 'undefined' && document.querySelector('.tab.active').dataset.tab === 'favoritos') {
        app.loadMatches();
    }
}

// Instância global
const ui = new UI();
