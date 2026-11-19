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

- Node.js 24 LTS (recomendado) e npm 11 ou superior
- Git

## Como rodar

```bash
git clone https://github.com/Geracao-Zine/geracao-zine.git
cd geracao-zine
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

### Anatomia de uma página do zine

Cada página do zine (o painel diagramado, não a folha A4 inteira) é composta por:

| Campo | Obrigatório | Comportamento |
|---|---|---|
| Título | Não | Ausente não reserva espaço |
| Subtítulo | Não | Ausente não reserva espaço |
| Data | Não | Formato pt-BR, editável |
| Texto principal | Sim | Área limitada; a fonte diminui automaticamente para caber |

O texto nunca transborda a caixa do painel: o sistema reduz o corpo da fonte até o mínimo legível e, se ainda não couber, gera continuação identificada.

### Modelos de dobra

| Modelo | Painéis por face | Páginas por folha |
|---|---|---|
| Banner A4 (uma poesia por folha) | 1 | 1 |
| Duas colunas vertical | 2 | 2 |
| Duas colunas horizontal | 2 | 2 |
| Quatro retângulos | 4 | 4 |
| Minizine de 8 páginas | 8 | 8 |
| Tríptico | 3 | 6 |
| Dobra em Z | 3 | 6 |
| Acordeão | 4 a 6 | 8 a 12 |
| Gatefold | 4 | 8 |
| Folha única frente e verso | 1 | 2 |
| Fanzine grampeado | 2 | múltiplos de 4 |
| Livrinho de 16 páginas | 16 | 16 |

Os templates com imposição implementada e os que estão em desenvolvimento são controlados pelo roadmap.

## Convenções de código

- TypeScript estrito, sem `any`; tipos de retorno explícitos em funções exportadas.
- Ponto e vírgula ao final de cada linha de comando.
- Uma responsabilidade por arquivo: regra de negócio não mora em componente de tela.
- Constantes de diagramação (medidas A4, margens, corpos de fonte) centralizadas, sem números mágicos.
- Nomes em português para o domínio do produto e em inglês para infraestrutura e APIs.

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
