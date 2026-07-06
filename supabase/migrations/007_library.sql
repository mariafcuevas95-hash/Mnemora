-- Source tracking for documents and flashcards (multimodal / transcription / pdf / manual)
alter table documents
  add column if not exists source   text default null,   -- 'transcription' | 'multimodal' | null = pdf
  add column if not exists raw_text text default null;   -- full extracted text (capped at 10k chars)

alter table flashcards
  add column if not exists source text default null;     -- 'transcription' | 'multimodal' | null = document/manual
