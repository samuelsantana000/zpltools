import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function extrairArquivosDoZip(buffer: ArrayBuffer) {
  const zip = await JSZip.loadAsync(buffer);

  const zpls: string[] = [];
  let declaracao: Uint8Array | null = null;

  for (const nome of Object.keys(zip.files)) {
    const arquivo = zip.files[nome];

    if (arquivo.dir) {
      continue;
    }

    const nomeMinusculo = nome.toLowerCase();

    console.log(
      `Arquivo encontrado no ZIP: ${nome}`
    );

    if (
      nomeMinusculo.endsWith(".zpl") ||
      nomeMinusculo.endsWith(".txt")
    ) {
      const conteudo =
        await arquivo.async("string");

      if (
        conteudo.includes("^XA") &&
        conteudo.includes("^XZ")
      ) {
        console.log(
          `Arquivo reconhecido como ZPL: ${nome}`
        );

        zpls.push(conteudo);
      } else {
        console.log(
          `Arquivo ignorado: ${nome} não possui estrutura ZPL válida.`
        );
      }
    }

    if (
      nomeMinusculo.endsWith(".pdf") &&
      (
        nomeMinusculo.includes(
          "content_declaration"
        ) ||
        nomeMinusculo.includes(
          "declaration"
        ) ||
        nomeMinusculo.includes(
          "declaracao"
        )
      )
    ) {
      console.log(
        `PDF de declarações encontrado: ${nome}`
      );

      declaracao =
        await arquivo.async(
          "uint8array"
        );
    }
  }

  if (zpls.length === 0) {
    throw new Error(
      "Nenhum arquivo ZPL/TXT válido foi encontrado dentro do ZIP."
    );
  }

  console.log(
    `Total de arquivos ZPL encontrados no ZIP: ${zpls.length}`
  );

  const zplFinal =
    zpls.join("\n");

  console.log(
    `Tamanho total do ZPL extraído: ${zplFinal.length}`
  );

  if (declaracao) {
    console.log(
      "PDF de declarações encontrado."
    );
  } else {
    console.log(
      "Nenhum PDF de declaração encontrado."
    );
  }

  return {
    zpl: zplFinal,
    declaracao,
    quantidadeZpl:
      zpls.length,
  };
}

async function enviarParaLabelary(
  blocoZpl: string,
  numeroBloco: number
) {
  const urlLabelary =
    "https://api.labelary.com/v1/printers/8dpmm/labels/4x6/";

  let pdfRecebido:
    ArrayBuffer | null = null;

  for (
    let tentativa = 1;
    tentativa <= 5;
    tentativa++
  ) {
    console.log(
      `Tentativa ${tentativa} para o bloco ${numeroBloco}...`
    );

    const response =
      await fetch(
        urlLabelary,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
            Accept:
              "application/pdf",
          },
          body: blocoZpl,
        }
      );

    if (response.status === 429) {
      console.log(
        "Limite do Labelary atingido. Aguardando 5 segundos..."
      );

      await esperar(5000);

      continue;
    }

    if (!response.ok) {
      const error =
        await response.text();

      throw new Error(
        `Erro Labelary: ${response.status} - ${
          error ||
          response.statusText
        }`
      );
    }

    const bytes =
      await response.arrayBuffer();

    console.log(
      `Bloco ${numeroBloco} recebeu ${bytes.byteLength} bytes.`
    );

    if (bytes.byteLength === 0) {
      await esperar(3000);
      continue;
    }

    pdfRecebido = bytes;
    break;
  }

  if (!pdfRecebido) {
    throw new Error(
      `Não foi possível converter o bloco ${numeroBloco}.`
    );
  }

  return pdfRecebido;
}

/*
 * ========================================
 * CONVERSOR DO FORMATO ESPECÍFICO
 * ========================================
 */

async function converterZplEspecial(
  zpl: string
) {
  console.log(
    "Usando conversor ZPL especial."
  );

  console.log(
    `Tamanho do ZPL recebido: ${zpl.length}`
  );

  const blocosGrafico =
    zpl.match(
      /~DGR:[\s\S]*?(?=~DGR:|$)/g
    );

  if (
    !blocosGrafico ||
    blocosGrafico.length === 0
  ) {
    throw new Error(
      "Não foram encontradas definições gráficas ~DGR no arquivo ZPL."
    );
  }

  console.log(
    `Encontradas ${blocosGrafico.length} definições gráficas ~DGR.`
  );

  const etiquetas: string[] = [];

  for (
    let i = 0;
    i < blocosGrafico.length;
    i++
  ) {
    const bloco =
      blocosGrafico[i];

    const primeiroXA =
      bloco.indexOf("^XA");

    if (primeiroXA === -1) {
      console.log(
        `Bloco gráfico ${i + 1}: nenhum ^XA encontrado.`
      );

      continue;
    }

    const grafico =
      bloco.substring(
        0,
        primeiroXA
      );

    const blocosXA =
      bloco
        .substring(primeiroXA)
        .match(
          /\^XA[\s\S]*?\^XZ/g
        );

    if (!blocosXA) {
      console.log(
        `Bloco gráfico ${i + 1}: nenhum bloco ^XA/^XZ encontrado.`
      );

      continue;
    }

    const blocoImpressao =
      blocosXA.find(
        (label) =>
          label.includes(
            "^XGR:"
          )
      );

    if (!blocoImpressao) {
      console.log(
        `Bloco gráfico ${i + 1}: nenhum ^XGR encontrado.`
      );

      continue;
    }

    const etiquetaCompleta =
      grafico +
      "\n" +
      blocoImpressao;

    etiquetas.push(
      etiquetaCompleta
    );
  }

  console.log(
    `Etiquetas reais encontradas: ${etiquetas.length}`
  );

  if (
    etiquetas.length === 0
  ) {
    throw new Error(
      "Nenhuma etiqueta ZPL válida foi encontrada."
    );
  }

  return converterBlocosEmPdf(
    etiquetas,
    true
  );
}

/*
 * ========================================
 * CONVERSOR ZPL GENÉRICO
 * ========================================
 */

async function converterZplGenerico(
  zpl: string
) {
  console.log(
    "Usando conversor ZPL genérico."
  );

  const blocos =
    zpl.match(
      /\^XA[\s\S]*?\^XZ/g
    );

  if (!blocos || blocos.length === 0) {
    throw new Error(
      "Não foram encontrados blocos ZPL ^XA/^XZ válidos."
    );
  }

  console.log(
    `Blocos ZPL genéricos encontrados: ${blocos.length}`
  );

  /*
   * Procura comandos de definição gráfica
   * antes das etiquetas.
   *
   * Eles serão reutilizados em cada bloco.
   */

  const primeiroXA =
    zpl.indexOf("^XA");

  let definicoes = "";

  if (primeiroXA > 0) {
    definicoes =
      zpl.substring(
        0,
        primeiroXA
      ).trim();
  }

  const blocosPreparados =
    blocos.map(
      (bloco) => {
        if (!definicoes) {
          return bloco;
        }

        return (
          definicoes +
          "\n" +
          bloco
        );
      }
    );

  return converterBlocosEmPdf(
    blocosPreparados,
    false
  );
}

/*
 * ========================================
 * PROCESSA BLOCOS E GERA PDF
 * ========================================
 */

async function converterBlocosEmPdf(
  etiquetas: string[],
  usarNomeGrafico: boolean
) {
  const finalPdf =
    await PDFDocument.create();

  const tamanhoDoBloco = 5;

  const totalBlocos =
    Math.ceil(
      etiquetas.length /
        tamanhoDoBloco
    );

  console.log(
    `Serão processados ${totalBlocos} blocos de até ${tamanhoDoBloco} etiquetas.`
  );

  for (
    let inicio = 0;
    inicio < etiquetas.length;
    inicio += tamanhoDoBloco
  ) {
    const fim =
      Math.min(
        inicio +
          tamanhoDoBloco,
        etiquetas.length
      );

    const numeroBloco =
      Math.floor(
        inicio /
          tamanhoDoBloco
      ) + 1;

    console.log(
      `Processando bloco ${numeroBloco} de ${totalBlocos}: etiquetas ${inicio + 1} até ${fim}...`
    );

    let etiquetasDoBloco =
      etiquetas.slice(
        inicio,
        fim
      );

    /*
     * O formato antigo precisa
     * substituir DEMO.GRF.
     */

    if (usarNomeGrafico) {
      etiquetasDoBloco =
        etiquetasDoBloco.map(
          (
            etiqueta,
            indice
          ) => {
            const numeroEtiqueta =
              inicio +
              indice +
              1;

            const nomeGrafico =
              `LBL${String(
                numeroEtiqueta
              ).padStart(
                3,
                "0"
              )}.GRF`;

            return etiqueta.replace(
              /DEMO\.GRF/g,
              nomeGrafico
            );
          }
        );
    }

    const blocoZpl =
      etiquetasDoBloco.join(
        "\n"
      );

    console.log(
      `Tamanho do bloco enviado: ${blocoZpl.length} caracteres.`
    );

    const pdfRecebido =
      await enviarParaLabelary(
        blocoZpl,
        numeroBloco
      );

    const blocoPdf =
      await PDFDocument.load(
        pdfRecebido
      );

    console.log(
      `Bloco convertido com ${blocoPdf.getPageCount()} página(s).`
    );

    const paginas =
      await finalPdf.copyPages(
        blocoPdf,
        blocoPdf.getPageIndices()
      );

    paginas.forEach(
      (pagina) => {
        finalPdf.addPage(
          pagina
        );
      }
    );

    console.log(
      `PDF acumulado possui ${finalPdf.getPageCount()} página(s).`
    );

    if (
      fim < etiquetas.length
    ) {
      await esperar(2000);
    }
  }

  console.log(
    `CONVERSÃO DAS ETIQUETAS CONCLUÍDA: ${finalPdf.getPageCount()} páginas.`
  );

  return finalPdf;
}

/*
 * ========================================
 * IDENTIFICA O TIPO DE ZPL
 * ========================================
 */

async function converterZpl(
  zpl: string
) {
  console.log(
    `Tamanho do ZPL recebido: ${zpl.length}`
  );

  const temFormatoEspecial =
    zpl.includes("~DGR:") &&
    zpl.includes("^XGR:");

  if (temFormatoEspecial) {
    console.log(
      "Formato especial detectado (~DGR + ^XGR)."
    );

    return converterZplEspecial(
      zpl
    );
  }

  console.log(
    "Formato especial não detectado. Tentando ZPL genérico."
  );

  return converterZplGenerico(
    zpl
  );
}

/*
 * ========================================
 * POST
 * ========================================
 */

export async function POST(
  request: Request
) {
  try {
    const formData =
      await request.formData();

    const arquivo =
      formData.get("file");

    const organizacao =
      String(
        formData.get(
          "organizacao"
        ) ||
        "intercalado"
      );

    console.log(
      "ORGANIZAÇÃO ESCOLHIDA:",
      organizacao
    );

    if (
      !(arquivo instanceof File)
    ) {
      return new Response(
        "Nenhum arquivo foi enviado.",
        {
          status: 400,
        }
      );
    }

    console.log(
      "================================="
    );

    console.log(
      "ARQUIVO RECEBIDO"
    );

    console.log(
      "Nome:",
      arquivo.name
    );

    console.log(
      "Tipo:",
      arquivo.type
    );

    console.log(
      "Tamanho:",
      arquivo.size
    );

    console.log(
      "================================="
    );

    const nome =
      arquivo.name.toLowerCase();

    let zpl = "";

    let declaracao:
      Uint8Array | null = null;

    /*
     * ========================================
     * ZIP
     * ========================================
     */

    if (
      nome.endsWith(".zip") ||
      arquivo.type ===
        "application/zip" ||
      arquivo.type ===
        "application/x-zip-compressed"
    ) {
      console.log(
        "ZIP detectado."
      );

      const buffer =
        await arquivo.arrayBuffer();

      const arquivos =
        await extrairArquivosDoZip(
          buffer
        );

      zpl =
        arquivos.zpl;

      declaracao =
        arquivos.declaracao;

      console.log(
        `Quantidade de arquivos ZPL encontrados: ${arquivos.quantidadeZpl}`
      );

    } else {
      /*
       * ========================================
       * ARQUIVO DIRETO
       * ========================================
       */

      console.log(
        "Tratando arquivo recebido como ZPL."
      );

      zpl =
        await arquivo.text();
    }

    /*
     * ========================================
     * CONVERSÃO
     * ========================================
     */

    const pdfEtiquetas =
      await converterZpl(
        zpl
      );

    /*
     * ========================================
     * SOMENTE ETIQUETAS
     * ========================================
     */

    if (
      organizacao ===
      "somente-etiquetas"
    ) {
      console.log(
        "Modo: SOMENTE ETIQUETAS"
      );

      const pdfBytes =
        await pdfEtiquetas.save();

      return new Response(
  Buffer.from(pdfBytes),
        {
          status: 200,
          headers: {
            "Content-Type":
              "application/pdf",

            "Content-Disposition":
              'attachment; filename="etiquetas.pdf"',
          },
        }
      );
    }

    /*
     * ========================================
     * SEM DECLARAÇÃO
     * ========================================
     */

    if (!declaracao) {
      console.log(
        "Nenhum PDF de declaração encontrado."
      );

      const pdfBytes =
        await pdfEtiquetas.save();

      return new Response(
  Buffer.from(pdfBytes),
        {
          status: 200,
          headers: {
            "Content-Type":
              "application/pdf",

            "Content-Disposition":
              'attachment; filename="etiquetas.pdf"',
          },
        }
      );
    }

    /*
     * ========================================
     * CARREGA DECLARAÇÕES
     * ========================================
     */

    console.log(
      "Abrindo PDF de declarações..."
    );

    const pdfDeclaracoes =
      await PDFDocument.load(
        declaracao
      );

    const totalEtiquetas =
      pdfEtiquetas.getPageCount();

    const totalDeclaracoes =
      pdfDeclaracoes.getPageCount();

    console.log(
      `Etiquetas: ${totalEtiquetas}`
    );

    console.log(
      `Declarações: ${totalDeclaracoes}`
    );

    if (
      totalEtiquetas !==
      totalDeclaracoes
    ) {
      throw new Error(
        `Quantidade diferente: ${totalEtiquetas} etiquetas e ${totalDeclaracoes} declarações.`
      );
    }

    const paginaEtiqueta =
      pdfEtiquetas.getPage(0);

    const larguraEtiqueta =
      paginaEtiqueta.getWidth();

    const alturaEtiqueta =
      paginaEtiqueta.getHeight();

    console.log(
      `Tamanho da etiqueta: ${larguraEtiqueta} x ${alturaEtiqueta}`
    );

    /*
     * ========================================
     * FUNÇÃO PARA ADICIONAR DECLARAÇÃO
     * ========================================
     */

    async function adicionarDeclaracao(
      pdfFinal: PDFDocument,
      indice: number
    ) {
      const paginaDeclaracaoOriginal =
        pdfDeclaracoes.getPage(
          indice
        );

      const larguraDeclaracao =
        paginaDeclaracaoOriginal.getWidth();

      const alturaDeclaracao =
        paginaDeclaracaoOriginal.getHeight();

      console.log(
        `Declaração ${indice + 1}: ${larguraDeclaracao} x ${alturaDeclaracao}`
      );

      const paginaDeclaracaoFinal =
        pdfFinal.addPage([
          larguraEtiqueta,
          alturaEtiqueta,
        ]);

      const margem = 10;

      const areaLargura =
        larguraEtiqueta -
        margem * 2;

      const areaAltura =
        alturaEtiqueta -
        margem * 2;

      const escalaX =
        areaLargura /
        larguraDeclaracao;

      const escalaY =
        areaAltura /
        alturaDeclaracao;

      const escala =
        Math.min(
          escalaX,
          escalaY
        );

      const novaLargura =
        larguraDeclaracao *
        escala;

      const novaAltura =
        alturaDeclaracao *
        escala;

      const x =
        (larguraEtiqueta -
          novaLargura) /
        2;

      const y =
        (alturaEtiqueta -
          novaAltura) /
        2;

      const declaracaoEmbutida =
        await pdfFinal.embedPage(
          paginaDeclaracaoOriginal
        );

      paginaDeclaracaoFinal.drawPage(
        declaracaoEmbutida,
        {
          x,
          y,
          width:
            novaLargura,
          height:
            novaAltura,
        }
      );
    }

    /*
     * ========================================
     * ETIQUETA + DECLARAÇÃO
     * ========================================
     */

    if (
      organizacao ===
      "intercalado"
    ) {
      console.log(
        "Modo: ETIQUETA + DECLARAÇÃO"
      );

      const pdfFinal =
        await PDFDocument.create();

      for (
        let i = 0;
        i < totalEtiquetas;
        i++
      ) {
        console.log(
          `Montando etiqueta + declaração ${i + 1} de ${totalEtiquetas}...`
        );

        const [
          paginaEtiquetaFinal,
        ] =
          await pdfFinal.copyPages(
            pdfEtiquetas,
            [i]
          );

        pdfFinal.addPage(
          paginaEtiquetaFinal
        );

        await adicionarDeclaracao(
          pdfFinal,
          i
        );
      }

      console.log(
        `PDF FINAL POSSUI ${pdfFinal.getPageCount()} PÁGINAS.`
      );

      const pdfBytes =
        await pdfFinal.save();

      return new Response(
  Buffer.from(pdfBytes),
        {
          status: 200,
          headers: {
            "Content-Type":
              "application/pdf",

            "Content-Disposition":
              'attachment; filename="etiquetas-e-declaracoes.pdf"',
          },
        }
      );
    }

    /*
     * ========================================
     * ETIQUETAS → DECLARAÇÕES
     * ========================================
     */

    if (
      organizacao ===
      "separado"
    ) {
      console.log(
        "Modo: ETIQUETAS → DECLARAÇÕES"
      );

      const pdfFinal =
        await PDFDocument.create();

      /*
       * Primeiro todas as etiquetas
       */

      const paginasEtiquetas =
        await pdfFinal.copyPages(
          pdfEtiquetas,
          pdfEtiquetas.getPageIndices()
        );

      paginasEtiquetas.forEach(
        (pagina) => {
          pdfFinal.addPage(
            pagina
          );
        }
      );

      console.log(
        `Adicionadas ${totalEtiquetas} etiquetas.`
      );

      /*
       * Depois todas as declarações
       */

      for (
        let i = 0;
        i < totalDeclaracoes;
        i++
      ) {
        console.log(
          `Adicionando declaração ${i + 1} de ${totalDeclaracoes}...`
        );

        await adicionarDeclaracao(
          pdfFinal,
          i
        );
      }

      console.log(
        `PDF FINAL POSSUI ${pdfFinal.getPageCount()} PÁGINAS.`
      );

      const pdfBytes =
        await pdfFinal.save();

      return new Response(
  Buffer.from(pdfBytes),
        {
          status: 200,
          headers: {
            "Content-Type":
              "application/pdf",

            "Content-Disposition":
              'attachment; filename="etiquetas-declaracoes-separadas.pdf"',
          },
        }
      );
    }

    /*
     * ========================================
     * MODO PADRÃO
     * ========================================
     */

    console.log(
      "Organização desconhecida. Usando modo intercalado."
    );

    const pdfFinal =
      await PDFDocument.create();

    for (
      let i = 0;
      i < totalEtiquetas;
      i++
    ) {
      const [
        paginaEtiquetaFinal,
      ] =
        await pdfFinal.copyPages(
          pdfEtiquetas,
          [i]
        );

      pdfFinal.addPage(
        paginaEtiquetaFinal
      );

      await adicionarDeclaracao(
        pdfFinal,
        i
      );
    }

    const pdfBytes =
      await pdfFinal.save();

    return new Response(
  Buffer.from(pdfBytes),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            'attachment; filename="etiquetas-e-declaracoes.pdf"',
        },
      }
    );

  } catch (error) {
    console.error(
      "ERRO NA CONVERSÃO:",
      error
    );

    return new Response(
      error instanceof Error
        ? error.message
        : "Erro interno ao converter o arquivo.",
      {
        status: 500,
      }
    );
  }
}