revoke execute on function public.has_ad_free(uuid, text) from public, anon;
grant execute on function public.has_ad_free(uuid, text) to authenticated, service_role;