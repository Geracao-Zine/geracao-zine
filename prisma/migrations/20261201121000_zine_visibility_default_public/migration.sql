-- AlterTable
--
-- Muda so o padrao das linhas novas. Zines ja gravados mantem a visibilidade
-- que tinham: virar publico o que alguem deixou privado seria publicar sem
-- pedir, e a acao de privar de novo nao desfaz uma copia ja vista.
ALTER TABLE "zines" ALTER COLUMN "visibility" SET DEFAULT 'public';
