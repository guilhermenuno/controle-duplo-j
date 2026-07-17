# Plano de ação — organização, segurança e confiabilidade

Data: 17 de julho de 2026

Base: auditoria do commit `97af464` e do Supabase `forbdpfbuuwbqcwvscjq`

## Objetivo

Transformar o Controle Duplo J em um repositório reproduzível, revisável e seguro para operar dados clínicos, preservando a interface e o valor funcional existentes.

Este plano separa contenção imediata, fundação operacional e evolução do produto. Nenhuma etapa pressupõe aplicar SQL diretamente em produção sem backup, testes de RLS e autorização humana.

## Princípios de execução

1. Banco e repositório são uma única mudança: toda alteração de schema nasce como migration versionada.
2. Produção não é ambiente de experimento: usar banco local e, assim que viável, staging/preview isolado.
3. Menor privilégio: UI não é fronteira de segurança; RLS/backend devem impor o contrato.
4. Dados clínicos não entram em logs, fixtures, issues, prompts ou PRs.
5. Toda correção de segurança tem teste negativo e positivo por papel.
6. Mudanças pequenas e reversíveis, com rollback documentado.
7. `main` só recebe alterações por PR revisado e checks verdes.

## Decisão operacional imediata

Até concluir a Onda 0, recomenda-se:

- suspender novos cadastros públicos ou restringir a criação de usuários a convite/admin;
- não executar manualmente `/api/check-deadlines`;
- não aplicar `supabase-setup.sql` como “correção”, pois ele não remove as políticas legadas;
- limitar mudanças funcionais a correções de segurança;
- preservar logs disponíveis e revisar se houve acesso por contas não aprovadas, sem copiar PII para fora do Supabase;
- confirmar com o responsável institucional se o repositório deve permanecer público.

## Onda 0 — contenção de segurança

Prazo recomendado: mesmo dia, com janela controlada.

Estado em 17 de julho de 2026:

- **Aplicado em produção:** novos cadastros desativados; migration RLS `20260717180000`; 14 políticas protegidas; zero políticas legadas; Security Advisor com 0 erros e Performance Advisor com 0 avisos.
- **Validado no PR #1:** cron fail-closed, saída agregada, XSS inerte, CSP/headers, 12 testes Node, teste RLS em PostgreSQL isolado e Semgrep sem achados.
- **Pendente de owner/revisão:** merge e deploy da aplicação, confirmação de `CRON_SECRET` na Vercel do Guilherme, revisão de logs/sessões e decisão sobre os três avisos residuais do Security Advisor.
- **Risco residual de recuperação:** o plano Free não ofereceu backup restaurável de dados; a exceção desta janela foi restrita a DDL transacional sem alteração de linhas e snapshots pré/pós de esquema. Mudanças futuras de dados continuam bloqueadas sem backup adequado.

### 0.1 Preparar recuperação antes da mudança

- definir owner técnico e owner clínico da janela;
- obter backup/export cifrado verificável do banco ou migrar para plano com backup antes de alterar RLS/schema;
- registrar hash, horário, retenção e responsável pelo backup sem versionar dados;
- ensaiar a migration em cópia/local com schema e dados sintéticos;
- preparar SQL de rollback e critérios de abortar.

Gate: restauração ou, no mínimo, validação independente de que o backup é utilizável.

### 0.2 Fechar bypass de RLS

Criar migration que:

- inventarie e remova explicitamente as três políticas legadas de `pacientes`;
- recrie políticas com papéis e ações claramente separados;
- use `TO authenticated` e verificações de usuário aprovado/admin;
- restrinja INSERT/UPDATE às colunas e condições permitidas, preferencialmente via RPC/backend para mutações críticas;
- valide que usuário pendente não consegue SELECT, INSERT, UPDATE ou DELETE;
- valide que aprovado e admin têm somente os privilégios definidos.

Gate mínimo automatizado:

| Papel | SELECT | INSERT | UPDATE | DELETE | Exportar |
| --- | --- | --- | --- | --- | --- |
| `anon` | negar | negar | negar | negar | negar |
| autenticado pendente | negar | negar | negar | negar | negar |
| aprovado | conforme escopo | conforme escopo | conforme escopo | negar | negar por padrão |
| admin | permitido/auditado | permitido/auditado | permitido/auditado | excepcional | excepcional + reauth |

### 0.3 Fechar cron

- mudar `isAuthorizedCron()` para negar se `CRON_SECRET` estiver ausente;
- validar `Authorization: Bearer` sem expor o segredo;
- reduzir a resposta a contagens agregadas e ID de execução, sem IDs de paciente;
- confirmar a existência do segredo na Vercel e redeploy controlado;
- testar handler localmente com secret ausente, incorreto e correto usando mocks de Supabase/Twilio;
- só reabilitar o agendamento após os testes.

### 0.4 Remover stored XSS

- substituir os cards baseados em `innerHTML` por DOM seguro e `textContent`;
- não inserir mensagens de erro remotas como HTML;
- testar payloads em nome, registro, telefone, observação e perfil;
- adicionar CSP inicialmente em `Report-Only`, ajustar dependências e depois promover para enforcement;
- adicionar `frame-ancestors 'none'` ou política institucional equivalente.

Gate: payloads permanecem texto inerte em telas comuns e administrativas.

### 0.5 Resposta e verificação pós-contenção

- revisar usuários e eventos de Auth, sem exportar endereços ou dados pessoais para a issue/PR;
- procurar operações de contas pendentes e alterações inesperadas;
- invalidar sessões ou credenciais se houver indício de exploração;
- executar novamente Security/Performance Advisors;
- documentar o risco residual e o go/no-go do owner.

## Onda 1 — fonte de verdade e governança do repositório

Prazo recomendado: 2 a 5 dias após contenção.

### 1.1 Pacote de contexto repo-native

Criar na raiz:

| Arquivo | Conteúdo mínimo | Necessidade atual |
| --- | --- | --- |
| `README.md` | propósito, público, dados tratados, arquitetura, setup, ambientes, deploy e links canônicos | obrigatória |
| `AGENTS.md` | fontes de verdade, segurança de PII, migrations, testes, deploy e critérios de saída | obrigatória |
| `CLAUDE.md` | contrato equivalente ao `AGENTS.md` | obrigatória e em paridade |
| `MEMORY.md` | contexto durável não sensível; escrita apenas sob gatilho explícito | recomendada |
| `HANDOFF.md` | onda/PR em andamento, bloqueios e próximo passo | necessária durante a remediação |
| `DECISIONS.md` | decisões aprovadas e datadas | necessária para escolhas estruturais abaixo |
| `ROADMAP.md` | ondas, owners, gates e estado executivo | necessária enquanto houver programa multi-PR |

Decisões que devem ser registradas, quando confirmadas:

- público versus privado no GitHub;
- titularidade institucional, responsáveis e acesso de emergência;
- plano Supabase e estratégia de backup;
- matriz de papéis/escopos;
- regra clínica de cálculo de datas;
- política de retenção, exclusão e exportação;
- canais de comunicação e evidência de consentimento.

Arquivos adicionais:

- `SECURITY.md` — reporte responsável e classificação de incidentes;
- `docs/architecture.md` — limites de confiança e fluxos;
- `docs/data-dictionary.md` — campos, finalidade e classificação;
- `docs/runbooks/backup-restore.md`;
- `docs/runbooks/security-incident.md`;
- `docs/runbooks/deploy-rollback.md`;
- `.env.example` com nomes, nunca valores;
- `CODEOWNERS` após definir owners reais.

### 1.2 Fluxo GitHub

- exigir PR para `main`;
- exigir pelo menos uma revisão de owner;
- bloquear force push e deleção de `main`;
- exigir checks de sintaxe, lint, testes, secret scan e migration reset;
- habilitar Dependabot e CodeQL/scan compatível;
- definir política de releases/tags;
- preencher descrição, topics e licença somente após decisão de propriedade/licenciamento.

A integração GitHub do Supabase pode ser ativada depois que migrations e ambientes estiverem confiáveis. Ela não deve ser o primeiro mecanismo de controle.

## Onda 2 — baseline e disciplina do banco

Prazo recomendado: 3 a 7 dias.

### 2.1 Estrutura Supabase local

Adicionar:

```text
supabase/
  config.toml
  migrations/
  seed.sql              # somente dados sintéticos
  tests/
```

Fluxo:

1. gerar dump somente de schema do banco ativo;
2. revisar e sanitizar o baseline;
3. dividir baseline e correções em migrations ordenadas;
4. provar `supabase db reset` local;
5. comparar schema local e remoto com diff vazio esperado;
6. proibir SQL manual não refletido em migration.

O baseline deve incluir a criação completa de `pacientes`, ausente no script atual.

### 2.2 Integridade do schema

Antes de constraints, executar queries de diagnóstico apenas no ambiente autorizado e contar violações. Em seguida, migrar gradualmente:

- `NOT NULL` para campos realmente obrigatórios;
- FK de atores/owners quando semanticamente válida;
- `CHECK` para status, prazos não negativos, datas e estados de notificação;
- invariantes de retirada e troca;
- coerência de `sexo`/`cistoscopia_quarta` conforme decisão clínica;
- unicidade ou regra de duplicidade para registro hospitalar, se confirmada;
- consentimento como evento com canal, finalidade, versão, origem, ator e timestamps;
- soft delete/arquivamento quando retenção impedir hard delete.

Datas derivadas devem ser calculadas canonicamente no banco/backend e testadas. O cliente pode exibir prévia, mas não deve ser a autoridade.

### 2.3 Índices orientados por consulta

Avaliar com `EXPLAIN (ANALYZE, BUFFERS)` em dados sintéticos/ambiente seguro:

- FKs sinalizadas pelo advisor;
- pacientes ativos por `data_prazo_retirada`;
- pacientes por `data_retirada`/`status` e ordenação por `data_colocacao`;
- trocas ativas por `proxima_troca_data`;
- auditoria por paciente e `created_at`;
- notificações por paciente/status/tipo/canal.

Evitar índices redundantes; cada índice deve ter consulta-alvo e medição.

### 2.4 Funções e privilégios

- definir `search_path` vazio e qualificar schemas;
- revogar `EXECUTE` de funções `SECURITY DEFINER` para `PUBLIC`, `anon` e/ou `authenticated` quando não necessário;
- manter `handle_new_user` utilizável pelo trigger, não diretamente pelo cliente;
- testar ownership, grants e comportamento sob RLS;
- revisar as políticas apontadas pelo advisor para evitar avaliação de Auth por linha.

## Onda 3 — camada de aplicação confiável

Prazo recomendado: 1 a 2 semanas.

### 3.1 Build reproduzível

- criar `package.json` e lockfile;
- fixar versão do Supabase JS;
- remover import remoto não versionado;
- definir scripts `dev`, `build`, `lint`, `test` e `check`;
- manter arquitetura simples; não migrar de framework sem justificativa funcional.

### 3.2 Modularização orientada a risco

Extrair progressivamente:

- `auth/session`;
- clientes/API e tratamento de erros;
- regras de data;
- validação/normalização de payloads;
- renderização segura;
- pacientes/trocas;
- notificações;
- exportação.

Primeiro escrever testes de caracterização dos fluxos críticos; depois mover código. Evitar reescrita total.

### 3.3 Autorização e UX de segurança

- implementar matriz de papéis confirmada;
- exigir AAL2/reauth para exportar, excluir, administrar acessos e disparar comunicação;
- introduzir timeout de inatividade no app enquanto o plano não oferecer enforcement de sessão;
- ocultar dados apenas como UX, nunca como controle primário;
- reduzir erros apresentados ao usuário e registrar códigos seguros no servidor;
- remover o falso gate `checkSecurityTables()` ou torná-lo uma verificação real, sem expor metadados sensíveis.

### 3.4 Exportação

- negar por padrão;
- mover geração para backend autorizado;
- selecionar apenas colunas necessárias;
- registrar ator, finalidade, filtros, timestamp e volume;
- considerar arquivo cifrado, expiração e marca d'água;
- documentar base legal, retenção e descarte.

## Onda 4 — notificações e auditoria

Prazo recomendado: 1 semana.

### 4.1 Outbox idempotente

- criar registro/claim transacional antes do envio;
- chave única de idempotência com janela ou evento clínico definido;
- estados `pending`, `processing`, `sent`, `failed`, `cancelled`;
- retry com backoff e limite;
- timeout/lock recuperável;
- armazenar o mínimo de destino necessário ou versão mascarada/cifrada;
- métricas agregadas sem PII.

### 4.2 Auditoria confiável

- retirar INSERT direto do cliente;
- produzir evento via trigger/RPC na mesma transação da mutação;
- ator derivado de sessão, não de payload;
- detalhes em allowlist, sem duplicar conteúdo clínico desnecessário;
- trilha de exportação, consentimento, comunicação, aprovação e exclusão;
- retenção e acesso definidos por decisão institucional.

### 4.3 Consentimento

- registrar captura e revogação como eventos;
- incluir canal, finalidade, versão do texto, timestamp, origem e ator;
- impedir envio se o consentimento vigente não autorizar;
- definir fluxo de correção de telefone e opt-out.

## Onda 5 — operação, privacidade e continuidade

Prazo recomendado: contínuo, com primeira entrega em 1 a 2 semanas.

- adotar plano/estratégia que ofereça backup compatível com criticidade;
- executar teste de restauração trimestral e registrar RPO/RTO;
- criar staging isolado sem dados reais ou com dados corretamente desidentificados;
- separar chaves e projetos por ambiente;
- manter inventário de acessos e revisão periódica;
- alertar falhas de cron, filas e prazos sem incluir PII;
- validar LGPD: finalidade, minimização, retenção, base legal, operadores e resposta a incidente;
- revisar segurança de Vercel, Supabase, Twilio e domínio;
- realizar avaliação clínica de segurança das regras de prazo antes de considerar o produto estável.

## Sequência recomendada de PRs

| PR | Escopo | Dependência | Gate principal |
| --- | --- | --- | --- |
| PR-0 | Pacote de contexto, CI mínimo e testes negativos de RLS preparados | nenhuma | nenhum deploy automático |
| PR-1 | Contenção RLS + funções/privilégios | backup + staging/local | matriz RLS completa |
| PR-2 | Cron fail-closed + XSS + CSP Report-Only | PR-1 ou coordenação paralela | testes de handler e payloads inertes |
| PR-3 | Baseline Supabase e schema reproduzível | PR-1 | `supabase db reset` + diff controlado |
| PR-4 | Constraints, datas e índices | PR-3 + decisão clínica | diagnóstico de dados + testes de borda |
| PR-5 | Autorização/exportação/auditoria | PR-3 | AAL2, trilha transacional e testes por papel |
| PR-6 | Outbox, consentimento e observabilidade | PR-4/5 | idempotência concorrente + opt-out |
| PR-7 | Acessibilidade, assets e dívida não crítica | estabilidade | testes de teclado/leitor/telas |

Se a contenção precisar preceder PR-0 por risco operacional, criar uma hotfix mínima, revisada por duas pessoas e imediatamente refletida em migration/testes na branch principal de trabalho.

## Matriz de verificação

### Banco e RLS

- reset local do zero;
- migration up/down ou rollback ensaiado;
- diff de schema esperado;
- testes de `anon`, pendente, aprovado e admin;
- tentativa de escrita de ator/colunas proibidas;
- advisors sem warnings não aceitos;
- FKs/constraints validadas sobre dados existentes.

### Aplicação

- cadastro, confirmação, login, pendência e aprovação;
- cadastro/edição/retirada/troca;
- datas de fim de mês, fevereiro, bissexto e timezone;
- payloads XSS em todos os textos;
- exportação autorizada e negada;
- sessão inativa e AAL2;
- teclado, foco, leitor de tela e responsividade.

### Notificações

- cron sem/errado/correto segredo;
- consentimento por canal e revogação;
- execução concorrente sem duplicidade;
- falha Twilio antes/depois do envio;
- retry e dead-letter;
- resposta/log sem IDs, telefone ou conteúdo clínico desnecessário.

### Operação

- deploy de preview/staging;
- smoke test sem dados reais;
- rollback de código e banco;
- backup restaurado em ambiente isolado;
- branch protegida e checks obrigatórios;
- nenhuma variável/segredo em Git, logs ou artefatos.

## Critérios de saída por marco

### Contenção concluída

- usuário pendente não acessa `pacientes`;
- payloads de texto não executam no navegador;
- cron nega quando configuração está ausente/incorreta;
- backup/rollback verificados;
- investigação inicial de acesso concluída.

### Fundação concluída

- banco reconstituível do zero por migrations;
- `main` protegida e CI obrigatório;
- contexto repo-native completo e paridade `AGENTS.md`/`CLAUDE.md`;
- staging/fluxo seguro definido;
- decisão de backup, visibilidade e papéis registrada.

### Produto confiável

- invariantes clínicas impostas no backend/banco e testadas;
- auditoria transacional e exportação controlada;
- notificações idempotentes e consentimento rastreável;
- restauração ensaiada;
- owners técnico, clínico e institucional aprovam go-live.

## Itens que exigem decisão humana

1. O repositório deve permanecer público?
2. Quem é o controlador institucional dos dados e quem aprova mudanças de produção?
3. Qual plano/estratégia de backup atende ao RPO/RTO esperado?
4. Quais papéis podem ver, editar, excluir, exportar e comunicar?
5. Qual é a regra clínica canônica para datas no fim do mês?
6. Registro hospitalar é único em qual escopo?
7. Qual a política de retenção, exclusão e auditoria?
8. Quais textos e evidências tornam o consentimento de SMS/WhatsApp válido?
9. Há necessidade de revisar possível acesso anterior por usuários pendentes?

## Próxima ação recomendada

Realizar uma reunião curta de go/no-go com Guilherme Mota, owner clínico e responsável técnico para aprovar a contenção, a janela de backup e as nove decisões acima. Em seguida, executar PR-0/PR-1 sem combinar refatoração ampla com a correção de RLS.
