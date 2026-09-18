import {
  extrairZplDoArquivo,
  prepararEtiquetas,
  prepararEtiquetaParaLabelary,
  esperar,
} from "@/lib/zpl";

export const runtime = "nodejs";

async function enviarParaLabelary(
  blocoZpl: string,
  numeroEtiqueta: number
) {
  const urlLabelary =
    "https://api.labelary.com/v1/printers/8dpmm/labels/4x6/";

  for (let tentativa = 1; tentativa <= 5; tentativa++) {
    console.log(
      `ENVIANDO ETIQUETA ${numeroEtiqueta} PARA LABELARY`
    );

    console.log(
      "TAMANHO ENVIADO:",
      blocoZpl.length
    );

    const response = await fetch(
      urlLabelary,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",

          Accept: "application/pdf",
        },

        body: blocoZpl,
      }
    );

    if (response.status === 429) {
      console.log(
        `RATE LIMIT - tentativa ${tentativa}/5`
      );

      await esperar(5000);

      continue;
    }

    if (!response.ok) {
      const erro =
        await response.text();

      throw new Error(
        `Labelary retornou ${response.status}: ${
          erro || response.statusText
        }`
      );
    }

    const bytes =
      await response.arrayBuffer();

    if (bytes.byteLength === 0) {
      console.log(
        "Labelary retornou arquivo vazio."
      );

      await esperar(3000);

      continue;
    }

    return Buffer.from(bytes);
  }

  throw new Error(
    `Não foi possível gerar a etiqueta ${numeroEtiqueta}.`
  );
}

export async function POST(
  request: Request
) {
  try {
    const formData =
      await request.formData();

    const arquivo =
      formData.get("file");

    if (!(arquivo instanceof File)) {
      return Response.json(
        {
          erro:
            "Nenhum arquivo foi enviado.",
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      "=============================="
    );

    console.log(
      "GERANDO PREVIEW"
    );

    console.log(
      "ARQUIVO:",
      arquivo.name
    );

    console.log(
      "TIPO:",
      arquivo.type
    );

    console.log(
      "TAMANHO:",
      arquivo.size
    );

    // ==========================================
    // 1. EXTRAIR ZPL
    // ==========================================

    const {
      zpl,
    } =
      await extrairZplDoArquivo(
        arquivo
      );

    console.log(
      "TAMANHO DO ZPL:",
      zpl.length
    );

    // ==========================================
    // 2. PREPARAR ETIQUETAS
    // ==========================================

    const {
      etiquetas,
      usarNomeGrafico,
    } =
      prepararEtiquetas(zpl);

    console.log(
      "FORMATO ESPECIAL:",
      usarNomeGrafico
    );

    console.log(
      "ETIQUETAS PREPARADAS:",
      etiquetas.length
    );

    // ==========================================
    // 3. LIMITAR PREVIEW
    // ==========================================

    const quantidadePreview =
      Math.min(
        etiquetas.length,
        20
      );

    console.log(
      `GERANDO ${quantidadePreview} PREVIEWS DE ${etiquetas.length} ETIQUETAS`
    );

    const previews: string[] = [];

    // ==========================================
    // 4. GERAR PREVIEWS
    // ==========================================

    for (
      let i = 0;
      i < quantidadePreview;
      i++
    ) {
      console.log(
        `GERANDO PREVIEW ${i + 1}/${quantidadePreview}`
      );

      const etiqueta =
        prepararEtiquetaParaLabelary(
          etiquetas[i],
          i,
          usarNomeGrafico
        );

      const pdf =
        await enviarParaLabelary(
          etiqueta,
          i + 1
        );

      console.log(
        `PDF DA ETIQUETA ${i + 1} RECEBIDO:`,
        pdf.length,
        "bytes"
      );

      // ========================================
      // GUARDAR PDF EM BASE64
      // ========================================

      previews.push(
        `data:application/pdf;base64,${pdf.toString(
          "base64"
        )}`
      );

      if (
        i <
        quantidadePreview - 1
      ) {
        await esperar(500);
      }
    }

    // ==========================================
    // 5. FINALIZAÇÃO
    // ==========================================

    console.log(
      "PREVIEW CONCLUÍDO"
    );

    console.log(
      "TOTAL DE ETIQUETAS:",
      etiquetas.length
    );

    console.log(
      "ETIQUETAS EXIBIDAS:",
      previews.length
    );

    console.log(
      "=============================="
    );

    return Response.json({
      etiquetas: previews,

      total:
        etiquetas.length,

      exibidas:
        previews.length,
    });
  } catch (error) {
    console.error(
      "ERRO AO GERAR PREVIEW:",
      error
    );

    return Response.json(
      {
        erro:
          error instanceof Error
            ? error.message
            : "Erro ao gerar preview.",
      },
      {
        status: 500,
      }
    );
  }
}
