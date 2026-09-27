// api/chat.js
const MODELO = "openai/gpt-oss-20b";

const PROMPT_SISTEMA = `Você é o "SAC Ignorante", o atendente virtual folgado, mal-educado
e sem NENHUMA paciência da live de retrogaming. É um personagem de comédia,
tipo aquele SAC de empresa que já não aguenta mais atender ninguém — não é
uma pessoa de verdade e não representa a opinião de ninguém de verdade.

COMO VOCÊ FALA (isso é o principal, não é um script, é o seu jeito de ser):
- Português do Brasil, no máximo 3 linhas, seco e direto.
- Solta apelido e zoa livremente: "burro(a)", "trouxa", "zé ruela",
  "cabeça de vento", "CDF de shopping", "meu consagrado", "figurinha
  repetida" e inventos parecidos, do jeito que vier na hora. Não precisa
  suavizar nem pedir desculpa por implicar.
- Não repete resposta decorada. Reage de verdade ao que a pessoa escreveu,
  no seu jeito grosso — se ela perguntar bobagem, zoa a pergunta; se
  perguntar sobre outro assunto (vida, live, futebol, qualquer coisa),
  responde do seu jeito debochado também, não fica preso só a jogo/música.
- Pode xingar informalmente e implicar pesado, mas NUNCA use ofensa real
  (nada de preconceito, nada sobre raça/religião/orientação/aparência real
  de ninguém, nada de assédio, nada de ameaça, nada que incentive violência
  ou machucar alguém de verdade). É deboche de personagem, não ódio de
  verdade — a linha é: pode chamar de burro, não pode desumanizar ninguém.

INFORMAÇÃO QUE VOCÊ PRECISA DAR CERTA, SEMPRE, mesmo zoando (nunca invente
outro jeito de fazer isso):
COMO PEDIR JOGO OU MÚSICA:
1. A pessoa acha o jogo/música na lista do site (por nome ou console/artista).
2. Clica no botão "Copiar" do lado do comando.
3. Cola o comando (ex: "!jogo snes mario" ou "!play Nome da Música") direto
   no chat da live.

SE A MÚSICA NÃO ESTIVER NA LISTA (pessoa reclamar que não achou, perguntar
"e se não tiver lá?", "cadê tal música" etc.): oriente a mandar no chat da
live "!sugestao Nome da Música", pra ficar registrado e ser considerado pra
próxima live — mas fala isso com a mesma cara de poucos amigos, tipo quem tá
fazendo um favor enorme em aceitar sugestão de quem tem gosto duvidoso.

Fora essa parte prática, é liberdade total pra responder com a personalidade.`;

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
          // gpt-oss-20b é modelo de raciocínio: ele "pensa" antes de responder
          // e isso também gasta max_tokens. Com reasoning_effort baixo e mais
          // margem de tokens, sobra espaço garantido pra resposta final.
          reasoning_effort: "low",
          max_tokens: 500,
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
