-- Testes dos fluxos críticos do banco (pergunta de segurança, acessos, pagamentos, permissões).
-- Como usar: cole TUDO no editor SQL do Supabase e execute. Nada fica gravado: no fim o bloco "estoura" de propósito
-- (desfazendo tudo) e o relatório aparece na mensagem de erro. Procure por "FALHA": se não houver, está tudo certo.
-- Precisa de uma conta com 2+ murais pessoais (usa a primeira que achar) e de outra conta qualquer.
do $$
declare
  rep text := '';
  o uuid; other uuid; a public.murals; b public.murals; nick text;
  r jsonb; tok uuid; n int; before_c int; after_c int; msg text; mid uuid;
begin
  select owner_id into o from public.murals where kind = 'personal' group by owner_id having count(*) >= 2 limit 1;
  select user_id into other from public.profiles where user_id <> o limit 1;
  select * into a from public.murals where owner_id = o and kind = 'personal' order by created_at, id limit 1;
  select * into b from public.murals where owner_id = o and kind = 'personal' and id <> a.id order by created_at limit 1;
  select nickname into nick from public.profiles where user_id = o;

  -- como o dono
  perform set_config('request.jwt.claims', json_build_object('sub', o, 'role', 'authenticated')::text, true);

  -- 1) pergunta e resposta são de cada mural
  perform public.update_mural(a.id, a.title, 'Pergunta A?', 'resposta a');
  perform public.update_mural(b.id, b.title, 'Pergunta B?', 'resposta b');
  rep := rep || case when (select question from public.murals where id = a.id) = 'Pergunta A?' and (select question from public.murals where id = b.id) = 'Pergunta B?' then 'OK    ' else 'FALHA ' end || 'cada mural tem a sua pergunta' || E'\n';

  -- 2) resposta errada não abre; certa abre só aquele mural
  r := public.try_unlock(nick, a.slug, 'errada', 'visitante-teste-0001');
  rep := rep || case when (r->>'ok')::boolean is not true then 'OK    ' else 'FALHA ' end || 'resposta errada não abre' || E'\n';
  r := public.try_unlock(nick, a.slug, 'Resposta A', 'visitante-teste-0001');
  tok := (r->>'token')::uuid;
  rep := rep || case when (r->>'ok')::boolean and (select count(*) from jsonb_object_keys(r->'tokens')) = 1 then 'OK    ' else 'FALHA ' end || 'resposta certa abre só o mural dela' || E'\n';

  -- 3) trocar a resposta derruba o acesso
  perform public.update_mural(a.id, a.title, 'Pergunta A?', 'outra resposta');
  rep := rep || case when public.check_grant(nick, a.slug, tok) is not true then 'OK    ' else 'FALHA ' end || 'trocar a resposta revoga o acesso' || E'\n';

  -- 4) o primeiro mural não pode ser apagado
  begin
    perform public.delete_mural(a.id);
    rep := rep || 'FALHA ' || 'primeiro mural foi apagado' || E'\n';
  exception when others then
    rep := rep || case when sqlerrm like '%first_mural%' then 'OK    ' else 'FALHA ' end || 'primeiro mural não pode ser apagado' || E'\n';
  end;

  -- 5) enviar pin exige conta; formato desligado é recusado
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin
    perform public.send_message(nick, a.slug, tok, 0, 'text', '{"text":"oi","variant":"letter"}'::jsonb);
    rep := rep || 'FALHA ' || 'pin enviado sem conta' || E'\n';
  exception when others then
    rep := rep || 'OK    ' || 'enviar pin sem conta é recusado (' || sqlerrm || ')' || E'\n';
  end;
  perform set_config('request.jwt.claims', json_build_object('sub', o, 'role', 'authenticated')::text, true);
  update public.feature_flags set enabled = false where key = 'pin_video';
  begin
    perform public.send_message(nick, a.slug, null, 27, 'video', '{"link":"https://youtu.be/dQw4w9WgXcQ"}'::jsonb);
    rep := rep || 'FALHA ' || 'formato desligado foi aceito' || E'\n';
  exception when others then
    rep := rep || case when sqlerrm like '%format_disabled%' then 'OK    ' else 'FALHA ' end || 'formato desligado é recusado' || E'\n';
  end;

  -- 6) quem não cuida do mural não move pin
  select id into mid from public.messages where mural_id = a.id limit 1;
  if mid is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', other, 'role', 'authenticated')::text, true);
    begin
      perform public.move_pin(mid, 20);
      rep := rep || 'FALHA ' || 'outra conta moveu o pin' || E'\n';
    exception when others then
      rep := rep || case when sqlerrm like '%forbidden%' then 'OK    ' else 'FALHA ' end || 'outra conta não move pin' || E'\n';
    end;
  else
    rep := rep || 'PULOU ' || 'mover pin (o mural de teste não tem pins)' || E'\n';
  end if;

  -- 7) pagamento: o mesmo aviso duas vezes credita uma vez só
  select credits into before_c from public.profiles where user_id = other;
  perform public.pay_credits_apply(other, 'TESTE-PAGAMENTO-1', 3, 300, 'approved');
  perform public.pay_credits_apply(other, 'TESTE-PAGAMENTO-1', 3, 300, 'approved');
  select credits into after_c from public.profiles where user_id = other;
  rep := rep || case when after_c = before_c + 3 then 'OK    ' else 'FALHA ' end || 'pagamento repetido credita uma vez (' || before_c || ' -> ' || after_c || ')' || E'\n';

  -- 8) comprar sem crédito é recusado
  perform set_config('request.jwt.claims', json_build_object('sub', other, 'role', 'authenticated')::text, true);
  update public.profiles set credits = 0 where user_id = other;
  begin
    perform public.buy_board('criativo');
    rep := rep || 'FALHA ' || 'compra sem crédito' || E'\n';
  exception when others then
    rep := rep || 'OK    ' || 'compra sem crédito é recusada (' || sqlerrm || ')' || E'\n';
  end;

  -- 9) permissões de quem não entrou
  rep := rep || case when not has_function_privilege('anon', 'public.moderate_pin(uuid,boolean,boolean)', 'execute')
                      and not has_function_privilege('anon', 'public.send_message(text,text,uuid,integer,text,jsonb,timestamptz,boolean)', 'execute')
                      and not has_function_privilege('anon', 'public.pay_credits_apply(uuid,text,integer,integer,text)', 'execute')
                      and not has_function_privilege('authenticated', 'public.pay_credits_apply(uuid,text,integer,integer,text)', 'execute')
                 then 'OK    ' else 'FALHA ' end || 'funções sensíveis fechadas para quem não entrou' || E'\n';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  rep := rep || case when public._pin_upload_allowed('00000000-0000-0000-0000-000000000000/x.png') is not true then 'OK    ' else 'FALHA ' end || 'envio de arquivo sem conta é recusado' || E'\n';

  raise exception E'\n===== RELATÓRIO (nada foi gravado) =====\n%', rep;
end $$;
