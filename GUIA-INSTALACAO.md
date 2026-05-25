# Sorteio de Cupons - Guia (v2.0)

Endereco: https://sorteio.omago.xyz
Painel:   https://sorteio.omago.xyz/admin
Resultados: https://sorteio.omago.xyz/resultados

Roda em /opt/omago-sorteio, porta 3001 interna, processo PM2 omago-sorteio.

## Senha do painel
Arquivo data/senha-admin.txt (preservado em atualizacoes).
Trocar: editar o arquivo e rodar  pm2 restart omago-sorteio

## ATUALIZAR para uma versao nova
1. Backup (no VPS):
   cp /opt/omago-sorteio/data/sorteio.db ~/backup-sorteio.db
2. Enviar o pacote (no PC):
   scp omago-sorteio-X.tar.gz root@31.97.26.191:/opt/
3. Descompactar (no VPS) - a pasta data/ e preservada:
   cd /opt && tar -xzf omago-sorteio-X.tar.gz
4. Reiniciar:
   pm2 restart omago-sorteio

## BACKUP AUTOMATICO (configurar uma vez, no VPS)
   mkdir -p /opt/omago-backups
   (crontab -l 2>/dev/null; echo '0 3 * * * cp /opt/omago-sorteio/data/sorteio.db /opt/omago-backups/sorteio-$(date +\%F).db && find /opt/omago-backups -name "sorteio-*.db" -mtime +14 -delete') | crontab -
Faz uma copia do banco todo dia as 3h e mantem os ultimos 14 dias.

## EDICOES E HISTORICO
- Cada sorteio e uma "edicao". Sorteie os 3 premios + bonus no painel.
- Botao "Encerrar e arquivar sorteio": guarda a edicao no historico
  (com todos os cupons e ganhadores) e ZERA a grade para a proxima edicao.
- So encerra depois de sortear tudo. Acao com confirmacao dupla.
- Historico fica no painel; resultados publicos em /resultados.

## SUBIR NO GITHUB (uma vez)
Crie um repositorio vazio em github.com chamado omago-sorteio, depois:
   cd /opt/omago-sorteio
   git init
   git add .
   git commit -m "Sistema de Sorteio de Cupons v2.0"
   git branch -M main
   git remote add origin https://github.com/fernandocardosorodrigues1/omago-sorteio.git
   git push -u origin main
O .gitignore ja impede que o banco e a senha subam.

## Comandos uteis
pm2 logs omago-sorteio       ver o que acontece
pm2 restart omago-sorteio    reiniciar
