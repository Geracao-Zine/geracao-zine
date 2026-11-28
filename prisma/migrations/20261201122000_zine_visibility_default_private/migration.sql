-- AlterTable
--
-- Volta o padrao para `private`: publicar e acao explicita e confirmada
-- (ROADMAP 8.7). A migration anterior trocou o padrao para `public` por engano.
--
-- So o padrao das linhas novas muda. Zines ja gravados mantem a visibilidade
-- que tinham: virar privado o que alguem escolheu divulgar tiraria do ar um
-- link que pode ja ter sido compartilhado.
ALTER TABLE "zines" ALTER COLUMN "visibility" SET DEFAULT 'private';
