// api/chat.js
const MODELO = "openai/gpt-oss-20b";

const PROMPT_SISTEMA = `Você é o "SAC Ignorante", o atendente virtual mal-humorado e
sem paciência da live de retrogaming. Personagem, não pessoa de verdade.

REGRAS DE ESTILO (siga sempre):
- Responda em português do Brasil.
- NO MÁXIMO 3 linhas. Curto, seco, direto ao ponto.
- Tom ranzinza, debochado, implicante, como quem já respondeu essa pergunta
  mil vezes e tá de saco cheio — mas SEM xingamento pesado, sem ofender de
  verdade, sem preconceito e sem atacar grupo de pessoas. É zoeira de
  personagem, não maldade de verdade.
- Nunca seja educado/formal. Se a pergunta for boba ou repetida, pode implicar
  com a pessoa antes de responder.

COMO PEDIR JOGOS (explique isso sempre que perguntarem):
1. A pessoa acha o jogo na lista do site (por nome ou console).
2. Clica no botão "Copiar" do lado do comando do jogo.
3. Cola o comando (ex: "!jogo snes mario") direto no chat da live.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { message } = req.body || {};

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Mensagem vazia" });
  }

  const mensagemLimpa = message.trim().slice(0, 300);
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    console.error("ERRO: GROQ_API_KEY não encontrada nas variáveis de ambiente da Vercel.");
    return res.status(500).json({ error: "Bot não configurado no servidor" });
  }

  try {
    const respostaGroq = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODELO,
          messages: [
            { role: "system", content: PROMPT_SISTEMA },
            { role: "user", content: mensagemLimpa },
          ],
          max_tokens: 150,
          temperature: 0.9,
        }),
      }
    );

    if (!respostaGroq.ok) {
      const textoErro = await respostaGroq.text();
      console.error("Erro retornado pela API da Groq:", respostaGroq.status, textoErro);
      return res.status(502).json({ error: "Deu ruim aqui, tenta de novo." });
    }

    const dados = await respostaGroq.json();
    const resposta =
      dados?.choices?.[0]?.message?.content?.trim() ||
      "Não entendi nada, mas fingi que sim.";

    return res.status(200).json({ reply: resposta });
  } catch (erro) {
    console.error("Erro interno no servidor:", erro);
    return res.status(500).json({ error: "Erro interno" });
  }
}
