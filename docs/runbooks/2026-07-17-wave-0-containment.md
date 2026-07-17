# Onda 0 — contenção de segurança

Data: 2026-07-17
Projeto Supabase: `forbdpfbuuwbqcwvscjq`
Branch: `security/wave-0-containment`

## Estado de contenção

- Novos cadastros estão desativados no Auth do Supabase desde 2026-07-17.
- Usuários existentes não foram alterados.
- O snapshot anterior à mudança contém somente o esquema `public`, sem linhas de pacientes:
  `docs/audits/evidence/2026-07-17-public-schema-pre-wave0.sql`.
- SHA-256 do snapshot:
  `797ff6eef4069400e6d6c5e31cbc7a2990d8b1514613c2c511974a6d4af1f568`.
- A migration é transacional e interrompe a aplicação se o conjunto final não tiver exatamente as 14 políticas esperadas.

## Gates antes da aplicação

Executar na raiz do repositório:

```sh
npm test
npm run check
npm run test:rls
semgrep scan --config auto --error --exclude docs/audits/evidence --exclude .git .
supabase db push --linked --dry-run --yes
```

Resultado esperado:

- 12 testes Node aprovados;
- teste RLS aprovado para usuário pendente, aprovado e admin;
- zero achados bloqueantes no Semgrep;
- dry-run listando apenas `20260717180000_wave0_security_containment.sql`.

## Aplicação

```sh
supabase db push --linked --yes
supabase migration list --linked
```

A migration:

1. remove as três políticas legadas permissivas de `pacientes`;
2. recria as 14 políticas com papel `authenticated` explícito;
3. preserva os fluxos de usuário aprovado e administrador;
4. fixa `search_path` vazio nas quatro funções públicas;
5. remove execução direta das funções de trigger e restringe os helpers de RLS.

## Verificação pós-aplicação

- Confirmar que a migration local e remota aparecem alinhadas.
- Confirmar no Table Editor que as políticas legadas não existem.
- Confirmar no Security Advisor que os três alertas de políticas sempre verdadeiras desapareceram.
- Não consultar, exportar ou modificar linhas de pacientes durante a verificação.
- Manter novos cadastros desativados até existir fluxo institucional de provisionamento.

## Rollback seguro

Se qualquer comando da migration falhar, o `BEGIN`/`COMMIT` garante rollback automático e nenhuma política parcial é persistida.

Depois de um commit bem-sucedido, **não** restaurar o snapshot inteiro e **não** recriar políticas com `USING (true)` ou `WITH CHECK (true)`. Em caso de incompatibilidade:

1. manter novos cadastros desativados;
2. preservar as três políticas legadas removidas;
3. interromper o cliente afetado ou reverter somente o deploy da aplicação;
4. corrigir a política específica com uma nova migration transacional, mantendo o gate de usuário aprovado;
5. repetir os testes RLS antes de aplicar a correção.

Esse procedimento é um rollback funcional por correção à frente: evita reabrir o acesso que motivou a contenção.
