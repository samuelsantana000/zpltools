import JSZip from "jszip";

/**
 * Aguarda alguns milissegundos.
 */
export function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extrai o conteúdo ZPL e a declaração de conteúdo de um ZIP.
 */
export async function extrairArquivosDoZip(buffer: ArrayBuffer) {
  const zip = await JSZip.loadAsync(buffer);

  const zpls: string[] = [];
  let declaracao: Uint8Array | null = null;

  for (const nome of Object.keys(zip.files)) {
    const arquivo = zip.files[nome];

    if (arquivo.dir) continue;

    const nomeMinusculo = nome.toLowerCase();

    if (
      nomeMinusculo.endsWith(".zpl") ||
      nomeMinusculo.endsWith(".txt")
    ) {
      const conteudo = await arquivo.async("string");

      if (
        conteudo.includes("^XA") &&
        conteudo.includes("^XZ")
      ) {
        zpls.push(conteudo);
      }
    }

    if (
      nomeMinusculo.endsWith(".pdf") &&
      (
        nomeMinusculo.includes("content_declaration") ||
        nomeMinusculo.includes("declaration") ||
        nomeMinusculo.includes("declaracao")
      )
    ) {
      declaracao = await arquivo.async("uint8array");
    }
  }

  if (zpls.length === 0) {
    throw new Error(
      "Nenhum arquivo ZPL/TXT válido foi encontrado dentro do ZIP."
    );
  }

  return {
    zpl: zpls.join("\n"),
    declaracao,
    quantidadeZpl: zpls.length,
  };
}

/**
 * Extrai o ZPL de um arquivo individual ou ZIP.
 */
export async function extrairZplDoArquivo(arquivo: File) {
  const nome = arquivo.name.toLowerCase();

  const ehZip =
    nome.endsWith(".zip") ||
    arquivo.type === "application/zip" ||
    arquivo.type === "application/x-zip-compressed";

  if (ehZip) {
    const buffer = await arquivo.arrayBuffer();

    return await extrairArquivosDoZip(buffer);
  }

  const zpl = await arquivo.text();

  if (
    !zpl.includes("^XA") ||
    !zpl.includes("^XZ")
  ) {
    throw new Error(
      "O arquivo não contém um ZPL válido."
    );
  }

  return {
    zpl,
    declaracao: null,
    quantidadeZpl: 1,
  };
}

/**
 * Verifica se o arquivo utiliza o formato especial
 * com definições gráficas ~DGR e impressão através de ^XGR.
 */
export function possuiFormatoEspecial(zpl: string) {
  return (
    zpl.includes("~DGR:") &&
    zpl.includes("^XGR:")
  );
}

/**
 * Prepara etiquetas ZPL no formato especial.
 *
 * Esta é a mesma lógica utilizada atualmente
 * pelo /api/convert.
 */
export function prepararEtiquetasEspeciais(zpl: string) {
  const blocosGrafico =
    zpl.match(/\~DGR:[\s\S]*?(?=\~DGR:|$)/g);

  if (!blocosGrafico || blocosGrafico.length === 0) {
    throw new Error(
      "Não foram encontradas definições gráficas ~DGR no arquivo ZPL."
    );
  }

  const etiquetas: string[] = [];

  for (let i = 0; i < blocosGrafico.length; i++) {
    const bloco = blocosGrafico[i];

    const primeiroXA = bloco.indexOf("^XA");

    if (primeiroXA === -1) continue;

    const grafico = bloco.substring(0, primeiroXA);

    const blocosXA =
      bloco
        .substring(primeiroXA)
        .match(/\^XA[\s\S]*?\^XZ/g);

    if (!blocosXA) continue;

    const blocoImpressao =
      blocosXA.find((label) =>
        label.includes("^XGR:")
      );

    if (!blocoImpressao) continue;

    const etiquetaCompleta =
      grafico + "\n" + blocoImpressao;

    etiquetas.push(etiquetaCompleta);
  }

  if (etiquetas.length === 0) {
    throw new Error(
      "Nenhuma etiqueta ZPL válida foi encontrada."
    );
  }

  return etiquetas;
}

/**
 * Prepara etiquetas ZPL no formato genérico.
 *
 * Esta é a mesma lógica utilizada atualmente
 * pelo /api/convert.
 */
export function prepararEtiquetasGenericas(zpl: string) {
  const blocos =
    zpl.match(/\^XA[\s\S]*?\^XZ/g);

  if (!blocos || blocos.length === 0) {
    throw new Error(
      "Não foram encontrados blocos ZPL ^XA/^XZ válidos."
    );
  }

  const primeiroXA = zpl.indexOf("^XA");

  let definicoes = "";

  if (primeiroXA > 0) {
    definicoes = zpl
      .substring(0, primeiroXA)
      .trim();
  }

  const blocosPreparados =
    blocos.map((bloco) => {
      if (!definicoes) {
        return bloco;
      }

      return (
        definicoes +
        "\n" +
        bloco
      );
    });

  return blocosPreparados;
}

/**
 * Prepara todas as etiquetas usando exatamente
 * a mesma lógica do conversor atual.
 */
export function prepararEtiquetas(zpl: string) {
  const especial =
    possuiFormatoEspecial(zpl);

  if (especial) {
    const etiquetas =
      prepararEtiquetasEspeciais(zpl);

    return {
      etiquetas,
      usarNomeGrafico: true,
    };
  }

  const etiquetas =
    prepararEtiquetasGenericas(zpl);

  return {
    etiquetas,
    usarNomeGrafico: false,
  };
}

/**
 * Ajusta o nome do gráfico exatamente como
 * o /api/convert faz antes de enviar ao Labelary.
 */
export function prepararEtiquetaParaLabelary(
  etiqueta: string,
  indice: number,
  usarNomeGrafico: boolean
) {
  if (!usarNomeGrafico) {
    return etiqueta;
  }

  const nomeGrafico =
    `LBL${String(indice + 1).padStart(3, "0")}.GRF`;

  return etiqueta.replace(
    /DEMO\.GRF/g,
    nomeGrafico
  );
}