-- ============================================================
-- Menzah Store : schéma Supabase (état final)
-- Déjà appliqué sur le projet Supabase "between-us-coffee"
-- (jxthopvlrwmbpmqbhkmy). Toutes les tables sont préfixées "menzah_".
-- Ce fichier sert de référence pour recréer la base ailleurs.
-- ============================================================

-- ---------- Administrateurs ----------
create table public.menzah_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.menzah_admins enable row level security;
create policy menzah_admins_lecture_soi on public.menzah_admins
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.menzah_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.menzah_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.menzah_is_admin() from public;
grant execute on function public.menzah_is_admin() to authenticated;

create or replace function public.menzah_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------- Produits ----------
create table public.menzah_produits (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,59}$'),
  nom text not null check (char_length(nom) between 1 and 80),
  marque text not null default '' check (char_length(marque) <= 40),
  categorie text not null default 'iphone' check (categorie in ('iphone', 'android', 'accessoires')),
  visuel text not null default 'pro' check (visuel in ('plateau', 'air', 'pro', 'double', 'diagonale', 'oppo', 'ultra', 'airpods', 'chargeur', 'coque')),
  image_url text check (image_url is null or image_url ~ '^https://'),
  description text not null default '' check (char_length(description) <= 400),
  couleurs jsonb not null default '[]'::jsonb check (jsonb_typeof(couleurs) = 'array'),
  capacites jsonb not null default '[]'::jsonb check (jsonb_typeof(capacites) = 'array'),
  prix integer check (prix is null or prix >= 0),
  prix_barre integer check (prix_barre is null or prix_barre >= 0),
  badge text check (badge is null or char_length(badge) <= 24),
  video text check (video is null or video ~ '^https://'),
  en_stock boolean not null default true,
  actif boolean not null default true,
  ordre integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index menzah_produits_ordre_idx on public.menzah_produits (ordre, created_at);
alter table public.menzah_produits enable row level security;
create trigger menzah_produits_touch before update on public.menzah_produits
  for each row execute function public.menzah_touch_updated_at();

create policy menzah_produits_lecture_public on public.menzah_produits
  for select to anon using (actif);
create policy menzah_produits_lecture_connecte on public.menzah_produits
  for select to authenticated using (actif or (select public.menzah_is_admin()));
create policy menzah_produits_ajout on public.menzah_produits
  for insert to authenticated with check ((select public.menzah_is_admin()));
create policy menzah_produits_modif on public.menzah_produits
  for update to authenticated using ((select public.menzah_is_admin())) with check ((select public.menzah_is_admin()));
create policy menzah_produits_suppr on public.menzah_produits
  for delete to authenticated using ((select public.menzah_is_admin()));

-- ---------- Réglages (une seule ligne, id = 1) ----------
create table public.menzah_reglages (
  id smallint primary key default 1 check (id = 1),
  donnees jsonb not null default '{}'::jsonb check (jsonb_typeof(donnees) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.menzah_reglages enable row level security;
create trigger menzah_reglages_touch before update on public.menzah_reglages
  for each row execute function public.menzah_touch_updated_at();
create policy menzah_reglages_lecture on public.menzah_reglages
  for select to anon, authenticated using (true);
create policy menzah_reglages_ajout on public.menzah_reglages
  for insert to authenticated with check ((select public.menzah_is_admin()));
create policy menzah_reglages_modif on public.menzah_reglages
  for update to authenticated using ((select public.menzah_is_admin())) with check ((select public.menzah_is_admin()));

-- ---------- Commandes ----------
create table public.menzah_commandes (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity (start with 1001) unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  produit_id text references public.menzah_produits (id) on delete set null,
  produit_nom text not null check (char_length(produit_nom) between 1 and 100),
  couleur text check (couleur is null or char_length(couleur) <= 40),
  capacite text check (capacite is null or char_length(capacite) <= 40),
  prix integer,
  client_nom text not null check (char_length(client_nom) between 2 and 80),
  client_telephone text not null check (client_telephone ~ '^\+?[0-9]{9,14}$'),
  mode_reception text not null default 'boutique' check (mode_reception in ('boutique', 'livraison')),
  wilaya text check (wilaya is null or char_length(wilaya) <= 80),
  note text check (note is null or char_length(note) <= 500),
  statut text not null default 'nouvelle' check (statut in ('nouvelle', 'confirmee', 'livree', 'annulee'))
);
create index menzah_commandes_date_idx on public.menzah_commandes (created_at desc);
create index menzah_commandes_tel_idx on public.menzah_commandes (client_telephone, created_at desc);
create index menzah_commandes_produit_idx on public.menzah_commandes (produit_id);
alter table public.menzah_commandes enable row level security;
create trigger menzah_commandes_touch before update on public.menzah_commandes
  for each row execute function public.menzah_touch_updated_at();

create policy menzah_commandes_lecture on public.menzah_commandes
  for select to authenticated using ((select public.menzah_is_admin()));
create policy menzah_commandes_modif on public.menzah_commandes
  for update to authenticated using ((select public.menzah_is_admin())) with check ((select public.menzah_is_admin()));
create policy menzah_commandes_suppr on public.menzah_commandes
  for delete to authenticated using ((select public.menzah_is_admin()));

-- Les clients passent commande uniquement par cette fonction (validation + anti-abus).
create or replace function public.menzah_passer_commande(
  p_produit_id text, p_couleur text, p_capacite text, p_nom text,
  p_telephone text, p_mode text, p_wilaya text, p_note text
)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_produit public.menzah_produits%rowtype;
  v_tel text;
  v_nom text := btrim(coalesce(p_nom, ''));
  v_numero bigint;
begin
  select * into v_produit from public.menzah_produits where id = p_produit_id and actif;
  if not found then
    raise exception 'Produit introuvable' using errcode = 'P0002';
  end if;
  if char_length(v_nom) < 2 or char_length(v_nom) > 80 then
    raise exception 'Nom invalide' using errcode = '22023';
  end if;
  -- 0555 12 34 56 -> +213555123456
  v_tel := regexp_replace(coalesce(p_telephone, ''), '[^0-9+]', '', 'g');
  v_tel := regexp_replace(v_tel, '^00213', '+213');
  v_tel := regexp_replace(v_tel, '^0', '+213');
  if v_tel !~ '^\+213([5-7][0-9]{8}|[1-4][0-9]{7})$' then
    raise exception 'Numéro de téléphone invalide' using errcode = '22023';
  end if;
  if (select count(*) from public.menzah_commandes
      where client_telephone = v_tel and created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'Trop de commandes, réessayez dans quelques minutes' using errcode = 'P0001';
  end if;
  if (select count(*) from public.menzah_commandes
      where created_at > now() - interval '10 minutes') >= 40 then
    raise exception 'Trop de commandes en ce moment, réessayez dans quelques minutes' using errcode = 'P0001';
  end if;
  insert into public.menzah_commandes (
    produit_id, produit_nom, couleur, capacite, prix, client_nom, client_telephone, mode_reception, wilaya, note
  ) values (
    v_produit.id, v_produit.nom,
    nullif(left(btrim(coalesce(p_couleur, '')), 40), ''),
    nullif(left(btrim(coalesce(p_capacite, '')), 40), ''),
    v_produit.prix, v_nom, v_tel,
    case when p_mode = 'livraison' then 'livraison' else 'boutique' end,
    nullif(left(btrim(coalesce(p_wilaya, '')), 80), ''),
    nullif(left(btrim(coalesce(p_note, '')), 500), '')
  ) returning numero into v_numero;
  return v_numero;
end;
$$;
revoke all on function public.menzah_passer_commande(text, text, text, text, text, text, text, text) from public;
grant execute on function public.menzah_passer_commande(text, text, text, text, text, text, text, text) to anon, authenticated;

revoke insert, update, delete, truncate on public.menzah_produits, public.menzah_reglages, public.menzah_commandes, public.menzah_admins from anon;
revoke select on public.menzah_commandes, public.menzah_admins from anon;

-- Commandes en direct dans le tableau de bord
alter publication supabase_realtime add table public.menzah_commandes;

-- ---------- Photos (logo, produits) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menzah', 'menzah', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy menzah_storage_lecture_admin on storage.objects
  for select to authenticated using (bucket_id = 'menzah' and (select public.menzah_is_admin()));
create policy menzah_storage_ajout_admin on storage.objects
  for insert to authenticated with check (bucket_id = 'menzah' and (select public.menzah_is_admin()));
create policy menzah_storage_modif_admin on storage.objects
  for update to authenticated using (bucket_id = 'menzah' and (select public.menzah_is_admin()))
  with check (bucket_id = 'menzah' and (select public.menzah_is_admin()));
create policy menzah_storage_suppr_admin on storage.objects
  for delete to authenticated using (bucket_id = 'menzah' and (select public.menzah_is_admin()));

-- ---------- Donner l'accès admin à un compte ----------
-- Le tableau de bord se connecte avec un nom d'utilisateur, converti en adresse technique
-- <nom>@menzah-store.vercel.app (voir DOMAINE_IDENTIFIANT dans admin/admin.js).
-- Compte actuel : menzahstore@menzah-store.vercel.app (nom d'utilisateur « menzahstore »).
-- 1. Créer l'utilisateur dans Supabase > Authentication > Users : e-mail
--    vendeur@menzah-store.vercel.app, mot de passe, « Auto Confirm User » coché.
-- 2. Puis : insert into public.menzah_admins (user_id)
--           select id from auth.users where email = 'vendeur@menzah-store.vercel.app';
