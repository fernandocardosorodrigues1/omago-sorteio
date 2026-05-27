# Sistema de Sorteio de Cupons - Guia

Endereço: https://sorteio.omago.xyz  (painel: /admin)
Roda isolado em /opt/omago-sorteio, porta 3001 interna, processo PM2 omago-sorteio.

## Senha do painel
Arquivo data/senha-admin.txt (preservado em atualizacoes).
Trocar: editar o arquivo e rodar  pm2 restart omago-sorteio

## ATUALIZAR para v2.0.3 (passo-a-passo no VPS)
1. Backup do banco e dos arquivos antigos (SEGURANCA):
   cp /opt/omago-sorteio/data/sorteio.db ~/backup-sorteio-$(date +%F).db
   cp -r /opt/omago-sorteio /opt/omago-sorteio-backup-v2.0.2

2. Enviar o pacote (do PC):
   scp omago-sorteio-2.0.3.tar.gz root@31.97.26.191:/opt/

3. Descompactar (no VPS) - a pasta data/ e preservada:
   cd /opt && tar -xzf omago-sorteio-2.0.3.tar.gz

4. Reiniciar:
   pm2 restart omago-sorteio

5. Conferir:
   curl -s https://sorteio.omago.xyz/ | grep -o 'v2.0.3'
   pm2 logs omago-sorteio --lines 5

## ROLLBACK (se algo der errado)
   rm -rf /opt/omago-sorteio
   mv /opt/omago-sorteio-backup-v2.0.2 /opt/omago-sorteio
   pm2 restart omago-sorteio

## BACKUP AUTOMATICO (configurar uma vez)
   mkdir -p /opt/omago-backups
   (crontab -l 2>/dev/null; echo '0 3 * * * cp /opt/omago-sorteio/data/sorteio.db /opt/omago-backups/sorteio-$(date +\%F).db && find /opt/omago-backups -name "sorteio-*.db" -mtime +14 -delete') | crontab -

## O QUE MUDOU NA v2.0.3
- Numero do cupom NAO pode ser editado durante edicao (trava de seguranca)
- Botao "Cancelar edicao" no painel admin
- Tabela do admin mostra coluna "Atualizado em"
- Pagina publica: botao "Atualizar agora" + horario da ultima sincronizacao
- Polling publico de 25s para 15s (contador mais responsivo)
- Headers Cache-Control: no-store nas respostas JSON
- Backend rejeita criar cupom em numero ja ocupado (sem sobrescrita silenciosa)
- Backend rejeita atualizar cupom inexistente

## EDICOES E HISTORICO
- Cada sorteio e uma "edicao". Sorteie os 3 premios + bonus no painel.
- Botao "Encerrar e arquivar sorteio": guarda a edicao no historico
  (com todos os cupons e ganhadores) e ZERA a grade para a proxima edicao.
- So encerra depois de sortear tudo. Acao com confirmacao dupla.
- Historico fica no painel; resultados publicos em /resultados.

## Comandos uteis
pm2 logs omago-sorteio       ver o que acontece
pm2 restart omago-sorteio    reiniciar
pm2 status                   ver se esta online
