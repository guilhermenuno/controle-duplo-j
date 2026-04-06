-- ============================================================
-- MIGRAÇÃO: Adicionar campos sexo e cistoscopia_quarta
-- Tabela: pacientes
-- Data: 2026-04-06
-- ============================================================

-- 1. Adicionar coluna sexo (feminino, masculino ou null)
ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS sexo TEXT
CHECK (sexo IN ('feminino', 'masculino'));

-- 2. Adicionar coluna cistoscopia_quarta (boolean)
ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS cistoscopia_quarta BOOLEAN DEFAULT FALSE;

-- 3. Comentários para documentação
COMMENT ON COLUMN pacientes.sexo IS 'Sexo do paciente: feminino ou masculino';
COMMENT ON COLUMN pacientes.cistoscopia_quarta IS 'Indicação para retirada por cistoscopia às quartas pela manhã (apenas mulheres com DJ < 6 meses)';
