'use strict';
/* ============================================================
   Sistema de Sorteio de Cupons - Backend
   Versao 2.0
   Node.js puro. Banco: better-sqlite3 ou node:sqlite.
   ============================================================ */

const http   = require('node:http');
const fs     = require('node:fs');
const path   = require('node:path');
const crypto = require('node:crypto');

function abrirBanco(arquivo) {
  try {
    const Database = require('better-sqlite3');
    console.log('[banco] usando better-sqlite3');
    return new Database(arquivo);
  } catch (e) {
    const { DatabaseSync } = require('node:sqlite');
    console.log('[banco] usando node:sqlite (embutido)');
    return new DatabaseSync(arquivo);
  }
}

/* ====== CONFIGURACOES ======================================= */
const VERSAO       = '2.0.4';
const PORTA        = 3001;
const TOTAL_CUPONS = 100;
const NOME_MARCA   = '';

const PREMIOS = [
  { posicao: 1, emoji: '🥇', rotulo: '1º Prêmio', descricao: 'R$ 1.000,00 na mão' },
  { posicao: 2, emoji: '🥈', rotulo: '2º Prêmio', descricao: '6 meses de um ponto grátis' },
  { posicao: 3, emoji: '🥉', rotulo: '3º Prêmio', descricao: '3 meses de um ponto grátis' }
];
const BONUS = {
  emoji: '🌟', rotulo: 'Bônus',
  descricao: 'R$ 100,00 extras para quem tem mais indicações fechadas'
};
/* ============================================================ */

const DIR    = __dirname;
const DB_DIR = path.join(DIR, 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

/* ====== Senha do admin (arquivo separado) ==================== */
const ARQ_SENHA = path.join(DB_DIR, 'senha-admin.txt');
if (!fs.existsSync(ARQ_SENHA)) {
  fs.writeFileSync(ARQ_SENHA, 'troque-esta-senha\n');
  console.log('[senha] data/senha-admin.txt criado. TROQUE a senha nesse arquivo.');
}
const SENHA_ADMIN = fs.readFileSync(ARQ_SENHA, 'utf8').trim();

const db = abrirBanco(path.join(DB_DIR, 'sorteio.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS cupons (
    numero        INTEGER PRIMARY KEY,
    nome          TEXT NOT NULL,
    telefone      TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS config (
    chave TEXT PRIMARY KEY,
    valor TEXT
  );
  CREATE TABLE IF NOT EXISTS edicoes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    numero       INTEGER NOT NULL,
    encerrada_em TEXT NOT NULL,
    total_cupons INTEGER NOT NULL,
    dados        TEXT NOT NULL
  );
`);

const getConfig = (k) => {
  const r = db.prepare('SELECT valor FROM config WHERE chave=?').get(k);
  return r ? r.valor : null;
};
const setConfig = (k, v) =>
  db.prepare('INSERT INTO config (chave,valor) VALUES (?,?) ' +
             'ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor').run(k, v);

/* ====== Carga inicial (apenas 1 vez, em instalacao nova) =====
   60 cupons da planilha original. Apos arquivar uma edicao a
   grade fica vazia, mas o seed NAO roda de novo (flag seed_feito).
   ============================================================ */
const SEED = [
  [1,'Cleia Maria Maia Brand','9233'],[2,'Angela Cristina Da Silva','4105'],
  [3,'Cleia Maria Maia Brand','9233'],[5,'Flávia Ferreira de Assis Santos','6392'],
  [6,'Fabiana Souza da Silva Nogueira','8105'],[7,'Célia Aparecida Siqueira marciano','4671'],
  [8,'Eliane Freitas Ferreira','1993'],[10,'Sandro de Oliveira Schiavetti','2084'],
  [11,'Adriano de Freitas','6705'],[12,'Wellington Porangaba dos Santos','7200'],
  [13,'Maurice Inacia De Sa Nunes','6792'],[17,'Andréa Regina Da Silva','1141'],
  [18,'Kamila Alves de Oliveira','9935'],[19,'Crislayne Kionara Duarte','3286'],
  [20,'Airton Alves Cunha','8302'],[21,'Laura Jeremias Ferreira','1825'],
  [22,'Renan Radames Loiola Custodio','6100'],[23,'Caio Neves De Mello Vieira','6602'],
  [24,'Julia Oliveira Silva','6635'],[25,'Vanessa Sabino Barreto','4355'],
  [26,'Célia Aparecida Siqueira marciano','4671'],[27,'Janaina Consoni Nascimento','4718'],
  [28,'Ana Celia Coelho','5823'],[29,'Angela Cristina Da Silva','4105'],
  [30,'Angela Cristina Da Silva','4105'],[31,'Weslley Barbosa Gottsfritz','4289'],
  [32,'Fabio Henrique Rezende Goncalves','4943'],[33,'Lyon Alves do Carmo','5490'],
  [35,'Antônio Jorlândio Leite','6940'],[37,'Sandro César Souza Costa','0112'],
  [40,'Andréa Regina Da Silva','1141'],[41,'Viviane Fernanda','7273'],
  [42,'Thiago De Moraes Correa','3247'],[44,'Angela Cristina Da Silva','4105'],
  [47,'Leonardo Luis Lopes','1669'],[49,'Sandro de Oliveira Schiavetti','2084'],
  [50,'Carla Mariano Leandro','3561'],[51,'Suelen Ferreira Barbosa','9597'],
  [53,'Elena Tomio Lima','5424'],[54,'Fábio Antunes','0469'],
  [55,'Leonardo Ferreira de Jesus','2735'],[61,'Adalgisa Lopes Dos Santos','2663'],
  [66,'Noely Bulzico Abibi','1367'],[67,'Maria Silmaria de Lima','7401'],
  [68,'Antonio Rodrigues','8313'],[70,'Raimundo Oliveira Ferreira','5214'],
  [71,'Jhean do Carmo Fernandes','8434'],[72,'Daniela Cristina Marins Pinheiro','5618'],
  [73,'Thiago Prado De Souza','9091'],[74,'Tainara Cluerici','9085'],
  [75,'Danilo dos Santos Reis','0136'],[77,'Elena Tomio Lima','5424'],
  [81,'Kamila Alves de Oliveira','9935'],[82,'Angela Cristina Da Silva','4105'],
  [89,'Andre Ricardo','2382'],[92,'Fabiano Pontes de Souza','7793'],
  [93,'Leonardo Luis Lopes','1669'],[97,'Alessandro Sidney Srbeck','6445'],
  [99,'Andréa Regina Da Silva','1141'],[100,'Regiane Aparecida Siqueira','5593']
];
if (getConfig('seed_feito') !== '1') {
  if (db.prepare('SELECT COUNT(*) c FROM cupons').get().c === 0) {
    const ins = db.prepare(
      'INSERT INTO cupons (numero,nome,telefone,atualizado_em) VALUES (?,?,?,?)');
    const agora = new Date().toISOString();
    for (const [n, nome, tel] of SEED) ins.run(n, nome, tel, agora);
    console.log(`[banco] carga inicial: ${SEED.length} cupons importados.`);
  }
  setConfig('seed_feito', '1');
}

/* ====== Sessoes ============================================== */
const sessoes = new Set();
const primeiroNome = (nome) => String(nome).trim().split(/\s+/)[0] || '';

function lerCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
const autenticado = (req) => {
  const c = lerCookies(req);
  return c.sorteio_sessao && sessoes.has(c.sorteio_sessao);
};
function lerCorpo(req) {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => { d += c; if (d.length > 10240) { d = ''; req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}
function json(res, codigo, dados) {
  res.writeHead(codigo, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.end(JSON.stringify(dados));
}
function html(res, arquivo) {
  fs.readFile(path.join(DIR, 'views', arquivo), (e, conteudo) => {
    if (e) { res.writeHead(404); res.end('Página não encontrada'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(conteudo);
  });
}

/* ====== Logica do sorteio ==================================== */
function infoPremios() {
  return PREMIOS.map((p) => {
    const num = getConfig('premio' + p.posicao);
    let vencedor = null;
    if (num) {
      const c = db.prepare('SELECT numero,nome,telefone FROM cupons WHERE numero=?')
                  .get(Number(num));
      if (c) vencedor = { numero: c.numero, nome: c.nome, telefone: c.telefone };
    }
    return { posicao: p.posicao, emoji: p.emoji, rotulo: p.rotulo,
             descricao: p.descricao, vencedor };
  });
}
function calcularBonus() {
  const linhas = db.prepare('SELECT nome,telefone FROM cupons').all();
  if (linhas.length === 0) return null;
  const cont = new Map();
  for (const l of linhas) {
    const chave = l.nome.trim().toLowerCase();
    if (!cont.has(chave))
      cont.set(chave, { nome: l.nome.trim(), telefone: l.telefone, cupons: 0 });
    cont.get(chave).cupons++;
  }
  let max = 0;
  for (const v of cont.values()) if (v.cupons > max) max = v.cupons;
  return { max, lideres: [...cont.values()].filter((v) => v.cupons === max) };
}
function infoBonus() {
  const base = { emoji: BONUS.emoji, rotulo: BONUS.rotulo,
                 descricao: BONUS.descricao, revelado: false, lideres: [], cupons: 0 };
  if (getConfig('bonus_revelado') === '1') {
    const r = calcularBonus();
    if (r) { base.revelado = true; base.lideres = r.lideres; base.cupons = r.max; }
  }
  return base;
}
const numeroEdicaoAtual = () =>
  db.prepare('SELECT COUNT(*) c FROM edicoes').get().c + 1;

function montarGrade() {
  const linhas = db.prepare('SELECT numero,nome,telefone FROM cupons').all();
  const mapa = new Map(linhas.map((l) => [l.numero, l]));
  const cupons = [];
  for (let n = 1; n <= TOTAL_CUPONS; n++) {
    if (mapa.has(n)) {
      const c = mapa.get(n);
      cupons.push({ n, status: 'ocupado',
                    primeiro: primeiroNome(c.nome), telefone: c.telefone });
    } else {
      cupons.push({ n, status: 'livre' });
    }
  }
  return {
    total: TOTAL_CUPONS, ocupados: linhas.length, livres: TOTAL_CUPONS - linhas.length,
    marca: NOME_MARCA, versao: VERSAO, edicao: numeroEdicaoAtual(),
    premios: PREMIOS,
    bonus: { emoji: BONUS.emoji, rotulo: BONUS.rotulo, descricao: BONUS.descricao },
    cupons
  };
}
// "fotografia" da edicao atual, para o historico
function snapshotEdicao() {
  return {
    cupons: db.prepare('SELECT numero,nome,telefone FROM cupons ORDER BY numero').all(),
    premios: infoPremios(),
    bonus: infoBonus()
  };
}

/* ====== Servidor ============================================= */
const servidor = http.createServer(async (req, res) => {
  const url  = new URL(req.url, 'http://local');
  const rota = url.pathname.replace(/\/+$/, '') || '/';
  const m    = req.method;

  // ---- Paginas ----
  if ((rota === '/' || rota === '') && m === 'GET') return html(res, 'public.html');
  if (rota === '/admin' && m === 'GET')             return html(res, 'admin.html');
  if (rota === '/resultados' && m === 'GET')        return html(res, 'resultados.html');

  // ---- Favicon ----
  if (rota === '/favicon.svg' && m === 'GET') {
    fs.readFile(path.join(DIR, 'views', 'favicon.svg'), (e, c) => {
      if (e) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': 'image/svg+xml',
                           'Cache-Control': 'public, max-age=86400' });
      res.end(c);
    });
    return;
  }

  // ---- API publica ----
  if (rota === '/api/grade' && m === 'GET')
    return json(res, 200, montarGrade());

  // resultados publicos: apenas os ganhadores das edicoes encerradas
  if (rota === '/api/resultados' && m === 'GET') {
    const eds = db.prepare(
      'SELECT numero,encerrada_em,dados FROM edicoes ORDER BY numero DESC').all();
    return json(res, 200, {
      marca: NOME_MARCA, versao: VERSAO,
      edicoes: eds.map((e) => {
        const d = JSON.parse(e.dados);
        return {
          numero: e.numero, encerrada_em: e.encerrada_em,
          premios: d.premios.map((p) => ({
            rotulo: p.rotulo, emoji: p.emoji, descricao: p.descricao,
            vencedor: p.vencedor
              ? { numero: p.vencedor.numero, nome: p.vencedor.nome,
                  telefone: p.vencedor.telefone }
              : null
          })),
          bonus: {
            emoji: d.bonus.emoji, rotulo: d.bonus.rotulo, cupons: d.bonus.cupons,
            lideres: (d.bonus.lideres || []).map((l) => ({
              nome: l.nome, telefone: l.telefone }))
          }
        };
      })
    });
  }

  // ---- Login / Logout ----
  if (rota === '/api/login' && m === 'POST') {
    const corpo = await lerCorpo(req);
    if (String(corpo.senha || '') === SENHA_ADMIN) {
      const token = crypto.randomBytes(24).toString('hex');
      sessoes.add(token);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': `sorteio_sessao=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`
      });
      return res.end(JSON.stringify({ ok: true }));
    }
    await new Promise((r) => setTimeout(r, 600));
    return json(res, 401, { ok: false, erro: 'Senha incorreta.' });
  }
  if (rota === '/api/logout' && m === 'POST') {
    const c = lerCookies(req);
    if (c.sorteio_sessao) sessoes.delete(c.sorteio_sessao);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': 'sorteio_sessao=; HttpOnly; Path=/; Max-Age=0'
    });
    return res.end(JSON.stringify({ ok: true }));
  }

  // ---- API de admin (protegida) ----
  if (rota.startsWith('/api/admin/')) {
    if (!autenticado(req)) return json(res, 401, { erro: 'Não autenticado.' });

    if (rota === '/api/admin/cupons' && m === 'GET') {
      const linhas = db.prepare(
        'SELECT numero,nome,telefone,atualizado_em FROM cupons ORDER BY numero').all();
      return json(res, 200, {
        total: TOTAL_CUPONS, ocupados: linhas.length,
        livres: TOTAL_CUPONS - linhas.length, edicao: numeroEdicaoAtual(),
        cupons: linhas
      });
    }

    if (rota === '/api/admin/sorteio' && m === 'GET') {
      return json(res, 200, { premios: infoPremios(), bonus: infoBonus() });
    }

    if (rota === '/api/admin/cupom' && m === 'POST') {
      const c = await lerCorpo(req);
      const numero    = parseInt(c.numero, 10);
      const nome      = String(c.nome || '').trim();
      const operacao  = String(c.operacao || '').trim().toLowerCase(); // 'criar' | 'atualizar'
      let tel = String(c.telefone || '').replace(/\D/g, '');

      // validacoes basicas (valem para criar e atualizar)
      if (!Number.isInteger(numero) || numero < 1 || numero > TOTAL_CUPONS)
        return json(res, 400, { erro: `Número deve ser entre 1 e ${TOTAL_CUPONS}.` });
      if (!nome)
        return json(res, 400, { erro: 'Informe o nome do cliente.' });
      if (!tel || tel.length > 4)
        return json(res, 400, { erro: 'Telefone: até 4 dígitos finais.' });
      tel = tel.padStart(4, '0');

      // verifica estado atual do cupom (existe ou nao)
      const existente = db.prepare(
        'SELECT numero,nome,telefone FROM cupons WHERE numero=?').get(numero);
      const agora = new Date().toISOString();

      if (operacao === 'criar') {
        // CRIAR: rejeita se o numero ja esta ocupado
        if (existente) {
          return json(res, 409, {
            erro: `O cupom ${numero} já está com ${existente.nome} (final ${existente.telefone}). ` +
                  `Para alterar o nome/telefone, clique em "Editar" na lista. ` +
                  `Para liberá-lo, clique em "Remover".`
          });
        }
        db.prepare(
          'INSERT INTO cupons (numero,nome,telefone,atualizado_em) VALUES (?,?,?,?)'
        ).run(numero, nome, tel, agora);
        return json(res, 200, { ok: true, modo: 'criado', numero });
      }

      if (operacao === 'atualizar') {
        // ATUALIZAR: exige que o cupom exista; numero NUNCA muda (e PK)
        if (!existente) {
          return json(res, 404, {
            erro: `O cupom ${numero} não existe. Use "Adicionar" para criar.`
          });
        }
        db.prepare(
          'UPDATE cupons SET nome=?, telefone=?, atualizado_em=? WHERE numero=?'
        ).run(nome, tel, agora, numero);
        return json(res, 200, { ok: true, modo: 'atualizado', numero });
      }

      // operacao ausente/invalida: rejeita explicitamente em vez de "adivinhar"
      return json(res, 400, {
        erro: 'Operação inválida. Use "criar" para novos cupons ou "atualizar" para editar.'
      });
    }

    if (rota === '/api/admin/limpar' && m === 'POST') {
      const c = await lerCorpo(req);
      const numero = parseInt(c.numero, 10);
      db.prepare('DELETE FROM cupons WHERE numero=?').run(numero);
      for (const p of [1, 2, 3])
        if (getConfig('premio' + p) === String(numero)) setConfig('premio' + p, '');
      return json(res, 200, { ok: true });
    }

    if (rota === '/api/admin/sortear' && m === 'POST') {
      const c = await lerCorpo(req);
      const premio = parseInt(c.premio, 10);
      if (![1, 2, 3].includes(premio))
        return json(res, 400, { erro: 'Prêmio inválido.' });
      if (getConfig('premio' + premio))
        return json(res, 400, {
          erro: `O ${premio}º prêmio já foi sorteado. Use "Limpar resultados" para refazer.` });
      const usados = [1, 2, 3].map((p) => getConfig('premio' + p))
                               .filter(Boolean).map(Number);
      const disp = db.prepare('SELECT numero,nome,telefone FROM cupons').all()
                     .filter((x) => !usados.includes(x.numero));
      if (disp.length === 0)
        return json(res, 400, { erro: 'Não há cupons suficientes para sortear.' });
      const s = disp[crypto.randomInt(disp.length)];
      setConfig('premio' + premio, String(s.numero));
      return json(res, 200, {
        ok: true, premio, numero: s.numero, nome: s.nome, telefone: s.telefone });
    }

    if (rota === '/api/admin/revelar-bonus' && m === 'POST') {
      const r = calcularBonus();
      if (!r) return json(res, 400, { erro: 'Não há cupons cadastrados.' });
      setConfig('bonus_revelado', '1');
      return json(res, 200, { ok: true, cupons: r.max, lideres: r.lideres });
    }

    if (rota === '/api/admin/resetar-sorteio' && m === 'POST') {
      ['premio1', 'premio2', 'premio3', 'bonus_revelado', 'ganhador']
        .forEach((k) => setConfig(k, ''));
      return json(res, 200, { ok: true });
    }

    // encerrar e arquivar a edicao atual
    if (rota === '/api/admin/encerrar' && m === 'POST') {
      const faltando = [];
      for (const p of [1, 2, 3])
        if (!getConfig('premio' + p)) faltando.push(`${p}º prêmio`);
      if (getConfig('bonus_revelado') !== '1') faltando.push('bônus');
      if (faltando.length)
        return json(res, 400, {
          erro: 'Antes de encerrar, finalize o sorteio. Falta sortear: ' +
                faltando.join(', ') + '.' });
      const numero = numeroEdicaoAtual();
      const dados  = snapshotEdicao();
      db.prepare(
        'INSERT INTO edicoes (numero,encerrada_em,total_cupons,dados) VALUES (?,?,?,?)'
      ).run(numero, new Date().toISOString(), dados.cupons.length, JSON.stringify(dados));
      db.prepare('DELETE FROM cupons').run();
      ['premio1', 'premio2', 'premio3', 'bonus_revelado', 'ganhador']
        .forEach((k) => setConfig(k, ''));
      return json(res, 200, { ok: true, numero });
    }

    // historico completo (apenas admin)
    if (rota === '/api/admin/historico' && m === 'GET') {
      const eds = db.prepare(
        'SELECT numero,encerrada_em,total_cupons,dados FROM edicoes ' +
        'ORDER BY numero DESC').all();
      return json(res, 200, {
        edicoes: eds.map((e) => ({
          numero: e.numero, encerrada_em: e.encerrada_em,
          total_cupons: e.total_cupons, ...JSON.parse(e.dados)
        }))
      });
    }

    if (rota === '/api/admin/exportar' && m === 'GET') {
      const linhas = db.prepare(
        'SELECT numero,nome,telefone FROM cupons ORDER BY numero').all();
      let csv = 'Cupom;Nome;Telefone\n';
      for (const l of linhas) csv += `${l.numero};${l.nome};${l.telefone}\n`;
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="cupons-sorteio.csv"'
      });
      return res.end('\uFEFF' + csv);
    }

    return json(res, 404, { erro: 'Rota não encontrada.' });
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Página não encontrada');
});

servidor.listen(PORTA, '127.0.0.1', () => {
  console.log(`Sorteio de Cupons v${VERSAO} rodando em 127.0.0.1:${PORTA} (interno)`);
});
