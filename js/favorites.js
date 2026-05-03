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
        return index === -1; // Retorna true se foi adicionado
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

// Instância global
const favorites = new FavoritesManager();
