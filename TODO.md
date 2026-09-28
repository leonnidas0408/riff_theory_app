# TODO.md — Riff Theory: Roadmap de Melhorias

Backlog organizado a partir do mapa mental "Prioridades de melhorias para o app de guitarra".
As tarefas estão agrupadas por nível de prioridade e seguem, dentro de cada grupo, a ordem
sugerida de implementação (1 → 5) indicada no mapa.

---
<details>
      <summary>🔴 Prioridade máxima</summary>
      
## 🔴 Prioridade máxima — base essencial e rápida de entregar
> Estrutura fundamental para o app não afastar quem está começando; validar com uso real antes de expandir.

### 1. Fundar o app
- [ ] **Conteúdo para iniciantes**: revisar telas/textos para não afastar quem está começando —
      explicar sem excesso de teoria, com exemplos simples e diretos.
- [ ] **Experiência mais prática**: transformar informação em ação (tocar, testar, comparar,
      repetir) — o app precisa ser útil para *tocar*, não só para consultar. Melhoria transversal,
      impacta todas as outras áreas.
- [ ] **Versão beta**: lançar uma versão enxuta o quanto antes para reduzir risco e acelerar a
      validação real; evitar gastar tempo demais antes de confirmar o que é mais útil.
- [ ] **Testes com músicos**: validar com guitarristas, alunos e músicos de igreja antes de
      ampliar o escopo; ajuda a descobrir o que realmente faz diferença no dia a dia e a corrigir
      prioridades com base em uso real (não só em suposição).
      
</details>

---

<details>
      <summary>🟠 Prioridade alta</summary>
      
## 🟠 Prioridade alta — valor imediato para o usuário tocar melhor

### 2. Entregar utilidade imediata
- [ ] **Acordes mais práticos**: incluir diferentes formas de tocar o mesmo acorde; facilita a
      aplicação em músicas reais e reduz a dependência do desenho básico.
- [ ] **Explicação de sonoridade**: mostrar como cada acorde/posição soa, ajudando o usuário a
      escolher a melhor forma de tocar em cada contexto (mais musical, menos apenas visual).
- [ ] **Sistema de sugestões**: recomendar automaticamente opções em vez de só listar
      informações — reduz esforço de decisão. Pode começar simples e evoluir depois.
- [ ] **Aprendizado gradual**: organizar o conteúdo como trilha de estudo progressiva, para o
      usuário avançar sem se perder em excesso de informação (sensação de caminho claro, melhora
      retenção).

</details>

---


<details>
      <summary>🟡 Prioridade média</summary>
      

## 🟡 Prioridade média — núcleo harmônico do app

### 3. Estruturar a teoria principal
- [x] **Campo harmônico**: já implementado (`calcCampoHarmonico` em `util.js`) — cria uma base
      para graus, funções e relações entre acordes; serve de estrutura para várias outras áreas
      do sistema.
- [ ] **Harmonia aplicada**: conectar teoria com prática musical (ex: sugerir progressões comuns
      usando o campo harmônico já calculado). Depende de uma base harmônica já organizada.
- [ ] **Escalas por contexto**: organizar escalas maiores, menores, pentatônicas e modos de forma
      fácil de consultar; precisa estar bem categorizado para não virar uma lista confusa.
- [ ] **Relação escala-acorde**: mostrar quais escalas combinam com cada acorde/progressão,
      fortalecendo o uso prático da teoria no estudo e no improviso. Funciona melhor depois que o
      campo harmônico estiver bem definido.

</details>

---


<details>
      <summary>🟣 Prioridade média-alta</summary>
      

## 🟣 Prioridade média-alta — recursos de criação e improviso

### 4. Expandir para uso musical avançado
- [ ] **Improvisação guiada**: dar sugestões de notas e caminhos para improvisar melhor, ajudando
      a transformar conhecimento em execução musical. Pode começar com orientações simples e
      evoluir em profundidade.
- [ ] **Arpejos**: incluir estudo de arpejos para solo e acompanhamento; complementa bem o campo
      harmônico e a relação escala-acorde.
- [ ] **Sobreposições de escalas**: sugerir pentatônicas e outras combinações úteis sobre acordes,
      trazendo riqueza musical e opções mais criativas. Faz mais sentido depois do básico
      consolidado.

</details>

---


<details>
      <summary>🟢 Prioridade de especialização</summary>
      

## 🟢 Prioridade de especialização — para aprofundar o app

### 5. Adicionar camadas de especialização
- [ ] **Sonoridade por estilo**: separar sons e padrões por igreja, rock, pop, blues e outros
      estilos, ajudando o usuário a aplicar o conteúdo em contextos reais. Pode vir depois do
      núcleo principal estar pronto.
- [ ] **Guia de timbres**: mostrar como chegar em timbres parecidos com bandas/referências
      conhecidas — aumenta muito o valor percebido do app, mas exige boa curadoria e pode crescer
      por etapas.
- [ ] **Ajustes de equipamento**: explicar influência de pedal, amp, captador, guitarra e pegada;
      complementa o guia de timbres e a sonoridade por estilo. Útil para músicos mais dedicados,
      fase posterior.

</details>

---


<details>
      <summary>🔵 Prioridade avançada</summary>
      

## 🔵 Prioridade avançada — profundidade e expansão

- [ ] **Conteúdo para avançados**: material mais profundo para quem já toca há mais tempo, sem
      simplificar demais o app; ajuda a reter usuários experientes. Deve vir depois que a base
      estiver consistente.
- [ ] **Tirar música de ouvido**: seção para o usuário descobrir acordes e progressões sozinho.
      Alto valor pedagógico, porém mais complexa de estruturar — pode ser uma das fases mais
      fortes do produto, mas não a primeira.
- [ ] **Sonoridade por estilo e timbre como trilha de evolução**: usar essas camadas para permitir
      crescer por módulos sem travar o lançamento — boa estratégia para transformar o app em
      plataforma completa.

</details>

---

## Ordem sugerida de implementação (resumo)
1. **Fundar o app** — base essencial, versão beta, testes com músicos
2. **Entregar utilidade imediata** — acordes práticos, sugestões, aprendizado gradual
3. **Estruturar a teoria principal** — campo harmônico ✅, harmonia aplicada, escalas por contexto
4. **Expandir para uso musical avançado** — improvisação, arpejos, sobreposição de escalas
5. **Adicionar camadas de especialização** — estilo, timbre, equipamento, conteúdo avançado

---
