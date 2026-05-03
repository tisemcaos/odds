require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_FOOTBALL_KEY;

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// Rota para buscar jogos por data
app.get('/api/jogos/:data?', async (req, res) => {
    try {
        let data = req.params.data;
        
        // Se não informar data, usa a data atual
        if (!data) {
            const hoje = new Date();
            data = hoje.toISOString().split('T')[0];
        }

        const response = await fetch(
            `https://v3.football.api-sports.io/fixtures?date=${data}`,
            {
                headers: {
                    'x-apisports-key': API_KEY
                }
            }
        );

        const dados = await response.json();
        
        // Organiza os dados
        const jogosOrganizados = dados.response.map(jogo => ({
            id: jogo.fixture.id,
            campeonato: {
                nome: jogo.league.name,
                pais: jogo.league.country,
                logo: jogo.league.logo,
                rodada: jogo.league.round
            },
            data: jogo.fixture.date,
            horario: new Date(jogo.fixture.date).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            status: jogo.fixture.status.long,
            timeCasa: {
                nome: jogo.teams.home.name,
                logo: jogo.teams.home.logo,
                gols: jogo.goals.home
            },
            timeVisitante: {
                nome: jogo.teams.away.name,
                logo: jogo.teams.away.logo,
                gols: jogo.goals.away
            },
            placar: `${jogo.goals.home} x ${jogo.goals.away}`,
            estadio: jogo.fixture.venue.name,
            cidade: jogo.fixture.venue.city
        }));

        res.json({
            sucesso: true,
            data_consulta: data,
            total_jogos: jogosOrganizados.length,
            jogos: jogosOrganizados
        });

    } catch (erro) {
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao buscar dados da API',
            erro: erro.message
        });
    }
});

// Rota para buscar campeonatos disponíveis
app.get('/api/campeonatos', async (req, res) => {
    try {
        const response = await fetch(
            'https://v3.football.api-sports.io/leagues?country=Brazil',
            {
                headers: {
                    'x-apisports-key': API_KEY
                }
            }
        );

        const dados = await response.json();
        
        const campeonatos = dados.response.map(liga => ({
            id: liga.league.id,
            nome: liga.league.name,
            logo: liga.league.logo
        }));

        res.json({
            sucesso: true,
            campeonatos
        });

    } catch (erro) {
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao buscar campeonatos'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
