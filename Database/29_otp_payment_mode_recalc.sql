-- Keeps otp_orders_acceptable's Pro-Forma-Invoice gate in sync when
-- Lead-To-Order later edits payment_mode on an already-converted order's
-- tracker row (lto_enquiry_tracker / lto_enquiry_tracker_for_leads).
--
-- otp_sync_order_from_tracker() (Database/13/15/19/20) already re-copies
-- payment_mode into otp_orders on every such UPDATE (its trigger fires on
-- UPDATE too, not just INSERT) — that part is automatic. What's missing is
-- recalculating otp_orders_acceptable.proforma_invoice_planned /
-- check_inventory_planned to match the new payment_mode, which is what this
-- trigger (on otp_orders, our own table — not lto_*) does.
--
-- Rules (confirmed with the user):
--   1. If Order Acceptable hasn't been processed yet (no otp_orders_acceptable
--      row) or the order was rejected — nothing to recalc; Order Acceptable's
--      own POST reads payment_mode live at process time anyway.
--   2. Once Check Inventory (or anything later) has started for this order,
--      stop touching the gate entirely — a later payment_mode edit must not
--      reopen/close a stage the order has already moved past.
--   3. Switching TO 'pi against advance': only set proforma_invoice_planned
--      (and clear check_inventory_planned) if Pro-Forma Invoice hasn't
--      already been processed for this order.
--   4. Switching AWAY from 'pi against advance': only clear
--      proforma_invoice_planned (and set check_inventory_planned) if
--      Pro-Forma Invoice is still pending (not yet processed) — if it's
--      already done, leave check_inventory_planned as that stage's own POST
--      set it.
CREATE OR REPLACE FUNCTION public.otp_recalc_proforma_planned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_acc public.otp_orders_acceptable;
BEGIN
  SELECT * INTO v_acc FROM public.otp_orders_acceptable WHERE order_id = NEW.id;

  IF v_acc.id IS NULL OR v_acc.is_order_acceptable IS DISTINCT FROM 'Yes' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.otp_check_inventory WHERE order_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  IF NEW.payment_mode = 'pi against advance' THEN
    IF NOT EXISTS (SELECT 1 FROM public.otp_proforma_invoice WHERE order_id = NEW.id) THEN
      UPDATE public.otp_orders_acceptable
         SET proforma_invoice_planned = now() + interval '3 days',
             check_inventory_planned = NULL
       WHERE order_id = NEW.id;
    END IF;
  ELSE
    IF v_acc.proforma_invoice_planned IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.otp_proforma_invoice WHERE order_id = NEW.id) THEN
      UPDATE public.otp_orders_acceptable
         SET proforma_invoice_planned = NULL,
             check_inventory_planned = now() + interval '3 days'
       WHERE order_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS otp_trg_orders_payment_mode_recalc ON public.otp_orders;
CREATE TRIGGER otp_trg_orders_payment_mode_recalc
  AFTER UPDATE ON public.otp_orders
  FOR EACH ROW
  WHEN (OLD.payment_mode IS DISTINCT FROM NEW.payment_mode)
  EXECUTE FUNCTION public.otp_recalc_proforma_planned();
