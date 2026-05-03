// Verifica se a configuração existe
if (typeof CONFIG === 'undefined' || !CONFIG.API_KEY || CONFIG.API_KEY === 'sua_chave_api_aqui') {
    document.getElementById('erro').style.display = 'block';
    document.getElementById('erro').innerHTML = `
        <h3>⚠️ Configuração necessária</h3>
        <p>Crie o arquivo <strong>config.js</strong> com sua chave da API:</p>
        <pre style="background:#0f172a;padding:10px;border-radius:5px;margin:10px 0;">
const CONFIG = {
    API_KEY: 'sua_chave_api_aqui',
    API_URL: 'https://v3.football.api-sports.io'
};</pre>
        <p>Obtenha sua chave gratuita em: <a href="https://www.api-football.com/" target="_blank" style="color:#60a5fa;">api-football.com</a></p>
    `;
    document.getElementById('loading').style.display = 'none';
}

// Inicialização
const hoje = new Date().toISOString().split('T')[0];
document.getElementById('dataFiltro').value = hoje;

// Carrega jogos de hoje automaticamente
window.addEventListener('DOMContentLoaded', () => {
    if (typeof CONFIG !== 'undefined' && CONFIG.API_KEY && CONFIG.API_KEY !== 'sua_chave_api_aqui') {
        buscarJogosHoje();
    }
});

// Função principal de busca
async function buscarJogos(data) {
    const container = document.getElementById('jogosContainer');
    const loading = document.getElementById('loading');
    const totalJogos = document.getElementById('totalJogos');
    const erro = document.getElementById('erro');
    
    // Mostra loading
    loading.style.display = 'block';
    container.innerHTML = '';
    erro.style.display = 'none';
    totalJogos.style.display = 'none';

    try {
        const response = await fetch(
            `${CONFIG.API_URL}/fixtures?date=${data}&timezone=America/Sao_Paulo`,
            {
                headers: {
                    'x-apisports-key': CONFIG.API_KEY
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const dados = await response.json();
        
        if (dados.errors && Object.keys(dados.errors).length > 0) {
            throw new Error('Erro na API: Verifique sua chave ou limite de requisições');
        }

        const jogosProcessados = processarJogos(dados.response, data);
        exibirJogos(jogosProcessados);
        
    } catch (erro) {
        console.error('Erro:', erro);
        erro.style.display = 'block';
        erro.innerHTML = `
            <h3>😕 Erro ao carregar jogos</h3>
            <p>${erro.message}</p>
            <p style="margin-top:10px;font-size:0.9em;">
                Isso pode ocorrer devido à chave API inválida ou limite de requisições excedido.
            </p>
        `;
    } finally {
        loading.style.display = 'none';
    }
}

// Processa os dados da API
function processarJogos(jogos, dataConsulta) {
    if (!jogos || jogos.length === 0) {
        return {
            data_consulta: dataConsulta,
            total_jogos: 0,
            jogos: [],
            jogosPorCampeonato: {}
        };
    }

    const jogosProcessados = jogos.map(jogo => ({
        id: jogo.fixture.id,
        campeonato: {
            id: jogo.league.id,
            nome: jogo.league.name,
            pais: jogo.league.country,
            logo: jogo.league.logo,
            rodada: jogo.league.round
        },
        data: jogo.fixture.date,
        horario: new Date(jogo.fixture.date).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo'
        }),
        status: traduzirStatus(jogo.fixture.status.long),
        timeCasa: {
            id: jogo.teams.home.id,
            nome: jogo.teams.home.name,
            logo: jogo.teams.home.logo,
            gols: jogo.goals.home
        },
        timeVisitante: {
            id: jogo.teams.away.id,
            nome: jogo.teams.away.name,
            logo: jogo.teams.away.logo,
            gols: jogo.goals.away
        },
        placar: jogo.goals.home !== null ? `${jogo.goals.home} x ${jogo.goals.away}` : null,
        estadio: jogo.fixture.venue?.name || 'Não informado',
        cidade: jogo.fixture.venue?.city || ''
    }));

    // Agrupa por campeonato
    const jogosPorCampeonato = jogosProcessados.reduce((acc, jogo) => {
        const chave = `${jogo.campeonato.nome} (${jogo.campeonato.pais})`;
        if (!acc[chave]) {
            acc[chave] = [];
        }
        acc[chave].push(jogo);
        return acc;
    }, {});

    return {
        data_consulta: dataConsulta,
        total_jogos: jogosProcessados.length,
        jogos: jogosProcessados,
        jogosPorCampeonato
    };
}

// Traduz status dos jogos
function traduzirStatus(status) {
    const traducoes = {
        'Match Finished': 'Finalizado',
        'Not Started': 'Agendado',
        'First Half': '1º Tempo',
        'Second Half': '2º Tempo',
        'Half Time': 'Intervalo',
        'Extra Time': 'Prorrogação',
        'Penalty In Progress': 'Pênaltis',
        'Match Suspended': 'Suspenso',
        'Match Interrupted': 'Interrompido',
        'Match Postponed': 'Adiado',
        'Match Cancelled': 'Cancelado',
        'Technical Loss': 'Derrota Técnica',
        'Walkover': 'W.O.'
    };
    return traducoes[status] || status;
}

// Exibe os jogos na tela
function exibirJogos(dados) {
    const container = document.getElementById('jogosContainer');
    const totalJogos = document.getElementById('totalJogos');

    if (dados.total_jogos === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:#94a3b8;">
                <h3>📅 Nenhum jogo encontrado para ${formatarData(dados.data_consulta)}</h3>
                <p style="margin-top:10px;">Tente outra data ou verifique as ligas disponíveis.</p>
            </div>
        `;
        totalJogos.style.display = 'none';
        return;
    }

    // Exibe total
    totalJogos.style.display = 'block';
    totalJogos.innerHTML = `📊 <strong>${dados.total_jogos} jogo(s)</strong> encontrado(s) em ${formatarData(dados.data_consulta)}`;

    // Renderiza por campeonato
    let html = '';
    for (const [nomeCampeonato, jogos] of Object.entries(dados.jogosPorCampeonato)) {
        // Cabeçalho do campeonato
        html += `
            <div style="margin-bottom:30px;">
                <h2 style="color:#60a5fa;margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid #334155;">
                    ${jogos[0].campeonato.logo ? `<img src="${jogos[0].campeonato.logo}" style="width:25px;vertical-align:middle;margin-right:10px;">` : ''}
                    ${nomeCampeonato}
                </h2>
        `;

        // Cards dos jogos
        jogos.forEach(jogo => {
            const statusClass = getStatusClass(jogo.status);
            html += `
                <div class="jogo-card">
                    <div class="campeonato-header">
                        <span class="campeonato-nome">${jogo.campeonato.nome}</span>
                        <span class="campeonato-pais">${jogo.campeonato.pais}</span>
                        <span class="rodada">${jogo.campeonato.rodada || 'Rodada não informada'}</span>
                    </div>
                    
                    <div class="placar-container">
                        <div class="time">
                            ${jogo.timeCasa.logo ? `<img src="${jogo.timeCasa.logo}" alt="${jogo.timeCasa.nome}" class="time-logo">` : ''}
                            <div class="time-nome">${jogo.timeCasa.nome}</div>
                        </div>
                        
                        <div class="placar ${!jogo.placar ? 'placar-vs' : ''}">
                            ${jogo.placar || 'VS'}
                        </div>
                        
                        <div class="time">
                            ${jogo.timeVisitante.logo ? `<img src="${jogo.timeVisitante.logo}" alt="${jogo.timeVisitante.nome}" class="time-logo">` : ''}
                            <div class="time-nome">${jogo.timeVisitante.nome}</div>
                        </div>
                    </div>
                    
                    <div class="info-jogo">
                        <span class="status-jogo ${statusClass}">${jogo.status}</span>
                        <div class="info-data">
                            📅 ${formatarDataHora(jogo.data)} às ${jogo.horario}
                        </div>
                        <div class="info-local">
                            🏟️ ${jogo.estadio}${jogo.cidade ? ` - ${jogo.cidade}` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
    }

    container.innerHTML = html;
}

// Funções auxiliares
function getStatusClass(status) {
    if (status.includes('Tempo') || status.includes('Intervalo') || status.includes('Prorrogação') || status.includes('Pênaltis')) return 'status-ao-vivo';
    if (status.includes('Finalizado')) return 'status-finalizado';
    return 'status-agendado';
}

function formatarData(data) {
    if (!data) return '';
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(dataString) {
    if (!dataString) return '';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo'
    });
}

// Funções dos botões
function buscarJogosPorData() {
    const data = document.getElementById('dataFiltro').value;
    if (data) {
        buscarJogos(data);
    }
}

function buscarJogosHoje() {
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('dataFiltro').value = hoje;
    buscarJogos(hoje);
}

function buscarJogosOntem() {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const data = ontem.toISOString().split('T')[0];
    document.getElementById('dataFiltro').value = data;
    buscarJogos(data);
}

function buscarJogosAmanha() {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const data = amanha.toISOString().split('T')[0];
    document.getElementById('dataFiltro').value = data;
    buscarJogos(data);
}
