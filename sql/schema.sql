create extension if not exists vector;
create table if not exists public.document_registry (
 document_id text primary key,title text not null,original_filename text,drive_file_id text not null,
 drive_url text,publisher text,publication_year integer,document_type text,category text,subcategory text,
 language text,geographic_scope text,description text,keywords text[],access_level text default 'public',
 processing_status text not null default 'pending' check(processing_status in ('pending','processing','completed','failed','skipped')),
 checksum_sha256 text,last_successful_checksum text,last_processed_at timestamptz,error_message text,
 updated_at timestamptz not null default now()
);
create table if not exists public.document_chunks (
 id bigserial primary key,document_id text not null references public.document_registry(document_id) on delete cascade,
 chunk_index integer not null,content text not null,page_start integer,page_end integer,metadata jsonb not null default '{}'::jsonb,
 checksum_sha256 text not null,embedding vector(768) not null,created_at timestamptz not null default now(),
 unique(document_id,checksum_sha256,chunk_index)
);
create index if not exists document_chunks_doc_idx on public.document_chunks(document_id);
create index if not exists document_chunks_embedding_idx on public.document_chunks using hnsw(embedding vector_cosine_ops);
create or replace function public.match_document_chunks(
 query_embedding vector(768),match_count integer default 5,
 similarity_threshold double precision default 0.35,filter_category text default null
) returns table(document_id text,title text,publisher text,category text,content text,page_start integer,
 page_end integer,metadata jsonb,similarity double precision)
language sql stable as $$
 select c.document_id,r.title,r.publisher,r.category,c.content,c.page_start,c.page_end,c.metadata,
  1-(c.embedding <=> query_embedding) as similarity
 from public.document_chunks c join public.document_registry r using(document_id)
 where r.processing_status='completed' and r.last_successful_checksum=c.checksum_sha256
 and (filter_category is null or r.category=filter_category)
 and 1-(c.embedding <=> query_embedding)>=similarity_threshold
 order by c.embedding <=> query_embedding limit greatest(match_count,1);
$$;
alter table public.document_registry enable row level security;
alter table public.document_chunks enable row level security;
-- Jangan membuka policy publik tanpa review akses. Service role hanya di server/CI.
