ALTER TABLE public.scheduled_classes
ADD CONSTRAINT scheduled_classes_firm_id_fkey
FOREIGN KEY (firm_id)
REFERENCES public.firms (id)
ON DELETE CASCADE;
