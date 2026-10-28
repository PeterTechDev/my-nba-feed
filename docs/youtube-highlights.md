# Highlights oficiais do YouTube

## Como funciona

- O workflow **YouTube Highlights** roda **a cada hora, no minuto 15**.
  O GitHub pode atrasar o início de tarefas agendadas.
- A rotina consulta a playlist de uploads do canal oficial **NBA**, usando a
  YouTube Data API v3. Aceita apenas títulos de **FULL GAME HIGHLIGHTS**, identifica
  os dois times e a data do jogo e verifica se o vídeo é público e incorporável.
- Salva ID, título, URL da thumbnail, duração, times e data no documento privado
  `youtube-highlights.json` do Blob já conectado ao projeto. Não baixa os vídeos.
- Um vídeo salvo atende aos dois times. Os jogos já encontrados não são
  pesquisados novamente. Visitar `/highlights`, trocar de time ou atualizar a
  página **não faz chamadas à YouTube Data API**.
- A thumbnail permanece visível com a proteção contra spoilers. O player oficial
  carrega dentro da página somente depois do clique em Play; fechar o player
  interrompe o vídeo. O card Last Game abre o recap salvo diretamente no YouTube,
  com uma busca pelo jogo como alternativa enquanto o vídeo não está no catálogo.
- A primeira sincronização percorre até 30 dias de uploads. As seguintes consultam
  apenas uploads recentes, com 48 horas de sobreposição para publicações atrasadas.
  Um limite de 100 páginas interrompe respostas excessivas sem perder os dados salvos.
- As chamadas são em lote, até 50 uploads/vídeos por página. O consumo depende das
  páginas consultadas e dos novos vídeos, não do número de visitantes. Repetir uma
  sincronização em menos de 30 minutos não consulta a API do YouTube.
- O job remove os registros fora da janela de 30 dias. A API de leitura também
  deixa de servir metadados com mais de 30 dias. Isso limita o histórico e atende
  à regra de atualizar ou excluir os dados armazenados após esse prazo.

## 1. Criar a chave no Google Cloud

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/) com sua conta
   Google e crie ou selecione um projeto, por exemplo `NBA Feed`.
2. Abra a [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com)
   nesse projeto e clique em **Ativar / Enable**.
3. Abra [APIs e serviços → Credenciais](https://console.cloud.google.com/apis/credentials).
   Clique em **Criar credenciais → Chave de API / Create credentials → API key**.
   Use uma chave padrão para acesso a dados públicos, sem associá-la a uma conta de serviço.
4. Edite a chave e dê um nome como `NBA Feed - GitHub Actions`.
5. Em **Restrições de API / API restrictions**, selecione **Restringir chave** e
   permita somente **YouTube Data API v3**. Salve.
6. As chamadas vêm de um servidor do GitHub Actions. Não use restrições de sites
   ou HTTP referrer, pois elas se destinam a chamadas feitas pelo navegador.
   Runners hospedados comuns não fornecem um IP de saída fixo para restringir esta chave.
7. Copie a chave diretamente para o secret do GitHub indicado abaixo. Não envie a
   chave pelo chat nem a coloque em código, screenshots ou commits.

## 2. Cadastrar a chave no GitHub

1. Abra as configurações do repositório e selecione **Environments → YOUTUBE_API_KEY**.
   Crie esse ambiente se ainda não existir: o job `sync` declara esse nome no workflow.
2. Adicione um **environment secret** ao ambiente.
3. Nome: `YOUTUBE_API_KEY`. Valor: a chave criada no Google Cloud. O workflow também
   aceita um repository secret com esse nome quando não há um valor no ambiente.
4. O workflow também usa o secret **já existente** `DIGEST_PUBLISH_TOKEN` para
   publicar os dados na Vercel. Ele deve corresponder ao token de produção.

A chave do Google fica apenas no passo de sincronização do GitHub Actions.
O job usa o ambiente GitHub `YOUTUBE_API_KEY`, onde a chave foi cadastrada;
o secret de publicação continua disponível no nível do repositório.
Não precisa ser cadastrada na Vercel e nunca usa o prefixo `NEXT_PUBLIC_`.
O armazenamento usa a conexão Blob existente e o controle de concorrência de
`src/lib/blobStorage.ts`, em um documento separado. O nome legado
`DIGEST_PUBLISH_TOKEN` continua sendo usado pelo publicador de highlights;
as rotas do Digest e a publicação diária foram removidas.

## 3. Publicar o código e fazer a primeira sincronização

1. Faça o deploy desta implementação antes de executar o workflow: ele publica
   os resultados em `https://my-nba-feed.vercel.app/api/highlights`.
2. Abra [Actions → YouTube Highlights](https://github.com/PeterTechDev/my-nba-feed/actions/workflows/youtube-highlights.yml).
3. Clique em **Run workflow**, escolha `main` e execute.
4. Confirme o resultado do passo **Sync and verify saved NBA highlights**. O resumo
   mostra `status`, `apiRequests` e `added`, sem imprimir credenciais.
5. Abra [Highlights](https://my-nba-feed.vercel.app/highlights), escolha um jogo e
   clique em Play. O vídeo deve tocar dentro do site. Há também um link direto
   **NBA · YouTube** caso o player seja bloqueado pelo navegador ou pelo canal.

Depois disso, o agendamento de hora em hora mantém o catálogo. É possível executar o mesmo
workflow manualmente para buscar um upload atrasado; respeite o intervalo de 30
minutos. Execuções do workflow são serializadas e sua ativação é renovada para
evitar a suspensão por inatividade do repositório.

## Testar localmente

Com Node 22.18+ e as credenciais em `.env.local`, que é ignorado pelo Git:

```text
YOUTUBE_API_KEY=valor_da_chave
DIGEST_PUBLISH_TOKEN=token_de_publicacao_existente
```

```powershell
npm run highlights:sync
```

Esse comando publica no **site de produção** e confirma a persistência por uma
nova leitura. Para testar sem credenciais nem alterar produção:

```powershell
node --experimental-strip-types --test tests/youtube-highlights.test.mjs tests/app-data.test.mjs
npm run lint
npm run build
```

## Recuperação

- **403 da API do YouTube:** confira se a API está ativada no projeto certo, se
  a chave permite YouTube Data API v3 e se a cota está disponível. Veja o consumo
  em **APIs e serviços → YouTube Data API v3 → Cotas e limites do sistema**.
- **401 na publicação:** o `DIGEST_PUBLISH_TOKEN` do GitHub difere do configurado
  na Vercel, ou está ausente.
- **503 na leitura/publicação:** confira a conexão do Blob. A rotina não troca
  os dados salvos por uma lista vazia quando a fonte ou o armazenamento falha.
- **Vídeo não disponível:** pode ainda não ter sido publicado, não seguir o
  formato reconhecido ou não permitir incorporação. A busca no YouTube continua
  disponível como alternativa. Nenhum clipe da ESPN é usado como substituto.
- O player mantém as regras do YouTube: anúncios e recomendações do canal podem
  aparecer. `youtube-nocookie.com` usa o modo de privacidade avançada; `rel=0`
  limita recomendações ao mesmo canal, sem removê-las completamente.

## Referências

- [Configuração da YouTube Data API](https://developers.google.com/youtube/v3/getting-started)
- [Uploads de um canal](https://developers.google.com/youtube/v3/guides/implementation/videos)
- [PlaylistItems: paginação e cota](https://developers.google.com/youtube/v3/docs/playlistItems/list)
- [Boas práticas para chaves de API](https://cloud.google.com/docs/authentication/api-keys-best-practices)
- [Player e seus parâmetros](https://developers.google.com/youtube/player_parameters)
- [Retenção dos dados da API](https://developers.google.com/youtube/terms/developer-policies#e.-handling-youtube-data-and-content)


## Nightly Top Plays

`/top-plays` shows the NBA channel's dated Top 10 and Top 5 Plays of the Night,
newest first, with previous nights underneath. It uses the same hourly workflow,
credentials and private document as full-game highlights. No extra API key is needed.
`GET /api/highlights?kind=top-plays` returns only countdowns; team queries still
return only matching game recaps. Preview reveal and playback respect spoiler defaults.

The first sync with this version scans the last 30 days to backfill countdowns,
then records `topPlaysEnabled` and resumes incremental scans. Deploy the updated
API before running the updated workflow. Until the first successful sync, the
page shows an empty state with an official-channel search link. Titles must identify
Top 5/10 Plays of the Night and a valid date; weekly and player compilations are excluded.

The main navigation links to the page. With protection enabled, reveal the
preview before playing; **Hide
preview** also stops playback. **Close player** restores the visible preview.
Loading, empty and retryable error states use the existing dashboard controls.

Visual review: ship, with desktop, 390px, 320px, protected, empty and error
captures in `.impeccable/review/top-plays-*.png`. Review metadata and its existing
NBA thumbnail are fixtures only; they were not published. Production thumbnails
are supplied by the official NBA YouTube sync, with no generated artwork added.
