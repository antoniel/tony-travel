# Identidade Visual e Diretrizes de Marca

Objetivo: padronizar a expressão visual e o tom da aplicação Tony Travel para garantir consistência, acessibilidade e coerência com o produto, sem detalhar implementações técnicas.

Princípios de marca (alto nível):
- Claro e confiável: informação legível, hierarquia visual consistente e previsível.
- Acolhedor e colaborativo: linguagem inclusiva, foco no planejamento em grupo.
- Funcional e discreto: estética moderna sem distrações; conteúdo acima de ornamentos.

Invariantes do projeto (derivados das regras atuais):
- Design System shadcn/ui: usar componentes e tokens do DS; não introduzir cores customizadas.
- Tailwind v4: utilizar utilitários padrão e tokens do DS; evitar classes inline de cor fora do DS.
- Acessibilidade AA: contraste mínimo e navegação por teclado; estados visuais e textuais claros.
- Consistência monetária pt-BR: valores exibidos como BRL no produto; máscaras no formulário seguem as regras de UI e não desta diretriz.

Paleta por tokens (sem cores customizadas):
- Base: `text-foreground`, `text-muted-foreground`, `bg-background`, `bg-muted`, `border`, `ring`.
- Ações: `primary`, `secondary`, `accent` (em suas variantes suportadas pelo DS).
- Estados: `destructive`, `ring`, mensagens/ícones de estado conforme componentes do DS.
- Uso: preferência por variantes de componente (ex.: `variant="primary"`) em vez de aplicar cor direta.

Tipografia e hierarquia:
- Fonte: utilizar a fonte padrão definida pelo projeto via DS (configurada globalmente). Evitar hardcode de fontes.
- Níveis: títulos H1–H4 com escala consistente; subtítulos para contexto; corpo legível em todas as densidades.
- Ênfase: utilizar peso/tamanho moderado; evitar CAIXA ALTA para textos longos.

Espaçamento, layout e superfícies:
- Espaçamento: seguir escala do projeto com respiro entre seções e relação clara entre grupos.
- Superfícies: camadas sutis (bg, border, ring) para separar conteúdos sem poluição visual.
- Densidade: formular padrões que funcionem em telas menores sem perda de legibilidade.

Ícones, ilustrações e imagens:
- Ícones: estilo consistente (outline), tamanho proporcional ao texto, sem preenchimento pesado.
- Ilustrações e fotos: usar com parcimônia; foco principal no conteúdo e dados.
- Atribuição: garantir direitos de uso quando aplicável; preferir assets do projeto.

Motion e microinterações:
- Transições curtas e discretas (ex.: ~200ms) para feedback; evitar animações chamativas.
- Estados de carga: skeletons em vez de spinners longos; feedback imediato em ações.

Acessibilidade aplicada:
- Contraste: mínimo AA em textos e ícones relevantes; verificação ao introduzir novas combinações.
- Teclado: componentes interativos com foco visível e ordem lógica.
- Texto alternativo: descrever propósito de imagens/ícones quando forem relevantes ao entendimento.

Anti‑padrões (proibidos):
- Introduzir cores ou gradientes fora dos tokens do DS.
- Hardcode de cores, fontes ou tamanhos sem respaldo do DS.
- Baixo contraste para priorizar “estética”.
- Ícones sem propósito, excesso de decoração ou animações intrusivas.

Aplicação no produto (exemplos conceituais):
- Painel da viagem: títulos claros, seções separadas por superfícies leves; ações primárias evidentes.
- Linha do tempo: hierarquia entre eventos principais e dependentes com sinais visuais sutis (sem excesso de cor).
- Resumo financeiro: comunicar estados (carregando/erro/vazio) com componentes do DS; números legíveis, rótulos claros.

## Logotipo: direção escolhida (canônica)

Conceito oficial:
- Marca isométrica 3D com formas preenchidas e acabamento realista discreto.
- Símbolo principal: mala em perspectiva isométrica a 30°, cantos suaves, acabamento matte, AO sutil.
- Elementos complementares: mochila compacta encostada à direita (parcialmente atrás), luggage tag mínima no cabo e route pin esmaltado minúsculo no canto frontal.
- Sem monograma/letra explícita. Nenhuma forma deve desenhar “T”.
- Wordmark discreto “TonyViagens” permitido em variantes: plaqueta metálica pequena na face frontal OU tag OU lockup em linha abaixo (dimensão reduzida, baixo contraste).

Prompt canônico (geração do símbolo):
- Descrição:
  - “Isometric 3D logo for ‘TonyViagens’. Clean suitcase block at 30°, matte polymer, gentle chamfers, soft studio lighting, subtle ambient occlusion. Add a compact backpack leaning against the suitcase on the right, slightly behind it (25–30% size), matte finish, soft AO, gentle contact shadow. Include a minimal luggage tag on the handle and a tiny enamel route pin on the front corner. Filled shapes, teal/blue body, charcoal trims, light neutral highlights. Centered, transparent/white background, crisp edges, no text, no scene.”
- Negative prompt:
  - “no letter monograms, no explicit letters, no large typography, no busy background, no watermark, no lens flare, no harsh specular, no heavy gradients, no drop shadow, no bevel text”
- Parâmetros (sugestão):
  - Midjourney v6: `--ar 1:1 --v 6 --style raw --s 200 --chaos 5 --seed 12345`
  - SDXL: 1024×1024, Steps 30–36, CFG 6–7, Sampler DPM++ 2M Karras
  - DALL·E 3: enfatizar “isometric 3D logo, filled, subtle realistic shading, centered, no text, transparent background”.

Regras de uso do wordmark “TonyViagens” (discreto):
- Tamanho: ≤ 10–15% da largura do ícone quando acoplado (lockup) ou proporcional na plaqueta/tag.
- Peso: semibold (500–600); sans geométrica/humanista; tracking levemente negativo.
- Contraste: baixo a médio; não competir com o símbolo. Evitar cores fora dos tokens do DS.
- Posições permitidas: plaqueta pequena na face frontal; impressão pequena na tag; linha base abaixo do símbolo (lockup), sempre centrado e com margens generosas.

Variações e exportação (entregáveis):
- Ícone apenas (principal); Ícone + wordmark discreto; Monocromático (positivo/negativo); SVG e PNG 1024/512.
- Margens de proteção: manter respiro uniforme; evitar fundos complexos; preferir fundos `bg-background`.
- Teste de legibilidade: verificar 24–32 px; garantir silhueta clara em mono.

Veja também: [00-visao-geral.md](./00-visao-geral.md), [04-regras-de-negocio.md](./04-regras-de-negocio.md), [05-arquitetura-conceitual.md](./05-arquitetura-conceitual.md)

Backreferences: index raiz
