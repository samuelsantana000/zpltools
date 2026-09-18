import JSZip from "jszip";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const arquivo = formData.get("file");

    if (!(arquivo instanceof File)) {
      return Response.json(
        {
          erro: "Nenhum arquivo foi enviado.",
        },
        {
          status: 400,
        }
      );
    }

    const nome = arquivo.name.toLowerCase();

    let quantidadeZpl = 0;
    let quantidadeDeclaracoes = 0;

    /*
     * ========================================
     * ZIP
     * ========================================
     */

    if (
      nome.endsWith(".zip") ||
      arquivo.type === "application/zip" ||
      arquivo.type === "application/x-zip-compressed"
    ) {
      const buffer = await arquivo.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);

      for (const nomeArquivo of Object.keys(zip.files)) {
        const item = zip.files[nomeArquivo];

        if (item.dir) {
          continue;
        }

        const nomeMinusculo = nomeArquivo.toLowerCase();

        /*
         * Procura arquivos ZPL/TXT válidos
         */

        if (
          nomeMinusculo.endsWith(".zpl") ||
          nomeMinusculo.endsWith(".txt")
        ) {
          const conteudo = await item.async("string");

          if (
            conteudo.includes("^XA") &&
            conteudo.includes("^XZ")
          ) {
            quantidadeZpl++;
          }
        }

        /*
         * Procura PDFs de declaração
         */

        if (
          nomeMinusculo.endsWith(".pdf") &&
          (
            nomeMinusculo.includes("content_declaration") ||
            nomeMinusculo.includes("declaration") ||
            nomeMinusculo.includes("declaracao")
          )
        ) {
          quantidadeDeclaracoes++;
        }
      }

      return Response.json({
        tipo: "zip",
        quantidadeZpl,
        quantidadeDeclaracoes,
      });
    }

    /*
     * ========================================
     * ZPL / TXT
     * ========================================
     */

    const conteudo = await arquivo.text();

    if (
      conteudo.includes("^XA") &&
      conteudo.includes("^XZ")
    ) {
      quantidadeZpl = 1;
    }

    return Response.json({
      tipo: "zpl",
      quantidadeZpl,
      quantidadeDeclaracoes: 0,
    });

  } catch (error) {
    console.error(
      "ERRO AO ANALISAR ARQUIVO:",
      error
    );

    return Response.json(
      {
        erro:
          error instanceof Error
            ? error.message
            : "Erro ao analisar o arquivo.",
      },
      {
        status: 500,
      }
    );
  }
}