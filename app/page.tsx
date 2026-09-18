"use client";

import { useEffect, useRef, useState } from "react";

type Analise = {
  tipo: string;
  quantidadeZpl: number;
  quantidadeDeclaracoes: number;
};

type PreviewData = {
  etiquetas: string[];
  total: number;
  exibidas: number;
};

function PdfPreview({
  pdfData,
  indice,
}: {
  pdfData: string;
  indice: number;
}) {
  return (
    <div className="previewItem">
      <div className="previewTop">
        <div className="previewLabel">
          <span className="previewLabelDot" />
          Etiqueta
        </div>

        <strong>
          {String(indice + 1).padStart(2, "0")}
        </strong>
      </div>

      <div className="previewPdf">
        <iframe
          src={pdfData}
          title={`Preview da etiqueta ${indice + 1}`}
        />
      </div>
    </div>
  );
}

function criarArquivoDoCodigo(codigo: string) {
  const blob = new Blob([codigo], {
    type: "text/plain",
  });

  return new File([blob], "codigo.zpl", {
    type: "text/plain",
  });
}

export default function Home() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [feedbackAberto, setFeedbackAberto] = useState(false);
const [feedbackTipo, setFeedbackTipo] = useState("Sugestão");
const [feedbackTexto, setFeedbackTexto] = useState("");
const [feedbackEnviado, setFeedbackEnviado] = useState(false);
  const [codigoZpl, setCodigoZpl] = useState("");

  const [convertendo, setConvertendo] = useState(false);
  const [analisando, setAnalisando] = useState(false);
  const [gerandoPreview, setGerandoPreview] = useState(false);

  const [progresso, setProgresso] = useState(0);
  const [tempoRestante, setTempoRestante] = useState(0);

  const [mensagem, setMensagem] = useState("");
  const [mensagemPreview, setMensagemPreview] = useState("");

  const [organizacao, setOrganizacao] =
    useState("somente-etiquetas");

  const [menuAberto, setMenuAberto] = useState(false);
  const [arrastando, setArrastando] = useState(false);

  const [pdfUrl, setPdfUrl] = useState("");
  const [previewEtiquetas, setPreviewEtiquetas] =
    useState<string[]>([]);

  const [totalPreview, setTotalPreview] = useState(0);

  const [analise, setAnalise] = useState<Analise | null>(
    null
  );

  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const previewTimerRef = useRef<ReturnType<
    typeof setInterval
  > | null>(null);

  const previewIdRef = useRef(0);

  const carrosselRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function fecharMenu(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuAberto(false);
      }
    }

    document.addEventListener("mousedown", fecharMenu);

    return () => {
      document.removeEventListener(
        "mousedown",
        fecharMenu
      );
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) {
        clearInterval(previewTimerRef.current);
      }

      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  async function analisarArquivo(
    arquivoSelecionado: File
  ) {
    try {
      setAnalisando(true);
      setMensagem("");
      setAnalise(null);

      const formData = new FormData();
      formData.append("file", arquivoSelecionado);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.erro ||
            "Não foi possível analisar o arquivo."
        );
      }

      setAnalise(data);
    } catch (error) {
      setMensagem(
        error instanceof Error
          ? error.message
          : "Erro ao analisar o arquivo."
      );
    } finally {
      setAnalisando(false);
    }
  }

  async function gerarPreview(
    arquivoSelecionado: File
  ) {
    const previewId = ++previewIdRef.current;

    try {
      setGerandoPreview(true);
      setMensagemPreview("");
      setPreviewEtiquetas([]);
      setTotalPreview(0);

      const formData = new FormData();
      formData.append("file", arquivoSelecionado);

      const response = await fetch("/api/preview", {
        method: "POST",
        body: formData,
      });

      const data: PreviewData & { erro?: string } =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.erro ||
            "Não foi possível gerar o preview."
        );
      }

      if (previewId !== previewIdRef.current) {
        return;
      }

      setPreviewEtiquetas(data.etiquetas || []);
      setTotalPreview(data.total || 0);

      if (
        !data.etiquetas ||
        data.etiquetas.length === 0
      ) {
        setMensagemPreview(
          "Não foi possível gerar uma visualização para este arquivo."
        );
      }
    } catch (error) {
      if (previewId !== previewIdRef.current) {
        return;
      }

      setMensagemPreview(
        error instanceof Error
          ? error.message
          : "Erro ao gerar preview."
      );
    } finally {
      if (previewId === previewIdRef.current) {
        setGerandoPreview(false);
      }
    }
  }

  async function lidarComArquivo(
    arquivoSelecionado: File
  ) {
    if (!arquivoSelecionado) return;

    setMensagem("");
    setMensagemPreview("");
    setCodigoZpl("");
    setPdfUrl("");
    setProgresso(0);
    setTempoRestante(0);

    setArquivo(arquivoSelecionado);

    await analisarArquivo(arquivoSelecionado);

    gerarPreview(arquivoSelecionado);
  }

  function selecionarArquivo(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const arquivoSelecionado =
      event.target.files?.[0];

    if (!arquivoSelecionado) return;

    lidarComArquivo(arquivoSelecionado);
  }

  function abrirSeletor() {
    inputRef.current?.click();
  }

  function lidarComDrop(
    event: React.DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setArrastando(false);

    const arquivoSelecionado =
      event.dataTransfer.files?.[0];

    if (!arquivoSelecionado) return;

    lidarComArquivo(arquivoSelecionado);
  }

  function lidarComCodigo(
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) {
    const codigo = event.target.value;

    setCodigoZpl(codigo);

    if (!codigo.trim()) {
      setArquivo(null);
      setAnalise(null);
      setPreviewEtiquetas([]);
      setTotalPreview(0);
      setMensagemPreview("");
      return;
    }

    const arquivoGerado =
      criarArquivoDoCodigo(codigo);

    setArquivo(arquivoGerado);

    setAnalise({
      tipo: "zpl",
      quantidadeZpl: 1,
      quantidadeDeclaracoes: 0,
    });

    gerarPreview(arquivoGerado);
  }

  function selecionarOrganizacao(valor: string) {
    setOrganizacao(valor);
    setMenuAberto(false);
  }

  function nomeOrganizacao() {
    if (organizacao === "intercalado") {
      return "Etiquetas + declarações intercaladas";
    }

    if (organizacao === "separado") {
      return "Etiquetas + declarações separadas";
    }

    return "Somente etiquetas";
  }

  function rolarPreview(
    direcao: "esquerda" | "direita"
  ) {
    if (!carrosselRef.current) return;

    const largura =
      carrosselRef.current.clientWidth;

    carrosselRef.current.scrollBy({
      left:
        direcao === "direita"
          ? largura
          : -largura,
      behavior: "smooth",
    });
  }

  async function converter() {
    if (!arquivo) {
      setMensagem(
        "Selecione um arquivo antes de converter."
      );
      return;
    }

    try {
      setConvertendo(true);
      setMensagem("");
      setPdfUrl("");
      setProgresso(0);

      setTempoRestante(
        Math.max(
          5,
          Math.ceil(
            ((analise?.quantidadeZpl || 1) / 5) *
              2.5
          )
        )
      );

      const inicio = Date.now();

      if (previewTimerRef.current) {
        clearInterval(previewTimerRef.current);
      }

      previewTimerRef.current = setInterval(() => {
        const quantidade =
          analise?.quantidadeZpl || 1;

        const estimativa = Math.max(
          5,
          Math.ceil((quantidade / 5) * 2.5)
        );

        const decorrido =
          (Date.now() - inicio) / 1000;

        const progressoEstimado = Math.min(
          95,
          Math.max(
            5,
            Math.round(
              (decorrido / estimativa) * 100
            )
          )
        );

        setProgresso(progressoEstimado);

        const restante = Math.max(
          0,
          Math.ceil(estimativa - decorrido)
        );

        setTempoRestante(restante);
      }, 500);

      const formData = new FormData();

      formData.append("file", arquivo);
      formData.append(
        "organizacao",
        organizacao
      );

      const response = await fetch(
        "/api/convert",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        let erro =
          "Erro ao converter o arquivo.";

        try {
          const data = await response.json();

          if (data.erro) {
            erro = data.erro;
          }
        } catch {}

        throw new Error(erro);
      }

      const blob = await response.blob();

      const url = URL.createObjectURL(blob);

      setPdfUrl(url);
      setProgresso(100);
      setTempoRestante(0);
      setMensagem(
        "Conversão concluída com sucesso!"
      );
    } catch (error) {
      setMensagem(
        error instanceof Error
          ? error.message
          : "Erro ao converter o arquivo."
      );

      setProgresso(0);
      setTempoRestante(0);
    } finally {
      if (previewTimerRef.current) {
        clearInterval(previewTimerRef.current);
        previewTimerRef.current = null;
      }

      setConvertendo(false);
    }
  }

  function baixarPdf() {
    if (!pdfUrl) return;

    const link = document.createElement("a");

    link.href = pdfUrl;
    link.download =
      "etiquetas-convertidas.pdf";

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function imprimirPdf() {
    if (!pdfUrl) return;

    const janela = window.open(
      pdfUrl,
      "_blank"
    );

    if (!janela) {
      setMensagem(
        "O navegador bloqueou a abertura da janela de impressão."
      );

      return;
    }

    janela.addEventListener("load", () => {
      janela.print();
    });
  }

  function limparTudo() {
    previewIdRef.current++;

    if (previewTimerRef.current) {
      clearInterval(previewTimerRef.current);
      previewTimerRef.current = null;
    }

    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }

    setArquivo(null);
    setCodigoZpl("");
    setConvertendo(false);
    setAnalisando(false);
    setGerandoPreview(false);
    setProgresso(0);
    setTempoRestante(0);
    setMensagem("");
    setMensagemPreview("");
    setOrganizacao("somente-etiquetas");
    setMenuAberto(false);
    setArrastando(false);
    setPdfUrl("");
    setPreviewEtiquetas([]);
    setTotalPreview(0);
    setAnalise(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const temArquivo = !!arquivo;
  const temPreview = previewEtiquetas.length > 0;

  return (
    <main className="pagina">
      <div className="container">

        <header className="header">

          <div className="logoArea">

            <div className="logoIcon">
              Z
            </div>

            <div>
              <div className="logoNome">
                ZPLTools
                <span className="betaBadge">BETA</span>
              </div>

              <div className="logoSub">
                ZPL → PDF
              </div>
            </div>

          </div>

          <div className="headerRight">
  <span className="onlineDot" />
  <span>Sistema online</span>
</div>

        </header>


        <section className="hero">

          <div className="heroTag">
            <span>✦</span>
            Conversor de etiquetas
          </div>

          <h1>
            ZPL para PDF,
            <span> simples e rápido.</span>
          </h1>

          <p>
            Envie suas etiquetas, visualize o resultado
            e gere seu PDF em poucos segundos.
          </p>

        </section>
                


        <div className="feedbackHighlight">

          <div className="feedbackHighlightIcon">
            💡
          </div>

          <div className="feedbackHighlightInfo">
            <strong>
              Tem uma sugestão para o ZPLTools?
            </strong>

            <span>
              Estamos melhorando a ferramenta.
              Conte sua ideia ou diga o que podemos melhorar.
            </span>
          </div>

          <button
            className="feedbackHighlightButton"
            type="button"
            onClick={() => setFeedbackAberto(true)}
          >
            Enviar sugestão
            <span>→</span>
          </button>

        </div>


    
        <section className="workspace">

          <div className="previewPanel">

            <div className="panelHeader">

              <div>
                <div className="panelTitle">
                  Visualizador
                </div>

                <div className="panelSub">
                  Confira sua etiqueta antes da conversão
                </div>
              </div>

              {totalPreview > 0 && (
                <div className="counter">
                  {previewEtiquetas.length} /{" "}
                  {totalPreview}
                </div>
              )}

            </div>


            <div className="previewContent">

              {gerandoPreview ? (

                <div className="loadingPreview">

                  <div className="loadingOrb">
                    <div className="spinner" />
                  </div>

                  <strong>
                    Gerando visualização
                  </strong>

                  <span>
                    Preparando suas etiquetas...
                  </span>

                </div>

              ) : temPreview ? (

                <div className="previewNavigation">

                  <div
                    className="arrow"
                    onClick={() =>
                      rolarPreview("esquerda")
                    }
                  >
                    ‹
                  </div>

                  <div
                    className="carousel"
                    ref={carrosselRef}
                  >

                    {previewEtiquetas.map(
                      (pdf, index) => (

                        <div
                          className="slide"
                          key={`${index}-${pdf.length}`}
                        >
                          <PdfPreview
                            pdfData={pdf}
                            indice={index}
                          />
                        </div>

                      )
                    )}

                  </div>

                  <div
                    className="arrow"
                    onClick={() =>
                      rolarPreview("direita")
                    }
                  >
                    ›
                  </div>

                </div>

              ) : (

                <div className="emptyPreview">

                  <div className="emptyIcon">
                    <span>◇</span>
                  </div>

                  <strong>
                    Sua etiqueta aparecerá aqui
                  </strong>

                  <span>
                    Selecione um arquivo ou cole seu código ZPL
                  </span>

                </div>

              )}

            </div>


            {totalPreview > 0 && (
              <div className="previewFooter">

                <div className="previewStatus">
                  <span className="statusDot" />

                  Visualização disponível
                </div>

                <div>
                  Mostrando{" "}
                  <strong>
                    {previewEtiquetas.length}
                  </strong>{" "}
                  de{" "}
                  <strong>
                    {totalPreview}
                  </strong>
                </div>

              </div>
            )}

            {mensagemPreview && !temPreview && !gerandoPreview && (
              <div className="previewError">
                !
                <span>{mensagemPreview}</span>
              </div>
            )}

          </div>


          <div className="controlColumn">

            <section className="card">

              <div className="sectionHead">

                <div>
                  <div className="sectionTitle">
                    Seu arquivo
                  </div>

                  <div className="sectionSub">
                    ZPL, TXT ou ZIP
                  </div>
                </div>

                {temArquivo && (
                  <div
                    className="textAction"
                    onClick={limparTudo}
                  >
                    Limpar
                  </div>
                )}

              </div>


              {!temArquivo ? (

                <div
                  className={`upload ${
                    arrastando
                      ? "uploadActive"
                      : ""
                  }`}
                  onClick={abrirSeletor}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setArrastando(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setArrastando(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setArrastando(false);
                  }}
                  onDrop={lidarComDrop}
                >

                  <div className="uploadSymbol">
                    ↑
                  </div>

                  <div className="uploadText">

                    <strong>
                      Arraste seu arquivo
                    </strong>

                    <span>
                      ou clique para selecionar
                    </span>

                  </div>

                  <div className="uploadButton">
                    Selecionar arquivo
                  </div>

                  <div className="uploadHint">
                    ZPL · TXT · ZIP
                  </div>

                  <input
                    ref={inputRef}
                    type="file"
                    accept=".zpl,.txt,.zip,text/plain,application/zip"
                    onChange={selecionarArquivo}
                    hidden
                  />

                </div>

              ) : (

                <div className="fileBox">

                  <div className="fileIcon">
                    <span>Z</span>
                  </div>

                  <div className="fileInfo">

                    <div className="fileName">
                      {arquivo.name}
                    </div>

                    <div className="fileMeta">

                      {(arquivo.size / 1024).toFixed(
                        1
                      )} KB

                      <span>•</span>

                      {analisando
                        ? "Analisando..."
                        : analise
                        ? `${
                            analise.quantidadeZpl
                          } etiqueta${
                            analise.quantidadeZpl ===
                            1
                              ? ""
                              : "s"
                          }`
                        : "Pronto"}

                    </div>

                  </div>

                  <div className="fileReady">
                    <span>✓</span>
                    Pronto
                  </div>

                  <div
                    className="fileRemove"
                    onClick={limparTudo}
                  >
                    ×
                  </div>

                </div>

              )}


              <div className="codeSection">

                <div className="codeLabel">
                  Ou cole o código ZPL
                </div>

                <textarea
                  value={codigoZpl}
                  onChange={lidarComCodigo}
                  placeholder={`^XA
^FO50,50
^A0N,40,40
^FDMinha etiqueta^FS
^XZ`}
                  spellCheck={false}
                />

              </div>

              {mensagem && (
                <div
                  className={`message ${
                    mensagem.includes("sucesso")
                      ? "messageSuccess"
                      : "messageError"
                  }`}
                >
                  <span>
                    {mensagem.includes("sucesso")
                      ? "✓"
                      : "!"}
                  </span>

                  {mensagem}
                </div>
              )}

            </section>


            {temArquivo && (

              <section className="card conversionCard">

                <div className="sectionHead">

                  <div>
                    <div className="sectionTitle">
                      Conversão
                    </div>

                    <div className="sectionSub">
                      Configure o PDF final
                    </div>
                  </div>

                </div>


                <div className="organization">

                  <div className="fieldLabel">
                    Organização do PDF
                  </div>

                  <div
                    className="customSelect"
                    ref={menuRef}
                  >

                    <div
                      className="selectCurrent"
                      onClick={() =>
                        setMenuAberto(
                          !menuAberto
                        )
                      }
                    >

                      <span>
                        {nomeOrganizacao()}
                      </span>

                      <span className="selectArrow">
                        {menuAberto ? "⌃" : "⌄"}
                      </span>

                    </div>


                    {menuAberto && (

                      <div className="selectMenu">

                        <div
                          className={`option ${
                            organizacao ===
                            "somente-etiquetas"
                              ? "optionActive"
                              : ""
                          }`}
                          onClick={() =>
                            selecionarOrganizacao(
                              "somente-etiquetas"
                            )
                          }
                        >

                          <div>
                            <strong>
                              Somente etiquetas
                            </strong>

                            <span>
                              Apenas as etiquetas
                            </span>
                          </div>

                          {organizacao ===
                            "somente-etiquetas" && (
                            <b>✓</b>
                          )}

                        </div>


                        <div
                          className={`option ${
                            organizacao ===
                            "intercalado"
                              ? "optionActive"
                              : ""
                          }`}
                          onClick={() =>
                            selecionarOrganizacao(
                              "intercalado"
                            )
                          }
                        >

                          <div>
                            <strong>
                              Intercalado
                            </strong>

                            <span>
                              Etiqueta + declaração
                            </span>
                          </div>

                          {organizacao ===
                            "intercalado" && (
                            <b>✓</b>
                          )}

                        </div>


                        <div
                          className={`option ${
                            organizacao ===
                            "separado"
                              ? "optionActive"
                              : ""
                          }`}
                          onClick={() =>
                            selecionarOrganizacao(
                              "separado"
                            )
                          }
                        >

                          <div>
                            <strong>
                              Separado
                            </strong>

                            <span>
                              Etiquetas e declarações
                            </span>
                          </div>

                          {organizacao ===
                            "separado" && (
                            <b>✓</b>
                          )}

                        </div>

                      </div>

                    )}

                  </div>

                </div>


                <div className="stats">

                  <div className="stat">

                    <span>Etiquetas</span>

                    <strong>
                      {analise?.quantidadeZpl ||
                        "—"}
                    </strong>

                  </div>

                  <div className="stat">

                    <span>Declarações</span>

                    <strong>
                      {analise?.quantidadeDeclaracoes ||
                        "—"}
                    </strong>

                  </div>

                </div>


                <div
                  className={`convertButton ${
                    convertendo
                      ? "convertDisabled"
                      : ""
                  }`}
                  onClick={() => {
                    if (!convertendo) {
                      converter();
                    }
                  }}
                >

                  {convertendo ? (
                    <>
                      <span className="buttonSpinner" />
                      Convertendo...
                    </>
                  ) : (
                    <>
                      Converter para PDF
                      <span>→</span>
                    </>
                  )}

                </div>


                <div className="conversionActions">

                  <div
                    className={`actionButton actionDownload ${
                      !pdfUrl
                        ? "actionDisabled"
                        : ""
                    }`}
                    onClick={() => {
                      if (pdfUrl) {
                        baixarPdf();
                      }
                    }}
                  >
                    <span>↓</span>
                    Baixar PDF
                  </div>

                  <div
                    className={`actionButton actionPrint ${
                      !pdfUrl
                        ? "actionDisabled"
                        : ""
                    }`}
                    onClick={() => {
                      if (pdfUrl) {
                        imprimirPdf();
                      }
                    }}
                  >
                    <span>▣</span>
                    Imprimir
                  </div>

                </div>


                {convertendo && (

                  <div className="progressArea">

                    <div className="progressTop">

                      <span>
                        Processando etiquetas
                      </span>

                      <strong>
                        {progresso}%
                      </strong>

                    </div>

                    <div className="progressBar">

                      <div
                        className="progressValue"
                        style={{
                          width:
                            `${progresso}%`,
                        }}
                      />

                    </div>

                    <div className="progressBottom">

                      {tempoRestante > 0
                        ? `aproximadamente ${tempoRestante}s restantes`
                        : "Finalizando..."}

                    </div>

                  </div>

                )}

              </section>

            )}

          </div>

        </section>


        {pdfUrl && (

          <section className="result">

            <div className="resultCheck">
              ✓
            </div>

            <div className="resultInfo">

              <strong>
                PDF pronto
              </strong>

              <span>
                Seu arquivo foi convertido com sucesso.
              </span>

            </div>

          </section>

        )}


        <footer>
          <span>ZPLTools</span>
          <i>•</i>
          Conversor ZPL para PDF
        </footer>
        {feedbackAberto && (
  <div
    className="feedbackOverlay"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        setFeedbackAberto(false);
        setFeedbackEnviado(false);
      }
    }}
  >
    <div className="feedbackModal">

      {feedbackEnviado ? (
        <div className="feedbackSuccess">

          <div className="feedbackSuccessIcon">
            ✓
          </div>

          <strong>
            Feedback enviado!
          </strong>

          <span>
            Obrigado por ajudar a melhorar o ZPLTools.
          </span>

          <button
            type="button"
            className="feedbackSuccessButton"
            onClick={() => {
              setFeedbackEnviado(false);
              setFeedbackAberto(false);
            }}
          >
            Fechar
          </button>

        </div>
      ) : (

        <>
          <button
            className="feedbackClose"
            type="button"
            onClick={() => setFeedbackAberto(false)}
            aria-label="Fechar"
          >
            ×
          </button>

          <div className="feedbackModalIcon">
            💡
          </div>

          <div className="feedbackModalHead">
            <strong>Envie sua sugestão</strong>

            <span>
              Sua opinião ajuda a melhorar o ZPLTools.
            </span>
          </div>

          <div className="feedbackField">
            <label>Tipo de feedback</label>

            <div className="feedbackTypes">
              {["Sugestão", "Bug / erro", "Melhoria"].map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  className={`feedbackType ${
                    feedbackTipo === tipo
                      ? "feedbackTypeActive"
                      : ""
                  }`}
                  onClick={() => setFeedbackTipo(tipo)}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          <div className="feedbackField">
            <label htmlFor="feedbackTexto">
              Sua mensagem
            </label>

            <textarea
              id="feedbackTexto"
              value={feedbackTexto}
              onChange={(event) =>
                setFeedbackTexto(event.target.value)
              }
              placeholder="Conte sua ideia, sugestão ou problema..."
              rows={5}
            />
          </div>

          <div className="feedbackModalActions">

            <button
              type="button"
              className="feedbackCancel"
              onClick={() => setFeedbackAberto(false)}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="feedbackSend"
              onClick={async () => {
                if (!feedbackTexto.trim()) {
                  alert("Digite uma mensagem antes de enviar.");
                  return;
                }

                try {
                  const resposta = await fetch("/api/feedback", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      tipo: feedbackTipo,
                      mensagem: feedbackTexto,
                    }),
                  });

                  const dados = await resposta.json();

                  if (!resposta.ok) {
                    throw new Error(
                      dados.error || "Erro ao enviar feedback."
                    );
                  }

                  setFeedbackEnviado(true);
                  setFeedbackTexto("");

                } catch (error) {
                  console.error(error);

                  alert(
                    "Não foi possível enviar o feedback agora. Tente novamente."
                  );
                }
              }}
            >
              Enviar sugestão →
            </button>

          </div>
        </>

      )}

    </div>
  </div>
)}

      </div>


      <style>{`

        * {
          box-sizing: border-box;
        }

       body {
  margin: 0;
  background: #0b0d12;
  color: #eef0f5;

  font-family:
    Inter,
    "Segoe UI",
    Roboto,
    Helvetica,
    Arial,
    sans-serif;

  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

        .pagina {
  min-height: 100vh;
  padding: 0 28px 28px;

  background:
    radial-gradient(
      circle at 50% -12%,
      rgba(124,58,237,.16),
      transparent 38%
    ),
    radial-gradient(
      circle at 90% 45%,
      rgba(37,99,235,.06),
      transparent 32%
    ),
    #0b0d12;
}

        .container {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
        }


        /* HEADER */

        .header {
          height: 82px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          border-bottom: 1px solid #242934;
        }

        .logoArea {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .logoIcon {
          width: 42px;
          height: 42px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid rgba(167,139,250,.32);
          border-radius: 12px;

          background:
            linear-gradient(
              135deg,
              #8b5cf6,
              #2563eb
            );

          color: white;

          font-size: 22px;
          font-weight: 850;

          box-shadow:
            0 10px 28px
            rgba(76,59,160,.24);
        }

        .logoNome {
          font-size: 21px;
          font-weight: 800;
          letter-spacing: -.5px;
        }
          .betaBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  margin-left: 8px;
  padding: 3px 7px;

  border: 1px solid rgba(139, 92, 246, .28);
  border-radius: 6px;

  background: rgba(124, 58, 237, .10);

  color: #a78bfa;

  font-size: 9px;
  font-weight: 800;
  letter-spacing: .08em;

  vertical-align: middle;
}
                           

        .logoSub {
          margin-top: 2px;
          color: #697180;
          font-size: 13px;
        }

        .headerRight {
  display: inline-flex;
  align-items: center;
  gap: 8px;

  padding: 7px 11px;

  border: 1px solid rgba(74, 222, 128, .14);
  border-radius: 9px;

  background: rgba(74, 222, 128, .045);

  color: #858d9b;
  font-size: 12px;
  font-weight: 700;
}

        .onlineDot {
  width: 7px;
  height: 7px;

  border-radius: 50%;
  background: #4ade80;

  box-shadow:
    0 0 9px
    rgba(74, 222, 128, .55);

  animation: onlinePulse 2.2s ease-in-out infinite;
}

@keyframes onlinePulse {
  0%,
  100% {
    opacity: 1;
    box-shadow:
      0 0 9px
      rgba(74, 222, 128, .55);
  }

  50% {
    opacity: .65;
    box-shadow:
      0 0 5px
      rgba(74, 222, 128, .30);
  }
}


        /* HERO */

        .hero {
  padding: 34px 8px 28px;
  text-align: center;
}

        .heroTag {
          display: inline-flex;
          align-items: center;
          gap: 8px;

          padding: 8px 13px;

          border: 1px solid
            rgba(139,92,246,.25);

          border-radius: 999px;

          background:
            rgba(124,58,237,.07);

          color: #aaa0d2;

          font-size: 14px;
          font-weight: 700;
        }

        .heroTag span {
          color: #a78bfa;
        }

        .hero h1 {
  margin: 17px 0 10px;

  font-size:
    clamp(38px,4vw,56px);

  line-height: 1.03;
  letter-spacing: -3px;
  font-weight: 900;
}

        .hero h1 span {
          background:
            linear-gradient(
              90deg,
              #a78bfa,
              #60a5fa
            );

          -webkit-background-clip: text;
          background-clip: text;

          color: transparent;
        }

        .hero p {
          margin: 0 auto;

          max-width: 620px;

          color: #737b89;
          font-size: 16px;
          line-height: 1.6;
        }
        /* FEEDBACK */

        .feedbackHighlight {
          display: flex;
          align-items: center;
          gap: 16px;

          margin: 0 0 22px;

          padding: 14px 16px;

          border: 1px solid rgba(139,92,246,.20);
          border-radius: 14px;

          background:
            linear-gradient(
              135deg,
              rgba(124,58,237,.09),
              rgba(37,99,235,.045)
            );

          box-shadow:
            0 10px 30px rgba(0,0,0,.10);
        }

        .feedbackHighlightIcon {
          width: 42px;
          height: 42px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid rgba(167,139,250,.18);
          border-radius: 11px;

          background:
            rgba(124,58,237,.10);

          font-size: 19px;
        }

        .feedbackHighlightInfo {
          min-width: 0;
          flex: 1;
        }

        .feedbackHighlightInfo strong {
          display: block;

          color: #e6e8ed;

          font-size: 14px;
          font-weight: 800;
        }

        .feedbackHighlightInfo span {
          display: block;

          margin-top: 3px;

          color: #747d8c;

          font-size: 12px;
          line-height: 1.45;
        }

        .feedbackHighlightButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;

          flex-shrink: 0;

          padding: 10px 14px;

          border: 1px solid rgba(139,92,246,.28);
          border-radius: 9px;

          background:
            rgba(124,58,237,.10);

          color: #b6a3ed;

          font-family: inherit;

          font-size: 12px;
          font-weight: 800;

          cursor: pointer;

          transition:
            border-color .2s,
            background .2s,
            color .2s,
            transform .2s;
        }

        .feedbackHighlightButton:hover {
          border-color: #6856a4;

          background:
            rgba(124,58,237,.17);

          color: #d0c3f5;

          transform: translateY(-1px);
        }

        .feedbackHighlightButton span {
          font-size: 16px;
        }

        /* WORKSPACE */

        .workspace {
          display: grid;

          grid-template-columns:
            minmax(0, 1.35fr)
            minmax(420px, .85fr);

          gap: 22px;

          align-items: start;
        }


        /* VISUALIZADOR */

        .previewPanel {
          min-width: 0;

          padding: 22px;

          border: 1px solid #2b303c;
          border-radius: 19px;

          background:
            linear-gradient(
              180deg,
              #191c25,
              #14171e
            );

          box-shadow:
            0 22px 55px
            rgba(0,0,0,.21);
        }

        .panelHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 18px;

          margin-bottom: 17px;
        }

        .panelTitle {
  color: #f3f4f7;
  font-size: 19px;
  font-weight: 850;
  letter-spacing: -.35px;
}

        .panelSub {
          margin-top: 5px;
          color: #707887;
          font-size: 14px;
        }

        .counter {
          padding: 7px 11px;

          border: 1px solid #343a47;
          border-radius: 999px;

          background: #11141a;

          color: #929aaa;
          font-size: 13px;
          white-space: nowrap;
        }

        .previewContent {
          min-height: 520px;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 18px;

          border: 1px solid #292f3a;
          border-radius: 15px;

          background:
            radial-gradient(
              circle at 50% 38%,
              rgba(124,58,237,.045),
              transparent 50%
            ),
            #101319;
        }


        /* PREVIEW */

        .previewNavigation {
          width: 100%;

          display: flex;
          align-items: center;
          gap: 15px;
        }

        .carousel {
          flex: 1;
          min-width: 0;

          display: flex;

          overflow-x: auto;
          overflow-y: hidden;

          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;

          scrollbar-width: thin;
          scrollbar-color:
            #414856 #101319;
        }

        .carousel::-webkit-scrollbar {
          height: 6px;
        }

        .carousel::-webkit-scrollbar-track {
          background: #101319;
        }

        .carousel::-webkit-scrollbar-thumb {
          background: #414856;
          border-radius: 99px;
        }

        .slide {
          flex: 0 0 100%;
          min-width: 0;

          display: flex;
          justify-content: center;

          padding: 3px 8px 13px;

          scroll-snap-align: center;
        }

        .previewItem {
          width: min(455px, 100%);

          overflow: hidden;

          border: 1px solid #3b4250;
          border-radius: 15px;

          background: #0d1015;

          box-shadow:
            0 25px 55px
            rgba(0,0,0,.38);
        }

        .previewTop {
          height: 43px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 0 15px;

          border-bottom: 1px solid #2c323d;

          background:
            linear-gradient(
              180deg,
              #1b1f27,
              #15181f
            );

          color: #737c8b;

          font-size: 13px;
        }

        .previewLabel {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .previewLabelDot {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          background: #8b5cf6;

          box-shadow:
            0 0 9px
            rgba(139,92,246,.5);
        }

        .previewTop strong {
          color: #b09be8;
          font-size: 14px;
        }

        .previewPdf {
          width: 100%;
          aspect-ratio: 4 / 6;

          overflow: hidden;

          background: white;
        }

        .previewPdf iframe {
          width: 100%;
          height: 100%;

          display: block;

          border: 0;

          background: white;
        }

        .arrow {
          width: 43px;
          height: 43px;

          flex: 0 0 43px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid #363d49;
          border-radius: 50%;

          background: #15181f;

          color: #9aa2b1;

          font-size: 32px;

          cursor: pointer;
          user-select: none;

          transition:
            border-color .2s,
            color .2s,
            background .2s,
            transform .2s;
        }

        .arrow:hover {
          border-color: #6754a7;
          background: #1d2029;
          color: #b9a5ef;
          transform: scale(1.04);
        }

        .previewFooter {
          display: flex;
          align-items: center;
          justify-content: space-between;

          margin-top: 13px;

          color: #626b79;

          font-size: 13px;
        }

        .previewFooter strong {
          color: #929aaa;
        }

        .previewStatus {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .statusDot {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          background: #4ade80;
        }

        .emptyPreview {
          width: 100%;
          min-height: 560px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          text-align: center;
        }

        .emptyIcon {
          width: 68px;
          height: 68px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-bottom: 17px;

          border: 1px solid #343a47;
          border-radius: 18px;

          background:
            rgba(124,58,237,.065);

          color: #8b79bc;

          font-size: 33px;
        }

        .emptyPreview strong {
          color: #b9bec8;
          font-size: 16px;
        }

        .emptyPreview > span {
          margin-top: 7px;
          color: #626a78;
          font-size: 13px;
        }

        .loadingPreview {
          width: 100%;
          min-height: 560px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .loadingOrb {
          width: 60px;
          height: 60px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-bottom: 17px;

          border: 1px solid #393050;
          border-radius: 17px;

          background:
            rgba(124,58,237,.07);
        }

        .spinner {
          width: 28px;
          height: 28px;

          border: 3px solid #303640;
          border-top-color: #9b7be8;

          border-radius: 50%;

          animation:
            spin .75s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loadingPreview strong {
          color: #e3e5ea;
          font-size: 15px;
        }

        .loadingPreview span {
          margin-top: 6px;
          color: #656e7c;
          font-size: 13px;
        }

        .previewError {
          display: flex;
          align-items: center;
          gap: 9px;

          margin-top: 12px;
          padding: 10px 12px;

          border: 1px solid rgba(239,68,68,.12);
          border-radius: 9px;

          background: rgba(239,68,68,.045);

          color: #e99494;
          font-size: 13px;
        }


        /* CONTROLES */

        .controlColumn {
          min-width: 0;

          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .card {
          min-width: 0;

          padding: 22px;

          border: 1px solid #2b303c;
          border-radius: 19px;

          background:
            linear-gradient(
              180deg,
              #191c25,
              #15181f
            );

          box-shadow:
            0 17px 40px
            rgba(0,0,0,.15);
        }

        .sectionHead {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 18px;

          margin-bottom: 17px;
        }

        .sectionTitle {
  color: #f3f4f7;
  font-size: 19px;
  font-weight: 850;
  letter-spacing: -.35px;
}

        .sectionSub {
          margin-top: 5px;
          color: #707887;
          font-size: 14px;
        }

        .textAction {
          padding: 6px 9px;

          border-radius: 7px;

          color: #818a99;
          font-size: 13px;
          cursor: pointer;

          transition:
            color .2s,
            background .2s;
        }

        .textAction:hover {
          color: #b09bf0;
          background: #20232c;
        }


        /* UPLOAD */

        .upload {
          min-height: 220px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          border: 1px dashed #3b4250;
          border-radius: 15px;

          background:
            radial-gradient(
              circle at center,
              rgba(124,58,237,.065),
              transparent 65%
            );

          cursor: pointer;

          transition:
            border-color .2s,
            background .2s,
            transform .2s;
        }

        .upload:hover,
        .uploadActive {
          border-color: #7562b9;

          background:
            rgba(124,58,237,.075);
        }

        .uploadActive {
          transform: scale(1.002);
        }

        .uploadSymbol {
          width: 52px;
          height: 52px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-bottom: 13px;

          border: 1px solid rgba(139,92,246,.22);
          border-radius: 14px;

          background:
            rgba(124,58,237,.11);

          color: #b09bf0;

          font-size: 31px;
        }

        .uploadText {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .uploadText strong {
          color: #e4e7ec;
          font-size: 15px;
        }

        .uploadText span {
          color: #697281;
          font-size: 13px;
        }

        .uploadButton {
          margin-top: 14px;
          padding: 10px 15px;

          border-radius: 9px;

          background:
            linear-gradient(
              135deg,
              #7c3aed,
              #2563eb
            );

          color: white;

          font-size: 13px;
          font-weight: 700;

          box-shadow:
            0 9px 22px
            rgba(76,59,160,.2);
        }

        .uploadHint {
          margin-top: 10px;
          color: #555d6b;
          font-size: 11px;
          letter-spacing: .4px;
        }


        /* FILE */

.fileBox {
  position: relative;

  display: flex;
  align-items: center;
  gap: 14px;

  min-height: 82px;

  padding: 13px 14px;

  border: 1px solid #353b48;
  border-radius: 14px;

  background:
    linear-gradient(
      135deg,
      #191c25,
      #101319
    );

  box-shadow:
    0 8px 24px rgba(0,0,0,.16),
    inset 0 1px 0 rgba(255,255,255,.025);

  animation:
    fileAppear .32s cubic-bezier(.2,.8,.2,1);

  transition:
    border-color .2s,
    background .2s,
    transform .2s,
    box-shadow .2s;
}

.fileBox:hover {
  border-color: #4d5564;

  background:
    linear-gradient(
      135deg,
      #1c2029,
      #11151b
    );

  box-shadow:
    0 12px 28px rgba(0,0,0,.22),
    inset 0 1px 0 rgba(255,255,255,.03);

  transform: translateY(-1px);
}

@keyframes fileAppear {
  from {
    opacity: 0;
    transform: translateY(7px) scale(.985);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}


/* ÍCONE DO ARQUIVO */

.fileIcon {
  position: relative;

  width: 46px;
  height: 54px;

  flex-shrink: 0;

  display: flex;
  align-items: flex-end;
  justify-content: center;

  padding-bottom: 7px;

  border: 1px solid #444b59;
  border-radius: 10px;

  background:
    linear-gradient(
      145deg,
      #2b303b,
      #171b23
    );

  color: #c9b8f4;

  font-size: 14px;
  font-weight: 850;

  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.06),
    0 5px 14px rgba(0,0,0,.18);

  overflow: hidden;
}

.fileIcon::before {
  content: "";

  position: absolute;

  top: 0;
  right: 0;

  width: 17px;
  height: 17px;

  background: #11151b;

  clip-path: polygon(
    100% 0,
    0 0,
    100% 100%
  );
}

.fileIcon::after {
  content: "";

  position: absolute;

  top: 0;
  right: 0;

  width: 16px;
  height: 16px;

  border-left: 1px solid #444b59;
  border-bottom: 1px solid #444b59;

  opacity: .8;
}

.fileIcon span {
  position: relative;
  z-index: 1;

  display: flex;
  align-items: center;
  justify-content: center;

  width: 27px;
  height: 19px;

  border: 1px solid rgba(174,152,235,.12);
  border-radius: 5px;

  background:
    linear-gradient(
      135deg,
      rgba(174,152,235,.16),
      rgba(124,58,237,.07)
    );

  color: #cdbef0;

  letter-spacing: .3px;
}


/* INFORMAÇÕES */

.fileInfo {
  min-width: 0;
  flex: 1;
}

.fileName {
  overflow: hidden;

  color: #f5f6f8;

  font-size: 17px;
  font-weight: 850;
  letter-spacing: -.25px;
  line-height: 1.25;

  text-overflow: ellipsis;
  white-space: nowrap;
}

.fileMeta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;

  margin-top: 5px;

  color: #858d9b;

  font-size: 13px;
  font-weight: 600;
}

.fileMeta span {
  margin: 0 6px;

  color: #414752;
}


/* STATUS */

.fileReady {
  display: flex;
  align-items: center;
  gap: 7px;

  padding: 7px 11px;

  border: 1px solid rgba(105,208,138,.22);
  border-radius: 999px;

  background:
    linear-gradient(
      135deg,
      rgba(34,197,94,.12),
      rgba(34,197,94,.045)
    );

  color: #82e09d;

  font-size: 13px;
  font-weight: 850;
  letter-spacing: -.1px;

  white-space: nowrap;

  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.025);
}

.fileReady span {
  width: 20px;
  height: 20px;

  display: flex;
  align-items: center;
  justify-content: center;

  border: 1px solid rgba(74,222,128,.12);
  border-radius: 50%;

  background:
    rgba(34,197,94,.14);

  color: #8be5a3;

  font-size: 12px;
  font-weight: 900;
}


/* REMOVER */

.fileRemove {
  width: 36px;
  height: 36px;

  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  border: 1px solid transparent;
  border-radius: 9px;

  color: #7b8492;

  font-size: 23px;
  font-weight: 500;
  line-height: 1;

  cursor: pointer;

  transition:
    color .2s,
    background .2s,
    border-color .2s,
    transform .2s;
}

.fileRemove:hover {
  border-color: rgba(239,136,136,.18);

  background:
    rgba(239,136,136,.07);

  color: #ef8888;

  transform: scale(1.04);
}


        /* CODE */

        .codeSection {
          margin-top: 17px;
        }

        .codeLabel,
        .fieldLabel {
          margin-bottom: 8px;

          color: #737b89;

          font-size: 13px;
          font-weight: 700;
        }

        textarea {
          width: 100%;
          min-height: 145px;

          display: block;

          resize: vertical;

          padding: 13px;

          border: 1px solid #303641;
          border-radius: 11px;

          outline: none;

          background: #0f1217;

          color: #c6ccd7;

          font-family:
            "SFMono-Regular",
            Consolas,
            monospace;

          font-size: 13px;
          line-height: 1.6;

          transition:
            border-color .2s,
            box-shadow .2s;
        }

        textarea::placeholder {
          color: #4c5360;
        }

        textarea:focus {
          border-color: #6655a1;

          box-shadow:
            0 0 0 3px
            rgba(124,58,237,.08);
        }


        /* MESSAGE */

        .message {
          display: flex;
          align-items: center;
          gap: 8px;

          margin-top: 11px;
          padding: 10px 12px;

          border-radius: 9px;

          font-size: 12px;
        }

        .messageError {
          color: #e99898;
          background:
            rgba(239,68,68,.06);
        }

        .messageSuccess {
          color: #79ce91;
          background:
            rgba(34,197,94,.06);
        }


        /* CONVERSÃO */

        .organization {
          position: relative;
        }

        .customSelect {
          position: relative;
        }

        .selectCurrent {
          min-height: 48px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 10px;

          padding: 0 13px;

          border: 1px solid #353b47;
          border-radius: 11px;

          background: #111419;

          color: #d0d4dc;

          font-size: 13px;

          cursor: pointer;

          transition:
            border-color .2s,
            background .2s;
        }

        .selectCurrent:hover {
          border-color: #554b78;
          background: #15181f;
        }

        .selectArrow {
          color: #818997;
          font-size: 18px;
        }

        .selectMenu {
          position: absolute;

          z-index: 20;

          left: 0;
          right: 0;
          top: calc(100% + 6px);

          overflow: hidden;

          border: 1px solid #3b414d;
          border-radius: 11px;

          background: #191c23;

          box-shadow:
            0 20px 45px
            rgba(0,0,0,.4);
        }

        .option {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 10px;

          padding: 13px;

          border-bottom: 1px solid #282d36;

          cursor: pointer;
        }

        .option:last-child {
          border-bottom: 0;
        }

        .option:hover,
        .optionActive {
          background: #20232c;
        }

        .option strong {
          display: block;

          color: #e0e4ea;

          font-size: 13px;
        }

        .option span {
          display: block;

          margin-top: 3px;

          color: #687180;

          font-size: 11px;
        }

        .option b {
          color: #b09bf0;
          font-size: 17px;
        }

        .stats {
          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 10px;

          margin-top: 12px;
        }

        .stat {
          padding: 12px;

          border: 1px solid #303641;
          border-radius: 11px;

          background: #111419;

          text-align: center;
        }

        .stat span {
          display: block;

          color: #626b79;

          font-size: 11px;
        }

        .stat strong {
          display: block;

          margin-top: 4px;

          color: #b5bbc6;

          font-size: 19px;
        }

        .convertButton {
          height: 54px;

          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;

          margin-top: 14px;

          border: 1px solid rgba(167,139,250,.2);
          border-radius: 11px;

          background:
            linear-gradient(
              135deg,
              #7c3aed,
              #2563eb
            );

          color: white;

          font-size: 16px;
          font-weight: 800;

          cursor: pointer;

          box-shadow:
            0 11px 27px
            rgba(76,59,160,.22);

          transition:
            filter .2s,
            transform .2s;
        }

        .convertButton:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
        }

        .convertDisabled {
          opacity: .72;
          cursor: default;
          transform: none !important;
        }

        .buttonSpinner {
          width: 17px;
          height: 17px;

          border: 2px solid
            rgba(255,255,255,.35);

          border-top-color: white;

          border-radius: 50%;

          animation:
            spin .7s linear infinite;
        }

        .convertButton > span:last-child {
          font-size: 20px;
        }


        /* BOTÕES ABAIXO DO CONVERTER */

        .conversionActions {
          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 10px;

          margin-top: 10px;
        }

        .actionButton {
          height: 48px;

          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;

          border-radius: 10px;

          font-size: 13px;
          font-weight: 700;

          cursor: pointer;

          transition:
            background .2s,
            border-color .2s,
            color .2s,
            transform .2s;
        }

        .actionButton:hover:not(.actionDisabled) {
          transform: translateY(-1px);
        }

        .actionButton span {
          font-size: 19px;
        }

        .actionDownload {
          border: 1px solid rgba(139,92,246,.25);

          background:
            rgba(124,58,237,.09);

          color: #c0aff0;
        }

        .actionDownload:hover:not(.actionDisabled) {
          border-color: #6856a4;
          background: rgba(124,58,237,.14);
        }

        .actionPrint {
          border: 1px solid #343a46;

          background: #12151b;

          color: #aeb5c1;
        }

        .actionPrint:hover:not(.actionDisabled) {
          border-color: #505866;
          background: #191c23;
          color: #d0d5dd;
        }

        .actionDisabled {
          opacity: .38;
          cursor: default;
        }


        /* PROGRESS */

        .progressArea {
          margin-top: 14px;
        }

        .progressTop {
          display: flex;
          justify-content: space-between;

          margin-bottom: 6px;

          color: #697281;
          font-size: 12px;
        }

        .progressTop strong {
          color: #a996e0;
        }

        .progressBar {
          height: 6px;

          overflow: hidden;

          border-radius: 99px;

          background: #282d36;
        }

        .progressValue {
          height: 100%;

          border-radius: inherit;

          background:
            linear-gradient(
              90deg,
              #7c3aed,
              #2563eb
            );

          transition:
            width .4s ease;
        }

        .progressBottom {
          margin-top: 5px;

          color: #555e6b;

          font-size: 11px;
          text-align: right;
        }


        /* RESULTADO */

        .result {
          display: flex;
          align-items: center;
          gap: 14px;

          margin-top: 20px;
          margin-bottom: 15px;
          padding: 16px 18px;

          border: 1px solid
            rgba(34,197,94,.16);

          border-radius: 13px;

          background:
            rgba(34,197,94,.035);
        }

        .resultCheck {
          width: 37px;
          height: 37px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background:
            rgba(34,197,94,.1);

          color: #6bd68a;

          font-size: 19px;
          font-weight: 700;
        }

        .resultInfo {
          min-width: 0;
          flex: 1;
        }

        .resultInfo strong {
          display: block;

          color: #e1e5ea;

          font-size: 15px;
        }

        .resultInfo span {
          display: block;

          margin-top: 3px;

          color: #697281;

          font-size: 12px;
        }

        /* FEEDBACK MODAL */

.feedbackOverlay {
  position: fixed;
  inset: 0;
  z-index: 100;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 20px;

  background: rgba(5, 7, 11, .72);
  backdrop-filter: blur(8px);

  animation: feedbackOverlayIn .2s ease;
}

.feedbackModal {
  position: relative;

  width: min(520px, 100%);
  padding: 24px;

  border: 1px solid #343a47;
  border-radius: 18px;

  background:
    linear-gradient(
      180deg,
      #1b1e27,
      #14171e
    );

  box-shadow:
    0 30px 80px rgba(0,0,0,.45);

  animation:
    feedbackModalIn .24s cubic-bezier(.2,.8,.2,1);
}

.feedbackClose {
  position: absolute;
  top: 14px;
  right: 14px;

  width: 34px;
  height: 34px;

  display: flex;
  align-items: center;
  justify-content: center;

  border: 1px solid transparent;
  border-radius: 9px;

  background: transparent;
  color: #737b89;

  font-size: 24px;
  line-height: 1;

  cursor: pointer;

  transition:
    color .2s,
    background .2s,
    border-color .2s;
}

.feedbackClose:hover {
  border-color: #3a404c;
  background: #20232c;
  color: #d5d8df;
}

.feedbackModalIcon {
  width: 48px;
  height: 48px;

  display: flex;
  align-items: center;
  justify-content: center;

  margin-bottom: 14px;

  border: 1px solid rgba(167,139,250,.2);
  border-radius: 13px;

  background: rgba(124,58,237,.1);

  font-size: 22px;
}

.feedbackModalHead strong {
  display: block;

  color: #f0f2f6;

  font-size: 20px;
  font-weight: 850;
}

.feedbackModalHead span {
  display: block;

  margin-top: 5px;

  color: #747d8c;

  font-size: 13px;
  line-height: 1.5;
}

.feedbackField {
  margin-top: 18px;
}

.feedbackField label {
  display: block;

  margin-bottom: 8px;

  color: #858d9b;

  font-size: 12px;
  font-weight: 750;
}

.feedbackTypes {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.feedbackType {
  padding: 9px 11px;

  border: 1px solid #343a46;
  border-radius: 9px;

  background: #111419;
  color: #8f97a5;

  font-family: inherit;

  font-size: 12px;
  font-weight: 700;

  cursor: pointer;

  transition:
    border-color .2s,
    background .2s,
    color .2s;
}

.feedbackType:hover {
  border-color: #514775;
  color: #c3b5eb;
}

.feedbackTypeActive {
  border-color: rgba(139,92,246,.42);

  background:
    rgba(124,58,237,.11);

  color: #c4b5ee;
}

.feedbackField textarea {
  min-height: 125px;
  resize: vertical;
}

.feedbackModalActions {
  display: grid;

  grid-template-columns:
    1fr 1.4fr;

  gap: 10px;

  margin-top: 18px;
}

.feedbackCancel,
.feedbackSend {
  height: 46px;

  border-radius: 10px;

  font-family: inherit;

  font-size: 13px;
  font-weight: 800;

  cursor: pointer;

  transition:
    border-color .2s,
    background .2s,
    color .2s,
    transform .2s;
}

.feedbackCancel {
  border: 1px solid #343a46;

  background: #12151b;

  color: #9aa2b0;
}

.feedbackCancel:hover {
  border-color: #4a515e;

  background: #191c23;

  color: #d0d5dd;
}

.feedbackSend {
  border: 1px solid rgba(167,139,250,.2);

  background:
    linear-gradient(
      135deg,
      #7c3aed,
      #2563eb
    );

  color: white;

  box-shadow:
    0 9px 24px
    rgba(76,59,160,.2);
}

.feedbackSend:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

@keyframes feedbackOverlayIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes feedbackModalIn {
  from {
    opacity: 0;
    transform:
      translateY(10px)
      scale(.98);
  }

  to {
    opacity: 1;
    transform:
      translateY(0)
      scale(1);
  }
}

        /* FOOTER */

        footer {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 7px;

          padding-top: 22px;

          color: #4b5360;

          font-size: 12px;
        }

        footer span {
          color: #697281;
          font-weight: 700;
        }

        footer i {
          font-style: normal;
          color: #3a404b;
        }


        /* TABLET */

        @media (max-width: 1050px) {

          .container {
            max-width: 900px;
          }

          .workspace {
            grid-template-columns: 1fr;
          }

          .previewContent {
            min-height: 620px;
          }

          .controlColumn {
            display: grid;

            grid-template-columns:
              minmax(0,1fr)
              minmax(0,1fr);

            align-items: start;
          }

        }


        /* MOBILE */

        @media (max-width: 680px) {

          .pagina {
            padding:
              0 12px 30px;
          }

          .header {
            height: 68px;
          }

          .logoIcon {
            width: 38px;
            height: 38px;
          }

          .logoNome {
            font-size: 19px;
          }

          .headerRight {
            display: none;
          }

          .hero {
            padding:
              32px 4px 27px;
          }

          .hero h1 {
            font-size: 36px;
            letter-spacing: -1.8px;
          }

          .hero p {
            font-size: 14px;
          }

          .workspace {
            display: flex;
            flex-direction: column;
          }

          .previewPanel,
          .card {
            width: 100%;
            padding: 16px;
            border-radius: 15px;
          }

          .previewContent {
            min-height: 440px;
            padding: 10px;
          }

          .emptyPreview,
          .loadingPreview {
            min-height: 390px;
          }

          .previewItem {
            width: min(330px,100%);
          }

          .previewNavigation {
            gap: 6px;
          }

          .arrow {
            width: 34px;
            height: 34px;
            flex-basis: 34px;
          }

          .previewFooter {
            font-size: 11px;
          }

          .controlColumn {
            display: flex;
            width: 100%;
          }

          .fileReady {
            padding: 6px 8px;
            font-size: 11px;
          }

          .fileReady span {
            width: 18px;
            height: 18px;
          }

          .fileBox {
            gap: 9px;
            padding: 11px;
          }

          .fileIcon {
            width: 40px;
            height: 47px;
          }

          .fileName {
  font-size: 15px;
  font-weight: 850;
}

          .fileMeta {
            font-size: 11px;
          }

          .fileRemove {
            width: 32px;
            height: 32px;
          }

          .conversionActions {
            grid-template-columns: 1fr 1fr;
          }

          .actionButton {
            height: 46px;
          }

          .result {
            flex-wrap: wrap;
          }

                  .feedbackHighlight {
            align-items: flex-start;
            flex-wrap: wrap;

            gap: 11px;

            padding: 13px;
          }

          .feedbackHighlightInfo {
            flex: 1;
            min-width: 180px;
          }

          .feedbackHighlightInfo strong {
            font-size: 13px;
          }

          .feedbackHighlightInfo span {
            font-size: 11px;
          }

          .feedbackHighlightButton {
            width: 100%;
          }
          
          .feedbackModal {
          padding: 20px;
          border-radius: 16px;
          }

          .feedbackModalActions {
          grid-template-columns: 1fr;
          }

        }
         .feedbackSuccess {
  display: flex;
  flex-direction: column;
  align-items: center;

  padding: 20px 10px 8px;

  text-align: center;
}

.feedbackSuccessIcon {
  width: 58px;
  height: 58px;

  display: flex;
  align-items: center;
  justify-content: center;

  margin-bottom: 16px;

  border: 1px solid rgba(74, 222, 128, .25);
  border-radius: 50%;

  background: rgba(74, 222, 128, .10);

  color: #4ade80;

  font-size: 28px;
  font-weight: 800;

  box-shadow:
    0 0 28px rgba(74, 222, 128, .10);

  animation: feedbackSuccessIn .35s ease;
}

.feedbackSuccess strong {
  color: #f0f2f6;

  font-size: 20px;
  font-weight: 850;
}

.feedbackSuccess span {
  max-width: 330px;

  margin-top: 7px;

  color: #747d8c;

  font-size: 13px;
  line-height: 1.5;
}

.feedbackSuccessButton {
  min-width: 120px;
  height: 42px;

  margin-top: 22px;
  padding: 0 18px;

  border: 1px solid #343a46;
  border-radius: 10px;

  background: #12151b;

  color: #aeb5c1;

  font-family: inherit;
  font-size: 12px;
  font-weight: 800;

  cursor: pointer;

  transition:
    border-color .2s,
    background .2s,
    color .2s,
    transform .2s;
}

.feedbackSuccessButton:hover {
  border-color: #4a515e;
  background: #191c23;
  color: #f0f2f6;

  transform: translateY(-1px);
}

@keyframes feedbackSuccessIn {
  from {
    opacity: 0;
    transform: scale(.85);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
} 
          

      `}</style>
    </main>
  );
}
