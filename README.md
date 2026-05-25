# Sistema de Sorteio de Cupons

Versão **2.0**

Sistema web para gerenciar o sorteio de cupons distribuídos a clientes que
indicam novas vendas. Cada indicação fechada vale um cupom numerado (1 a 100).

Disponível em: **https://sorteio.omago.xyz**

## Recursos

- **Página pública** — grade dos 100 cupons (vermelho = distribuído,
  verde = disponível). Cupons livres são clicáveis e abrem um convite de
  reserva. Os resultados do sorteio nunca aparecem aqui.
- **Painel admin** (`/admin`) — protegido por senha. Cadastro/edição de
  cupons, sorteio dos prêmios e gestão de edições.
- **Sorteio** — 1º, 2º e 3º prêmios sorteados com animação; bônus
  automático para quem tem mais cupons.
- **Edições e histórico** — ao encerrar um sorteio, a edição é arquivada
  (com todos os cupons e ganhadores) e a grade é zerada para a próxima.
- **Resultados públicos** (`/resultados`) — ganhadores das edições já
  encerradas.

## Tecnologia

- Node.js puro (sem framework), módulo `http`.
- Banco SQLite via `better-sqlite3` (ou `node:sqlite` embutido como reserva).
- Sem dependências de build no frontend — HTML/CSS/JS direto.

## Como rodar

```
npm install
node server.js
```

O servidor sobe em `127.0.0.1:3001`. Em produção fica atrás do Nginx,
servido em `sorteio.omago.xyz`, e roda 24h via PM2.

## Configuração

- Senha do painel: arquivo `data/senha-admin.txt` (criado na 1ª execução).
- A pasta `data/` guarda o banco e a senha — não vai para o Git.

## Estrutura

```
server.js              backend (API + servidor)
views/public.html      página pública do sorteio
views/admin.html       painel administrativo
views/resultados.html  página pública de resultados
data/                  banco de dados e senha (local, fora do Git)
```
