--
-- PostgreSQL database dump
--

\restrict J3HQoxc8VcVVPYZTAmOtqRKbtwl3Bt7c2mblu1ieClq7HGjgIKYEprHIG6W8i5M

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "public";


--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email;
  return new;
end;
$$;


--
-- Name: is_admin_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."is_admin_user"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and approved = true
      and is_active = true
      and role = 'admin'
  );
$$;


--
-- Name: is_approved_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."is_approved_user"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and approved = true
      and is_active = true
  );
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: pacientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."pacientes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "registro_hospitalar" "text",
    "telefone" "text",
    "data_colocacao" "date",
    "data_3_meses" "date",
    "data_6_meses" "date",
    "status" "text",
    "observacoes" "text",
    "data_retirada" "date",
    "cadastrado_por" "uuid" DEFAULT "gen_random_uuid"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "retirado_por" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sexo" "text",
    "cistoscopia_quarta" boolean DEFAULT false,
    "prazo_retirada_meses" integer DEFAULT 3 NOT NULL,
    "prazo_retirada_dias" integer DEFAULT 0 NOT NULL,
    "data_prazo_retirada" "date",
    "contato_sms_autorizado" boolean DEFAULT false NOT NULL,
    "contato_whatsapp_autorizado" boolean DEFAULT false NOT NULL,
    CONSTRAINT "pacientes_sexo_check" CHECK (("sexo" = ANY (ARRAY['feminino'::"text", 'masculino'::"text"])))
);


--
-- Name: COLUMN "pacientes"."sexo"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."pacientes"."sexo" IS 'Sexo do paciente: feminino ou masculino';


--
-- Name: COLUMN "pacientes"."cistoscopia_quarta"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."pacientes"."cistoscopia_quarta" IS 'Indicação para retirada por cistoscopia às quartas pela manhã (apenas mulheres com DJ < 6 meses)';


--
-- Name: pacientes_troca_programada; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."pacientes_troca_programada" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "registro_hospitalar" "text" NOT NULL,
    "telefone" "text",
    "ultima_troca_data" "date" NOT NULL,
    "intervalo_meses" integer DEFAULT 3 NOT NULL,
    "intervalo_dias" integer DEFAULT 0 NOT NULL,
    "proxima_troca_data" "date" NOT NULL,
    "observacoes" "text",
    "status" "text" DEFAULT 'ativo'::"text" NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pacientes_troca_programada_status_check" CHECK (("status" = ANY (ARRAY['ativo'::"text", 'encerrado'::"text"])))
);


--
-- Name: patient_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."patient_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid",
    "target_table" "text" NOT NULL,
    "action" "text" NOT NULL,
    "actor_id" "uuid",
    "actor_name" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: patient_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."patient_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid",
    "target_table" "text" DEFAULT 'pacientes'::"text" NOT NULL,
    "notification_type" "text" NOT NULL,
    "channel" "text" NOT NULL,
    "destination" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "error_message" "text",
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "patient_notifications_channel_check" CHECK (("channel" = ANY (ARRAY['sms'::"text", 'whatsapp'::"text"])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "email" "text",
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "approved" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'user'::"text"])))
);


--
-- Name: pacientes pacientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."pacientes"
    ADD CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id");


--
-- Name: pacientes_troca_programada pacientes_troca_programada_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."pacientes_troca_programada"
    ADD CONSTRAINT "pacientes_troca_programada_pkey" PRIMARY KEY ("id");


--
-- Name: patient_audit_log patient_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."patient_audit_log"
    ADD CONSTRAINT "patient_audit_log_pkey" PRIMARY KEY ("id");


--
-- Name: patient_notifications patient_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."patient_notifications"
    ADD CONSTRAINT "patient_notifications_pkey" PRIMARY KEY ("id");


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");


--
-- Name: patient_notifications_unique_sent; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "patient_notifications_unique_sent" ON "public"."patient_notifications" USING "btree" ("patient_id", "target_table", "notification_type", "channel") WHERE ("status" = 'sent'::"text");


--
-- Name: pacientes pacientes_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "pacientes_set_updated_at" BEFORE UPDATE ON "public"."pacientes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: pacientes_troca_programada pacientes_troca_programada_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "pacientes_troca_programada_set_updated_at" BEFORE UPDATE ON "public"."pacientes_troca_programada" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: profiles profiles_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: pacientes pacientes_retirado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."pacientes"
    ADD CONSTRAINT "pacientes_retirado_por_fkey" FOREIGN KEY ("retirado_por") REFERENCES "auth"."users"("id");


--
-- Name: pacientes_troca_programada pacientes_troca_programada_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."pacientes_troca_programada"
    ADD CONSTRAINT "pacientes_troca_programada_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");


--
-- Name: pacientes_troca_programada pacientes_troca_programada_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."pacientes_troca_programada"
    ADD CONSTRAINT "pacientes_troca_programada_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");


--
-- Name: patient_audit_log patient_audit_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."patient_audit_log"
    ADD CONSTRAINT "patient_audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id");


--
-- Name: profiles profiles_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: patient_audit_log audit_insert_approved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "audit_insert_approved" ON "public"."patient_audit_log" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."is_approved_user"() AS "is_approved_user"));


--
-- Name: patient_audit_log audit_select_approved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "audit_select_approved" ON "public"."patient_audit_log" FOR SELECT TO "authenticated" USING (( SELECT "public"."is_approved_user"() AS "is_approved_user"));


--
-- Name: patient_notifications notifications_insert_approved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "notifications_insert_approved" ON "public"."patient_notifications" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."is_approved_user"() AS "is_approved_user"));


--
-- Name: patient_notifications notifications_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "notifications_select_admin" ON "public"."patient_notifications" FOR SELECT TO "authenticated" USING (( SELECT "public"."is_admin_user"() AS "is_admin_user"));


--
-- Name: pacientes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."pacientes" ENABLE ROW LEVEL SECURITY;

--
-- Name: pacientes pacientes_delete_admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "pacientes_delete_admin_only" ON "public"."pacientes" FOR DELETE TO "authenticated" USING (( SELECT "public"."is_admin_user"() AS "is_admin_user"));


--
-- Name: pacientes pacientes_insert_approved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "pacientes_insert_approved" ON "public"."pacientes" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "public"."is_approved_user"() AS "is_approved_user") AND (( SELECT "auth"."uid"() AS "uid") = "cadastrado_por")));


--
-- Name: pacientes pacientes_select_approved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "pacientes_select_approved" ON "public"."pacientes" FOR SELECT TO "authenticated" USING (( SELECT "public"."is_approved_user"() AS "is_approved_user"));


--
-- Name: pacientes_troca_programada; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."pacientes_troca_programada" ENABLE ROW LEVEL SECURITY;

--
-- Name: pacientes pacientes_update_approved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "pacientes_update_approved" ON "public"."pacientes" FOR UPDATE TO "authenticated" USING (( SELECT "public"."is_approved_user"() AS "is_approved_user")) WITH CHECK (( SELECT "public"."is_approved_user"() AS "is_approved_user"));


--
-- Name: patient_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."patient_audit_log" ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."patient_notifications" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_select_self_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "profiles_select_self_or_admin" ON "public"."profiles" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "id") OR ( SELECT "public"."is_admin_user"() AS "is_admin_user")));


--
-- Name: profiles profiles_update_admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "profiles_update_admin_only" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (( SELECT "public"."is_admin_user"() AS "is_admin_user")) WITH CHECK (( SELECT "public"."is_admin_user"() AS "is_admin_user"));


--
-- Name: pacientes_troca_programada trocas_delete_admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "trocas_delete_admin_only" ON "public"."pacientes_troca_programada" FOR DELETE TO "authenticated" USING (( SELECT "public"."is_admin_user"() AS "is_admin_user"));


--
-- Name: pacientes_troca_programada trocas_insert_approved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "trocas_insert_approved" ON "public"."pacientes_troca_programada" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "public"."is_approved_user"() AS "is_approved_user") AND (( SELECT "auth"."uid"() AS "uid") = "created_by")));


--
-- Name: pacientes_troca_programada trocas_select_approved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "trocas_select_approved" ON "public"."pacientes_troca_programada" FOR SELECT TO "authenticated" USING (( SELECT "public"."is_approved_user"() AS "is_approved_user"));


--
-- Name: pacientes_troca_programada trocas_update_approved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "trocas_update_approved" ON "public"."pacientes_troca_programada" FOR UPDATE TO "authenticated" USING (( SELECT "public"."is_approved_user"() AS "is_approved_user")) WITH CHECK (( SELECT "public"."is_approved_user"() AS "is_approved_user"));


--
-- PostgreSQL database dump complete
--

\unrestrict J3HQoxc8VcVVPYZTAmOtqRKbtwl3Bt7c2mblu1ieClq7HGjgIKYEprHIG6W8i5M
