# Fontes do PDF

Estes arquivos são embutidos no PDF gerado pelo editor. Ficam em `public/`
porque o navegador os busca em `/fonts/...` só no momento de gerar o PDF.

| Arquivo | Uso |
|---|---|
| `geist-regular.ttf` | Corpo do poema, data e assinatura |
| `geist-bold.ttf` | Título da capa |
| `geist-mono-regular.ttf` | Corpo, quando a fonte escolhida é Geist Mono |
| `geist-mono-bold.ttf` | Título, quando a fonte escolhida é Geist Mono |

## Origem e licença

Baixadas do Google Fonts (SIL Open Font License 1.1), a mesma família que o
site já usa via `next/font/google`. A OFL permite redistribuição e embutição
em documentos, inclusive comerciais.

## Fallback

`src/lib/pdf-fonts.ts` tenta baixar e embutir a fonte escolhida. Se o download
falhar (arquivo ausente, erro de rede, resposta não-200), a geração **não
quebra**: cai para as fontes padrão do PDF (Helvetica, Helvetica-Bold e
Helvetica-Oblique) e o PDF sai com a fonte errada, mas completo.

As fontes padrão cobrem Latin-1, o que inclui toda a acentuação portuguesa.
Elas falham apenas em cirílico, grego e emoji — nesse caso o `pdf-lib` lança
exceção e o PDF não é gerado. Com a fonte embutida esses caracteres funcionam.

## Atualizar as fontes

```sh
curl -s -A "Mozilla/5.0 (Windows NT 6.1)" \
  "https://fonts.googleapis.com/css2?family=Geist:wght@400;700&family=Geist+Mono:wght@400;700"
```

O CSS retornado traz as URLs `.ttf`; baixe e substitua os arquivos mantendo os
nomes. Os testes em `tests/fonts.test.mjs` verificam que cada caminho do
registro existe e é um TTF válido.
