# Geração Zine

Plataforma web para criadores independentes transformarem poesias e textos autorais em zines imprimíveis. O autor cadastra o conteúdo aos poucos, escolhe uma dobra de papel e recebe um PDF pronto para impressão.

## Sumário

- [O que é um zine](#o-que-é-um-zine)
- [Estado do projeto](#estado-do-projeto)
- [Stack](#stack)
- [Requisitos](#requisitos)
- [Como rodar](#como-rodar)
- [Scripts](#scripts)
- [Estrutura](#estrutura)
- [Fluxo do produto](#fluxo-do-produto)
- [Convenções de código](#convenções-de-código)
- [Deploy em VPS com Nginx e TLS](#deploy-em-vps-com-nginx-e-tls)
- [Roadmap](#roadmap)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

## O que é um zine

Zines são publicações independentes, feitas fora dos meios tradicionais: espaços de expressão livre onde ideias, arte, cultura e opinião ganham forma sem filtros ou intermediários.

O Geração Zine digitaliza esse processo. Em vez de recortar e colar no papel, o autor monta a publicação na tela e o sistema cuida da diagramação e da imposição das páginas para a dobra escolhida.

## Estado do projeto

O projeto está em desenvolvimento ativo. O roadmap completo, com fases, tarefas e critérios de conclusão, está em [ROADMAP.md](./ROADMAP.md).

**Funcionando hoje**

- Site institucional (`/`), cadastro (`/Create`) e editor (`/Editor`) com pré-visualização.
- Geração de PDF no formato "só para ler": uma poesia por página A4, com capa, título, autor e data.
- Build de produção e verificação de tipos passando.

**Em desenvolvimento**

- Dobras e templates de diagramação (duas colunas, quatro painéis, minizine, tríptico, sanfona e outros).
- Ajuste automático de fonte por área limitada, com frente e verso.
- Empacotamento em Docker para hospedagem em VPS.
- Correção dos bugs mapeados na auditoria do roadmap.

Telas de Biblioteca (`/Library`) e Apoio (`/Support`) são placeholders.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, react-icons |
| Linguagem | TypeScript 5 (modo estrito) |
| PDF | pdf-lib |
| Lint | ESLint 10 + eslint-config-next |

## Requisitos

- Node.js 24 LTS e npm 11 ou superior. A versão está fixada em [`.nvmrc`](./.nvmrc); o `package.json` declara `engines.node` como `>=22`.
- Git

## Como rodar

```bash
git clone https://github.com/Geracao-Zine/geracao-zine.git
cd geracao-zine
nvm use   # opcional: seleciona a versão do .nvmrc
npm install
npm run dev
```

A aplicação sobe em [http://localhost:3000](http://localhost:3000).

Para simular produção localmente:

```bash
npm run build
npm start
```

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com hot reload |
| `npm run build` | Build de produção |
| `npm start` | Executa o build de produção |
| `npm run lint` | Análise estática com ESLint |
| `npm run typecheck` | Verificação de tipos sem emitir arquivos |

## Estrutura

```
src/
├── app/                  # Rotas do App Router
│   ├── page.tsx          # Landing page
│   ├── Create/           # Cadastro do zine (capa e autoria)
│   ├── Editor/           # Editor de páginas e geração do PDF
│   ├── Library/          # Biblioteca de zines (placeholder)
│   ├── Support/          # Página de apoio (placeholder)
│   ├── layout.tsx        # Layout raiz e metadados
│   └── globals.css       # Tokens de cor e fontes
├── components/           # Componentes reutilizáveis
│   ├── Navbar/
│   ├── FontSelector/
│   └── FormatSelector/
└── assets/               # Imagens e logotipos
```

## Fluxo do produto

O objetivo do fluxo é pedir pouca informação por vez, permitindo que o autor adapte o conteúdo durante o processo.

1. **Capa e autoria** — título do zine, nome do autor e escolha de fontes.
2. **Poesias** — cadastro gradual: cada poesia tem título, subtítulo, data e texto, todos opcionais exceto o texto. O autor adiciona, edita, reordena e remove quando quiser.
3. **Revisão** — conferência do conteúdo e das pendências antes de diagramar.
4. **Dobra e impressão** — escolha do modelo de dobra, opção de apenas frente ou frente e verso, e download do PDF.

O rascunho é salvo no navegador (`localStorage`, chave `geracao-zine:draft`) a cada alteração, junto com a etapa atual. Recarregar a página, trocar de etapa ou abrir o link antigo `/Editor?coverTitle=...` não perde o que já foi escrito: um rascunho salvo sempre tem prioridade sobre os parâmetros da URL.

As pendências aparecem já na etapa de poesias e se repetem na revisão, sempre em linguagem direta: "2 poesias sem título", "1 página vazia". A etapa de dobra só é liberada quando existe capa completa e ao menos uma poesia com texto; até lá o botão de avançar fica desabilitado.

### Anatomia de uma página do zine

Cada página do zine (o painel diagramado, não a folha A4 inteira) é composta por:

| Campo | Obrigatório | Comportamento |
|---|---|---|
| Título | Não | Ausente não reserva espaço |
| Subtítulo | Não | Ausente não reserva espaço |
| Data | Não | Formato pt-BR, editável |
| Texto principal | Sim | Ocupa a caixa de área fixa que sobra do cabeçalho |

A hierarquia tipográfica é fixa: título > subtítulo > data > corpo. Um campo opcional vazio não deixa faixa em branco — a caixa do texto começa mais acima e cresce. O texto nunca transborda a caixa: o ajuste automático busca o maior corpo que cabe e, quando nem o mínimo cabe, o que sobra segue em página de continuação identificada, sem perder linha.

### Modelos de dobra

As quatro dobras básicas têm imposição implementada. A ordem de leitura é sempre da esquerda para a direita e de cima para baixo; o seletor mostra o diagrama de cada dobra com essa numeração.

| ID | Modelo | Folha | Painéis por face | Ordem de leitura |
|---|---|---|---|---|
| T1 | Banner A4 (uma poesia por folha) | A4 retrato | 1 | única |
| T2 | Duas colunas vertical | A4 retrato | 2 | 1 → 2, esquerda para a direita |
| T3 | Duas colunas horizontal | A4 paisagem | 2 | 1 → 2, cima para baixo |
| T4 | Quatro retângulos | A4 retrato | 4 | 1 → 2 → 3 → 4, em Z |

A imposição distribui as páginas dos poemas nas faces do template. Um poema curto ocupa um painel e divide a folha com o próximo; um poema que não cabe num painel continua na face seguinte, identificado como continuação. Quando o conteúdo termina no meio de uma face, os painéis restantes ficam vazios — nenhuma página em branco é inventada.

Os demais templates do catálogo aparecem no seletor como "Em breve" e estão detalhados no roadmap.

## Convenções de código

- TypeScript estrito, sem `any`; tipos de retorno explícitos em funções exportadas.
- Ponto e vírgula ao final de cada linha de comando.
- Uma responsabilidade por arquivo: regra de negócio não mora em componente de tela.
- Constantes de diagramação (medidas A4, margens, corpos de fonte) centralizadas, sem números mágicos.
- Nomes em português para o domínio do produto e em inglês para infraestrutura e APIs.

## Deploy em VPS com Nginx e TLS

O roteiro abaixo publica a aplicação em um domínio próprio, com HTTPS. Ele assume Ubuntu 22.04 ou 24.04 e acesso root por SSH.

### Requisitos da VPS

- 1 vCPU e 1 GB de RAM no mínimo. O build do Next consome cerca de 1 GB; em máquinas menores, adicione swap.
- 10 GB de disco.
- Um domínio com registro DNS do tipo `A` apontando para o IP da VPS. O certificado só é emitido depois que o DNS propaga.
- Portas 80 e 443 liberadas no firewall.

### 1. Instalar o Docker

```bash
apt update
apt install -y ca-certificates curl git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Confira com `docker compose version`. Os comandos seguintes não usam `sudo`; se o seu usuário não estiver no grupo `docker`, prefixe cada um com `sudo`.

### 2. Clonar o repositório

```bash
git clone https://github.com/Geracao-Zine/geracao-zine.git /opt/geracao-zine
cd /opt/geracao-zine
```

### 3. Configurar a porta

```bash
cp .env.example .env
```

O `.env.example` traz só `APP_PORT`, que é a porta publicada no host. O container sempre escuta na 3000. Para publicar direto na 80 e deixar o Nginx cuidando do TLS, use `APP_PORT=80`:

```bash
sed -i 's/^APP_PORT=.*/APP_PORT=80/' .env
```

O `.env` não vai para o repositório; o `.gitignore` cobre `.env*` e abre exceção apenas para o `.env.example`.

### 4. Subir a aplicação

```bash
docker compose up -d --build
docker compose ps
```

O `docker-compose.yml` já declara `restart: unless-stopped` e um healthcheck em `/`. Acompanhe até o estado virar `healthy`:

```bash
watch -n 2 'docker compose ps'
```

Teste localmente antes de envolver o Nginx:

```bash
curl -I http://127.0.0.1/
```

Um `200` aqui significa que a aplicação está no ar e o problema, se houver, é no proxy.

### 5. Nginx como proxy reverso

```bash
apt install -y nginx
```

Crie `/etc/nginx/sites-available/geracao-zine`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name zine.exemplo.com;

    # O Next ja envia Cache-Control imutavel para estes arquivos, que tem hash
    # no nome. Nao repita o add_header aqui: ele duplicaria o cabecalho.
    location /_next/static/ {
        proxy_pass http://127.0.0.1:80;
        proxy_cache_valid 200 365d;
    }

    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
    }
}
```

Troque `zine.exemplo.com` pelo seu domínio. Se você não mudou o `APP_PORT`, use `proxy_pass http://127.0.0.1:3000;` nos dois `location`.

Ative o site e recarregue:

```bash
ln -s /etc/nginx/sites-available/geracao-zine /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

O `nginx -t` precisa dizer `syntax is ok` e `test is successful` antes do reload.

### 6. Certificado com Let's Encrypt

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d zine.exemplo.com --redirect --agree-tos -m voce@exemplo.com
```

O `--redirect` faz o certbot acrescentar o redirecionamento de 80 para 443. Ele reescreve o arquivo do site, então confira o resultado depois:

```bash
nginx -t && systemctl reload nginx
curl -I https://zine.exemplo.com/
```

A renovação é automática: o pacote instala um timer do systemd. Verifique com:

```bash
systemctl list-timers | grep certbot
certbot renew --dry-run
```

O `--dry-run` testa a renovação sem consumir cota do Let's Encrypt. Rode-o uma vez após a instalação.

### 7. Headers de segurança

Crie `/etc/nginx/snippets/security-headers.conf`:

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

Inclua o snippet dentro do bloco `server` que escuta na 443, antes dos `location`:

```nginx
include /etc/nginx/snippets/security-headers.conf;
```

Duas ressalvas que costumam morder:

- `add_header` não é herdado por blocos `location` que declarem `add_header` próprio. Se um dia você adicionar um `add_header` dentro de um `location`, os headers do `server` deixam de valer ali e precisam ser repetidos.
- Só habilite o `Strict-Transport-Security` quando o HTTPS estiver estável. Ele faz o navegador recusar HTTP por um ano.

### 8. Atualizar

```bash
cd /opt/geracao-zine
git pull
docker compose up -d --build
docker compose ps
```

O `up -d --build` reconstrói a imagem e recria o container. Como o healthcheck existe, `docker compose ps` mostra `healthy` quando a nova versão respondeu de fato.

Para conferir que a versão no ar é a esperada:

```bash
git log -1 --format='%h %s'
curl -sI https://zine.exemplo.com/ | head -1
```

### 9. Rollback

O rollback volta o código para o commit anterior e reconstrói:

```bash
cd /opt/geracao-zine
git log --oneline -5          # identifique o commit bom
git checkout <commit>          # ex.: 216c092
docker compose up -d --build
docker compose ps
```

Depois de estabilizar, volte para a linha principal:

```bash
git checkout master
```

Se você preferir não depender do histórico do git, marque a imagem antes de cada atualização e volte para ela:

```bash
# antes de atualizar
docker tag geracao-zine:latest geracao-zine:anterior

# para voltar
docker compose down
docker tag geracao-zine:anterior geracao-zine:latest
docker compose up -d
```

O segundo caminho não recompila nada e volta em segundos; ele depende de a tag ter sido criada antes da atualização.

### Problemas comuns

| Sintoma | Causa provável |
|---|---|
| `curl 127.0.0.1` recusa conexão | Container não subiu: veja `docker compose logs app`. |
| Container reinicia em loop | Build falhou ou falta memória. Confira `docker compose logs` e adicione swap. |
| Nginx devolve 502 | A porta do `proxy_pass` não bate com o `APP_PORT` do `.env`. |
| Certbot falha na validação | O DNS ainda não aponta para a VPS, ou a porta 80 está bloqueada. |
| HTTPS funciona, HTTP não redireciona | O `--redirect` não foi aplicado; rode o certbot de novo. |
| Site abre sem estilo | `/_next/static/` não está sendo servido; confira o `location` do proxy. |

## Roadmap

O planejamento completo está em [ROADMAP.md](./ROADMAP.md), organizado em seis fases:

1. Node e dependências
2. Docker e hospedagem em VPS
3. Caça e correção de bugs
4. Otimização
5. Padronização de código
6. Fluxo de criação e diagramação

## Contribuindo

1. Abra uma issue descrevendo o problema ou a proposta.
2. Crie uma branch a partir de `master` com nome descritivo (`fix/...`, `feat/...`, `chore/...`).
3. Garanta `npm run lint`, `npm run typecheck` e `npm run build` verdes antes de abrir o PR.
4. Descreva no PR o que mudou e como foi verificado.

## Licença

Projeto open-source mantido pela organização [Geracao-Zine](https://github.com/Geracao-Zine).
