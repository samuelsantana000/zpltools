import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const tipo = body.tipo || "Não informado";
    const mensagem = body.mensagem || "";

    if (!mensagem.trim()) {
      return NextResponse.json(
        { error: "A mensagem é obrigatória." },
        { status: 400 }
      );
    }

    await resend.emails.send({
      from: "ZPLTools <onboarding@resend.dev>",
      to: ["storesb000@gmail.com"],
      subject: `[ZPLTools] ${tipo}`,
      text: `
Novo feedback recebido no ZPLTools.

Tipo: ${tipo}

Mensagem:
${mensagem}
      `,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Erro ao enviar feedback:", error);

    return NextResponse.json(
      { error: "Não foi possível enviar o feedback." },
      { status: 500 }
    );
  }
}