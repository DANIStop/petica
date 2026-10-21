-- Premium arhiva: igra prošlog dana je 'extra' igra s datumom tog dana i oznakom archive.
alter table plays add column archive boolean not null default false;
create unique index plays_one_archive on plays (user_id, game, date) where archive;
