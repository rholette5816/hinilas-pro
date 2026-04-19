create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  meta_description text default '',
  article text not null,
  cta text default '',
  hero_image_url text default '',
  status text default 'published',
  published_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Index for fast slug lookup
create index if not exists blog_posts_slug_idx on blog_posts (slug);
-- Index for listing posts by date
create index if not exists blog_posts_published_at_idx on blog_posts (published_at desc);
