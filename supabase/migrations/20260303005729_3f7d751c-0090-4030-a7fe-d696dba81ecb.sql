-- Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true);

-- Allow anyone to upload images (no auth required for this ephemeral chat)
CREATE POLICY "Anyone can upload chat images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-images');

-- Allow anyone to view chat images
CREATE POLICY "Anyone can view chat images"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-images');

-- Allow deletion of chat images (for purge)
CREATE POLICY "Anyone can delete chat images"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-images');