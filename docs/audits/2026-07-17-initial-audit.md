# Auditoria técnica inicial — Controle Duplo J

Data da auditoria: 17 de julho de 2026

Repositório: `guilhermenuno/controle-duplo-j`

Commit auditado: `97af464` (`main`, sincronizado com `origin/main`)

Supabase: projeto `forbdpfbuuwbqcwvscjq`, organização `Nunos Org`

## Resumo executivo

O sistema está funcional e o código publicado corresponde ao commit local auditado, mas a postura atual não é adequada para continuar tratando dados clínicos identificáveis sem contenção e endurecimento.

O risco mais urgente é uma cadeia explorável:

1. novos cadastros estão habilitados no Supabase;
2. três políticas legadas de RLS em `pacientes` permitem acesso a qualquer usuário autenticado, sem exigir aprovação;
3. dados controlados por usuários são renderizados com `innerHTML` sem escape;
4. um usuário recém-cadastrado e ainda não aprovado pode, portanto, ler/alterar dados clínicos e potencialmente persistir conteúdo executável para outros usuários.

Esta auditoria identificou 2 achados críticos, 7 altos e 7 médios. Nenhuma alteração foi feita no banco, no Supabase, na Vercel ou nas configurações do GitHub durante a avaliação.

## Escopo e método

Foram avaliados:

- todos os 24 arquivos rastreados pelo Git, totalizando 144.631 bytes;
- histórico, branches, PRs, regras e recursos de segurança do GitHub;
- aplicação web e funções serverless publicadas na Vercel;
- schema público, RLS, funções, triggers, índices, advisors, autenticação, backups, migrations, branches e integrações do Supabase;
- consistência entre aplicação, scripts SQL e banco ativo;
- segurança, integridade de dados, confiabilidade operacional, manutenibilidade, acessibilidade e governança documental.

Limites deliberados:

- nenhum registro de paciente foi aberto, lido, exportado ou copiado;
- contagens de linhas abaixo são estimativas exibidas pelo dashboard;
- nenhuma consulta SQL ou mutação foi executada no banco;
- o endpoint cron de produção não foi chamado, pois ele pode enviar mensagens reais;
- segredos e valores de variáveis da Vercel não foram acessados;
- o scan automatizado complementou, mas não substituiu, a revisão manual de lógica e autorização.

## Arquitetura observada

| Camada | Implementação atual | Observação |
| --- | --- | --- |
| Interface | HTML, CSS e JavaScript sem framework | `app.js` concentra autenticação, dados, regras, renderização e exportação |
| Cliente de dados | Supabase JS via `esm.sh` | Dependência sem versão fixada ou lockfile |
| Backend | 3 funções CommonJS na Vercel | Acesso privilegiado ao Supabase e envio por Twilio |
| Banco/Auth | Supabase Postgres + Auth | Projeto Free, branch única de produção |
| Deploy | Vercel | Site publicado e alinhado ao `app.js` local |
| Operação | Cron diário | `/api/check-deadlines`, 10:00 UTC |

Fluxo principal:

`navegador -> Supabase Auth/Data API -> tabelas clínicas`

`cron/usuário aprovado -> função Vercel -> Supabase service_role + Twilio`

## Inventário do repositório

| Grupo | Arquivos | Avaliação |
| --- | --- | --- |
| Aplicação | `index.html`, `style.css`, `app.js` | Produto funcional, porém monolítico e sem testes |
| Funções | `api/_notifications.js`, `api/check-deadlines.js`, `api/send-notification.js` | Autorização parcial; cron falha aberto quando falta segredo |
| Banco | `supabase-setup.sql`, `migration-sexo-cistoscopia.sql` | Scripts manuais e incompletos; não reconstroem o banco |
| Deploy/PWA | `vercel.json`, `site.webmanifest` | Configuração mínima; headers incompletos |
| Assets | SVG, PNG e ICO de logo/favicon | Há duplicatas e arquivos aparentemente não referenciados |
| Governança | apenas `.gitignore` | Ausentes README, contratos de agentes, decisões, handoff, roadmap e runbooks |

Não existem `package.json`, lockfile, suíte de testes, lint, type checking, pipeline de CI, `SECURITY.md`, documentação de privacidade/LGPD ou runbook de backup/restauração.

## Estado do GitHub e deploy

- repositório público, sem descrição e sem licença;
- permissão da conta Humaniza Health: `WRITE`;
- `main` é a única branch vigente; não há branches remotas não integradas;
- 15 commits diretos entre 3 e 22 de abril de 2026;
- nenhum PR aberto ou fechado;
- nenhum ruleset e endpoint de proteção de `main` retornando 404;
- nenhuma GitHub Action;
- Dependabot alerts desabilitados;
- Code Scanning sem análise;
- status de Secret Scanning não pôde ser confirmado pela permissão/API disponível;
- homepage configurada para `https://controle-duplo-j.vercel.app`;
- SHA-256 do `app.js` local e publicado: `93949f1e52ea67e186550dfbeaeb4a51814a5b04b7bd1208e151a352c4387682`.

O site retorna HTTPS/HSTS, `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy`. Não há CSP nem proteção explícita contra framing (`frame-ancestors` ou `X-Frame-Options`). A resposta também publica `Access-Control-Allow-Origin: *`.

## Estado do Supabase

### Projeto e operação

| Item | Estado confirmado |
| --- | --- |
| Organização | `Nunos Org`, plano Free |
| Conta auditora | `humanizahealth` / `dev@humaniza.health`, Owner |
| Saúde | Healthy |
| Compute | nano, `sa-east-1` (São Paulo) |
| Branch de banco | apenas `main` de produção |
| Preview/persistent branches | nenhuma |
| Migrações registradas | nenhuma |
| GitHub conectado | não |
| Backups | nenhum; plano Free não inclui backup de projeto |
| Banco no disco | aproximadamente 0,03 GB; 0,25 GB total ocupado |

O dashboard inicial informa “Advisor found no issues”, mas as páginas específicas dos advisors exibem alertas ativos. A página resumida não deve ser usada como gate de segurança.

### Tabelas públicas

| Tabela | Colunas | Linhas estimadas | RLS | Realtime |
| --- | ---: | ---: | --- | --- |
| `pacientes` | 21 | 9 | habilitada | desabilitado |
| `pacientes_troca_programada` | 14 | 1 | habilitada | desabilitado |
| `patient_audit_log` | 8 | 41 | habilitada | desabilitado |
| `patient_notifications` | 10 | 28 | habilitada | desabilitado |
| `profiles` | 10 | 2 | habilitada | habilitado |

RLS estar “habilitada” não garante isolamento: políticas permissivas para o mesmo comando são combinadas com OR.

### Índices

Foram encontrados apenas:

- a chave primária de cada uma das cinco tabelas;
- o índice parcial único `patient_notifications_unique_sent` em `patient_id, target_table, notification_type, channel` quando `status = 'sent'`.

Não há índices para as chaves estrangeiras sinalizadas pelo advisor nem para os filtros/ordenações principais da aplicação.

### Autenticação

- cadastro de novos usuários: habilitado;
- confirmação de e-mail: habilitada;
- login anônimo: desabilitado;
- e-mail/senha: habilitado; demais provedores desabilitados;
- CAPTCHA: desabilitado;
- proteção contra senhas vazadas: desabilitada;
- TOTP/MFA: habilitado na plataforma, mas a aplicação e as políticas não exigem AAL2 para ações clínicas;
- detecção de reutilização de refresh token: habilitada, intervalo de 10 segundos;
- sessão com duração máxima e timeout de inatividade: `never` no plano Free e não configuráveis nesse plano.

### Advisors

Security Advisor: 0 erros e 10 warnings:

- `search_path` mutável em `public.set_updated_at`;
- duas políticas de escrita em `pacientes` marcadas como sempre verdadeiras;
- execução de três funções `SECURITY DEFINER` exposta a `public`;
- execução das mesmas funções exposta a usuários autenticados;
- proteção contra senhas vazadas desabilitada.

Além disso, inspeção manual confirmou que a política legada de SELECT em `pacientes` usa `USING (true)`. O advisor não trata SELECT intencionalmente amplo como erro automático, mas aqui ele expõe dados clínicos identificáveis.

Performance Advisor: 0 erros, 6 warnings e 5 infos:

- três avisos de Auth RLS Initialization Plan;
- três avisos de Multiple Permissive Policies em `pacientes`;
- cinco chaves estrangeiras sem índice.

## Achados priorizados

### F-01 — Gate de aprovação quebrado por políticas RLS legadas

Severidade: **Crítica**

Status: confirmado no banco ativo

Políticas existentes em `pacientes`:

- `Usuarios autenticados podem ver pacientes` — SELECT com `USING (true)`;
- `Usuarios autenticados podem inserir pacientes` — INSERT sempre verdadeiro;
- `Usuarios autenticados podem atualizar pacientes` — UPDATE sempre verdadeiro.

O cadastro público e a confirmação de e-mail permitem que uma pessoa externa obtenha um JWT autenticado. Como políticas permissivas são combinadas com OR, as políticas legadas anulam `pacientes_*_approved` do script atual.

Impacto:

- leitura de nomes, registros hospitalares, telefones, datas, observações e consentimentos;
- inclusão ou adulteração de datas/prazos/status clínicos;
- quebra total do fluxo de aprovação administrativa;
- base para a cadeia de stored XSS descrita em F-02.

Remediação imediata: migration transacional revisada que remova explicitamente todas as políticas legadas, recrie políticas por papel/ação, teste `anon`, `pending`, `approved` e `admin` e só então seja aplicada com backup verificável e rollback preparado.

### F-02 — Stored XSS em telas clínicas e administrativas

Severidade: **Crítica**

Status: confirmado por revisão de fluxo

`app.js:118-122` cria cards usando `innerHTML`. Campos vindos do banco são interpolados sem escape em:

- `app.js:456-513` — pacientes;
- `app.js:517-560` — trocas;
- `app.js:564-578` — perfis pendentes;
- `app.js:798` — mensagem de erro.

Campos como nome, telefone, registro e observações aceitam texto do usuário. Com F-01, até um usuário não aprovado pode alterar `pacientes` e persistir payload executável. O Supabase mantém sessão no navegador; um payload executado em sessão aprovada/admin pode operar com os privilégios da vítima.

Remediação: substituir HTML interpolado por criação de nós e `textContent`; se algum HTML for indispensável, aplicar sanitização estrita e testes de regressão. Adicionar CSP é defesa adicional, não correção primária.

### F-03 — Endpoint cron falha aberto quando `CRON_SECRET` está ausente

Severidade: **Alta, condicional**

Status: confirmado no código; ambiente da Vercel não verificado

`api/check-deadlines.js:9-15` retorna autorizado quando `CRON_SECRET` não existe. O handler usa `service_role`, consulta todos os pacientes ativos e pode enviar SMS/WhatsApp. A resposta inclui IDs de pacientes e resultados.

Não foi feito teste dinâmico desse endpoint para evitar mensagens reais.

Remediação: falhar fechado se o segredo estiver ausente, comparar segredo de forma segura, não devolver IDs/detalhes e verificar a configuração efetiva na Vercel antes do próximo cron.

### F-04 — Banco de produção não é reproduzível e não possui backup incluído

Severidade: **Alta**

Status: confirmado

O dashboard registra zero migrations. `supabase-setup.sql` assume que `public.pacientes` já existe (`linha 62`) e não contém o `CREATE TABLE` base. O segundo arquivo é SQL avulso, fora de `supabase/migrations/`. O projeto Free informa explicitamente que não inclui backups.

Impacto: drift silencioso, alterações manuais irreversíveis, recuperação incerta e impossibilidade de testar `supabase db reset` contra o estado canônico.

Remediação: capturar baseline do schema atual sem dados, normalizar migrations versionadas, validar reset/diff local e adotar backup agendado ou procedimento externo cifrado com teste de restauração.

### F-05 — Auditoria clínica é fabricável e não transacional

Severidade: **Alta**

Status: confirmado

`app.js:429-442` permite que o cliente insira linhas em `patient_audit_log`. A política aceita qualquer usuário aprovado e não vincula obrigatoriamente `actor_id` a `auth.uid()`. O log é gravado após a mutação, fora da transação, e erros são ignorados.

Impacto: ações sem registro, identidade/detalhes falsificados e baixa utilidade para investigação, compliance ou rastreabilidade clínica.

Remediação: gerar auditoria no banco por trigger/RPC transacional, obter ator de `auth.uid()`, impedir escrita direta do cliente e definir política de retenção/imutabilidade.

### F-06 — Datas clínicas derivadas no cliente podem ficar incorretas

Severidade: **Alta**

Status: confirmado com teste local

`app.js:166-170` usa `Date.setMonth`. Exemplos reais do algoritmo atual:

- `2026-01-31 + 3 meses -> 2026-05-01`;
- `2026-11-30 + 3 meses -> 2027-03-02`.

Datas derivadas são enviadas pelo cliente e o banco não demonstra validação consistente entre data-base, prazo e data limite. Isso pode atrasar alertas em um produto cujo objetivo é controlar prazos de cateter.

Remediação: definir regra clínica para fim de mês, implementar cálculo canônico no banco/backend, adicionar constraints quando possível e testes de datas-limite, ano bissexto e timezone.

### F-07 — Autorização ampla e exportação integral de dados clínicos

Severidade: **Alta**

Status: confirmado

Mesmo após corrigir F-01, todo usuário aprovado pode listar todos os pacientes, editar qualquer linha e exportar CSV completo com identificadores, telefone e observações (`app.js:1335-1393`). Não há escopo por equipe, setor ou necessidade de saber, reautenticação, marca d'água, log confiável ou política de download.

Remediação: definir matriz mínima de papéis e escopos; separar visualização, edição, exclusão, comunicação e exportação; exigir AAL2/reauth para ações sensíveis; auditar exportações no servidor.

### F-08 — Integridade do schema é inferior às regras da interface

Severidade: **Alta**

Status: confirmado por metadados do schema

Na tabela ativa `pacientes`, campos exigidos pela interface — como registro hospitalar e data de colocação — são anuláveis. `status` não apresenta constraint visível; `cadastrado_por` não apareceu como FK; datas derivadas e consentimentos não têm coerência/proveniência garantida. A regra “cistoscopia às quartas apenas para mulheres com DJ menor que 6 meses” existe apenas na UI.

Remediação: migrações graduais com pré-validação de dados, `NOT NULL`, checks, FKs, unicidade e invariantes de negócio; nunca adicionar constraints sem identificar e tratar violações existentes.

### F-09 — Operação direta em `main` sem gates de engenharia

Severidade: **Alta**

Status: confirmado

Não há PRs históricos, proteção de branch, rulesets, CI, testes ou ambientes de banco. GitHub e Supabase não estão conectados e o banco só possui a branch de produção.

Impacto: mudança de código/schema sem revisão, regressões não detectadas e alto risco de aplicar SQL diretamente em produção.

Remediação: proteção de `main`, PR obrigatório, checks mínimos e fluxo de migration testada antes de promoção. A integração GitHub do Supabase é opcional; o requisito é ter uma fonte de verdade versionada e gates explícitos.

### F-10 — Envio de notificações não é atomicamente idempotente

Severidade: **Média**

Status: confirmado

O código faz `check -> send -> log`. Duas execuções concorrentes podem enviar duas mensagens antes que o índice parcial registre a primeira como `sent`. Falhas de log após envio também permitem reenvio. O endpoint manual não tem rate limiting próprio.

Remediação: outbox/claim transacional, chave de idempotência antes do envio, estados `pending/processing/sent/error`, retries controlados e métricas sem PII.

### F-11 — Consentimento de comunicação sem proveniência

Severidade: **Média**

Status: confirmado

O banco guarda apenas dois booleanos. Não registra quando, por quem, por qual texto/versão, em qual canal ou com que origem o consentimento foi obtido/revogado.

Remediação: modelar evento de consentimento e revogação, manter finalidade/versão/proveniência e garantir que o envio consulte o estado vigente.

### F-12 — Dependência de frontend não fixada e CSP ausente

Severidade: **Média**

Status: confirmado

`app.js:1` importa `@supabase/supabase-js` de `https://esm.sh/` sem versão. Não há lockfile, SRI ou build reproduzível. A ausência de CSP amplia o impacto de XSS e comprometimento de dependência.

Remediação: introduzir package manager/lockfile, fixar versão, gerar bundle controlado e publicar CSP estrita compatível com Supabase/Twilio somente quando necessário.

### F-13 — Privilégios e funções PostgreSQL excessivos

Severidade: **Média**

Status: confirmado pelo Security Advisor

`handle_new_user`, `is_approved_user` e `is_admin_user` são `SECURITY DEFINER` executáveis por `public` e usuários autenticados. `set_updated_at` tem `search_path` mutável.

Remediação: `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` conforme função; conceder apenas o mínimo; usar `SET search_path = ''` com objetos qualificados; testar triggers e RLS após a mudança.

### F-14 — Índices insuficientes e políticas RLS com alertas de plano

Severidade: **Média**

Status: confirmado pelo Performance Advisor

Cinco FKs não possuem índice. Consultas frequentes ordenam/filtram por datas, status e retirada sem índices correspondentes. Há avisos de Auth RLS Initialization Plan e políticas permissivas múltiplas.

Remediação: medir consultas e criar índices pequenos e direcionados, incluindo candidatos parciais para pacientes ativos e composto para trocas ativas por data. Reescrever políticas sinalizadas usando padrões que inicializam funções de Auth uma vez por statement quando aplicável.

### F-15 — Código monolítico, sem testes ou análise automatizada

Severidade: **Média**

Status: confirmado

`app.js` tem 1.489 linhas e mistura estado, DOM, autenticação, regras clínicas, persistência e exportação. Não existem testes, lint, tipos ou CI. O `checkSecurityTables()` retorna sempre `true`, tornando o gate inefetivo.

Remediação: primeiro cobrir fluxos críticos com testes; depois extrair módulos por responsabilidade sem reescrever o produto inteiro.

### F-16 — Lacunas de acessibilidade e higiene de assets

Severidade: **Média**

Status: revisão estática

Não foram encontrados tratamento explícito de `:focus-visible`, `prefers-reduced-motion` ou regiões vivas para mensagens. Há favicons duplicados e arquivos aparentemente sem referência; qualquer remoção deve ser precedida por inventário de manifest/HTML/deploy.

Remediação: auditoria de teclado/leitor de tela/contraste, estados de foco e anúncios; limpeza de assets em PR separado e verificável.

## Controles positivos encontrados

- HSTS e headers básicos presentes em produção;
- endpoint manual rejeita método GET com 405;
- endpoint manual valida token e perfil aprovado antes do envio;
- `service_role` e credenciais Twilio são lidas de variáveis de ambiente, não estão hardcoded no código atual;
- mensagens evitam links, cobranças e pedidos de documentos;
- confirmação de e-mail e detecção de reutilização de refresh token estão habilitadas;
- MFA TOTP está disponível na plataforma;
- RLS está tecnicamente habilitada em todas as tabelas públicas;
- índices primários e deduplicação parcial de notificações existem;
- o repositório local está limpo, sincronizado e o JavaScript publicado coincide com o auditado.

## Validações executadas

| Validação | Resultado |
| --- | --- |
| `git status/fetch/divergência` | limpo; `main` = `origin/main`; 0/0 |
| Sintaxe JS | 4 arquivos aprovados por `node --check` |
| JSON | `vercel.json` e `site.webmanifest` válidos |
| Semgrep | 345 regras em 24 arquivos, 0 findings; 12 warnings internos de regras não suportadas pelo engine OSS |
| Busca histórica limitada de segredos | nenhum padrão comum de chave privada/Stripe; referências encontradas são nomes de env vars |
| Produção | raiz 200; GET do endpoint manual 405 |
| Paridade deploy | SHA-256 de `app.js` local = publicado |
| Data de fim de mês | rollover incorreto reproduzido |
| Supabase | inspeção read-only de metadados, políticas e configurações concluída |

O resultado “0 findings” do Semgrep não reduz a criticidade dos achados manuais: RLS permissiva, autorização, XSS por interpolação e falha aberta do cron dependem de contexto e lógica de negócio. O scanner também informou limitações internas em algumas regras.

## Conclusão

O Controle Duplo J tem uma base pequena e compreensível, o que favorece uma correção cirúrgica. Entretanto, a combinação de dados clínicos identificáveis, produção sem backup/migrations e bypass confirmado de autorização exige tratar a próxima etapa como contenção de segurança e recuperação de governança — não como simples refatoração estética.

O plano recomendado está em `docs/plans/2026-07-17-repository-hardening-plan.md`.
