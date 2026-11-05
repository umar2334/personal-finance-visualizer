-- Personal Finance Visualizer: run once in the Supabase SQL editor.
-- Tables are prefixed so they can't clash with anything else in the project.
-- Safe to re-run.

create table if not exists public.pfv_categories (
  user_id    uuid not null references auth.users (id) on delete cascade,
  id         text not null,
  name       text not null check (char_length(name) between 1 and 40),
  type       text not null check (type in ('income', 'expense')),
  color      text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  is_default boolean not null default false,
  primary key (user_id, id)
);

create table if not exists public.pfv_transactions (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  type        text not null check (type in ('income', 'expense')),
  amount      numeric(14, 2) not null check (amount > 0),
  category_id text not null,
  description text not null default '' check (char_length(description) <= 140),
  date        date not null,
  created_at  timestamptz not null default now(),
  foreign key (user_id, category_id) references public.pfv_categories (user_id, id)
);
create index if not exists pfv_transactions_user_date on public.pfv_transactions (user_id, date desc);

create table if not exists public.pfv_budgets (
  user_id      uuid not null,
  month        text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  category_id  text not null,
  amount_limit numeric(14, 2) not null check (amount_limit > 0),
  primary key (user_id, month, category_id),
  foreign key (user_id, category_id) references public.pfv_categories (user_id, id) on delete cascade
);

alter table public.pfv_categories   enable row level security;
alter table public.pfv_transactions enable row level security;
alter table public.pfv_budgets      enable row level security;

-- Each policy limits every operation to the signed-in user's own rows.
drop policy if exists "own categories" on public.pfv_categories;
create policy "own categories" on public.pfv_categories
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own transactions" on public.pfv_transactions;
create policy "own transactions" on public.pfv_transactions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own budgets" on public.pfv_budgets;
create policy "own budgets" on public.pfv_budgets
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.pfv_categories, public.pfv_transactions, public.pfv_budgets to authenticated;
