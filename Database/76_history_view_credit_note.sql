-- 76: server-paged History view for Credit Note (see 74/75). The table already
-- carries company/PO/CRM/location itself, so no joins; crm_name and
-- order_location are listed explicitly (NULLIF '' -> NULL) instead of cn.* to avoid
-- duplicate column names. History = status 'completed'. Safe to re-run.
CREATE OR REPLACE VIEW public.otp_v_credit_note_history AS
SELECT
  cn.id, cn.invoice_number, cn.company_name, cn.po_number, cn.items, cn.remarks, cn.status,
  cn.created_by, cn.submitted_by, cn.submitted_at, cn.created_at, cn.updated_at, cn.delay_minutes,
  NULLIF(cn.crm_name, '')       AS crm_name,
  NULLIF(cn.order_location, '') AS order_location,
  lower(concat_ws(' ',
    cn.invoice_number, cn.company_name, cn.po_number, cn.crm_name, cn.remarks, cn.created_by, cn.submitted_by
  )) AS search_text
FROM public.otp_credit_note cn
WHERE cn.status = 'completed';
