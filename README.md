# CreatorsDeck Collector - Extensão do Google Chrome 🚀

Esta extensão integra o YouTube diretamente com a sua plataforma **CreatorsDeck**, permitindo coletar referências de vídeos, thumbnails e vídeos sugeridos de canais para as suas ideias de conteúdo com um único clique.

## 🚀 Funcionalidades

1. **Captura Inteligente**: Detecta automaticamente o título, canal, link e link de perfil do canal do YouTube aberto na aba ativa.
2. **Download e Upload de Thumbnail**: Salva a imagem da miniatura do YouTube e faz o upload dela automaticamente para o banco de dados da sua plataforma, criando uma referência de imagem no seu Moodboard.
3. **Associação Simples**: Permite salvar o vídeo como referência (link ou imagem) em qualquer ideia de vídeo existente nos seus canais.
4. **Modo Criação**: Permite criar uma nova ideia de vídeo no canal destino pré-preenchida com o título do vídeo coletado, anexando as referências automaticamente.
5. **Coletar Sugestões do Canal**: Permite iniciar a raspagem assíncrona dos vídeos em alta de um determinado canal selecionando-o e enviando-o para a fila do RabbitMQ.

---

## 🛠️ Como Instalar no Google Chrome

Siga os passos abaixo para carregar a extensão localmente no seu navegador:

1. Abra o navegador Google Chrome.
2. Acesse a página de extensões digitando `chrome://extensions/` na barra de endereços e pressionando `Enter`.
3. No canto superior direito, ative a chave **"Modo do desenvolvedor"** (Developer mode).
4. No canto superior esquerdo, clique no botão **"Carregar sem compactação"** (Load unpacked).
5. Navegue pelo gerenciador de arquivos e selecione a pasta `creatorsdeck-extension`.
6. Pronto! O ícone do **CreatorsDeck Collector** aparecerá na sua barra de extensões.

---

## 💻 Como Usar

1. **Inicie o Sistema**: Certifique-se de que a API do backend do seu projeto está rodando (por padrão na porta `8082`).
2. **Faça Login**: Clicando no popup da extensão, insira o mesmo usuário e senha que você usa para acessar a plataforma CreatorsDeck.
   * *Caso seu backend esteja rodando em uma porta diferente, clique no ícone de engrenagem no topo para atualizar a URL do servidor.*
3. **Colete Vídeos**:
   * Navegue no YouTube e abra qualquer vídeo (URL contendo `/watch`).
   * Abra a extensão. Você verá a prévia do título e da miniatura do vídeo.
   * Escolha o canal de destino e selecione se quer associar a uma ideia existente ou se prefere criar uma nova ideia a partir desse vídeo.
   * Escolha as opções de salvamento (salvar link de referência, imagem de thumbnail ou ambos) e clique para salvar.
4. **Coletar Sugestões**:
   * Clique no botão **"Coletar Sugestões do Canal"** para disparar a raspagem automática em segundo plano via microserviços.
5. **Verifique no Workspace**: Ao abrir o workspace da ideia na plataforma web, a miniatura e o link do vídeo estarão sincronizados no painel de **"Referências"**.
