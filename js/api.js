class FootballAPI {
    constructor() {
        this.baseURL = CONFIG.API_URL;
        this.apiKey = CONFIG.API_KEY;
        this.cache = new Map();
        this.cacheTimeout = 60000; // 1 minuto
    }

    async fetchWithCache(endpoint, params = {}) {
        const cacheKey = `${endpoint}?${new URLSearchParams(params)}`;
        
        // Verifica cache
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
            
            // Salva no cache
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

    async getLeagues() {
        return this.fetchWithCache('leagues');
    }

    async getMatchDetails(fixtureId) {
        return this.fetchWithCache('fixtures', {
            id: fixtureId
        });
    }

    async getTeamStatistics(teamId, leagueId, season) {
        return this.fetchWithCache('teams/statistics', {
            team: teamId,
            league: leagueId,
            season: season || new Date().getFullYear()
        });
    }
}

// Instância global
const api = new FootballAPI();
