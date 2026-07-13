# Setup Supabase - Dashboard Automix

## 1. Criar banco

1. Abra o Supabase.
2. Vá em **SQL Editor**.
3. Cole e execute o conteúdo de `supabase-schema.sql`.

## 2. Criar usuários

1. Vá em **Authentication > Users**.
2. Crie um usuário para o admin e outro para o cliente.
3. Copie o `User UID` de cada um.
4. No **SQL Editor**, cadastre os perfis:

```sql
insert into public.profiles (id, display_name, role)
values
  ('UID_DO_ADMIN', 'Admin Automix', 'admin'),
  ('UID_DO_CLIENTE', 'Cliente Automix', 'client')
on conflict (id) do update
set display_name = excluded.display_name,
    role = excluded.role;
```

## 3. Conectar o HTML

No arquivo `dashboard-automix-teste.html`, preencha:

```js
const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
const SUPABASE_ANON_KEY = "SUA_ANON_KEY";
```

Use apenas a `anon public key`. Nunca coloque a `service_role key` no HTML.

## 4. Migrar os dados atuais

Depois de configurar as chaves:

1. Abra `dashboard-automix-teste.html`.
2. Entre com o login admin do Supabase.
3. Se o banco estiver vazio, o arquivo envia automaticamente os contratos atuais do teste para o Supabase.
4. Recarregue a página e confirme que os dados continuam aparecendo.

## 5. Publicar

O projeto continua sendo estático. Depois de testar localmente, publique o mesmo HTML na hospedagem atual e adicione o domínio em **Authentication > URL Configuration** no Supabase.
