-- Create storage bucket for custom rule icons
INSERT INTO storage.buckets (id, name, public)
VALUES ('rule-icons', 'rule-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Rule icons are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'rule-icons');

-- Allow authenticated users to upload rule icons
CREATE POLICY "Authenticated users can upload rule icons"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'rule-icons' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update rule icons"
ON storage.objects FOR UPDATE
USING (bucket_id = 'rule-icons' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to delete rule icons
CREATE POLICY "Authenticated users can delete rule icons"
ON storage.objects FOR DELETE
USING (bucket_id = 'rule-icons' AND auth.uid() IS NOT NULL);