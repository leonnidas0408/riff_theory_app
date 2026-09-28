# Base de conhecimento do Chatbot

Coloque aqui dentro os arquivos que você quer que alimentem o chatbot de
teoria musical: PDFs, `.txt` ou `.md` (apostilas, artigos, anotações, etc.).
Pode organizar em subpastas à vontade.

Como esse .zip original é grande demais pra mandar de uma vez, extraia o
conteúdo aos poucos aqui (ou copie os PDFs/textos direto pra essa pasta) e
rode:

```bash
npm run build:knowledge
```

Isso gera/atualiza `api/knowledge-chunks.json`, que é o arquivo que a função
`api/chat.js` realmente lê para dar contexto às respostas da IA — os PDFs
originais não vão pro servidor, só o texto já processado.

Depois de gerar o JSON, é só commitar normalmente (`api/knowledge-chunks.json`
faz parte do repositório) e dar deploy.

Sempre que adicionar, remover ou trocar arquivos aqui, rode o comando de novo
para manter `knowledge-chunks.json` atualizado.
